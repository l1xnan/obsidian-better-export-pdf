import { App, PluginSettingTab, Setting, TextAreaComponent } from "obsidian";
import BetterExportPdfPlugin from "./main";
function setAttributes(element: HTMLTextAreaElement, attributes: { [x: string]: string }) {
  for (const key in attributes) {
    element.setAttribute(key, attributes[key]);
  }
}

export const renderBuyMeACoffeeBadge = (contentEl: HTMLElement | DocumentFragment, width = 175) => {
  const linkEl = contentEl.createEl("a", {
    href: "https://www.buymeacoffee.com/l1xnan",
  });
  const imgEl = linkEl.createEl("img");
  imgEl.src =
    "https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=nathangeorge&button_colour=6a8696&font_colour=ffffff&font_family=Poppins&outline_colour=000000&coffee_colour=FFDD00";
  imgEl.alt = "Buy me a coffee";
  imgEl.width = width;
};

export default class ConfigSettingTab extends PluginSettingTab {
  plugin: BetterExportPdfPlugin;

  constructor(app: App, plugin: BetterExportPdfPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    const supportDesc = new DocumentFragment();
    supportDesc.createDiv({
      text: "Support the continued development of this plugin.",
    });
    new Setting(containerEl).setDesc(supportDesc);
    renderBuyMeACoffeeBadge(containerEl);

    new Setting(containerEl).setName("Add filename as title").addToggle((toggle) =>
      toggle
        .setTooltip("Add filename as title")
        .setValue(this.plugin.settings.showTitle)
        .onChange(async (value) => {
          this.plugin.settings.showTitle = value;
          this.plugin.saveSettings();
        }),
    );
    new Setting(containerEl).setName("Display header").addToggle((toggle) =>
      toggle
        .setTooltip("Display header")
        .setValue(this.plugin.settings.displayHeader)
        .onChange(async (value) => {
          this.plugin.settings.displayHeader = value;
          this.plugin.saveSettings();
        }),
    );
    new Setting(containerEl).setName("Display footer").addToggle((toggle) =>
      toggle
        .setTooltip("Display footer")
        .setValue(this.plugin.settings.displayFooter)
        .onChange(async (value) => {
          this.plugin.settings.displayFooter = value;
          this.plugin.saveSettings();
        }),
    );

    new Setting(containerEl)
      .setName("Print background")
      .setDesc("Whether to print background graphics")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.printBackground).onChange(async (value) => {
          this.plugin.settings.printBackground = value;
          this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Generate tagged PDF")
      .setDesc("Whether or not to generate a tagged (accessible) PDF. Defaults to false. As this property is experimental, the generated PDF may not adhere fully to PDF/UA and WCAG standards.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.generateTaggedPDF).onChange(async (value) => {
          this.plugin.settings.generateTaggedPDF = value;
          this.plugin.saveSettings();
        }),
      );


			
    new Setting(containerEl).setName("Max headings level of the outline").addDropdown((dropdown) => {
      dropdown
        .addOptions(Object.fromEntries(["1", "2", "3", "4", "5", "6"].map((level) => [level, `h${level}`])))
        .setValue(this.plugin.settings.maxLevel)
        .onChange(async (value: string) => {
          this.plugin.settings.maxLevel = value;
          this.plugin.saveSettings();
        });
    });

    new Setting(containerEl)
      .setName("PDF metadata")
      .setDesc("Add frontMatter(title, author, keywords, subjectm creator, etc) to pdf metadata")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.displayMetadata).onChange(async (value) => {
          this.plugin.settings.displayMetadata = value;
          this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl).setName("Advanced").setHeading();

    const headerContentAreaSetting = new Setting(containerEl);
    headerContentAreaSetting.settingEl.setAttribute("style", "display: grid; grid-template-columns: 1fr;");
    headerContentAreaSetting
      .setName("Header Template")
      .setDesc(
        "HTML template for the print header." +
          "Should be valid HTML markup with following classes used to inject printing values into them: " +
          "date (formatted print date), title (document title), url (document location), pageNumber (current page number) and totalPages (total pages in the document). For example, <span class=title></span> would generate span containing the title.",
      );
    const hederContentArea = new TextAreaComponent(headerContentAreaSetting.controlEl);

    setAttributes(hederContentArea.inputEl, {
      style: "margin-top: 12px; width: 100%;  height: 6vh;",
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
      style: "margin-top: 12px; width: 100%;  height: 6vh;",
    });
    footerContentArea.setValue(this.plugin.settings.footerTemplate).onChange(async (value) => {
      this.plugin.settings.footerTemplate = value;
      this.plugin.saveSettings();
    });

    new Setting(containerEl).setName("Debug").setHeading();
    new Setting(containerEl)
      .setName("Debug mode")
      .setDesc("This is useful for troubleshooting.")
      .addToggle((cb) => {
        cb.setValue(this.plugin.settings.debug).onChange(async (value) => {
          this.plugin.settings.debug = value;
          await this.plugin.saveSettings();
        });
      });
  }
}
