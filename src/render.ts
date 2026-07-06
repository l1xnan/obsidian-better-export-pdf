import { App, Component, type FrontMatterCache, MarkdownRenderer, MarkdownView, Notice, TFile } from "obsidian";
import type { PageSizeType, ExportConfigType } from "./modal";
import { copyAttributes, fixAnchors, modifyDest } from "./utils";
import * as electron from "electron";

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

export const TOC_CSS = `
.pdf-toc {
  margin: 1em 0 1.5em 0;
  page-break-before: always;
  break-before: page;
  page-break-after: always;
  break-after: page;
}
.pdf-toc-title {
  font-size: 1.4em;
  font-weight: 700;
  letter-spacing: 0.03em;
  margin-bottom: 0.6em;
  padding-bottom: 0.3em;
  border-bottom: 2px solid currentColor;
  opacity: 0.85;
}
.pdf-toc ul {
  list-style: none;
  padding-left: 0;
  margin: 0;
}
.pdf-toc li {
  display: flex;
  align-items: baseline;
  margin: 0.1em 0;
  margin-right: 2.5em;
}
/* Inline position anchor — height:1em + align-items:baseline means
   its bottom edge lands exactly on the text baseline, so rect.y from
   getDestPosition maps to the baseline of the TOC entry text. */
.pdf-toc-anchor {
  display: inline-block;
  width: 1px;
  height: 1em;
  flex-shrink: 0;
  overflow: hidden;
  color: transparent;
  background: transparent;
}
.pdf-toc li .toc-link {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
  text-decoration: none;
  color: inherit;
  padding: 0.15em 0.2em 0.15em 0.4em;
  border-radius: 4px;
  transition: background 0.15s;
  flex-shrink: 0;
  max-width: 85%;
}
.pdf-toc li .toc-link:hover {
  background: rgba(128, 128, 128, 0.15);
}
.pdf-toc .toc-leader {
  flex: 1;
  border-bottom: 1px dotted currentColor;
  opacity: 0.35;
  margin: 0 0.3em 0.25em;
  min-width: 0.5em;
}
/* Level indentation */
.pdf-toc li.toc-level-1 { padding-left: 0; }
.pdf-toc li.toc-level-2 { padding-left: 1.2em; }
.pdf-toc li.toc-level-3 { padding-left: 2.4em; }
.pdf-toc li.toc-level-4 { padding-left: 3.6em; }
.pdf-toc li.toc-level-5 { padding-left: 4.8em; }
.pdf-toc li.toc-level-6 { padding-left: 6em; }
/* Per-level typography */
.pdf-toc li.toc-level-1 .toc-link { font-size: 1em;    font-weight: 600; }
.pdf-toc li.toc-level-2 .toc-link { font-size: 0.95em; font-weight: 500; }
.pdf-toc li.toc-level-3 .toc-link { font-size: 0.9em;  font-weight: 400; opacity: 0.85; }
.pdf-toc li.toc-level-4 .toc-link { font-size: 0.85em; font-weight: 400; opacity: 0.75; font-style: italic; }
.pdf-toc li.toc-level-5 .toc-link { font-size: 0.8em;  font-weight: 400; opacity: 0.65; font-style: italic; }
.pdf-toc li.toc-level-6 .toc-link { font-size: 0.78em; font-weight: 400; opacity: 0.55; font-style: italic; }
`;

