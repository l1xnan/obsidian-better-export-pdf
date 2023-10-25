import { Modal, App, Setting } from "obsidian";
import * as electron from "electron";
export interface TConfig {
  pageSise: electron.PrintToPDFOptions["pageSize"];
  marginType: string;
  open: boolean;
  landscape: boolean;
  scale: number;
  showTitle: boolean;

  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
}

type Callback = (conf: TConfig) => void;

export class ExportConfigModal extends Modal {
  result: TConfig;
  canceled: boolean;
  callback: Callback;

  constructor(app: App, callback: Callback) {
    super(app);
    this.canceled = true;
    this.result = {
      pageSise: "A4",
      marginType: "1",
      showTitle: true,
      open: true,
      scale: 100,
      landscape: false,
      marginTop: "0",
      marginBottom: "0",
      marginLeft: "0",
      marginRight: "0",
    };
    this.callback = callback;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.empty();

    this.titleEl.setText("Export to PDF");
    new Setting(contentEl).setName("Add filename as title").addToggle((toggle) =>
      toggle
        .setTooltip("Add filename as title")
        .setValue(true)
        .onChange(async (value) => {
          this.result["showTitle"] = value;
        }),
    );
    const pageSizes = ["A0", "A1", "A2", "A3", "A4", "A5", "A6", "Legal", "Letter", "Tabloid", "Ledger"];
    new Setting(contentEl).setName("Page size").addDropdown((dropdown) => {
      dropdown
        .addOptions(Object.fromEntries(pageSizes.map((size) => [size, size])))
        .setValue("A4")
        .onChange(async (value: string) => {
          // @ts-ignore
          this.result["pageSise"] = value;
        });
    });

    new Setting(contentEl).setName("Margin").addDropdown((dropdown) => {
      dropdown
        .addOption("0", "None")
        .addOption("1", "Default")
        .addOption("2", "Small")
        .addOption("3", "Custom")
        .setValue("1")
        .onChange(async (value: string) => {
          this.result["marginType"] = value;
          if (value == "3") {
            topEl.settingEl.hidden = false;
            btmEl.settingEl.hidden = false;
          } else {
            topEl.settingEl.hidden = true;
            btmEl.settingEl.hidden = true;
          }
        });
    });

    const topEl = new Setting(contentEl)
      .setName("Top/Bottom")
      .addText((text) => {
        text
          .setPlaceholder("margin top")
          .setValue("0")
          .onChange((value) => {
            this.result["marginTop"] = value;
          });
      })
      .addText((text) =>
        text
          .setPlaceholder("margin bottom")
          .setValue("0")
          .onChange((value) => {
            this.result["marginBottom"] = value;
          }),
      );
    topEl.settingEl.hidden = true;
    const btmEl = new Setting(contentEl)
      .setName("Left/Right")
      .addText((text) => {
        text
          .setPlaceholder("margin left")
          .setValue("0")
          .onChange((value) => {
            this.result["marginLeft"] = value;
          });
      })
      .addText((text) =>
        text
          .setPlaceholder("margin right")
          .setValue("0")
          .onChange((value) => {
            this.result["marginRight"] = value;
          }),
      );
    btmEl.settingEl.hidden = true;

    new Setting(contentEl).setName("Downscale precent").addSlider((slider) => {
      slider
        .setLimits(0, 100, 1)

        .setValue(100)
        .onChange(async (value) => {
          this.result["scale"] = value;
          slider.showTooltip();
        });
    });
    new Setting(contentEl).setName("Landscape").addToggle((toggle) =>
      toggle
        .setTooltip("landscape")
        .setValue(false)
        .onChange(async (value) => {
          this.result["landscape"] = value;
        }),
    );
    new Setting(contentEl).setName("Open after export").addToggle((toggle) =>
      toggle
        .setTooltip("Open the exported file after exporting.")
        .setValue(true)
        .onChange(async (value) => {
          this.result["open"] = value;
        }),
    );
    new Setting(contentEl).setHeading().addButton((button) => {
      button.setButtonText("Export").onClick(async () => {
        this.canceled = false;
        this.close();
        await this.callback(this.result);
      });

      button.buttonEl.style.marginRight = "auto";
      button.buttonEl.style.marginLeft = "auto";
      button.buttonEl.style.width = "-webkit-fill-available";
      button.buttonEl.style.marginBottom = "2em";
    });
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
