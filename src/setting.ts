import { App, PluginSettingTab, Setting } from "obsidian";
import BetterExportPdfPlugin from "./main";

export default class ConfigSettingTab extends PluginSettingTab {
  plugin: BetterExportPdfPlugin;

  constructor(app: App, plugin: BetterExportPdfPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

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
