import * as electron from "electron";
const fs = require("fs").promises;
import { type FrontMatterCache, Modal, TFile, TFolder } from "obsidian";
import path from "path";
import { mount, unmount } from "svelte";
import pLimit from "p-limit";

import i18n, { type Lang } from "./i18n";
import type BetterExportPdfPlugin from "./main";
import { fixDoc, renderMarkdown, type ParamType } from "./render";
import { safeParseInt, traverseFolder } from "./utils";
import ModalUI from "./components/ModalUI.svelte";

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

export class ExportConfigModal extends Modal {
  config: TConfig;
  plugin: BetterExportPdfPlugin;
  file: TFile | TFolder;
  multiplePdf?: boolean;

  docs: DocType[];
  i18n: Lang;

  // Svelte component instance
  private component?: ModalUI;

  constructor(plugin: BetterExportPdfPlugin, file: TFile | TFolder, multiplePdf?: boolean) {
    super(plugin.app);
    this.plugin = plugin;
    this.file = file;
    this.i18n = i18n.current;
    this.docs = [];
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
    this.titleEl.setText("Export to PDF2");

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