export const HEADING_NUMBERING_CSS = `
.auto-number-headings .markdown-preview-view {
  counter-reset: h1c 0 h2c 0 h3c 0 h4c 0 h5c 0 h6c 0;
}
.auto-number-headings .markdown-preview-view h1:not(.__title__) {
  counter-increment: h1c;
  counter-reset: h2c h3c h4c h5c h6c;
}
.auto-number-headings .markdown-preview-view h1:not(.__title__)::before {
  content: counter(h1c) ". ";
}
.auto-number-headings .markdown-preview-view h2 {
  counter-increment: h2c;
  counter-reset: h3c h4c h5c h6c;
}
.auto-number-headings .markdown-preview-view h2::before {
  content: counter(h1c) "." counter(h2c) ". ";
}
.auto-number-headings .markdown-preview-view h3 {
  counter-increment: h3c;
  counter-reset: h4c h5c h6c;
}
.auto-number-headings .markdown-preview-view h3::before {
  content: counter(h1c) "." counter(h2c) "." counter(h3c) ". ";
}
.auto-number-headings .markdown-preview-view h4 {
  counter-increment: h4c;
  counter-reset: h5c h6c;
}
.auto-number-headings .markdown-preview-view h4::before {
  content: counter(h1c) "." counter(h2c) "." counter(h3c) "." counter(h4c) ". ";
}
.auto-number-headings .markdown-preview-view h5 {
  counter-increment: h5c;
  counter-reset: h6c;
}
.auto-number-headings .markdown-preview-view h5::before {
  content: counter(h1c) "." counter(h2c) "." counter(h3c) "." counter(h4c) "." counter(h5c) ". ";
}
.auto-number-headings .markdown-preview-view h6 {
  counter-increment: h6c;
}
.auto-number-headings .markdown-preview-view h6::before {
  content: counter(h1c) "." counter(h2c) "." counter(h3c) "." counter(h4c) "." counter(h5c) "." counter(h6c) ". ";
}
`;

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

