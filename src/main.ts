import * as fs from "fs/promises";
import * as os from "os";
import {
  App,
  Editor,
  MarkdownRenderer,
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
} from "obsidian";
import * as path from "path";

import { WebviewTag } from "electron";
import * as electron from "electron";
import { getHeadingTree, modifyHeadings } from "./utils";
import { generateOutlines, getHeadingPosition, setOutline } from "./pdf";
import { PDFDocument } from "pdf-lib";
// Remember to rename these classes and interfaces!

interface BetterExportPdfPluginSettings {
  mySetting: string;
}

const DEFAULT_SETTINGS: BetterExportPdfPluginSettings = {
  mySetting: "default",
};

export default class BetterExportPdfPlugin extends Plugin {
  settings: BetterExportPdfPluginSettings;

  async onload() {
    await this.loadSettings();

    // This creates an icon in the left ribbon.
    const ribbonIconEl = this.addRibbonIcon("dice", "Sample Plugin", (evt: MouseEvent) => {
      // Called when the user clicks the icon.
      new Notice("This is a notice!");
    });
    // Perform additional things with the ribbon
    ribbonIconEl.addClass("my-plugin-ribbon-class");

    // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
    const statusBarItemEl = this.addStatusBarItem();
    statusBarItemEl.setText("Status Bar Text");

    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: "open-sample-modal-simple",
      name: "Open sample modal (simple)",
      callback: () => {
        new ExportConfigModal(this.app).open();
      },
    });
    // This adds an editor command that can perform some operation on the current editor instance
    this.addCommand({
      id: "sample-editor-command",
      name: "Sample editor command",
      editorCallback: (editor: Editor, view: MarkdownView) => {
        console.log(editor.getSelection());
        editor.replaceSelection("Sample Editor Command");
      },
    });
    // This adds a complex command that can check whether the current state of the app allows execution of the command
    this.addCommand({
      id: "open-sample-modal-complex",
      name: "Open sample modal (complex)",
      checkCallback: (checking: boolean) => {
        // Conditions to check
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (markdownView) {
          // If checking is true, we're simply "checking" if the command can be run.
          // If checking is false, then we want to actually perform the operation.
          if (!checking) {
            new ExportConfigModal(this.app).open();
          }

          // This command will only show up in Command Palette when the check function returns true
          return true;
        }
      },
    });

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new ConfigSettingTab(this.app, this));

    // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
    // Using this function will automatically remove the event listener when this plugin is disabled.
    this.registerDomEvent(document, "click", (evt: MouseEvent) => {
      console.log("click", evt);
    });

    // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
    this.registerInterval(window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000));

    // Register the Export As HTML button in the file menu
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file: TFile) => {
        menu.addItem((item) => {
          item
            .setTitle("Export to PDF")
            .setIcon("download")
            .setSection("export")
            .onClick(async () => {
              new ExportConfigModal(this.app, async (config: TConfig) => {
                try {
                  await this.exportToPDF(file, config);
                } catch (error) {
                  console.error(error);
                } finally {
                  document.querySelectorAll("webview").forEach((node) => {
                    console.log("webview");
                    if (process.argv[2] === "production") {
                      node.parentNode?.removeChild(node);
                    }
                  });
                }
              }).open();
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

  async exportToPDF(file: TFile, config: TConfig) {
    console.log("export to pdf:", config);

    const printOptions: electron.PrintToPDFOptions = { ...config, scale: config["scale"] / 100 };

    if (config.marginType == "3") {
      // Custom Margin
      printOptions["margins"] = {
        top: parseInt(config["marginTop"] ?? "0"),
        bottom: parseInt(config["marginBottom"] ?? "0"),
        left: parseInt(config["marginLeft"] ?? "0"),
        right: parseInt(config["marginRight"] ?? "0"),
      };
    }

    // @ts-ignore
    const result = await electron.remote.dialog.showSaveDialog({
      title: "Export to PDF",
      defaultPath: file.basename + ".pdf",
      filters: [
        { name: "All Files", extensions: ["*"] },
        { name: "PDF", extensions: ["pdf"] },
      ],
      properties: ["showOverwriteConfirmation", "createDirectory"],
    });

    if (result.canceled) {
      return;
    }

    const outputFile = result.filePath;

    const tempRoot = path.join(os.tmpdir(), "Obdisian");
    try {
      await fs.mkdir(tempRoot, { recursive: true });
    } catch (error) {
      /* empty */
    }

    const tempPath = await fs.mkdtemp(path.join(tempRoot, "export"));
    try {
      await fs.mkdir(tempPath, { recursive: true });
    } catch (error) {
      /* empty */
    }

    const view = this.app.workspace.getActiveViewOfType(MarkdownView) as MarkdownView;

    const preview = view.previewMode;
    // @ts-ignore
    preview.renderer.showAll = true;
    // @ts-ignore
    await preview.renderer.unfoldAllHeadings();

    const webview = document.createElement("webview");

    const doc = await this.renderFile(file, tempPath);

    console.log(file);

    const tempFile = path.join(tempPath, "index.html");
    console.log("temp html file:", tempFile);
    await fs.writeFile(tempFile, `<html>${doc.documentElement.innerHTML}</html>`);

    webview.src = `file:///${tempFile}`;
    webview.nodeintegration = true;

    let completed = false;
    document.body.appendChild(webview);
    webview.addEventListener("dom-ready", (e) => {
      console.log("dom-ready");
      completed = true;
    });

    await waitFor(() => completed);

    const w = document.querySelector("webview:last-child") as WebviewTag;
    console.log("webviewID", w.getWebContentsId());
    // w.openDevTools();
    await sleep(5000); // 5s
    try {
      let data = await w.printToPDF(printOptions);

      const pdfDoc = await PDFDocument.load(data);
      const posistions = await getHeadingPosition(pdfDoc);
      const headings = await getHeadingTree(doc);

      const outlines = generateOutlines(headings, posistions);

      setOutline(pdfDoc, outlines);
      data = await pdfDoc.save();
      await fs.writeFile(outputFile, data);

      if (config.open) {
        // @ts-ignore
        electron.remote.shell.openPath(outputFile);
      }
    } catch (error) {
      console.log(error);
    }
    console.log("finished");
  }

  async renderMarkdown(file: TFile) {
    const workspace = this.app.workspace;
    console.log("workspace:", workspace);

    const view = this.app.workspace.getActiveViewOfType(MarkdownView) as MarkdownView;
    const leaf = workspace.getLeaf("window");

    console.log("leaf:", leaf);
    await leaf.openFile(file, { active: true });
    // @ts-ignore
    await waitFor(() => leaf?.view.previewMode, 2000);

    // const view = leaf.view as MarkdownView;
    console.log("view:", view);
    console.log("data:", view.data);

    // @ts-ignore
    await view.setMode(view.modes["preview"]);

    const preview = view.previewMode;
    console.log("====preview:", preview);

    // @ts-ignore
    preview.renderer.showAll = true;
    // @ts-ignore
    await preview.renderer.unfoldAllHeadings();

    // @ts-ignore
    let lastRender = preview.renderer.lastRender;
    // @ts-ignore
    preview.renderer.rerender(true);
    let isRendered = false;
    // @ts-ignore
    preview.renderer.onRendered(() => {
      isRendered = true;
    });

    await waitFor(
      // @ts-ignore
      () => preview.renderer.lastRender != lastRender && isRendered,
      10 * 1000,
    );
    // @ts-ignore
    const container = preview.containerEl;
    console.log("html:", container.innerHTML);

    // await waitFor(() => {
    //   // @ts-ignore
    //   const currRender = preview.renderer.lastRender;
    //   if (currRender == lastRender) {
    //     return true;
    //   }
    //   lastRender = currRender;
    //   return false;
    // });

    console.log("container:", container);
  }
  /**
   * 处理 body 正文内容 <body></body>
   * @param doc
   * @param file
   */
  async createBody(doc: Document, file: TFile) {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView) as MarkdownView;
    const renderNode = doc.createElement("div");
    await MarkdownRenderer.render(this.app, view.data, renderNode, file.path, view);
    Array.from(renderNode.attributes).forEach((attr) => {
      renderNode.removeAttribute(attr.name);
    });
    renderNode.className = "markdown-preview-view markdown-rendered";

    const printNode = document.createElement("div");
    printNode.className = "print"; // print-preview

    printNode.appendChild(renderNode);
    doc.body.appendChild(printNode);

    Array.from(document.body.attributes).forEach(({ name, value }) => {
      doc.body.setAttribute(name, value);
    });

    modifyHeadings(doc);
  }

  async renderFile(file: TFile, tempPath: string) {
    const doc = document.implementation.createHTMLDocument(file.basename);
    await this.createBody(doc, file);
    await this.createHead(doc, tempPath);
    return doc;
  }

  /**
   * 创建 <head></head>
   * @param title
   * @param container
   * @returns
   */
  async createHead(doc: Document, tempPath: string) {
    const cssTexts = this.getAllStyles(doc);
    // 样式补丁
    const stylePatch = `
		/* ---------- css patch ---------- */
    @media print {
    	.print .markdown-preview-view {
    		height: auto !important;
    	}

			.md-print-anchor {
				white-space: pre !important;
				border-left: none !important;
				border-right: none !important;
				border-top: none !important;
				border-bottom: none !important;
				display: inline-block !important;
				position: absolute !important;
				width: 1px !important;
				height: 1px !important;
				right: 0 !important;
				outline: 0 !important;
				background: 0 0 !important;
				text-decoration: initial !important;
				text-shadow: initial !important;
			}
    }
		`;
    cssTexts.push(stylePatch);
    const appCssFile = path.join(tempPath, "app.css");

    await fs.writeFile(appCssFile, cssTexts.join("\n"));

    const linkNode = doc.createElement("link");
    linkNode.href = "./app.css";
    linkNode.rel = "stylesheet";

    // 将 <style> 元素追加到 <head> 标签中
    doc.head.appendChild(linkNode);

    // app://xxx.js 相关内部 js
    this.getAppScripts().forEach((src) => {
      const script = doc.createElement("script");
      script.src = src;
      script.type = "text/javascript";
      doc.head.appendChild(script);
    });

    {
      // 本地预览html时是加载外部 mathjax 资源
      const mathjax1 = `<script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>`;
      const mathjax2 = `<script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3.0.1/es5/tex-mml-chtml.js"></script>`;

      const script1 = document.createElement("span");
      script1.innerHTML = mathjax1;
      doc.head.appendChild(script1);

      const script2 = document.createElement("span");
      script2.innerHTML = mathjax2;
      doc.head.appendChild(script2);
    }

    return doc;
  }

  postProcessHTML(doc: Document, html: HTMLElement) {
    // transclusions put a div inside a p tag, which is invalid html. Fix it here
    html.querySelectorAll("p:has(div)").forEach((element) => {
      // replace the p tag with a span
      const span = doc.createElement("span");
      span.innerHTML = element.innerHTML;
      element.replaceWith(span);
    });

    // encode all text input values into attributes
    html.querySelectorAll("input[type=text]").forEach((element: HTMLElement) => {
      // @ts-ignore
      element.setAttribute("value", element.value);
      // @ts-ignore
      element.value = "";
    });

    html.querySelectorAll("textarea").forEach((element: HTMLElement) => {
      // @ts-ignore
      element.textContent = element.value;
    });
  }
  getStyleTags() {
    return Array.from(document.getElementsByTagName("style")).map((style) => {
      return style.textContent || style.innerHTML;
    });
  }

  getAllStyles(doc: Document) {
    const cssTexts: string[] = [];

    Array.from(document.styleSheets).forEach((sheet) => {
      // @ts-ignore
      const id = sheet.ownerNode?.id;

      // <style id="svelte-xxx" ignore
      if (id?.startsWith("svelte-")) {
        return;
      }
      // @ts-ignore
      const href = sheet.ownerNode?.href;

      const division = `/* ----------${id ? `id:${id}` : href ? `href:${href}` : ""}---------- */`;
      if (id || href) {
        console.log(division);
      }
      cssTexts.push(division);

      Array.from(sheet.cssRules).forEach((rule) => {
        if (/^(@font-face|.CodeMirror|.cm-)/.test(rule.cssText)) {
          return;
        }
        // ignore not find css selector
        if (rule instanceof CSSStyleRule) {
          // mathjax not ignore
          if (id != "MJX-CHTML-styles" && rule?.selectorText && !doc.querySelector(rule?.selectorText)) {
            return;
          }
        }
        const cssText = rule.cssText
          .replaceAll(`url("public/`, `url("https://publish.obsidian.md/public/`)
          .replaceAll(`url("lib/`, `url("https://publish.obsidian.md/lib/`);
        cssTexts.push(cssText);
      });
    });

    return cssTexts;
  }
  async getAllScripts() {
    const scriptTags = document.scripts;
    const jsScripts = [];

    for (let i = 0; i < scriptTags.length; i++) {
      const scriptTag = scriptTags[i];
      const src = scriptTag.src;
      const content = scriptTag.textContent || scriptTag.innerHTML;

      if (src) {
        // 如果是外部脚本，获取脚本的 URL

        const scriptContent = await fetch(src).then((res) => res.text());
        jsScripts.push(scriptContent);
      } else {
        // 如果是内联脚本，获取脚本的内容
        jsScripts.push(content);
      }
    }
    return jsScripts;
  }
  getAppScripts() {
    return Array.from(document.scripts)
      .map((script) => script.src)
      .filter((src) => src?.startsWith("app://"));
  }

  async inlineMedia(doc: Document, file: TFile) {
    doc.querySelectorAll("img, audio, video").forEach(async (elem) => {
      const src = elem.getAttribute("src");
      if (!src?.startsWith("app:")) {
        return;
      }

      try {
        //@ts-ignore
        const filePath = this.app.vault.resolveFileUrl(src);
        let extension = file.extension;
        const base64 = await fs.readFile(filePath, { encoding: "base64" });

        //@ts-ignore
        const type = this.app.viewRegistry.typeByExtension[extension] ?? "audio";

        if (extension === "svg") extension += "+xml";

        elem.setAttribute("src", `data:${type}/${extension};base64,${base64}`);
      } catch (error) {
        console.log(error);
      }
    });
  }
  demo1() {
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
  }

  demo2() {
    const el = document.body.createDiv("print");

    const el2 = el.createDiv("markdown-preview-view markdown-rendered");

    el2.toggleClass("rtl", this.app.vault.getConfig("rightToLeft"));
    el2.toggleClass("show-frontmatter", this.app.vault.getConfig("showFrontmatter"));

    el2.createEl("h1", {
      text: "xxxxx", // a.basename
    });

    const renderText = ""; // MarkdownRenderer.render();

    // renderText = sanitize(renderText)
    const node = document.importNode(renderText, true);

    el2.appendChild(node);

    // el2.addClasses(tw(c)),

    wP.postProcess(o, {
      docId: wt(16),
      sourcePath: a.path,
      frontmatter: c,
      promises: p,
      addChild: function (e) {
        return t.addChild(e);
      },
      getSectionInfo: function () {
        return null;
      },
      containerEl: i,
      el: i,
      displayMode: !0,
    });
  }
}

interface TConfig {
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

class ExportConfigModal extends Modal {
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

class ConfigSettingTab extends PluginSettingTab {
  plugin: BetterExportPdfPlugin;

  constructor(app: App, plugin: BetterExportPdfPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Setting #1")
      .setDesc("It's a secret")
      .addText((text) =>
        text
          .setPlaceholder("Enter your secret")
          .setValue(this.plugin.settings.mySetting)
          .onChange(async (value) => {
            this.plugin.settings.mySetting = value;
            await this.plugin.saveSettings();
          }),
      );
  }
}

/**
 * 等待函数，轮询检查条件是否满足，可设置超时时间。
 * @param cond 条件函数，返回布尔值表示条件是否满足。
 * @param timeout 超时时间（可选，默认为0，表示没有超时时间限制）。
 * @returns 返回一个 Promise 对象，当条件满足时解决为 true，超时或发生错误时拒绝。
 */
function waitFor(cond: (...args: unknown[]) => boolean, timeout = 0) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const poll = () => {
      if (cond()) {
        resolve(true);
      } else if (timeout > 0 && Date.now() - startTime >= timeout) {
        reject(new Error("Timeout exceeded"));
      } else {
        setTimeout(poll, 500);
      }
    };

    poll();
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
