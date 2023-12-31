import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";

import { MarkdownPreviewView, MarkdownRenderer, MarkdownView, Notice, TFile, loadMermaid } from "obsidian";
import { AyncFnType } from "./render";

import { SelectionType } from "./type";
import { modifyHeadings, waitFor } from "./utils";
import { TConfig } from "./modal";

import BetterExportPdfPlugin from "./main";

/**
 *
 * @deprecated
 */

export async function renderMarkdownView(preview: MarkdownPreviewView): Promise<HTMLElement | undefined> {
  // @ts-ignore
  const renderer = preview.renderer;
  // @ts-ignore
  await renderer.unfoldAllHeadings();
  // @ts-ignore
  await renderer.unfoldAllLists();
  // @ts-ignore
  await renderer.parseSync();

  // @ts-ignore
  if (!window.mermaid) {
    await loadMermaid();
  }

  const sections = renderer.sections as SelectionType[];

  const doc = document.implementation.createHTMLDocument("webview");

  const printEl = doc.body.createDiv("print");
  const viewEl = printEl.createDiv({
    cls: "markdown-preview-view markdown-rendered",
  });

  const promises: AyncFnType[] = [];

  for (const section of sections) {
    section.shown = true;
    section.rendered = false;
    // @ts-ignore
    section.resetCompute();
    // @ts-ignore
    section.setCollapsed(false);
    section.el.innerHTML = "";

    viewEl.appendChild(section.el);

    // @ts-ignore
    await section.render();

    await waitFor(() => section.el && section.rendered, 50);

    section.el.querySelectorAll(".language-mermaid").forEach(async (element: HTMLElement) => {
      const code = element.innerText;

      // @ts-ignore
      const { svg, bindFunctions } = await mermaid.render("mermaid-" + preview.docId + "-" + i, code);

      if (element.parentElement) {
        element.parentElement.outerHTML = `<div class="mermaid">${svg}</div>`;
        bindFunctions(element.parentElement);
      }
    });

    // @ts-ignore
    await renderer.measureSection(section);

    await waitFor(() => section.computed, 50);

    // @ts-ignore
    await preview.postProcess(section, promises, renderer.frontmatter);
  }

  await Promise.all(promises);

  // move all of them back in since rendering can cause some sections to move themselves out of their container
  for (const section of sections) {
    viewEl.appendChild(section.el);
  }

  // container.appendChild(viewEl);
  return viewEl;
}
export async function generateWebview1(plugin: BetterExportPdfPlugin, file: TFile, config: TConfig) {
  const view = plugin.app.workspace.getActiveViewOfType(MarkdownView) as MarkdownView;

  const preview = view.previewMode;
  // @ts-ignore
  preview.renderer.showAll = true;

  const doc = document.implementation.createHTMLDocument("webview");

  const printEl = doc.body.createDiv("print");
  const viewEl = printEl.createDiv({
    cls: "markdown-preview-view markdown-rendered",
  });
  // @ts-ignore
  const sections = preview.renderer.sections as SelectionType[];

  if (config?.["showTitle"]) {
    const header = doc.createElement("h1");
    header.innerHTML = file.basename;
    viewEl.appendChild(header);
  }

  for (const section of sections) {
    viewEl.appendChild(section.el.cloneNode(true));
  }

  const webview = document.createElement("webview");
  webview.src = `app://obsidian.md/help.html`;
  webview.nodeintegration = true;

  modifyHeadings(doc);
  return { webview, doc };
}
export async function generateWebview(plugin: BetterExportPdfPlugin, file: TFile, config: TConfig) {
  const tempRoot = path.join(os.tmpdir(), "Obdisian");
  try {
    await fs.mkdir(tempRoot, { recursive: true });
  } catch (error) {
    /* empty */
    new Notice(error, 1000);
  }

  const tempPath = await fs.mkdtemp(path.join(tempRoot, "export"));
  try {
    await fs.mkdir(tempPath, { recursive: true });
  } catch (error) {
    /* empty */
  }

  const view = plugin.app.workspace.getActiveViewOfType(MarkdownView) as MarkdownView;

  const preview = view.previewMode;
  // @ts-ignore
  preview.renderer.showAll = true;
  // @ts-ignore
  await preview.renderer.unfoldAllHeadings();

  const webview = document.createElement("webview");
  // webview.addClass("print-preview");
  const doc = await renderFile(this, file, tempPath, config);

  console.log(file);

  const tempFile = path.join(tempPath, "index.html");
  console.log("temp html file:", tempFile);

  const html = `<html>${doc.documentElement.innerHTML}</html>`;
  await fs.writeFile(tempFile, html);

  // TODO: try inline css in order to debug pagedjs
  // const inlineHtml = juice(html);
  // await fs.writeFile(path.join(tempPath, "inline-index.html"), inlineHtml);
  webview.src = `file:///${tempFile}`;
  webview.nodeintegration = true;
  return { webview, doc };
}
/**
 * 处理 body 正文内容 <body></body>
 * @param doc
 * @param file
 */

