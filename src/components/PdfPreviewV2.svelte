<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type BetterExportPdfPlugin from "../main";
  import type { ExportConfigType, ExportConfigModal, DocType, FileListType, DocV2Type } from "../modal";
  import { TFile } from "obsidian";
  import { fixDocV2, printToPdf, renderMarkdownV2 } from "../render";
  import * as electron from "electron";
  import { getHeadingTree, safeParseInt } from "../utils";
  import pLimit from "p-limit";
  import { icon, mountCanvas, mountNode } from "../actions";
  const fs = require("fs").promises;
  import { loadPdfJs } from "obsidian";
  import * as os from "os";
  import * as path from "path";
  import { editPDF, getOutputFile, getOutputPath, makePrintOptions } from "../pdf";
  import Switch from "./Switch.svelte";
  import { Mutex } from "../utils/mutex";
  import { initRenderStates, completeRenderState, type RenderState } from "../utils/renderStates";
  import { PageSizeCalculator } from "../utils/pageSize";
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
  let isPDF = $state(false);
  let rendering = $state(false);

  // State
  let renderStates = $state<RenderState[]>([]);
  let scale = $state(0.75);
  let previewEl = $state<HTMLDivElement>();
  let docs = $state<DocType[]>([]);
  let canvasDocs = $state<HTMLCanvasElement[]>([]);
  let pdfCaches = $state<Record<string, string[]>>({});
  let preConfig = $state.snapshot(config);

  const printOptions = $derived(makePrintOptions({ ...settings, ...config }));
  const pageSizeCalc = new PageSizeCalculator(config);

  export function calcPageSize() {
    if (!previewEl) return;
    scale = pageSizeCalc.calc(previewEl);
  }
  export async function handleChangeSize() {
    await calcPageSize();
  }

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
      return { ...rest, doc: fixDocV2(doc, doc.title) as HTMLDivElement };
    });
  }

  export async function renderPreview(render = true) {
    if (render) {
      const { data } = await modal.getAllFilesV2();
      renderStates = initRenderStates(data);
      docs = await renderFiles(data, (i) => { renderStates = completeRenderState(renderStates, i); });
    }

    calcPageSize();
  }

  export async function toggleTitle(value: boolean) {
    docs = docs.map(({ doc, ...rest }) => {
      const _title = doc?.querySelector("h1.__title__") as HTMLHeadingElement;
      if (_title) {
        _title.style.display = value ? "block" : "none";
      }
      return { doc, ...rest };
    });

    previewEl?.querySelectorAll("h1.__title__").forEach((el: HTMLHeadElement) => {
      el.style.display = value ? "block" : "none";
    });
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

  onDestroy(() => {
    // 只清理当前组件内部的 .print 元素
    document.querySelectorAll(".print").forEach((el) => el.remove());
  });

  $effect(() => {
    console.log("config:", $state.snapshot(config));
  });

  const mutex = new Mutex();

  export async function exportToPDF({
    el,
    outputFile,
    title,
    onlyPreview = false,
  }: {
    el: HTMLDivElement;
    outputFile: string;
    title: string;
    onlyPreview?: boolean;
  }) {
    console.log("printOptions:", printOptions);
    const pdfOptions = {
      ...printOptions,
      filepath: outputFile,
    };

    await mutex.run(async () => {
      // 防止标题污染, 同一时间只有一个PDF被渲染
      document.title = title;
      await printToPdf(el, pdfOptions);
    });
    if (onlyPreview) {
      return;
    }

    let data = await fs.readFile(outputFile);

    data = await editPDF(data, {
      headings: getHeadingTree(el as unknown as Document),
      frontMatter: docs[0].frontMatter,
      displayMetadata: settings?.displayMetadata,
      maxLevel: safeParseInt(settings?.maxLevel, 6),
    });

    await fs.writeFile(outputFile, data);
    if (config.open) {
      // @ts-ignore
      electron.remote.shell.openPath(outputFile);
    }
  }

  export async function printDocs({
    docs,
    outfiles,
    cb,
    onlyPreview,
  }: {
    docs: DocType[];
    outfiles: string[];
    cb?: any;
    onlyPreview?: boolean;
  }) {
    const currentTitle = document.title;

    docs.forEach(({ doc }) => {
      (doc as HTMLElement).style.display = "none";
    });

    for (const [i, outfile] of outfiles.entries()) {
      const { doc, file } = docs[i] as { doc: HTMLDivElement; file: TFile };
      const title = file.basename;
      doc.style.display = "block";
      await sleep(200);

      await exportToPDF({ el: doc, outputFile: outfile, title, onlyPreview });
      doc.style.display = "none";
      if (cb) {
        await cb(outfile);
      }
    }
    document.title = currentTitle;
  }

  export async function handlePrintToPDF() {
    const title = (modal.file as TFile)?.basename ?? modal.file?.name;

    const files = [];
    if (modal.multiplePdf) {
      const outputPath = await getOutputPath(title);
      if (!outputPath) {
        return false;
      }
      files.push(...docs.map((item) => `${outputPath}/${item.file.basename}.pdf`));
    } else {
      const outputFile = await getOutputFile(title, settings.isTimestamp);
      if (!outputFile) {
        return false;
      }
      files.push(outputFile);
    }

    await printDocs({ docs, outfiles: files });
    return true;
  }

  async function renderPdf() {
    // 1. 加载 PDF.js 库
    rendering = true;

    const pdfjsLib = await loadPdfJs();
    const tempDir = os.tmpdir();

    let numPages = 0;

    async function renderCanvas(tmpfile: string) {
      // 2. 读取文件为 ArrayBuffer
      const content = await fs.readFile(tmpfile);

      // // 3. 加载文档
      const loadingTask = pdfjsLib.getDocument({ data: content });
      const pdf = await loadingTask.promise;

      console.log("loading tmp file", pdf.numPages);

      // 4. 循环处理每一页
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);

        // 创建 Canvas 节点
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        const viewport = page.getViewport({ scale: 5 }); // 设置缩放
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // 渲染到 Canvas
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        // 5. 更新或追加
        if (numPages < canvasDocs.length) {
          canvasDocs[numPages] = canvas; // 覆盖已有位置
        } else {
          canvasDocs.push(canvas); // 追加新元素
        }
        numPages += 1;
      }
    }

    const key = JSON.stringify(config);
    if (!pdfCaches[key]) {
      // 生成一个唯一的文件名

      const tempFiles = docs.map(({ file }) =>
        path.join(tempDir, `obsidian-temp-${file.path.replace(/[/\\]/g, "_")}-${Date.now()}.pdf`),
      );
      console.log("tempFiles", tempFiles);

      await printDocs({ docs, outfiles: tempFiles, cb: renderCanvas, onlyPreview: true });

      pdfCaches[key] = tempFiles;
    } else {
      console.log(key, pdfCaches[key]);
      for (const file of pdfCaches[key]) {
        await renderCanvas(file);
      }
    }
    canvasDocs.length = numPages;
    rendering = false;

    console.log("loaded tmp canvas pages:", numPages);
  }

  export function handleOpenDevTools() {
    // @ts-ignore
    const c = document.win.electron.remote.getCurrentWebContents();
    c.openDevTools();
  }

  async function toggleModel(model: string) {
    if (model === "pdf") {
      isPDF = true;
      await renderPdf();
      rendering = false;
    } else {
      isPDF = false;
    }
  }

  $effect(() => {
    const current = $state.snapshot(config);
    const changes = [];

    console.log("config changed:", preConfig, current);
    const keys = [
      "pageSize",
      "scale",
      "landscape",
      "marginBottom",
      "marginLeft",
      "marginRight",
      "marginTop",
      "marginType",
      "displayHeader",
      "displayFooter",
      "showTitle",
    ];

    for (const _key of keys) {
      const key = _key as keyof ExportConfigType;
      if (current?.[key] != preConfig?.[key]) {
        changes.push({ key, oldValue: preConfig[key], newValue: current[key] });
      }
    }

    if (changes.length == 0) {
      return;
    }
    preConfig = current;

    if (!isPDF) return;

    rendering = true;
    const timer = setTimeout(async () => {
        await renderPdf();
        rendering = false;
    }, 300);

    return () => clearTimeout(timer);
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
  {#if rendering}
    <div class="rendering">
      <span use:icon={"loader"} style="animation: spin 1s linear infinite;max-width:18px;max-height:18px;"></span>
      <span>Rendering</span>
    </div>
  {/if}
  <Switch initialMode="html" onChange={toggleModel}></Switch>
  <div bind:this={previewEl}>
    <div class="preview-wrapper">
      <div class="print-preview-container" style="--modal-scale: {scale};" style:display={isPDF ? "none" : "block"}>
        {#each docs as item, i}
          {#if modal.multiplePdf}
            <div class="filename">{item.file.name}</div>
          {/if}
          <div class="print-preview-item" use:mountNode={item.doc}></div>
        {/each}
      </div>
      <div style:display={isPDF ? "block" : "none"}>
        {#each canvasDocs as canvas (canvas)}
          <div class="pdf-canvas-page" use:mountCanvas={canvas}></div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .rendering {
    position: absolute;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
  }
</style>
