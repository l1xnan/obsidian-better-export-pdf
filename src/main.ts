import { MarkdownView, Plugin, TFile, TFolder } from "obsidian";
import { ExportConfigModal, TConfig } from "./modal";
import ConfigSettingTab from "./setting";

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

  debug: boolean;
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
};

export default class BetterExportPdfPlugin extends Plugin {
  settings: BetterExportPdfPluginSettings;

  async onload() {
    await this.loadSettings();

    this.registerCommand();
    this.registerSetting();
    this.registerEvents();
  }

  registerCommand() {
    this.addCommand({
      id: "export-current-file-to-pdf",
      name: "Export current file to PDF",
      checkCallback: (checking: boolean) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        const file = view?.file;
        if (!file) {
          return false;
        }
        if (checking) {
          return true;
        }
        new ExportConfigModal(this, file, this.settings?.prevConfig).open();

        return true;
      },
    });
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
              new ExportConfigModal(this, file, this.settings?.prevConfig).open();
            });
        });
      }),
    );
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
