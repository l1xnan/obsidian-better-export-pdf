import * as electron from "electron";
import { ButtonComponent, FrontMatterCache, Modal, Notice, Setting, TFile, TFolder, debounce } from "obsidian";
import { PageSize } from "./constant";
import BetterExportPdfPlugin from "./main";
import { exportToPDF, getOutputFile } from "./pdf";
import { createWebview, fixDoc, getAllStyles, getFrontMatter, getPatchStyle, renderMarkdown } from "./render";
import { mm2px, px2mm, traverseFolder } from "./utils";
import path from "path";
import * as fs from "fs/promises";

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
}

type Callback = (conf: TConfig) => void;

function fullWidthButton(button: ButtonComponent) {
  button.buttonEl.setAttribute("style", `margin: "0 auto"; width: -webkit-fill-available`);
}

function setInputWidth(inputEl: HTMLInputElement) {
  inputEl.setAttribute("style", `width: 100px;`);
}

export class ExportConfigModal extends Modal {
  config: TConfig;
  canceled: boolean;
  callback: Callback;
  plugin: BetterExportPdfPlugin;
  file: TFile | TFolder;
  preview: electron.WebviewTag;
  previewDiv: HTMLDivElement;
  completed: boolean;
  doc: Document;
  title: string;
  frontMatter: FrontMatterCache;