img.__canvas__ {
  width: 100% !important;
  height: 100% !important;
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

export function generateDocId(n: number) {
  return Array.from({ length: n }, () => ((16 * Math.random()) | 0).toString(16)).join("");
}

export type AyncFnType = (...args: unknown[]) => Promise<unknown>;

export function getFrontMatter(app: App, file: TFile) {
  const cache = app.metadataCache.getFileCache(file);
  return cache?.frontmatter ?? ({} as FrontMatterCache);
}

export type ParamType = {
  app: App;
  file: TFile;
  config?: ExportConfigType;
  extra?: {
    title?: string;
    file: TFile;
    id?: string;
  };
  cleanup?: () => void;
};

// 逆向Obdian官方打印函数
export async function renderMarkdown({ app, file, config, extra }: ParamType) {
  const startTime = new Date().getTime();

  const ws = app.workspace;
  // if (ws.getActiveFile()?.path != file.path) {
  //   const leaf = ws.getLeaf(true);
  //   console.debug(file, leaf);
  //   await leaf.openFile(file);
  // }
  // const view = ws.getActiveViewOfType(MarkdownView) as MarkdownView;

  const leaf = ws.getLeaf(true);
  await leaf.openFile(file);
  const view = leaf.view as MarkdownView;
  const data = await app.vault.cachedRead(file);
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

  const printEl = document.body.createDiv("print theme-light");
  const viewEl = printEl.createDiv({
    cls: "markdown-preview-view markdown-rendered" + cssclasses.join(" "),
  });

  // @ts-ignore
  viewEl.toggleClass("rtl", app.vault.getConfig("rightToLeft"));
  // @ts-ignore
  viewEl.toggleClass("show-properties", "hidden" !== app.vault.getConfig("propertiesInDocument"));

  const title = extra?.title ?? frontMatter?.title ?? file.basename;
  viewEl.createEl("h1", { text: title }, (e) => {
    e.addClass("__title__");
    e.style.display = config?.showTitle ? "block" : "none";
    e.id = extra?.id ?? "";
  });

  const cache = app.metadataCache.getFileCache(file);

  // const lines = data?.split("\n") ?? [];
  // Object.entries(cache?.blocks ?? {}).forEach(([key, c]) => {
  //   const idx = c.position.end.line;
  //   lines[idx] = `<span id="^${key}" class="blockid"></span>\n` + lines[idx];
  // });

  const blocks = new Map(Object.entries(cache?.blocks ?? {}));
  const lines = (data?.split("\n") ?? []).map((line, i) => {
    for (const {
      id,
      position: { start, end },
    } of blocks.values()) {
      const blockid = `^${id}`;
      if (line.includes(blockid) && i >= start.line && i <= end.line) {
        blocks.delete(id);
        return line.replace(blockid, `<span id="${blockid}" class="blockid"></span> ${blockid}`);
      }
    }
    return line;
  });

  [...blocks.values()].forEach(({ id, position: { start, end } }) => {
    const idx = start.line;
    lines[idx] = `<span id="^${id}" class="blockid"></span>\n\n` + lines[idx];
  });

  const fragment = {
    children: undefined,
    appendChild(e: DocumentFragment) {
      (this as any).children = e?.children;
      throw new Error("exit");
    },
  } as unknown as HTMLElement;

  const promises: AyncFnType[] = [];
  try {
    // `render` converts Markdown to HTML, and then it undergoes postProcess handling.
    // Here, postProcess handling is not needed.When passed as a fragment, it converts to HTML correctly,
    // but errors occur during recent postProcess handling, thus achieving the goal of avoiding postProcess handling.
    await MarkdownRenderer.render(app, lines.join("\n"), fragment, file.path, comp);
  } catch (error) {
    /* empty */
  }

  const el = createFragment();
  Array.from(fragment.children).forEach((item) => {
    el.createDiv({}, (t) => {
      return t.appendChild(item);
    });
  });

  viewEl.appendChild(el);

  // @ts-ignore
  // (app: App: param: T) => T
  // MarkdownPostProcessorContext
  await MarkdownRenderer.postProcess(app, {
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
    const [title, anchor] = (el as HTMLAnchorElement).dataset.href?.split("#") ?? [];

    if ((!title || title?.length == 0 || title == file.basename) && anchor?.startsWith("^")) {
      return;
    }

    el.removeAttribute("href");
  });
  try {
    await fixWaitRender(data, viewEl);
  } catch (error) {
    console.warn("wait timeout");
  }

  fixCanvasToImage(viewEl);

  const doc = document.implementation.createHTMLDocument("document");
  doc.body.appendChild(printEl.cloneNode(true));

  printEl.detach();
  comp.unload();
  printEl.remove();
  doc.title = title;
  leaf.detach();
  console.debug(`md render time:${new Date().getTime() - startTime}ms`);
  return { doc, frontMatter, file };
}

export async function renderMarkdownV2({ app, file, config, extra }: ParamType) {
  const startTime = new Date().getTime();

  const data = await app.vault.cachedRead(file);
  if (!data) {
    new Notice(`${file} content is empty!`);
  }

  const comp = new Component();
  comp.load();

  const printEl = document.body.createDiv({
    cls: "print theme-light",
    attr: {
      id: file.path,
    },
  });
  if (config?.autoNumberHeadings) {
    printEl.addClass("auto-number-headings");
  }
  const { viewEl, frontMatter } = createViewEl({ app, file, extra, config, printEl });

  const markdown = modifyMarkdown({ app, file, data });

  await renderHtml({ app, markdown, file, comp, viewEl });

  const cleanup = () => {
    printEl.detach();
    comp.unload();
    printEl.remove();
  };
  console.debug(`md render time:${new Date().getTime() - startTime}ms`);

  return { doc: printEl, frontMatter, file, cleanup };
}

export function createViewEl({
  app,
  file,
  printEl,
  extra,
  config,
}: {
  app: App;
  file: TFile;
  printEl: HTMLDivElement;
  extra: { title?: string; file?: TFile; id?: string } | undefined;
  config?: ExportConfigType;
}) {
  const frontMatter = getFrontMatter(app, file);

  const viewEl = printEl.createDiv({ cls: "markdown-preview-view markdown-rendered" });

  const cssclasses = getCssclasses(frontMatter);
  viewEl.addClasses(cssclasses);

  // @ts-ignore
  // 设置阅读方向和属性显示
  viewEl.toggleClass("rtl", app.vault.getConfig("rightToLeft"));
  // @ts-ignore
  viewEl.toggleClass("show-properties", "hidden" !== app.vault.getConfig("propertiesInDocument"));

  const title = extra?.title ?? frontMatter?.title ?? file.basename;
  viewEl.createEl("h1", { text: title }, (e) => {
    e.addClass("__title__");
    e.style.display = config?.showTitle ? "block" : "none";
    e.id = extra?.id ?? "";
  });
  return { viewEl, frontMatter };
}

// 添加块ID
export function modifyMarkdown({ app, file, data }: { app: App; file: TFile; data: string }) {
  data = data.replace(/<!--\s*__TOC__\s*-->/g, '<div class="__toc_placeholder__"></div>');

  const cache = app.metadataCache.getFileCache(file);

  const blocks = new Map(Object.entries(cache?.blocks ?? {}));
  const lines = (data?.split("\n") ?? []).map((line, i) => {
    for (const {
      id,
      position: { start, end },
    } of blocks.values()) {
      const blockid = `^${id}`;
      if (line.includes(blockid) && i >= start.line && i <= end.line) {
        blocks.delete(id);
        return line.replace(blockid, `<span id="${blockid}" class="blockid"></span> ${blockid}`);
      }
    }
    return line;
  });

  [...blocks.values()].forEach(({ id, position: { start, end } }) => {
    const idx = start.line;
    lines[idx] = `<span id="^${id}" class="blockid"></span>\n\n` + lines[idx];
  });
  return lines.join("\n");
}

async function renderHtml({
  app,
  markdown,
  file,
  comp,
  viewEl,
}: {
  app: App;
  markdown: string;
  file: TFile;
  comp: Component;
  viewEl: HTMLDivElement;
}) {
  const fragment = {
    children: undefined,
    appendChild(e: DocumentFragment) {
      (this as any).children = e?.children;
      throw new Error("exit");
    },
  } as unknown as HTMLElement;

  const promises: AyncFnType[] = [];
  try {
    // `render` converts Markdown to HTML, and then it undergoes postProcess handling.
    // Here, postProcess handling is not needed.When passed as a fragment, it converts to HTML correctly,
    // but errors occur during recent postProcess handling, thus achieving the goal of avoiding postProcess handling.
    await MarkdownRenderer.render(app, markdown, fragment, file.path, comp);
  } catch (error) {
    /* empty */
  }

  const el = createFragment();
  Array.from(fragment.children).forEach((item) => {
    el.createDiv({}, (t) => {
      return t.appendChild(item);
    });
  });

  viewEl.appendChild(el);

  // @ts-ignore
  // (app: App: param: T) => T
  // MarkdownPostProcessorContext
  await MarkdownRenderer.postProcess(app, {
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

  viewEl.findAll("a.internal-link").forEach((el) => {
    const [title, anchor] = (el as HTMLAnchorElement).dataset.href?.split("#") ?? [];

    if ((!title || title?.length == 0 || title == file.basename) && anchor?.startsWith("^")) {
      return;
    }

    el.removeAttribute("href");
  });
}

export function fixDoc(doc: Document, title: string) {
  const dest = modifyDest(doc);
  fixAnchors(doc, dest, title);
  encodeEmbeds(doc);
  return doc;
}

export function fixDocV2(doc: Document | HTMLDivElement, title: string, autoNumberHeadings = false) {
  const dest = modifyDest(doc);
  fixAnchors(doc, dest, title);
  injectTOC(doc, autoNumberHeadings);
  return doc;
}

function computeHeadingNumbers(headings: HTMLElement[]): string[] {
  const counters = [0, 0, 0, 0, 0, 0];
  return headings.map((heading) => {
    const level = parseInt(heading.tagName[1]) - 1;
    counters[level]++;
    for (let i = level + 1; i < 6; i++) counters[i] = 0;
    return counters.slice(0, level + 1).join(".") + ". ";
  });
}

export function injectTOC(doc: Document | HTMLDivElement, autoNumberHeadings = false) {
  const placeholder = doc.querySelector(".__toc_placeholder__");
  if (!placeholder) return;

  const headings = Array.from(
    doc.querySelectorAll("h1:not(.__title__), h2, h3, h4, h5, h6"),
  ) as HTMLElement[];

  if (headings.length === 0) {
    placeholder.remove();
    return;
  }

  const numberPrefixes = autoNumberHeadings ? computeHeadingNumbers(headings) : [];

  const nav = document.createElement("nav");
  nav.className = "pdf-toc";

  const titleEl = document.createElement("p");
  titleEl.className = "pdf-toc-title";
  titleEl.textContent = "Table of Contents";
  nav.appendChild(titleEl);

  const ul = document.createElement("ul");

  headings.forEach((heading, idx) => {
    const level = parseInt(heading.tagName[1]);
    const flag = heading.querySelector("a.md-print-anchor")?.getAttribute("href")?.replace("af://", "");
    const text = heading.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const prefix = numberPrefixes[idx] ?? "";

    const li = document.createElement("li");
    li.className = `toc-level-${level}`;

    // Inline anchor so getDestPosition captures this row's baseline Y in the PDF.
    // Uses pdf-toc-anchor (not md-print-anchor) to stay in normal flow and
    // baseline-align with the text, giving an accurate rect.y.
    if (flag) {
      const posAnchor = document.createElement("a");
      posAnchor.href = `af://toc-${flag}`;
      posAnchor.className = "pdf-toc-anchor";
      li.appendChild(posAnchor);
    }

    if (flag) {
      const a = document.createElement("a");
      a.href = `an://${flag}`;
      a.className = "toc-link";
      a.textContent = prefix + text;
      li.appendChild(a);
    } else {
      const span = document.createElement("span");
      span.className = "toc-link";
      span.textContent = prefix + text;
      li.appendChild(span);
    }

    const leader = document.createElement("span");
    leader.className = "toc-leader";
    li.appendChild(leader);

    ul.appendChild(li);
  });

  nav.appendChild(ul);
  placeholder.replaceWith(nav);
}

export function encodeEmbeds(doc: Document) {
  const spans = Array.from(doc.querySelectorAll("span.markdown-embed")).reverse();
  spans.forEach((span) => ((span as HTMLElement).innerHTML = encodeURIComponent((span as HTMLElement).innerHTML)));
}

export async function fixWaitRender(data: string, viewEl: HTMLElement) {
  if (data.includes("```dataview") || data.includes("```gEvent") || data.includes("![[")) {
    await sleep(2000);
  }
  try {
    await waitForDomChange(viewEl);
  } catch (error) {
    await sleep(1000);
  }
}

// TODO: base64 to canvas
// TODO: light render canvas
export function fixCanvasToImage(el: HTMLElement) {
  for (const canvas of Array.from(el.querySelectorAll("canvas"))) {
    const data = canvas.toDataURL();
    const img = document.createElement("img");
    img.src = data;
    copyAttributes(img, canvas.attributes);
    img.className = "__canvas__";

    canvas.replaceWith(img);
  }
}

export function createWebview(scale = 1.25) {
  const webview = document.createElement("webview");
  webview.src = `app://obsidian.md/help.html`;
  webview.setAttribute(
    "style",
    `height:calc(${scale} * 100%);
     width: calc(${scale} * 100%);
     transform: scale(${1 / scale}, ${1 / scale});
     transform-origin: top left;
     border: 1px solid #f2f2f2;
    `,
  );
  webview.nodeintegration = true;
  return webview;
}

export function makeWebviewJs(doc: Document) {
  return `
      document.body.innerHTML = decodeURIComponent(\`${encodeURIComponent(doc.body.innerHTML)}\`);
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
      document.title = \`${doc.title}\`;
      `;
}

function waitForDomChange(target: HTMLElement, timeout = 2000, interval = 200): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let timer: NodeJS.Timeout;
    const observer = new MutationObserver((m) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        observer.disconnect();
        resolve(true);
      }, interval);
    });

    observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`timeout ${timeout}ms`));
    }, timeout);
  });
}

/**
 *
 * @param printEl
 * @param options
 */
export async function printToPdf(
  printEl: any,
  options: electron.PrintToPDFOptions & {
    filepath: string;
  },
) {
  const ipc = printEl.win.electron.ipcRenderer as electron.IpcRenderer;

  return new Promise((resolve) => {
    // 1.ipc先设置监听（确保不会错过主进程的回信）
    ipc.once("print-to-pdf", (event, result) => {
      resolve(result); // 收到回复时，结束等待
    });

    // 2. 发送请求
    ipc.send("print-to-pdf", options);
  });
}

export function getCssclasses(frontMatter: FrontMatterCache) {
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
  return cssclasses;
}
