import * as electron from "electron";
const fs = require("fs").promises;
import { type FrontMatterCache, Modal, TFile, TFolder } from "obsidian";
import path from "path";
import { mount, unmount } from "svelte";
import pLimit from "p-limit";

import { PageSize } from "../constant";
import i18n, { type Lang } from "../i18n";
import type BetterExportPdfPlugin from "../main";
import { exportToPDF, getOutputFile, getOutputPath } from "../pdf";
import { createWebview, fixDoc, getAllStyles, getPatchStyle, renderMarkdown, type ParamType } from "../render";
import { isNumber, mm2px, px2mm, safeParseFloat, safeParseInt, traverseFolder } from "../utils";
import ModalUI from "./ModalUI.svelte";

export type PageSizeType = electron.PrintToPDFOptions["pageSize"];

export interface TConfig {
  pageSize: PageSizeType | "Custom";
  pageWidth?: string;
  pageHeight?: string;

  marginType: string;
  open: boolean;
  landscape: boolean;
  scale: number;
  showTitle: boolean;
  displayHeader: boolean;
  displayFooter: boolean;

  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;

  cssSnippet?: string;

  multiple?: boolean;
}

export type DocType = { doc: Document; frontMatter?: FrontMatterCache; file: TFile };

export class SvelteModal extends Modal {
  config: TConfig;
  plugin: BetterExportPdfPlugin;
  file: TFile | TFolder;
  multiplePdf?: boolean;

  preview: electron.WebviewTag;
  webviews: electron.WebviewTag[];
  previewDiv: HTMLDivElement;
  completed: boolean;
  docs: DocType[];
  i18n: Lang;
  scale: number;

  // Svelte component instance
  private component?: Record<string, any>;

  // Render progress callback — will be set by Svelte component
  initRenderStates?: (data: ParamType[]) => void;
  updateRenderStates?: (i: number) => void;

  constructor(plugin: BetterExportPdfPlugin, file: TFile | TFolder, multiplePdf?: boolean) {
    super(plugin.app);
    this.plugin = plugin;
    this.file = file;
    this.completed = false;
    this.i18n = i18n.current;
    this.docs = [];
    this.scale = 0.75;
    this.webviews = [];
    this.multiplePdf = multiplePdf;

    this.config = {
      pageSize: "A4",
      marginType: "1",
      showTitle: plugin.settings.showTitle ?? true,
      open: true,
      scale: 100,
      landscape: false,
      marginTop: "10",
      marginBottom: "10",
      marginLeft: "10",
      marginRight: "10",
      displayHeader: plugin.settings.displayHeader ?? true,
      displayFooter: plugin.settings.displayHeader ?? true,
      cssSnippet: "0",
      ...(plugin.settings.prevConfig ?? {}),
    } as TConfig;
  }

  // ── Lifecycle ───────────────────────────────────────────

  onOpen() {
    this.contentEl.empty();
    this.containerEl.style.setProperty("--dialog-width", "60vw");
    this.titleEl.setText("Export to PDF");

    this.component = mount(ModalUI, {
      target: this.contentEl,
      props: {
        modal: this,
        plugin: this.plugin,
        config: this.config,
      },
    });
  }

  onClose() {
    if (this.component) {
      unmount(this.component);
      this.component = undefined;
    }
    this.contentEl.empty();
  }

  // ── File rendering ──────────────────────────────────────

  getFileCache(file: TFile) {
    return this.app.metadataCache.getFileCache(file);
  }

  async getAllFiles() {
    const app = this.plugin.app;
    const data: ParamType[] = [];
    const docs: DocType[] = [];
    if (this.file instanceof TFolder) {
      const files = traverseFolder(this.file);
      for (const file of files) {
        data.push({ app, file, config: this.config });
      }
    } else {
      const { doc, frontMatter, file } = await renderMarkdown({ app, file: this.file, config: this.config });
      docs.push({ doc, frontMatter, file });
      if (frontMatter.toc) {
        const files = this.parseToc(doc);
        for (const item of files) {
          data.push({ app, file: item.file, config: this.config, extra: item });
        }
      }
    }
    return { data, docs };
  }