  constructor(plugin: BetterExportPdfPlugin, file: TFile | TFolder, config?: TConfig) {
    super(plugin.app);
    this.canceled = true;
    this.plugin = plugin;
    this.file = file;
    this.completed = false;
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
      ...(plugin.settings?.prevConfig ?? {}),
    } as TConfig;
  }

  getFileCache(file: TFile) {
    return this.app.metadataCache.getFileCache(file);
  }

  async renderFiles() {
    const app = this.plugin.app;

    const docs = [];
    if (this.file instanceof TFolder) {
      const files = traverseFolder(this.file);
      for (const file of files) {
        docs.push(await renderMarkdown(app, file, this.config));
        Object.assign(this.frontMatter, getFrontMatter(app, file));
      }
    } else {
      const doc0 = await renderMarkdown(app, this.file, this.config);
      docs.push(doc0);
      const matter = getFrontMatter(app, this.file);
      Object.assign(this.frontMatter, matter);
      if (matter.toc) {
        const cache = this.getFileCache(this.file as TFile);
        const files =
          cache?.links
            ?.map(({ link, displayText }) => {
              const id = crypto.randomUUID();
              const elem = doc0.querySelector(`a[data-href="${link}"]`) as HTMLAnchorElement;
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
        for (const item of files) {
          docs.push(await renderMarkdown(app, item.file, this.config, item));
          Object.assign(this.frontMatter, getFrontMatter(app, item.file));
        }
        const leaf = this.app.workspace.getLeaf();
        await leaf.openFile(this.file);
      }
    }
    this.doc = docs[0];
    if (docs.length > 1) {
      const sections = [];
      for (const doc of docs) {
        const element = doc.querySelector(".markdown-preview-view");

        if (element) {
          const section = this.doc.createElement("section");
          Array.from(element.children).forEach((child) => {
            section.appendChild(this.doc.importNode(child, true));
          });

          sections.push(section);
        }
      }
      const root = this.doc.querySelector(".markdown-preview-view");
      if (root) {
        root.innerHTML = "";
      }
      sections.forEach((section) => {
        root?.appendChild(section);
      });
    }

    fixDoc(this.doc, this.title);

    return this.doc;
  }

  calcPageSize(element?: HTMLDivElement, config?: TConfig) {
    const conf = config ?? this.config;
    const el = element ?? this.previewDiv;
    const width = PageSize?.[conf["pageSize"] as string]?.[0] ?? parseFloat(conf["pageWidth"] ?? "210");
    const scale = Math.floor((mm2px(width) / el.offsetWidth) * 100) / 100;
    if (this.preview) {
      this.preview.style.transform = `scale(${1 / scale},${1 / scale})`;
      this.preview.style.width = `calc(${scale} * 100%)`;
      this.preview.style.height = `calc(${scale} * 100%)`;
    }
  }

  async calcWebviewSize() {
    await sleep(500);
    const [width, height] = await this.preview.executeJavaScript(
      "[document.body.offsetWidth, document.body.offsetHeight]",
    );

    const sizeEl = document.querySelector("#print-size");
    if (sizeEl) {
      sizeEl.innerHTML = `${width}×${height}px\n${px2mm(width)}×${px2mm(height)}mm`;
    }
  }

  async togglePrintSize() {
    const sizeEl = document.querySelector("#print-size") as HTMLDivElement | undefined;
    if (sizeEl) {
      if (this.config["pageSize"] == "Custom") {
        sizeEl.style.visibility = "visible";
      } else {
        sizeEl.style.visibility = "hidden";
      }
    }
  }
  async appendWebview(e: HTMLDivElement, render = true) {
    if (render) {
      await this.renderFiles();
    }
    const webview = createWebview();
    this.preview = e.appendChild(webview);
    this.preview.addEventListener("dom-ready", async (e) => {
      this.completed = true;
      getAllStyles().forEach(async (css) => {
        await this.preview.insertCSS(css);
      });
      if (this.config.cssSnippet && this.config.cssSnippet != "0") {
        try {
          const cssSnippet = await fs.readFile(this.config.cssSnippet, { encoding: "utf8" });
          // remove `@media print { ... }`
          const printCss = cssSnippet.replaceAll(/@media print\s*{([^}]+)}/g, "$1");
          await this.preview.insertCSS(printCss);
          await this.preview.insertCSS(cssSnippet);
        } catch (error) {
          console.warn(error);
        }
      }
      await this.preview.executeJavaScript(`
      document.body.innerHTML = decodeURIComponent(\`${encodeURIComponent(this.doc.body.innerHTML)}\`);
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
      document.title = \`${this.title}\`;
      `);
      getPatchStyle().forEach(async (css) => {
        await this.preview.insertCSS(css);
      });
      this.calcWebviewSize();
    });
  }
  async onOpen() {
    this.contentEl.empty();
    this.containerEl.style.setProperty("--dialog-width", "60vw");

    this.titleEl.setText("Export to PDF");
    const wrapper = this.contentEl.createDiv();
    wrapper.setAttribute("style", "display: flex; flex-direction: row; height: 75vh;");

    const title = (this.file as TFile)?.basename ?? this.file?.name;
    this.frontMatter = { title };
    this.title = title;

    this.previewDiv = wrapper.createDiv({ attr: { style: "flex:auto; position:relative;" } }, async (el) => {
      el.empty();
      const resizeObserver = new ResizeObserver(() => {
        this.calcPageSize(el);
      });
      resizeObserver.observe(el);
      await this.appendWebview(el);
    });

    this.previewDiv.createDiv({
      attr: {
        id: "print-size",
        style:
          "position:absolute;right:8px;top:8px;z-index:99;font-size:0.75rem;white-space:pre-wrap;text-align:right;visibility:hidden;",
      },
    });
    this.togglePrintSize();

    const contentEl = wrapper.createDiv();
    contentEl.setAttribute("style", "width:320px;margin-left:16px;");
    contentEl.addEventListener("keyup", (event) => {
      if (event.key === "Enter") {
        handleExport();
      }
    });
    this.generateForm(contentEl);

    const handleExport = async () => {
      this.plugin.settings.prevConfig = this.config;
      await this.plugin.saveSettings();

      if (this.completed) {
        const outputFile = await getOutputFile(title, this.plugin.settings.isTimestamp);
        if (outputFile) {
          await exportToPDF(
            outputFile,
            { ...this.plugin.settings, ...this.config },
            this.preview,
            this.doc,
            this.frontMatter,
          );
          this.close();
        }
      } else {
        new Notice("dom not ready");
      }
    };

    new Setting(contentEl).setHeading().addButton((button) => {
      button.setButtonText("Export").onClick(handleExport);
      button.setCta();
      fullWidthButton(button);
    });

    new Setting(contentEl).setHeading().addButton((button) => {
      button.setButtonText("Refresh").onClick(async () => {
        this.previewDiv.empty();
        await this.appendWebview(this.previewDiv);
      });
      fullWidthButton(button);
    });

    const debugEl = new Setting(contentEl).setHeading().addButton((button) => {
      button.setButtonText("Debug").onClick(async () => {
        this.preview?.openDevTools();
      });
      fullWidthButton(button);
    });
    debugEl.settingEl.hidden = !this.plugin.settings.debug;
  }

  private generateForm(contentEl: HTMLDivElement) {
    new Setting(contentEl).setName("Include file name as title").addToggle((toggle) =>
      toggle
        .setTooltip("Include file name as title")
        .setValue(this.config["showTitle"])
        .onChange(async (value) => {
          this.config["showTitle"] = value;

          if (this.completed) {
            await this.renderFiles();
            this.preview?.executeJavaScript(`
            document.body.innerHTML = decodeURIComponent(\`${encodeURIComponent(this.doc.body.innerHTML)}\`);
            `);
          }
        }),
    );
    const pageSizes: (PageSizeType | "Custom")[] = [
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
      "Custom",
    ];
    new Setting(contentEl).setName("Page size").addDropdown((dropdown) => {
      dropdown
        .addOptions(Object.fromEntries(pageSizes.map((size) => [size, size])))
        .setValue(this.config.pageSize as string)
        .onChange(async (value: string) => {
          this.config["pageSize"] = value as PageSizeType;
          if (value == "Custom") {
            sizeEl.settingEl.hidden = false;
          } else {
            sizeEl.settingEl.hidden = true;
          }
          this.togglePrintSize();
          this.calcPageSize();
          await this.calcWebviewSize();
        });
    });

    const sizeEl = new Setting(contentEl)
      .setName("Width/Height")
      .addText((text) => {
        setInputWidth(text.inputEl);
        text
          .setPlaceholder("width")
          .setValue(this.config["pageWidth"] as string)
          .onChange(
            debounce(
              async (value) => {
                this.config["pageWidth"] = value;
                this.calcPageSize();
                await this.calcWebviewSize();
              },
              500,
              true,
            ),
          );
      })
      .addText((text) => {
        setInputWidth(text.inputEl);
        text
          .setPlaceholder("height")
          .setValue(this.config["pageHeight"] as string)
          .onChange((value) => {
            this.config["pageHeight"] = value;
          });
      });

    sizeEl.settingEl.hidden = this.config["pageSize"] !== "Custom";

    new Setting(contentEl)
      .setName("Margin")
      .setDesc("The unit is millimeters.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("0", "None")
          .addOption("1", "Default")
          .addOption("2", "Small")
          .addOption("3", "Custom")
          .setValue(this.config["marginType"])
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
        setInputWidth(text.inputEl);
        text
          .setPlaceholder("margin top")
          .setValue(this.config["marginTop"] as string)
          .onChange((value) => {
            this.config["marginTop"] = value;
          });
      })
      .addText((text) => {
        setInputWidth(text.inputEl);
        text
          .setPlaceholder("margin bottom")
          .setValue(this.config["marginBottom"] as string)
          .onChange((value) => {
            this.config["marginBottom"] = value;
          });
      });
    topEl.settingEl.hidden = this.config["marginType"] != "3";
    const btmEl = new Setting(contentEl)
      .setName("Left/Right")
      .addText((text) => {
        setInputWidth(text.inputEl);
        text
          .setPlaceholder("margin left")
          .setValue(this.config["marginLeft"] as string)
          .onChange((value) => {
            this.config["marginLeft"] = value;
          });
      })
      .addText((text) => {
        setInputWidth(text.inputEl);
        text
          .setPlaceholder("margin right")
          .setValue(this.config["marginRight"] as string)
          .onChange((value) => {
            this.config["marginRight"] = value;
          });
      });
    btmEl.settingEl.hidden = this.config["marginType"] != "3";

    new Setting(contentEl).setName("Downscale percent").addSlider((slider) => {
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

    new Setting(contentEl).setName("Display header").addToggle((toggle) =>
      toggle
        .setTooltip("Display header")
        .setValue(this.config["displayHeader"])
        .onChange(async (value) => {
          this.config["displayHeader"] = value;
        }),
    );

    new Setting(contentEl).setName("Display footer").addToggle((toggle) =>
      toggle
        .setTooltip("Display footer")
        .setValue(this.config["displayFooter"])
        .onChange(async (value) => {
          this.config["displayFooter"] = value;
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

    const snippets = this.cssSnippets();

    if (Object.keys(snippets).length > 0 && this.plugin.settings.enabledCss) {
      new Setting(contentEl).setName("CSS snippets").addDropdown((dropdown) => {
        dropdown
          .addOption("0", "Not select")
          .addOptions(snippets)
          .setValue(this.config["cssSnippet"] as string)
          .onChange(async (value: string) => {
            this.config["cssSnippet"] = value;
            this.previewDiv.empty();
            await this.appendWebview(this.previewDiv, false);
          });
      });
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

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
