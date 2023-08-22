import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from "obsidian";
import { writeFile } from "fs/promises";

import { WebviewTag } from "electron";
import * as fs from "fs";
import * as path from "path";
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
        new SampleModal(this.app).open();
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
            new SampleModal(this.app).open();
          }

          // This command will only show up in Command Palette when the check function returns true
          return true;
        }
      },
    });

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new SampleSettingTab(this.app, this));

    // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
    // Using this function will automatically remove the event listener when this plugin is disabled.
    this.registerDomEvent(document, "click", (evt: MouseEvent) => {
      console.log("click", evt);
    });

    // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
    this.registerInterval(window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000));

    // Register the Export As HTML button in the file menu
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        menu.addItem((item) => {
          item
            .setTitle("Export to PDF")
            .setIcon("download")
            .setSection("export")
            .onClick(async () => {
              try {
                await this.exportToPDF(file as TFile);
              } catch (error) {
                console.error(error);
              } finally {
                document.querySelectorAll("webview").forEach((node) => {
                  console.log("webview");
                  node.parentNode?.removeChild(node);
                });
              }
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

  async exportToPDF(file: TFile) {
    console.log("click better export to pdf");
    // const markdown = getCurrentMarkdownContent();

    const workspace = this.app.workspace;
    console.log("workspace:", workspace);

    const view = this.app.workspace.getActiveViewOfType(MarkdownView) as MarkdownView;
    // const leaf = workspace.getLeaf("window");
    // console.log("leaf:", leaf);
    // await leaf.openFile(file, { active: false });

    // const view = leaf.view as MarkdownView;
    console.log("view:", view);
    console.log("data:", view.data);

    // // waitUntil(() => leaf != undefined && leaf.view?.previewMode, 2000, 10);
    const preview = view.previewMode;
    console.log("====preview:", preview);
    // @ts-ignore
    preview.renderer.showAll = true;
    // @ts-ignore
    await preview.renderer.unfoldAllHeadings();

    const container = preview.containerEl;

    // let lastRender = preview.renderer.lastRender;
    // preview.renderer.rerender(true);
    // let container = preview.containerEl;
    console.log("container:", container);
    if (container) {
      // postProcessHTML(file, container);
      // AssetHandler.loadMathjaxStyles();
      // return container.innerHTML;
    }
    console.log("html:", container.innerHTML);

    // console.log("previewMode:", previewMode);

    const webview = document.createElement("webview");

    const cssTexts = this.getAllStyles();

    const doc = document.implementation.createHTMLDocument(file.basename);

    // @ts-ignore
    const rootPath = path.join(this.app.vault.adapter.basePath, this.manifest.dir ?? "", "tmp");

    try {
      fs.mkdirSync(rootPath, { recursive: true });
    } catch (error) {
      /* empty */
    }
    const appCssFile = path.join(rootPath, "app.css");

    const cssContent = cssTexts.join("\n");
    try {
      const res = await writeFile(appCssFile, cssContent);
      console.log("write css:", res);
    } catch (error) {
      console.log(error);
    }
    // fs.writeFileSync(appCssFile, cssContent);

    const linkNode = doc.createElement("link");
    linkNode.href = "./app.css";
    linkNode.rel = "stylesheet";

    const stylePatch = `
		@media print {
			.markdown-reading-view {
				display: block !important;
			}
			.markdown-preview-view {
				overflow-y: visible !important;
			}
		}
		.markdown-preview-sizer {
			padding-bottom: 0 !important;
		}
		`;
    const styleElement = doc.createElement("style");
    styleElement.innerHTML = stylePatch;
    doc.head.appendChild(styleElement);

    // 将 <style> 元素追加到 <head> 标签中
    doc.head.appendChild(linkNode);

    // const mathjax1 = `<script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>`;
    // const mathjax2 = `<script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3.0.1/es5/tex-mml-chtml.js"></script>`;

    // const script1 = document.createElement("span");
    // script1.innerHTML = mathjax1;
    // doc.head.appendChild(script1);

    // const script2 = document.createElement("span");
    // script2.innerHTML = mathjax2;
    // doc.head.appendChild(script2);

    const node1 = doc.createElement("div");
    node1.className = "print";

    const node2 = doc.importNode(container, true);
    node1.appendChild(node2);

    doc.body.appendChild(node1);

    doc.querySelectorAll(".markdown-preview-sizer").forEach((item: HTMLElement) => {
      item.style.paddingBottom = "unnest";
    });

    // ====
    const fullhtml = doc.documentElement.innerHTML;

    const htmlFile = path.join(rootPath, "test.html");
    fs.writeFileSync(htmlFile, fullhtml);
    webview.src = `file:///${htmlFile}`;
    webview.nodeintegration = true;

    let completed = false;
    document.body.appendChild(webview);
    webview.addEventListener("dom-ready", (e) => {
      console.log("dom-ready");
      completed = true;
    });

    await waitFor(() => completed);
    // const scripts = this.getAllScripts()
    // console.log("scripts:", scripts);
    const w = document.querySelector("webview:last-child") as WebviewTag;
    console.log("webviewID", w.getWebContentsId());
    // w.openDevTools();
    await sleep(5000);
    try {
      const data = await w.printToPDF({
        pageSize: "A4",
        scale: 1,
        margins: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
      });
      const pdfFile = path.join(rootPath, "test.pdf");
      console.log("pdf-data:", pdfFile, data);
      fs.writeFileSync(pdfFile, data);
    } catch (error) {
      console.log(error);
    }
    console.log("finished");
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

  getAllStyles() {
    const cssTexts: string[] = [];

    Array.from(document.styleSheets).forEach((sheet) => {
      // @ts-ignore
      const id = sheet.ownerNode?.id;
      // @ts-ignore
      const href = sheet.ownerNode?.href;

      const division = `/* ----------${id ? `id:${id}` : href ? `href:${href}` : ""}---------- */`;
      if (id || href) {
        console.log(division);
      }
      cssTexts.push(division);

      Array.from(sheet.cssRules).forEach((rule) => {
        // if (rule.cssText.startsWith("@font-face")) continue;
        // if (rule.cssText.startsWith(".CodeMirror")) continue;
        // if (rule.cssText.startsWith(".cm-")) continue;

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
        const base64 = fs.readFileSync(filePath, { encoding: "base64" });

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

class SampleModal extends Modal {
  constructor(app: App) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.setText("Woah!");
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class SampleSettingTab extends PluginSettingTab {
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
