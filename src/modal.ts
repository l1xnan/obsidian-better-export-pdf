import { Modal, App, Setting, TFile } from "obsidian";
import * as electron from "electron";
import BetterExportPdfPlugin from "./main";
import { generateWebview, generateWebview1, getAllStyles, getAllStyles1 } from "./render";
import { editPDF, exportToPDF } from "./pdf";

type PageSizeType = electron.PrintToPDFOptions["pageSize"];

export interface TConfig {
  pageSise: PageSizeType;
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
  config: TConfig;
  canceled: boolean;
  callback: Callback;
  plugin: BetterExportPdfPlugin;
  file: TFile;

  constructor(plugin: BetterExportPdfPlugin, file: TFile, callback: Callback, config?: TConfig) {
    super(plugin.app);
    this.canceled = true;
    this.plugin = plugin;
    this.file = file;
    this.config =
      config ??
      ({
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
      } as TConfig);
    this.callback = callback;
  }

  async onOpen() {
    this.contentEl.empty();
    console.log(this.containerEl, this.contentEl);
    this.containerEl.style.setProperty("--dialog-width", "60vw");

    this.titleEl.setText("Export to PDF");
    let completed = false;
    let preview: Electron.WebviewTag;
    const wrapper = this.contentEl.createDiv();
    wrapper.setAttribute("style", "display: flex; flex-direction: row; height: 75vh;");

    const { webview, doc } = await generateWebview1(this.plugin, this.file, this.config);
    const appendWebview = async (e: HTMLDivElement) => {
      preview = e.appendChild(webview);
      webview.setAttribute("style", "height:100%;");
      webview.addEventListener("dom-ready", (e) => {
        console.log("dom-ready");
        webview.setZoomFactor(0.7);
        completed = true;
        getAllStyles1(document).forEach((css) => {
          webview.insertCSS(css);
        });
        webview.executeJavaScript(`
        document.body.innerHTML = \`${doc.body.innerHTML}\`;
        `);
      });
    };
    
    const previewDiv = wrapper.createDiv({ attr: { style: "flex:auto;" } }, async (e) => {
      e.empty();
      await appendWebview(e);
    });

    const contentEl = wrapper.createDiv();
    contentEl.setAttribute("style", "width:320px;margin-left:16px;");

    this.generateForm(contentEl);

    new Setting(contentEl).setHeading().addButton((button) => {
      button.setButtonText("Export").onClick(async () => {
        this.canceled = false;
        
        preview.executeJavaScript(`
        document.body.addClass("theme-light");
        document.body.removeClass("theme-dark");
        `);
        exportToPDF(this.file, this.config, preview, doc)
        this.close();
        // await this.callback(this.config);
      });

      button.buttonEl.style.marginRight = "auto";
      button.buttonEl.style.marginLeft = "auto";
      button.buttonEl.style.width = "-webkit-fill-available";
    });
    new Setting(contentEl).setHeading().addButton((button) => {
      button.setButtonText("Debug").onClick(async () => {
        preview?.openDevTools();
      });
      button.buttonEl.style.marginRight = "auto";
      button.buttonEl.style.marginLeft = "auto";
      button.buttonEl.style.width = "-webkit-fill-available";
    });
    new Setting(contentEl).setHeading().addButton((button) => {
      button.setButtonText("Refresh").onClick(async () => {
        previewDiv.empty();
        await appendWebview(previewDiv);
      });
      button.buttonEl.style.marginRight = "auto";
      button.buttonEl.style.marginLeft = "auto";
      button.buttonEl.style.width = "-webkit-fill-available";
    });
  }

  private generateForm(contentEl: HTMLDivElement) {
    new Setting(contentEl).setName("Add filename as title").addToggle((toggle) =>
      toggle
        .setTooltip("Add filename as title")
        .setValue(true)
        .onChange(async (value) => {
          this.config["showTitle"] = value;
        }),
    );
    const pageSizes: PageSizeType[] = [
      "A0",
      "A1",
      "A2",
      "A3",
      "A4",
      "A5",
      "A6",
      "Legal",
      "Letter",
      "Tabloid",
      "Ledger",
    ];
    new Setting(contentEl).setName("Page size").addDropdown((dropdown) => {
      dropdown
        .addOptions(Object.fromEntries(pageSizes.map((size) => [size, size])))
        .setValue(this.config.pageSise as string)
        .onChange(async (value: string) => {
          this.config["pageSise"] = value as PageSizeType;
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
          this.config["marginType"] = value;
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
        text.inputEl.style.width = "100px";
        text
          .setPlaceholder("margin top")
          .setValue(this.config["marginTop"] as string)
          .onChange((value) => {
            this.config["marginTop"] = value;
          });
      })
      .addText((text) => {
        text.inputEl.style.width = "100px";
        text
          .setPlaceholder("margin bottom")
          .setValue(this.config["marginBottom"] as string)
          .onChange((value) => {
            this.config["marginBottom"] = value;
          });
      });
    topEl.settingEl.hidden = true;
    const btmEl = new Setting(contentEl)
      .setName("Left/Right")
      .addText((text) => {
        text.inputEl.style.width = "100px";
        text
          .setPlaceholder("margin left")
          .setValue(this.config["marginLeft"] as string)
          .onChange((value) => {
            this.config["marginLeft"] = value;
          });
      })
      .addText((text) => {
        text.inputEl.style.width = "100px";
        text
          .setPlaceholder("margin right")
          .setValue(this.config["marginRight"] as string)
          .onChange((value) => {
            this.config["marginRight"] = value;
          });
      });
    btmEl.settingEl.hidden = true;

    new Setting(contentEl).setName("Downscale precent").addSlider((slider) => {
      slider
        .setLimits(0, 100, 1)
        .setValue(this.config["scale"] as number)
        .onChange(async (value) => {
          this.config["scale"] = value;
          slider.showTooltip();
        });
    });
    new Setting(contentEl).setName("Landscape").addToggle((toggle) =>
      toggle
        .setTooltip("landscape")
        .setValue(this.config["landscape"])
        .onChange(async (value) => {
          this.config["landscape"] = value;
        }),
    );
    new Setting(contentEl).setName("Open after export").addToggle((toggle) =>
      toggle
        .setTooltip("Open the exported file after exporting.")
        .setValue(this.config["open"])
        .onChange(async (value) => {
          this.config["open"] = value;
        }),
    );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
