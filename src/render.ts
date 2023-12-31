import { MarkdownRenderer, MarkdownView, TFile, Component } from "obsidian";
import { TConfig } from "./modal";
import BetterExportPdfPlugin from "./main";
import { modifyHeadings } from "./utils";

export function getAllStyles() {
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
      cssTexts.push(rule.cssText);
    });
  });

  const stylePatch = `
  /* ---------- css patch ---------- */

  body {
    overflow: auto !important;
  }
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
  cssTexts.push(...getPrintStyle());
  return cssTexts;
}

export function getPrintStyle() {
  const cssTexts: string[] = [];
  Array.from(document.styleSheets).forEach((sheet) => {
    Array.from(sheet.cssRules).forEach((rule) => {
      if (rule.constructor.name == "CSSMediaRule") {
        if ((rule as CSSMediaRule).conditionText === "print") {
          const res = rule.cssText.replace(/@media print\s*\{(.+)\}/gms, "$1");
          cssTexts.push(res);
        }
      }
    });
  });
  return cssTexts;
}

function generateDocId(n: number) {
  return Array.from({ length: n }, () => ((16 * Math.random()) | 0).toString(16)).join("");
}

export type AyncFnType = (...args: unknown[]) => Promise<unknown>;
// 逆向原生打印函数
export async function renderMarkdown(plugin: BetterExportPdfPlugin, file: TFile, config: TConfig) {
  const view = plugin.app.workspace.getActiveViewOfType(MarkdownView) as MarkdownView;

  const comp = new Component();
  comp.load();
  const promises: AyncFnType[] = [];

  const printEl = document.body.createDiv("print");
  const viewEl = printEl.createDiv({
    cls: "markdown-preview-view markdown-rendered",
  });
  plugin.app.vault.cachedRead(file);

  // @ts-ignore
  viewEl.toggleClass("rtl", plugin.app.vault.getConfig("rightToLeft"));
  // @ts-ignore
  viewEl.toggleClass("show-properties", "hidden" !== plugin.app.vault.getConfig("propertiesInDocument"));

  if (config.showTitle) {
    viewEl.createEl("h1", {
      text: file.basename,
    });
  }
  await MarkdownRenderer.render(plugin.app, view.data, viewEl, file.path, comp);
  // @ts-ignore
  // (app: App: param: T) => T
  MarkdownRenderer.postProcess(plugin.app, {
    docId: generateDocId(16),
    sourcePath: file.path,
    frontmatter: {},
    promises,
    addChild: function (e: Component) {
      return comp.addChild(e);
    },
    getSectionInfo: function () {
      return null;
    },
    containerEl: viewEl,
    el: viewEl,
    displayMode: true,
  });

  await Promise.all(promises);

  printEl.findAll("a.internal-link").forEach((el) => {
    el.removeAttribute("href");
  });

  const doc = document.implementation.createHTMLDocument("document");
  doc.body.appendChild(printEl.cloneNode(true));
  modifyHeadings(doc);

  printEl.detach();
  comp.unload();
  printEl.remove();
  return doc;
}

export function createWebview() {
  const webview = document.createElement("webview");
  webview.src = `app://obsidian.md/help.html`;
  webview.setAttribute(
    "style",
    "height:calc(1/0.75 * 100%);width:calc(1/0.75 * 100%);transform:scale(0.75, 0.75);transform-origin: top left;",
  );
  webview.nodeintegration = true;
  return webview;
}