export async function createBody(plugin: BetterExportPdfPlugin, doc: Document, file: TFile, config: TConfig) {
  const view = plugin.app.workspace.getActiveViewOfType(MarkdownView) as MarkdownView;
  const renderNode = doc.createElement("div");
  await MarkdownRenderer.render(plugin.app, view.data, renderNode, file.path, view);
  Array.from(renderNode.attributes).forEach((attr) => {
    renderNode.removeAttribute(attr.name);
  });
  renderNode.className = "markdown-preview-view markdown-rendered";

  if (config?.["showTitle"]) {
    const header = doc.createElement("h1");
    header.innerHTML = file.basename;
    renderNode.insertBefore(header, renderNode.firstChild);
  }

  const printNode = document.createElement("div");
  printNode.className = "print"; // print-preview

  printNode.appendChild(renderNode);
  doc.body.appendChild(printNode);

  Array.from(document.body.attributes).forEach(({ name, value }) => {
    doc.body.setAttribute(name, value);
  });

  doc.body.addClass("theme-light");
  doc.body.removeClass("theme-dark");

  modifyHeadings(doc);

  await renderMermaid(doc);
}
export async function createBody1(plugin: BetterExportPdfPlugin, doc: Document, file: TFile, config: TConfig) {
  const view = plugin.app.workspace.getActiveViewOfType(MarkdownView) as MarkdownView;

  const preview = view.previewMode;
  // @ts-ignore
  preview.renderer.showAll = true;

  const renderNode = await renderMarkdownView(preview);

  if (config?.["showTitle"]) {
    const header = doc.createElement("h1");
    header.innerHTML = file.basename;
    renderNode?.insertBefore(header, renderNode.firstChild);
  }

  const printEl = doc.body.createDiv("print");
  const viewEl = printEl.createDiv({
    cls: "markdown-preview-view markdown-rendered",
  });

  // @ts-ignore
  const sections = preview.renderer.sections as SelectionType[];

  for (const section of sections) {
    viewEl.appendChild(section.el.cloneNode(true));
  }

  doc.body.addClass("theme-light");
  doc.body.removeClass("theme-dark");

  modifyHeadings(doc);

  await renderMermaid(doc);
}

export async function renderFile(plugin: BetterExportPdfPlugin, file: TFile, tempPath: string, config: TConfig) {
  const doc = document.implementation.createHTMLDocument(file.basename);
  await createBody1(plugin, doc, file, config);
  await createHead(doc, tempPath);
  return doc;
}

export async function renderDocument(plugin: BetterExportPdfPlugin, file: TFile, tempPath: string, config: TConfig) {
  const doc = document.implementation.createHTMLDocument(file.basename);
  await createBody1(plugin, doc, file, config);
  await createHead(doc, tempPath);
  return doc;
}

