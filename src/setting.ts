import { App, PluginSettingTab, Setting, TextAreaComponent } from "obsidian";
import BetterExportPdfPlugin from "./main";
function setAttributes(element: HTMLTextAreaElement, attributes: { [x: string]: string }) {
  for (const key in attributes) {
    element.setAttribute(key, attributes[key]);
  }
}
export default class ConfigSettingTab extends PluginSettingTab {
  plugin: BetterExportPdfPlugin;

  constructor(app: App, plugin: BetterExportPdfPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    const headerContentAreaSetting = new Setting(containerEl);
    headerContentAreaSetting.settingEl.setAttribute("style", "display: grid; grid-template-columns: 1fr;");
    headerContentAreaSetting
      .setName("Header Template")
      .setDesc(
        "string (optional) - HTML template for the print header." +
          "Should be valid HTML markup with following classes used to inject printing values into them: " +
          "date (formatted print date), title (document title), url (document location), pageNumber (current page number) and totalPages (total pages in the document). For example, <span class=title></span> would generate span containing the title.",
      );
    const hederContentArea = new TextAreaComponent(headerContentAreaSetting.controlEl);

    setAttributes(hederContentArea.inputEl, {
      style: "margin-top: 12px; width: 100%;  height: 10vh;",
    });
    hederContentArea.setValue(this.plugin.settings.headerTemplate).onChange(async (value) => {
      this.plugin.settings.headerTemplate = value;
      this.plugin.saveSettings();
    });

    const footerContentAreaSetting = new Setting(containerEl);
    footerContentAreaSetting.settingEl.setAttribute("style", "display: grid; grid-template-columns: 1fr;");
    footerContentAreaSetting
      .setName("Footer Template")
      .setDesc("HTML template for the print footer. Should use the same format as the headerTemplate.");
    const footerContentArea = new TextAreaComponent(footerContentAreaSetting.controlEl);

    setAttributes(footerContentArea.inputEl, {
      style: "margin-top: 12px; width: 100%;  height: 10vh;",
    });
    footerContentArea.setValue(this.plugin.settings.footerTemplate).onChange(async (value) => {
      this.plugin.settings.footerTemplate = value;
      this.plugin.saveSettings();
    });

    new Setting(containerEl)
      .setName("Page number format")
      .setDesc("{page}: current page number, {pages}: total page numbers, examples: {page} / {pages}")
      .addText((text) =>
        text
          .setPlaceholder("{page}")
          .setValue(this.plugin.settings.pageFormat)
          .onChange(async (value) => {
            this.plugin.settings.pageFormat = value;
            await this.plugin.saveSettings();
          }),
      );
    new Setting(containerEl).setName("Footer bottom distance").addText((text) =>
      text
        .setPlaceholder("20")
        .setValue(this.plugin.settings.distance)
        .onChange(async (value) => {
          this.plugin.settings.distance = value;
          await this.plugin.saveSettings();
        }),
    );
  }
}
