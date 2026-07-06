<script lang="ts">
  import { onMount } from "svelte";
  import type BetterExportPdfPlugin from "../main";
  import type { ExportConfigType, ExportConfigModal, DocType } from "../modal";
  import { TFile } from "obsidian";
  import { getAllStyles, getPatchStyle, makeWebviewJs, renderMarkdown, type ParamType } from "../render";
  import * as electron from "electron";
  import { px2mm, safeParseInt } from "../utils";
  import { fixDoc } from "../render";
  import { exportToPDF, getOutputFile, getOutputPath } from "../pdf";
  import { icon } from "../actions";
  import { initRenderStates, completeRenderState, type RenderState } from "../utils/renderStates";
  import { PageSizeCalculator } from "../utils/pageSize";
  import pLimit from "p-limit";
  const fs = require("fs").promises;

  let {
    modal,
    plugin,
    config = $bindable(),
  }: {
    modal: ExportConfigModal;
    plugin: BetterExportPdfPlugin;
    config: ExportConfigType;
  } = $props();

  const settings = $derived(plugin.settings);

  // State
  let completed = $state(false);
  let docs = $state<DocType[]>([]);
  let webviews = $state<electron.WebviewTag[]>([]);
  let scale = $state(0.75);
  let previewEl = $state<HTMLDivElement>();

  let renderStates = $state<RenderState[]>([]);
  const pageSizeCalc = new PageSizeCalculator(config);

  export function calcPageSize() {
    if (!previewEl) return;
    scale = pageSizeCalc.calc(previewEl);
  }

  export async function calcWebviewSize() {
    // @ts-ignore
    await sleep(500);

    webviews.forEach(async (e, i) => {
      const [width, height] = await e.executeJavaScript("[document.body.offsetWidth, document.body.offsetHeight]");
      docs[i] = { ...docs[i], printSize: `${width}×${height}px²\n${px2mm(width)}×${px2mm(height)}mm²` };
    });
  }

  export async function handleChangeSize() {
    await calcPageSize();
    await calcWebviewSize();
  }

  async function renderFiles(data: ParamType[], allDocs?: any[], cb?: (i: number) => void) {
    const concurrency = safeParseInt(settings.concurrency) || 5;
    const limit = pLimit(concurrency);

    const currentConfig = $state.snapshot(config);

    console.debug("file list data:", data, currentConfig);

    const inputs = data.map((param, i) =>
      limit(async () => {
        const option = { ...param, config: currentConfig };
        const res = await renderMarkdown(option);
        cb?.(i);
        return res;
      }),
    );
    let _docs = [...(allDocs ?? []), ...(await Promise.all(inputs))];

    if (modal.file instanceof TFile) {
      const leaf = modal.app.workspace.getLeaf();
      await leaf.openFile(modal.file);
    }

    if (!modal.multiplePdf) {
      _docs = modal.mergeDoc(_docs);
    }
    return _docs.map(({ doc, ...rest }) => {
      return { ...rest, doc: fixDoc(doc, doc.title) };
    });
  }

  export async function renderPreview(render = true) {
    if (render) {
      const { data, docs: allDocs } = await modal.getAllFiles();
      renderStates = initRenderStates(data);
      docs = await renderFiles(data, allDocs, (i) => { renderStates = completeRenderState(renderStates, i); });
    }

    webviews = [];

    const promises = docs.map((docItem) => {
      return new Promise<void>((resolve) => {
        // @ts-ignore
        docItem.resolve = resolve;
      });
    });

    await Promise.all(promises);
    calcPageSize();
    await calcWebviewSize();
  }

  export function toggleTitle(value: boolean) {
    webviews.forEach((wv, i) => {
      wv.executeJavaScript(`
        var _title = document.querySelector("h1.__title__");
        if (_title) {
          _title.style.display = "${value ? "block" : "none"}";
        }
      `);
      const _title = docs[i]?.doc?.querySelector("h1.__title__") as HTMLHeadingElement;
      if (_title) {
        _title.style.display = value ? "block" : "none";
      }
    });
  }

  export async function handlePrintToPDF() {
    const title = (modal.file as TFile)?.basename ?? modal.file?.name;

    if (modal.multiplePdf) {
      const outputPath = await getOutputPath(title);
      if (outputPath) {
        await Promise.all(
          webviews.map(async (wb, i) => {
            await exportToPDF(`${outputPath}/${docs[i].file.basename}.pdf`, { ...settings, ...config }, wb, docs[i]);
          }),
        );
      }
    } else {
      const outputFile = await getOutputFile(title, settings.isTimestamp);
      if (outputFile) {
        await exportToPDF(outputFile, { ...settings, ...config }, webviews[0], docs[0]);
      }
    }
  }

  export function handleOpenDevTools() {
    webviews?.[-1]?.openDevTools();
  }

  function initWebviewEvents(preview: electron.WebviewTag, docObj: any) {
    webviews.push(preview);

    // Ensure the doc promise is settled exactly once so a failed load
    // cannot leave renderPreview's Promise.all waiting forever.
    let settled = false;
    const unblock = () => {
      if (settled) return;
      settled = true;
      preview.removeEventListener("dom-ready", handler);
      preview.removeEventListener("did-fail-load", failHandler);
      docObj.resolve?.();
    };

    const handler = async () => {
      completed = true;
      getAllStyles().forEach(async (css) => {
        await preview.insertCSS(css);
      });
      if (config.cssSnippet && config.cssSnippet != "0") {
        try {
          const cssSnippet = await fs.readFile(config.cssSnippet, { encoding: "utf8" });
          const printCss = cssSnippet.replaceAll(/@media print\s*{([^}]+)}/g, "$1");
          await preview.insertCSS(printCss);
          await preview.insertCSS(cssSnippet);
        } catch (error) {
          console.warn(error);
        }
      }
      await preview.executeJavaScript(makeWebviewJs(docObj.doc));
      getPatchStyle().forEach(async (css) => {
        await preview.insertCSS(css);
      });
      unblock();
    };

    const failHandler = (event: any) => {
      // -3 is ERR_ABORTED, which fires on benign in-page navigations; ignore it.
      if (event?.errorCode === -3) return;
      console.warn(`Webview failed to load: ${event?.errorDescription ?? "unknown error"}`);
      unblock();
    };

    preview.addEventListener("dom-ready", handler);
    preview.addEventListener("did-fail-load", failHandler);

    return {
      destroy() {
        preview.removeEventListener("dom-ready", handler);
        preview.removeEventListener("did-fail-load", failHandler);
      },
    };
  }

  onMount(() => {
    if (!previewEl) return;
    pageSizeCalc.startObserver(previewEl);

    // Initial render
    renderPreview(true);

    return () => {
      pageSizeCalc.stopObserver();
    };
  });
</script>

<div class="print-preview">
  <div class="progress">
    {#if renderStates.length > 0 && !renderStates.every((item) => item.status)}
      <div>Rendering...</div>
      {#each renderStates as item}
        <div>
          {#if item.status}
            <span use:icon={"check"}></span>
          {:else}
            <span use:icon={"loader"}></span>
          {/if}
          {item.filename}
        </div>
      {/each}
    {/if}
  </div>
  <div bind:this={previewEl}>
    {#each docs as item, i}
      {#if modal.multiplePdf}
        <div class="filename">{i + 1}-{item.doc.title}</div>
      {/if}
      <div class="webview-wrapper">
        <div class="print-size" style:visibility={config.pageSize === "Custom" ? "visible" : "hidden"}>
          {item.printSize ?? ""}
        </div>
        <webview
          src="app://obsidian.md/help.html"
          nodeintegration={true}
          class="print-preview-container"
          style="--modal-scale: {scale};"
          use:initWebviewEvents={item}
        ></webview>
      </div>
    {/each}
  </div>
</div>
