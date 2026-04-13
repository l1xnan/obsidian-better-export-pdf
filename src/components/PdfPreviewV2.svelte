<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type BetterExportPdfPlugin from "../main";
  import type { ExportConfigType, ExportConfigModal, DocType, FileListType, DocV2Type } from "../modal";
  import { TFile } from "obsidian";
  import { fixDocV2, printToPdf, renderMarkdownV2 } from "../render";
  import { PageSize } from "../constant";
  import * as electron from "electron";
  import { mm2px, safeParseFloat, safeParseInt } from "../utils";
  import pLimit from "p-limit";
  import { icon } from "../actions";
  const fs = require("fs").promises;
  import { loadPdfJs } from "obsidian";
  import * as os from "os";
  import * as path from "path";
  import { getOutputFile } from "../pdf";

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
  let printEl = $state<HTMLDivElement>();

  // Progress
  let renderStates = $state<{ filename: string; status: number }[]>([]);
  let scale = $state(0.75);
  let previewEl = $state<HTMLDivElement>();
  let docs = $state<DocType[]>([]);
  let canvasDocs = $state<HTMLCanvasElement[]>([]);

  export function calcPageSize() {
    const { pageSize, pageWidth } = config;
    if (!previewEl) return;
    const width = PageSize?.[pageSize as string]?.[0] ?? safeParseFloat(pageWidth as string, 210);
    scale = Math.floor((mm2px(width) / previewEl.offsetWidth) * 100) / 100;
  }

  function initRenderStates(data: FileListType) {
    renderStates = data.map((param) => ({ status: 0, filename: param.file.name }));
  }
  function updateRenderStates(i: number) {
    renderStates[i].status = 1;
  }

  export async function calcWebviewSize() {}

  async function renderFiles(data: FileListType, cb?: (i: number) => void) {
    const concurrency = safeParseInt(settings.concurrency) || 5;
    const limit = pLimit(concurrency);
    console.log("file list data:", data);
    const inputs = data.map((param, i) =>
      limit(async () => {
        const res = await renderMarkdownV2({
          app: modal.app,
          file: param.file,
          config,
        });
        cb?.(i);
        return res;
      }),
    );
    let _docs = [...(await Promise.all(inputs))] as DocV2Type[];

    console.log(_docs, modal.multiplePdf);

    if (!modal.multiplePdf && _docs.length > 1) {
      _docs = modal.mergeDocV2(_docs);
    }
    return _docs.map(({ doc, ...rest }) => {
      return { ...rest, doc: fixDocV2(doc as unknown as Document, doc.title) };
    });
  }

  export async function renderPreview(render = true) {
    if (render) {
      const { data } = await modal.getAllFilesV2();
      initRenderStates(data);
      docs = await renderFiles(data, (i) => updateRenderStates(i));
    }

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
    docs.forEach(({ doc }) => {
      const _title = doc?.querySelector("h1.__title__") as HTMLHeadingElement;
      if (_title) {
        _title.style.display = value ? "block" : "none";
      }
    });
  }

  export async function handlePrintToPDF() {
    console.log("printEl", printEl);
    const title = (modal.file as TFile)?.basename ?? modal.file?.name;
    const outputFile = await getOutputFile(title, settings.isTimestamp);

    const el = document.querySelector(".print");

    const res = await printToPdf(el, {
      filepath: outputFile,
      includeName: true,
      landscape: false,
      marginsType: 0,
      open: true,
      pageSize: "A4",
      scale: 1,
      scaleFactor: 100,
    });
    console.log("print res", res);
  }

  onMount(() => {
    if (!previewEl) return;
    const resizeObserver = new ResizeObserver(() => {
      calcPageSize();
    });
    resizeObserver.observe(previewEl);

    // Initial render
    renderPreview(true);

    return async () => {
      resizeObserver.disconnect();
    };
  });

  onDestroy(() => {
    // 只清理当前组件内部的 .print 元素
    document.querySelectorAll(".print").forEach((el) => el.remove());
  });

  $effect(() => {
    console.log("config:", $state.snapshot(config));
  });
  function mountNodes(node: HTMLElement, docs: DocType[]) {
    const update = (newDocs: DocType[]) => {
      console.log("newDocs", $state.snapshot(newDocs));
      node.innerHTML = "";
      newDocs.forEach((item) => node.appendChild(item.doc.cloneNode(true)));
    };

    update(docs);

    return {
      update,
      destroy() {
        node.innerHTML = "";
      },
    };
  }

  async function renderPdf() {
    // 1. 加载 PDF.js 库
    const pdfjsLib = await loadPdfJs();
    const tempDir = os.tmpdir();

    // 生成一个唯一的文件名
    const tempFilePath = path.join(tempDir, `obsidian-temp-${Date.now()}.pdf`);

    // const el = document.querySelector(".print");
    const el = docs[0].doc;

    const res = await printToPdf(el, {
      filepath: tempFilePath,
      includeName: true,
      landscape: false,
      marginsType: 0,
      open: false,
      pageSize: "A4",
      scale: 1,
      scaleFactor: 100,
    });

    console.log(tempFilePath);
    await sleep(200);
    // 2. 读取文件为 ArrayBuffer
    const content = await fs.readFile(tempFilePath);

    // // 3. 加载文档
    const loadingTask = pdfjsLib.getDocument({ data: content });
    const pdf = await loadingTask.promise;

    const canvasNodes = [];

    // 4. 循环处理每一页
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);

      // 创建 Canvas 节点
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      const viewport = page.getViewport({ scale: 2 }); // 设置缩放
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // 渲染到 Canvas
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      canvasNodes.push(canvas);
    }
    canvasDocs = canvasNodes;
    return canvasNodes; // 这就是你需要的 DOM Node 列表
  }

  function mountCanvas(container: HTMLElement, canvas: HTMLCanvasElement) {
    const update = (newCanvas: HTMLCanvasElement) => {
    container.innerHTML = "";
      if (newCanvas) {
        newCanvas.style.width = "100%"; // 使用更安全的方式设置样式
        container.appendChild(newCanvas);
      }
    };
    update(canvas);
    return {
      update,
    };
  }
</script>

<div class="pdf-preview">
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
    {/each}
    <div class="webview-wrapper">
      <button onclick={renderPdf}>Preview</button>
      <div class="pdf-preview-webview" style="--modal-scale: {scale};">
        <div
          class="print"
          bind:this={printEl}
          use:mountNodes={docs}
          style:display={config?.pdfPreview ? "none" : "block"}
        ></div>
        <div style:display={config?.pdfPreview ? "block" : "none"}>
          {#each canvasDocs as canvas (canvas)}
            <div class="pdf-canvas-container" use:mountCanvas={canvas}></div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
</style>
