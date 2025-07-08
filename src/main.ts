import { App, MarkdownView, Menu, Plugin, type PluginManifest, TFile, TFolder } from "obsidian";
import i18n, { type Lang } from "./i18n";
import { ExportConfigModal, type TConfig } from "./modal";
import ConfigSettingTab from "./setting";
import { traverseFolder } from "./utils";
import * as fs from "fs/promises";
import path from "path";

const isDev = process.env.NODE_ENV === "development";

export interface BetterExportPdfPluginSettings {
  prevConfig?: TConfig;

  showTitle: boolean;
  maxLevel: string;

  displayHeader: boolean;
  displayFooter: boolean;
  headerTemplate: string;
  footerTemplate: string;

  printBackground: boolean;
  generateTaggedPDF: boolean;

  displayMetadata: boolean;

  isTimestamp: boolean;
  debug: boolean;
  enabledCss: boolean;
  concurrency: string;
}

const DEFAULT_SETTINGS: BetterExportPdfPluginSettings = {
  showTitle: true,
  maxLevel: "6",

  displayHeader: true,
  displayFooter: true,
  headerTemplate: `<div style="width: 100vw;font-size:10px;text-align:center;"><span class="title"></span></div>`,
  footerTemplate: `<div style="width: 100vw;font-size:10px;text-align:center;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>`,

  printBackground: false,
  generateTaggedPDF: false,

  displayMetadata: false,
  debug: false,
  isTimestamp: false,
  enabledCss: false,
  concurrency: "5",
};

export default class BetterExportPdfPlugin extends Plugin {
  settings: BetterExportPdfPluginSettings;
  i18n: Lang;

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
    this.i18n = i18n.current;
  }

  async onload() {
    await this.loadSettings();

    this.registerCommand();
    this.registerSetting();
    this.registerEvents();
  }

  registerCommand() {
    this.addCommand({
      id: "export-current-file-to-pdf",
      name: this.i18n.exportCurrentFile,
      checkCallback: (checking: boolean) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        const file = view?.file;
        if (!file) {
          return false;
        }
        if (checking) {
          return true;
        }
        new ExportConfigModal(this, file).open();

        return true;
      },
    });
    // this.addCommand({
    //   id: "better-export-pdf:with-prev-setting",
    //   name: this.i18n.exportCurrentFileWithPrevious,
    //   checkCallback: (checking: boolean) => {
    //     const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    //     const file = view?.file;
    //     if (!file) {
    //       return false;
    //     }
    //     if (checking) {
    //       return true;
    //     }
    //     new ExportConfigModal(this, file, this.settings?.prevConfig).open();

    //     return true;
    //   },
    // });
  }

  registerSetting() {
    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new ConfigSettingTab(this.app, this));
  }

  registerEvents() {
    // Register the Export As HTML button in the file menu
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file: TFile | TFolder) => {
        let title = file instanceof TFolder ? "Export folder to PDF" : "Better Export PDF";
        if (isDev) {
          title = `${title} (dev)`;
        }

        menu.addItem((item) => {
          item
            .setTitle(title)
            .setIcon("download")
            .setSection("action")
            .onClick(async () => {
              new ExportConfigModal(this, file).open();
            });
        });
      }),
    );
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file: TFile | TFolder) => {
        if (file instanceof TFolder) {
          let title = "Export to PDF...";
          if (isDev) {
            title = `${title} (dev)`;
          }
          menu.addItem((item) => {
            item.setTitle(title).setIcon("lucide-folder-down").setSection("action");
            // @ts-ignore
            const subMenu: Menu = item.setSubmenu();
            subMenu.addItem((item) =>
              item
                .setTitle("Export each file to PDF")
                .setIcon("lucide-file-stack")
                .onClick(async () => {
                  new ExportConfigModal(this, file, true).open();
                }),
            );
            subMenu.addItem((item) =>
              item
                .setTitle("Generate TOC.md file")
                .setIcon("lucide-file-text")
                .onClick(async () => {
                  await this.generateToc(file);
                }),
            );
          });
        }
      }),
    );
  }

  async generateToc(root: TFolder | TFile) {
    // @ts-ignore
    const basePath = this.app.vault.adapter.basePath;
    const toc = path.join(basePath, root.path, "_TOC_.md");
    const content = `---\ntoc: true\ntitle: ${root.name}\n---\n`;
    await fs.writeFile(toc, content);
    if (root instanceof TFolder) {
      const files = traverseFolder(root);
      for (const file of files) {
        if (file.name == "_TOC_.md") {
          continue;
        }
        await fs.appendFile(toc, `[[${file.path}]]\n`);
      }
    }
  }

  onunload() {}
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  changeConfig() {
    // @ts-ignore
    const theme = "obsidian" === this.app.vault?.getConfig("theme");
    if (theme) {
      document.body.addClass("theme-light");
      document.body.removeClass("theme-dark");
    }
    document.body.removeClass("theme-dark");
    const node = document.body.createDiv("print");

    const reset = function () {
      node.detach();
      if (theme) {
        document.body.removeClass("theme-light");
        document.body.addClass("theme-dark");
      }
      // t.hide();
    };
    node.addEventListener("click", reset);

    const el = document.body.createDiv("print");

    const el2 = el.createDiv("markdown-preview-view markdown-rendered");

    // @ts-ignore
    el2.toggleClass("rtl", this.app.vault.getConfig("rightToLeft"));
    // @ts-ignore
    el2.toggleClass("show-frontmatter", this.app.vault.getConfig("showFrontmatter"));

    el2.createEl("h1", {
      text: "xxxxx", // a.basename
    });
  }
}