export async function renderMarkdown(this: BetterExportPdfPlugin, file: TFile) {
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

  await waitFor(() => {
    // @ts-ignore
    const currRender = preview.renderer.lastRender;
    if (currRender == lastRender) {
      return true;
    }
    lastRender = currRender;
    return false;
  });

  console.log("container:", container);
}
export function insertScripts(doc: Document) {
  // app://xxx.js 相关内部 js
  const element = doc.body;

  getAppScripts().forEach((src) => {
    console.log("src:", src);
    const script = doc.createElement("script");
    if (src.includes("mermaid")) {
      return;
    }
    script.src = src;
    script.type = "text/javascript";
    element.appendChild(script);
  });

  {
    // 本地预览html时是加载外部 mathjax 资源
    const mathjax1 = `<script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>`;
    const mathjax2 = `<script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3.0.1/es5/tex-mml-chtml.js"></script>`;

    const script1 = document.createElement("span");
    script1.innerHTML = mathjax1;
    element.appendChild(script1);

    const script2 = document.createElement("span");
    script2.innerHTML = mathjax2;
    element.appendChild(script2);
  }
}
/**
 * 创建 <head></head>
 * @param title
 * @param container
 * @returns
 */

export async function createHead(doc: Document, tempPath: string) {
  const cssTexts = getAllStyles(doc);
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
			
			.markdown-preview-view {
				text-align: justify;
				hyphens: auto;
			}
    }
		`;
  cssTexts.push(stylePatch);
  const appCssFile = path.join(tempPath, "app.css");

  await fs.writeFile(appCssFile, cssTexts.join("\n"));

  const linkNode = doc.createElement("link");
  linkNode.href = "./app.css";
  linkNode.rel = "stylesheet";

  const styleElement = doc.createElement("style");
  styleElement.innerHTML = cssTexts.join("\n");
  doc.head.appendChild(styleElement);

  // 将 <style> 元素追加到 <head> 标签中
  // doc.head.appendChild(linkNode);
  insertScripts(doc);

  return doc;
}
export async function createHead1(doc: Document, tempPath: string) {
  const cssTexts = getAllStyles(doc);
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
			
			.markdown-preview-view {
				text-align: justify;
				hyphens: auto;
			}
    }
		`;
  cssTexts.push(stylePatch);
  const appCssFile = path.join(tempPath, "app.css");

  await fs.writeFile(appCssFile, cssTexts.join("\n"));

  const linkNode = doc.createElement("link");
  linkNode.href = "./app.css";
  linkNode.rel = "stylesheet";

  const styleElement = doc.createElement("style");
  styleElement.innerHTML = cssTexts.join("\n");
  doc.head.appendChild(styleElement);

  // 将 <style> 元素追加到 <head> 标签中
  // doc.head.appendChild(linkNode);
  insertScripts(doc);

  return doc;
}
export async function inlineMedia(doc: Document, file: TFile) {
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
export async function renderMermaid(doc: Document) {
  doc.querySelectorAll(".language-mermaid").forEach(async (element: HTMLElement, i: number) => {
    const code = element.querySelector("code")?.innerText;

    // @ts-ignore
    const { svg, bindFunctions } = await mermaid.render("mermaid-" + i, code);

    element.outerHTML = `<div class="mermaid">${svg}</div>`;
    bindFunctions(element);

    // if (element.parentElement) {
    //   element.parentElement.outerHTML = `<div class="mermaid">${svg}</div>`;
    //   bindFunctions(element.parentElement);
    // }
  });
}

export async function getAllScripts() {
  const scriptTags = document.scripts;
  const jsScripts: string[] = [];

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

export function getAppScripts() {
  return Array.from(document.scripts)
    .map((script) => script.src)
    .filter((src) => src?.startsWith("app://"));
}

export function getStyleTags() {
  return Array.from(document.getElementsByTagName("style")).map((style) => {
    return style.textContent || style.innerHTML;
  });
}

export function getAllStyles(doc: Document, clear = false) {
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
      if (clear) {
        if (rule instanceof CSSStyleRule) {
          if (/^(.CodeMirror|.cm-)[^,]*$/.test(rule.selectorText)) {
            return;
          }
          // ignore not find css selector, mathjax not ignore
          if (id != "MJX-CHTML-styles" && rule?.selectorText && !doc.querySelector(rule?.selectorText)) {
            return;
          }
        }
        if (rule.cssText.startsWith("@font-face")) {
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
