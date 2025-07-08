import { App, PluginSettingTab, Setting, TextAreaComponent } from "obsidian";
import i18n, { type Lang } from "./i18n";
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
  i18n: Lang;

  constructor(app: App, plugin: BetterExportPdfPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.i18n = i18n.current;
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

    new Setting(containerEl).setName(this.i18n.settings.showTitle).addToggle((toggle) =>
      toggle
        .setTooltip(this.i18n.settings.showTitle)
        .setValue(this.plugin.settings.showTitle)
        .onChange(async (value) => {
          this.plugin.settings.showTitle = value;
          this.plugin.saveSettings();
        }),
    );
    new Setting(containerEl).setName(this.i18n.settings.displayHeader).addToggle((toggle) =>
      toggle
        .setTooltip("Display header")
        .setValue(this.plugin.settings.displayHeader)
        .onChange(async (value) => {
          this.plugin.settings.displayHeader = value;
          this.plugin.saveSettings();
        }),
    );
    new Setting(containerEl).setName(this.i18n.settings.displayFooter).addToggle((toggle) =>
      toggle
        .setTooltip("Display footer")
        .setValue(this.plugin.settings.displayFooter)
        .onChange(async (value) => {
          this.plugin.settings.displayFooter = value;
          this.plugin.saveSettings();
        }),
    );

    new Setting(containerEl)
      .setName(this.i18n.settings.printBackground)
      .setDesc("Whether to print background graphics")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.printBackground).onChange(async (value) => {
          this.plugin.settings.printBackground = value;
          this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Generate tagged PDF")
      .setDesc(
        "Whether or not to generate a tagged (accessible) PDF. Defaults to false. As this property is experimental, the generated PDF may not adhere fully to PDF/UA and WCAG standards.",
      )
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.generateTaggedPDF).onChange(async (value) => {
          this.plugin.settings.generateTaggedPDF = value;
          this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl).setName(this.i18n.settings.maxLevel).addDropdown((dropdown) => {
      dropdown
        .addOptions(Object.fromEntries(["1", "2", "3", "4", "5", "6"].map((level) => [level, `h${level}`])))
        .setValue(this.plugin.settings.maxLevel)
        .onChange(async (value: string) => {
          this.plugin.settings.maxLevel = value;
          this.plugin.saveSettings();
        });
    });

    new Setting(containerEl)
      .setName(this.i18n.settings.displayMetadata)
      .setDesc("Add frontMatter(title, author, keywords, subject creator, etc) to pdf metadata")
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
      .setName(this.i18n.settings.headerTemplate)
      .setDesc(
        "HTML template for the print header. " +
          "Should be valid HTML markup with following classes used to inject printing values into them: " +
          'date (formatted print date), title (document title), url (document location), pageNumber (current page number) and totalPages (total pages in the document). For example, <span class="title"></span> would generate span containing the title.',
      );
    const hederContentArea = new TextAreaComponent(headerContentAreaSetting.controlEl);

    setAttributes(hederContentArea.inputEl, {
      style: "margin-top: 12px; width: 100%; height: 6vh;",
    });
    hederContentArea.setValue(this.plugin.settings.headerTemplate).onChange(async (value) => {
      this.plugin.settings.headerTemplate = value;
      this.plugin.saveSettings();
    });

    const footerContentAreaSetting = new Setting(containerEl);
    footerContentAreaSetting.settingEl.setAttribute("style", "display: grid; grid-template-columns: 1fr;");
    footerContentAreaSetting
      .setName(this.i18n.settings.footerTemplate)
      .setDesc("HTML template for the print footer. Should use the same format as the headerTemplate.");
    const footerContentArea = new TextAreaComponent(footerContentAreaSetting.controlEl);

    setAttributes(footerContentArea.inputEl, {
      style: "margin-top: 12px; width: 100%; height: 6vh;",
    });
    footerContentArea.setValue(this.plugin.settings.footerTemplate).onChange(async (value) => {
      this.plugin.settings.footerTemplate = value;
      this.plugin.saveSettings();
    });

    new Setting(containerEl)
      .setName(this.i18n.settings.isTimestamp)
      .setDesc("Add timestamp to output file name")
      .addToggle((cb) => {
        cb.setValue(this.plugin.settings.isTimestamp).onChange(async (value) => {
          this.plugin.settings.isTimestamp = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(this.i18n.settings.enabledCss)
      .setDesc("Select the css snippet that are not enabled")
      .addToggle((cb) => {
        cb.setValue(this.plugin.settings.enabledCss).onChange(async (value) => {
          this.plugin.settings.enabledCss = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(this.i18n.settings.concurrency)
      .setDesc("Limit the number of concurrent renders")
      .addText((cb) => {
        const concurrency = this.plugin.settings?.concurrency;
        cb.setValue(concurrency?.length > 0 ? concurrency : "5").onChange(async (value) => {
          this.plugin.settings.concurrency = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl).setName("Debug").setHeading();
    new Setting(containerEl)
      .setName(this.i18n.settings.debugMode)
      .setDesc("This is useful for troubleshooting.")
      .addToggle((cb) => {
        cb.setValue(this.plugin.settings.debug).onChange(async (value) => {
          this.plugin.settings.debug = value;
          await this.plugin.saveSettings();
        });
      });
  }
}
