import * as electron from "electron";
const fs = require("fs").promises;
import { type FrontMatterCache, Modal, TFile, TFolder } from "obsidian";
import path from "path";
import { mount, unmount } from "svelte";
import i18n, { type Lang } from "./i18n";
import type BetterExportPdfPlugin from "./main";
import { renderMarkdown, type ParamType } from "./render";
import { traverseFolder } from "./utils";
import ModalUI from "./components/ModalUI.svelte";

export type PageSizeType = electron.PrintToPDFOptions["pageSize"];

export interface ExportConfigType {
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
  autoNumberHeadings?: boolean;

  multiple?: boolean;
}

export type DocType = { doc: Document | HTMLDivElement; frontMatter?: FrontMatterCache; file: TFile };
export type DocV2Type = {
  doc: HTMLDivElement;
  frontMatter: FrontMatterCache;
  file: TFile;
  cleanup: () => void;
};

export type FileListType = {
  file: TFile;
  toc?: boolean;
}[];

export class ExportConfigModal extends Modal {
  defaultConfig: ExportConfigType;
  plugin: BetterExportPdfPlugin;
  file: TFile | TFolder;
  multiplePdf?: boolean;

  i18n: Lang;

  // Svelte component instance
  private component?: ModalUI;

  constructor(plugin: BetterExportPdfPlugin, file: TFile | TFolder, multiplePdf?: boolean) {
    super(plugin.app);
    this.plugin = plugin;
    this.file = file;
    this.i18n = i18n.current;
    this.multiplePdf = multiplePdf;

    this.defaultConfig = {
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
      autoNumberHeadings: plugin.settings.autoNumberHeadings ?? false,
      ...(plugin.settings.prevConfig ?? {}),
    } as ExportConfigType;
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
      },
    }) as unknown as ModalUI;
  }

  onClose() {
    if (this.component) {
      unmount(this.component);
      this.component = undefined;
    }
    this.contentEl.empty();
    document.querySelectorAll(".print").forEach((el) => el.remove());
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
        data.push({ app, file });
      }
    } else {
      const { doc, frontMatter, file } = await renderMarkdown({ app, file: this.file, config: this.defaultConfig });
      docs.push({ doc, frontMatter, file });
      if (frontMatter.toc) {
        const files = this.parseToc(doc);
        for (const item of files) {
          data.push({ app, file: item.file, extra: item });
        }
      }
    }
    return { data, docs };
  }

  async getAllFilesV2() {
    const data: FileListType = [];
    if (this.file instanceof TFolder) {
      const files = traverseFolder(this.file);
      for (const file of files) {
        data.push({ file });
      }
    } else {
      const { frontmatter, links } = this.getFileCache(this.file) ?? {};
      data.push({ file: this.file, toc: frontmatter?.toc });
      if (frontmatter?.toc && links) {
        for (const link of links) {
          const file = this.app.metadataCache.getFirstLinkpathDest(link.link, this.file.path) as TFile;
          if (file instanceof TFile) {
            data.push({ file });
          }
        }
      }
    }
    return { data, multiplePdf: this.multiplePdf };
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
        const doc0doc = doc0 as Document;
        const section = doc0doc.createElement("section");
        Array.from(element.children).forEach((child) => {
          section.appendChild(doc0doc.importNode(child, true));
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
    return [{ doc: doc0, frontMatter, file, node: root }];
  }

  mergeDocV2(docs: DocV2Type[]): DocV2Type[] {
    const printEl = document.body.createDiv("print");

    for (const { doc } of docs) {
      const viewEl = doc.querySelector(".markdown-preview-view");
      if (viewEl) {
        printEl.appendChild(viewEl);
      }
      document.body.removeChild(doc);
    }
    return [{ ...docs[0], doc: printEl }];
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
