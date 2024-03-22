import { MarkdownRenderer, MarkdownView, TFile, Component, Notice, App, FrontMatterCache, TFolder } from "obsidian";
import { TConfig } from "./modal";
import { modifyAnchors, modifyDest, waitFor } from "./utils";

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

    cssTexts.push(division);

    try {
      Array.from(sheet?.cssRules ?? []).forEach((rule) => {
        cssTexts.push(rule.cssText);
      });
    } catch (error) {
      console.error(error);
    }
  });

  cssTexts.push(...getPatchStyle());
  return cssTexts;
}

const CSS_PATCH = `
/* ---------- css patch ---------- */

body {
  overflow: auto !important;
}
@media print {
  .print .markdown-preview-view {
    height: auto !important;
  }
  .md-print-anchor, .blockid {
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
@media print {
  table {
    break-inside: auto;
  }
  tr {
    break-inside: avoid;
    break-after: auto;
  }
}
`;

export function getPatchStyle() {
  return [CSS_PATCH, ...getPrintStyle()];
}

export function getPrintStyle() {
  const cssTexts: string[] = [];
  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      const cssRules = sheet?.cssRules ?? [];
      Array.from(cssRules).forEach((rule) => {
        if (rule.constructor.name == "CSSMediaRule") {
          if ((rule as CSSMediaRule).conditionText === "print") {
            const res = rule.cssText.replace(/@media print\s*\{(.+)\}/gms, "$1");
            cssTexts.push(res);
          }
        }
      });
    } catch (error) {
      console.error(error);
    }
  });
  return cssTexts;
}

function generateDocId(n: number) {
  return Array.from({ length: n }, () => ((16 * Math.random()) | 0).toString(16)).join("");
}

export type AyncFnType = (...args: unknown[]) => Promise<unknown>;

export function getFrontMatter(app: App, file: TFile) {
  const cache = app.metadataCache.getFileCache(file);
  return cache?.frontmatter ?? ({} as FrontMatterCache);
}

// 逆向原生打印函数
export async function renderMarkdown(
  app: App,
  file: TFile,
  config: TConfig,
  extra?: {
    title?: string;
    file: TFile;
    id?: string;
  },
) {
  const ws = app.workspace;
  if (ws.getActiveFile()?.path != file.path) {
    const leaf = ws.getLeaf();
    await leaf.openFile(file);
  }
  const view = ws.getActiveViewOfType(MarkdownView) as MarkdownView;
  // @ts-ignore
  const data = view?.data ?? ws?.getActiveFileView()?.data ?? ws.activeEditor?.data;
  if (!data) {
    new Notice("data is empty!");
  }

  const frontMatter = getFrontMatter(app, file);

  const cssclasses = [];
  for (const [key, val] of Object.entries(frontMatter)) {
    if (key.toLowerCase() == "cssclass" || key.toLowerCase() == "cssclasses") {
      if (Array.isArray(val)) {
        cssclasses.push(...val);
      } else {
        cssclasses.push(val);
      }
    }
  }

  const comp = new Component();
  comp.load();
  const promises: AyncFnType[] = [];

  const printEl = document.body.createDiv("print");
  const viewEl = printEl.createDiv({
    cls: "markdown-preview-view markdown-rendered " + cssclasses.join(" "),
  });
  app.vault.cachedRead(file);

  // @ts-ignore
  viewEl.toggleClass("rtl", app.vault.getConfig("rightToLeft"));
  // @ts-ignore
  viewEl.toggleClass("show-properties", "hidden" !== app.vault.getConfig("propertiesInDocument"));

  if (config.showTitle) {
    const h = viewEl.createEl("h1", {
      text: extra?.title ?? file.basename,
    });
    h.id = extra?.id ?? "";
  }

  const cache = app.metadataCache.getFileCache(file);

  const lines = data?.split("\n") ?? [];

  Object.entries(cache?.blocks ?? {}).forEach(([key, c]) => {
    const idx = c.position.end.line;
    lines[idx] = `<span id="^${key}" class="blockid"></span>\n` + lines[idx];
  });

  await MarkdownRenderer.render(app, lines.join("\n"), viewEl, file.path, comp);
  // @ts-ignore
  // (app: App: param: T) => T
  MarkdownRenderer.postProcess(app, {
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

  printEl.findAll("a.internal-link").forEach((el: HTMLAnchorElement) => {
    const [title, anchor] = el.dataset.href?.split("#") ?? [];

    if ((!title || title?.length == 0 || title == file.basename) && anchor?.startsWith("^")) {
      return;
    }

    el.removeAttribute("href");
  });

  if (data.includes("```dataview")) {
    try {
      await waitFor(() => false, 2000);
    } catch (error) {
      /* empty */
    }
  }

  const doc = document.implementation.createHTMLDocument("document");
  doc.body.appendChild(printEl.cloneNode(true));

  printEl.detach();
  comp.unload();
  printEl.remove();
  return doc;
}

export function fixDoc(doc: Document, title: string) {
  const dest = modifyDest(doc);
  modifyAnchors(doc, dest, title);
  modifyEmbedSpan(doc);
}

export function modifyEmbedSpan(doc: Document) {
  const spans = doc.querySelectorAll("span.markdown-embed");

  spans.forEach((span: HTMLElement) => {
    const newDiv = document.createElement("div");

    // copy attributes
    Array.from(span.attributes).forEach((attr) => {
      newDiv.setAttribute(attr.name, attr.value);
    });

    newDiv.innerHTML = span.innerHTML;

    span.parentNode?.replaceChild(newDiv, span);
  });
}

export function createWebview() {
  const webview = document.createElement("webview");
  webview.src = `app://obsidian.md/help.html`;
  webview.setAttribute(
    "style",
    `height:calc(1/0.75 * 100%);
     width: calc(1/0.75 * 100%);
     transform: scale(0.75, 0.75);
     transform-origin: top left;
     border: 1px solid #f2f2f2;
    `,
  );
  webview.nodeintegration = true;
  return webview;
}