  async renderFiles(data: ParamType[], docs?: DocType[], cb?: (i: number) => void) {
    const concurrency = safeParseInt(this.plugin.settings.concurrency) || 5;
    const limit = pLimit(concurrency);

    const inputs = data.map((param, i) =>
      limit(async () => {
        const res = await renderMarkdown(param);
        cb?.(i);
        return res;
      }),
    );
    let _docs = [...(docs ?? []), ...(await Promise.all(inputs))];

    if (this.file instanceof TFile) {
      const leaf = this.app.workspace.getLeaf();
      await leaf.openFile(this.file);
    }

    if (!this.multiplePdf) {
      _docs = this.mergeDoc(_docs);
    }
    this.docs = _docs.map(({ doc, ...rest }) => {
      return { ...rest, doc: fixDoc(doc, doc.title) };
    });
  }

  parseToc(doc: Document) {
    const cache = this.getFileCache(this.file as TFile);
    const files =
      cache?.links
        ?.map(({ link, displayText }) => {
          const id = crypto.randomUUID();
          const elem = doc.querySelector(`a[data-href="${link}"]`) as HTMLAnchorElement;
          if (elem) {
            elem.href = `#${id}`;
          }
          return {
            title: displayText,
            file: this.app.metadataCache.getFirstLinkpathDest(link, this.file.path) as TFile,
            id,
          };
        })
        .filter((item) => item.file instanceof TFile) ?? [];
    return files;
  }

  mergeDoc(docs: DocType[]) {
    const { doc: doc0, frontMatter, file } = docs[0];
    const sections = [];
    for (const { doc } of docs) {
      const element = doc.querySelector(".markdown-preview-view");
      if (element) {
        const section = doc0.createElement("section");
        Array.from(element.children).forEach((child) => {
          section.appendChild(doc0.importNode(child, true));
        });
        sections.push(section);
      }
    }
    const root = doc0.querySelector(".markdown-preview-view");
    if (root) {
      root.innerHTML = "";
    }
    sections.forEach((section) => {
      root?.appendChild(section);
    });
    return [{ doc: doc0, frontMatter, file }];
  }

  // ── Webview management ──────────────────────────────────

  calcPageSize(element?: HTMLDivElement, config?: TConfig) {
    const { pageSize, pageWidth } = config ?? this.config;
    const el = element ?? this.previewDiv;
    const width = PageSize?.[pageSize as string]?.[0] ?? safeParseFloat(pageWidth as string, 210);
    const scale = Math.floor((mm2px(width) / el.offsetWidth) * 100) / 100;
    this.webviews.forEach((wb) => {
      wb.style.transform = `scale(${1 / scale},${1 / scale})`;
      wb.style.width = `calc(${scale} * 100%)`;
      wb.style.height = `calc(${scale} * 100%)`;
    });
    this.scale = scale;
    return scale;
  }

  async calcWebviewSize() {
    await sleep(500);
    this.webviews.forEach(async (e) => {
      const [width, height] = await e.executeJavaScript("[document.body.offsetWidth, document.body.offsetHeight]");
      const sizeEl = e.parentNode?.querySelector(".print-size");
      if (sizeEl) {
        sizeEl.innerHTML = `${width}×${height}px\n${px2mm(width)}×${px2mm(height)}mm`;
      }
    });
  }

  async togglePrintSize() {
    document.querySelectorAll(".print-size")?.forEach((sizeEl: HTMLDivElement) => {
      sizeEl.style.visibility = this.config["pageSize"] == "Custom" ? "visible" : "hidden";
    });
  }

  makeWebviewJs(doc: Document) {
    return `
      document.body.innerHTML = decodeURIComponent(\`${encodeURIComponent(doc.body.innerHTML)}\`);
      document.head.innerHTML = decodeURIComponent(\`${encodeURIComponent(document.head.innerHTML)}\`);
      
      // Function to recursively decode and replace innerHTML of span.markdown-embed elements
      function decodeAndReplaceEmbed(element) {
				// Replace the innerHTML with the decoded content
        element.innerHTML = decodeURIComponent(element.innerHTML);
				// Check if the new content contains further span.markdown-embed elements
        const newEmbeds = element.querySelectorAll("span.markdown-embed");
        newEmbeds.forEach(decodeAndReplaceEmbed);
      }
      
      // Start the process with all span.markdown-embed elements in the document
      document.querySelectorAll("span.markdown-embed").forEach(decodeAndReplaceEmbed);

      document.body.setAttribute("class", \`${document.body.getAttribute("class")}\`)
      document.body.setAttribute("style", \`${document.body.getAttribute("style")}\`)
      document.body.addClass("theme-light");
      document.body.removeClass("theme-dark");
      document.title = \`${doc.title}\`;
      `;
  }

