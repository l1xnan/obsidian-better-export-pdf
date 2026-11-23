import { App, Component, type FrontMatterCache, MarkdownRenderer, MarkdownView, Notice, TFile } from "obsidian";
import type { PageSizeType, ExportConfigType } from "./modal";
import { applyLightVars, copyAttributes, fixAnchors, getHeadingTree, modifyDest, sleep, type TreeNode } from "./utils";
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
  applyLightVars(printEl);
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
      this.children = e?.children;
      throw new Error("exit");
    },
  } as unknown as HTMLElement;

  const promises: Promise<unknown>[] = [];
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

  printEl.findAll("a.internal-link").forEach((el: HTMLAnchorElement) => {
    const [title, anchor] = el.dataset.href?.split("#") ?? [];

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
  applyLightVars(printEl);
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
      this.children = e?.children;
      throw new Error("exit");
    },
  } as unknown as HTMLElement;

  const promises: Promise<unknown>[] = [];
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

  viewEl.findAll("a.internal-link").forEach((el: HTMLAnchorElement) => {
    const [title, anchor] = el.dataset.href?.split("#") ?? [];

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

export function fixDocV2(doc: Document | HTMLDivElement, title: string) {
  const dest = modifyDest(doc);
  fixAnchors(doc, dest, title);
  fixSvgFragmentUrls(doc);
  return doc;
}

const SVG_URL_ATTRS = [
  "marker-end",
  "marker-start",
  "marker-mid",
  "fill",
  "stroke",
  "clip-path",
  "mask",
  "filter",
];

/** Rewrite url(#id) so Chromium print doesn't resolve markers against <base href>. */
export function fixSvgFragmentUrls(root: Document | ParentNode) {
  const base = (document.baseURI || document.URL || "").split("#")[0];
  const rewrite = (value: string) =>
    value.replace(/url\(\s*(['"]?)#([^'")\s]+)\1\s*\)/g, (_m, _q, id) => `url("${base}#${id}")`);

  root.querySelectorAll("svg").forEach((svg) => {
    svg.querySelectorAll("*").forEach((el) => {
      for (const attr of SVG_URL_ATTRS) {
        const val = el.getAttribute(attr);
        if (val?.includes("#")) {
          el.setAttribute(attr, rewrite(val));
        }
      }
      const style = el.getAttribute("style");
      if (style?.includes("url(") && style.includes("#")) {
        el.setAttribute("style", rewrite(style));
      }
    });
  });
}

export function encodeEmbeds(doc: Document) {
  const spans = Array.from(doc.querySelectorAll("span.markdown-embed")).reverse();
  spans.forEach((span: HTMLElement) => {
    span.textContent = encodeURIComponent(span.innerHTML);
  });
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

function serializeSheet(sheet: CSSStyleSheet): string {
  try {
    return Array.from(sheet.cssRules)
      .map((rule) => rule.cssText)
      .join("\n");
  } catch {
    return "";
  }
}

function copyPrintStyles(target: Document) {
  const head = target.head;
  for (const node of Array.from(document.head.childNodes)) {
    const isStyle = node instanceof HTMLStyleElement;
    const isLink = node instanceof HTMLLinkElement && node.type === "text/css";
    if (!isStyle && !isLink) {
      continue;
    }
    if (isStyle && node.textContent?.includes("\u037C1")) {
      continue;
    }
    const clone = node.cloneNode(true) as HTMLStyleElement;
    if (isStyle && node.sheet && (node.id === "MJX-CHTML-styles" || !node.textContent?.trim())) {
      const text = serializeSheet(node.sheet);
      if (text) {
        clone.textContent = text;
      }
    }
    head.appendChild(clone);
  }
}

function copyMathJaxStylesheet(target: Document) {
  const src = document.getElementById("MJX-CHTML-styles");
  if (!(src instanceof HTMLStyleElement) || !src.sheet) {
    return;
  }
  const text = serializeSheet(src.sheet);
  if (!text) {
    return;
  }
  let dest = target.getElementById("MJX-CHTML-styles");
  if (!(dest instanceof HTMLStyleElement)) {
    dest = target.createElement("style");
    dest.id = "MJX-CHTML-styles";
    target.head.appendChild(dest);
  }
  dest.textContent = text;
}

async function openPrintWindow(): Promise<Window> {
  const ipc = (window as unknown as { require: NodeRequire }).require("electron").ipcRenderer;
  const token = ipc.sendSync("popup-token");
  if (!token) {
    throw new Error("无法打开打印窗口");
  }
  const popup = window.open("about:blank", "_blank", `token=${token},hide=true`);
  if (!popup) {
    throw new Error("无法打开打印窗口");
  }
  const start = Date.now();
  while (!popup.document?.body) {
    if (Date.now() - start > 3000) {
      popup.close();
      throw new Error("无法打开打印窗口");
    }
    await sleep(20);
  }
  return popup;
}

async function popupIpc(popup: Window): Promise<electron.IpcRenderer> {
  const start = Date.now();
  while (Date.now() - start < 3000) {
    const req = (popup as unknown as { require?: NodeRequire }).require;
    if (typeof req === "function") {
      (popup as unknown as { electron: typeof electron }).electron = req("electron");
      return req("electron").ipcRenderer;
    }
    await sleep(20);
  }
  throw new Error("无法打开打印窗口");
}

function preparePrintDocument(popup: Window) {
  const doc = popup.document;
  const base = doc.createElement("base");
  base.href = location.href;
  doc.head.appendChild(base);
  copyPrintStyles(doc);
  doc.documentElement.lang = document.documentElement.lang;
  if (document.body.classList.contains("mod-rtl")) {
    doc.body.classList.add("mod-rtl");
  }
  const fontSize = getComputedStyle(document.body).fontSize;
  if (fontSize) {
    doc.documentElement.style.setProperty("font-size", fontSize);
  }
}

async function renderOfficialNote({
  app,
  file,
  config,
  comp,
  printEl,
  extra,
}: {
  app: App;
  file: TFile;
  config?: ExportConfigType;
  comp: Component;
  printEl: HTMLElement;
  extra?: { title?: string; id?: string };
}) {
  const frontMatter = getFrontMatter(app, file);
  const viewEl = document.createElement("div");
  viewEl.className = "markdown-preview-view markdown-rendered";
  viewEl.classList.toggle("rtl", !!app.vault.getConfig("rightToLeft"));
  viewEl.classList.toggle("show-properties", app.vault.getConfig("propertiesInDocument") !== "hidden");
  for (const name of getCssclasses(frontMatter)) {
    if (name && !String(name).includes(" ")) {
      viewEl.classList.add(String(name));
    }
  }
  if (config?.showTitle !== false) {
    const title = document.createElement("h1");
    title.className = "__title__";
    title.textContent = extra?.title ?? file.basename;
    if (extra?.id) {
      title.id = extra.id;
    }
    viewEl.appendChild(title);
  }
  printEl.appendChild(viewEl);

  const data = await app.vault.cachedRead(file);
  const holder = {
    children: undefined as HTMLCollection | undefined,
    appendChild(fragment: DocumentFragment) {
      this.children = fragment?.children;
      throw new Error("exit");
    },
  };
  try {
    await MarkdownRenderer.render(app, data ?? "", holder as unknown as HTMLElement, file.path, comp);
  } catch (error) {
    if ((error as Error)?.message !== "exit") {
      throw error;
    }
  }

  for (const node of Array.from(holder.children ?? [])) {
    if (node.tagName === "HR") {
      viewEl.appendChild(node);
    } else {
      const wrap = document.createElement("div");
      wrap.appendChild(node);
      viewEl.appendChild(wrap);
    }
  }

  const promises: Promise<unknown>[] = [];
  // @ts-ignore MarkdownRenderer.postProcess is not in the public type
  await MarkdownRenderer.postProcess(app, {
    docId: generateDocId(16),
    sourcePath: file.path,
    frontmatter: frontMatter,
    promises,
    addChild: (child: Component) => comp.addChild(child),
    getSectionInfo: () => null,
    containerEl: viewEl,
    el: viewEl,
    displayMode: true,
  });
  await Promise.all(promises);

  viewEl.querySelectorAll("a.internal-link").forEach((link) => {
    link.removeAttribute("href");
  });
  return frontMatter;
}

export async function printFilesInHiddenWindow({
  app,
  files,
  config,
  options,
}: {
  app: App;
  files: TFile[];
  config?: ExportConfigType;
  options: electron.PrintToPDFOptions & { filepath: string };
}): Promise<{ headings: TreeNode; frontMatter: FrontMatterCache }> {
  if (!files.length) {
    throw new Error("没有可导出的笔记");
  }
  const popup = await openPrintWindow();
  const comp = new Component();
  comp.load();
  try {
    preparePrintDocument(popup);
    await sleep(200);
    popup.document.body.classList.remove("theme-dark");
    popup.document.body.classList.add("theme-light");
    popup.document.title = files[0].basename;

    const printEl = document.createElement("div");
    printEl.className = "print";
    popup.document.body.appendChild(printEl);

    for (const file of files) {
      await renderOfficialNote({ app, file, config, comp, printEl });
    }
    const frontMatter = getFrontMatter(app, files[0]);
    fixDocV2(printEl, files[0].basename);
    copyMathJaxStylesheet(popup.document);
    await sleep(200);

    const ipc = await popupIpc(popup);
    await new Promise((resolve) => {
      ipc.once("print-to-pdf", () => resolve(null));
      ipc.send("print-to-pdf", options);
    });
    return { headings: getHeadingTree(printEl), frontMatter };
  } finally {
    comp.unload();
    popup.close();
  }
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
  if (printEl instanceof HTMLElement) {
    fixSvgFragmentUrls(printEl);
  }
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