  async appendWebview(e: HTMLDivElement, doc: Document) {
    const webview = createWebview(this.scale);
    const preview = e.appendChild(webview);
    this.webviews.push(preview);
    this.preview = preview;
    preview.addEventListener("dom-ready", async () => {
      this.completed = true;
      getAllStyles().forEach(async (css) => {
        await preview.insertCSS(css);
      });
      if (this.config.cssSnippet && this.config.cssSnippet != "0") {
        try {
          const cssSnippet = await fs.readFile(this.config.cssSnippet, { encoding: "utf8" });
          const printCss = cssSnippet.replaceAll(/@media print\s*{([^}]+)}/g, "$1");
          await preview.insertCSS(printCss);
          await preview.insertCSS(cssSnippet);
        } catch (error) {
          console.warn(error);
        }
      }
      await preview.executeJavaScript(this.makeWebviewJs(doc));
      getPatchStyle().forEach(async (css) => {
        await preview.insertCSS(css);
      });
    });
  }

  async appendWebviews(el: HTMLDivElement, render = true) {
    el.empty();
    if (render) {
      const { data, docs } = await this.getAllFiles();
      this.initRenderStates?.(data);
      await this.renderFiles(data, docs, this.updateRenderStates);
    }
    el.empty();
    await Promise.all(
      this.docs?.map(async ({ doc }, i) => {
        if (this.multiplePdf) {
          el.createDiv({
            text: `${i + 1}-${doc.title}`,
            attr: { class: "filename" },
          });
        }
        const div = el.createDiv({ attr: { class: "webview-wrapper" } });
        div.createDiv({ attr: { class: "print-size" } });
        await this.appendWebview(div, doc);
      }),
    );
    await this.calcWebviewSize();
  }

  // ── Title toggle (called from Svelte UI) ───────────────

  toggleTitle(value: boolean) {
    this.webviews.forEach((wv, i) => {
      wv.executeJavaScript(`
        var _title = document.querySelector("h1.__title__");
        if (_title) {
          _title.style.display = "${value ? "block" : "none"}";
        }
      `);
      const _title = this.docs[i]?.doc?.querySelector("h1.__title__") as HTMLHeadingElement;
      if (_title) {
        _title.style.display = value ? "block" : "none";
      }
    });
  }

  // ── Page size change (called from Svelte UI) ───────────

  async onPageSizeChange() {
    this.togglePrintSize();
    this.calcPageSize();
    await this.calcWebviewSize();
  }

  // ── CSS Snippet change (called from Svelte UI) ─────────

  async onCssSnippetChange() {
    await this.appendWebviews(this.previewDiv, false);
  }

  // ── Refresh preview (called from Svelte UI) ────────────

  async refreshPreview() {
    await this.appendWebviews(this.previewDiv);
  }

  // ── Export (called from Svelte UI) ─────────────────────

  async handleExport() {
    this.plugin.settings.prevConfig = this.config;
    await this.plugin.saveSettings();

    if (this.config["pageSize"] == "Custom") {
      if (!isNumber(this.config["pageWidth"] ?? "") || !isNumber(this.config["pageHeight"] ?? "")) {
        alert("When the page size is Custom, the Width/Height cannot be empty.");
        return;
      }
    }

    const title = (this.file as TFile)?.basename ?? this.file?.name;

    if (this.multiplePdf) {
      const outputPath = await getOutputPath(title);
      console.log("output:", outputPath);
      if (outputPath) {
        await Promise.all(
          this.webviews.map(async (wb, i) => {
            await exportToPDF(
              `${outputPath}/${this.docs[i].file.basename}.pdf`,
              { ...this.plugin.settings, ...this.config },
              wb,
              this.docs[i],
            );
          }),
        );
        this.close();
      }
    } else {
      const outputFile = await getOutputFile(title, this.plugin.settings.isTimestamp);
      if (outputFile) {
        await exportToPDF(outputFile, { ...this.plugin.settings, ...this.config }, this.webviews[0], this.docs[0]);
        this.close();
      }
    }
  }

  // ── CSS Snippets helper ─────────────────────────────────

  cssSnippets(): Record<string, string> {
    // @ts-ignore
    const { snippets, enabledSnippets } = this.app?.customCss ?? {};
    // @ts-ignore
    const basePath = this.app.vault.adapter.basePath;
    return Object.fromEntries(
      snippets
        ?.filter((item: string) => !enabledSnippets.has(item))
        .map((name: string) => {
          const file = path.join(basePath, ".obsidian/snippets", name + ".css");
          return [file, name];
        }),
    );
  }
}
