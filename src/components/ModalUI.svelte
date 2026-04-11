<script lang="ts">
  import { onMount } from "svelte";
  import type BetterExportPdfPlugin from "../main";
  import type { TConfig, ExportConfigModal } from "../modal";
  import { TFile } from "obsidian";
  import { settingToggle, settingDropdown, settingSlider, settingButton, settingDoubleText, icon } from "../actions";
  import { getAllStyles, getPatchStyle, renderMarkdown, type ParamType } from "../render";
  import { exportToPDF, getOutputFile, getOutputPath } from "../pdf";
  import { PageSize } from "../constant";
  import * as electron from "electron";
  import { mm2px, safeParseFloat, px2mm, isNumber, safeParseInt } from "../utils";
  import { fixDoc } from "../render";
  import pLimit from "p-limit";
  const fs = require("fs").promises;

  let {
    modal,
    plugin,
    config = $bindable(),
  }: {
    modal: ExportConfigModal;
    plugin: BetterExportPdfPlugin;
    config: TConfig;
  } = $props();

  // Webview state
  let webviews = $state<electron.WebviewTag[]>([]);
  let lastPreview = $state<electron.WebviewTag | null>(null);
  let completed = $state(false);

  const i18n = $derived(plugin.i18n);
  const settings = $derived(plugin.settings);

  // ── Derived visibility states ──────────────────────────
  let showCustomSize = $state(config.pageSize === "Custom");
  let showCustomMargin = $state(config.marginType === "3");

  // Progress
  let renderStates = $state<{ filename: string; status: number }[]>([]);
  let docs = $state<any[]>([]);
  let scale = $state(0.75);

  export function calcPageSize(element?: HTMLDivElement) {
    const { pageSize, pageWidth } = config;
    const el = element ?? previewEl;
    if (!el) return;
    const width = PageSize?.[pageSize as string]?.[0] ?? safeParseFloat(pageWidth as string, 210);
    scale = Math.floor((mm2px(width) / el.offsetWidth) * 100) / 100;
  }

  export function initRenderStates(data: ParamType[]) {
    renderStates = data.map((param) => ({ status: 0, filename: param.file.name }));
  }
  export function updateRenderStates(i: number) {
    renderStates[i].status = 1;
  }

  export async function calcWebviewSize() {
    // @ts-ignore
    await sleep(500);

    webviews.forEach(async (e, i) => {
      const [width, height] = await e.executeJavaScript("[document.body.offsetWidth, document.body.offsetHeight]");
      docs[i].printSize = `${width}×${height}px²\n${px2mm(width)}×${px2mm(height)}mm²`;
    });
  }

  async function renderFiles(data: ParamType[], docs?: any[], cb?: (i: number) => void) {
    const concurrency = safeParseInt(plugin.settings.concurrency) || 5;
    const limit = pLimit(concurrency);

    const inputs = data.map((param, i) =>
      limit(async () => {
        const res = await renderMarkdown(param);
        cb?.(i);
        return res;
      }),
    );
    let _docs = [...(docs ?? []), ...(await Promise.all(inputs))];

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
      initRenderStates(data);
      docs = await renderFiles(data, allDocs, (i) => updateRenderStates(i));
    }

    webviews = [];
    lastPreview = null;

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

  function toggleTitle(value: boolean) {
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

  export async function onCssSnippetChange() {
    await renderPreview(false);
  }

  export async function refreshPreview() {
    await renderPreview(true);
  }

  export async function handleExport() {
    plugin.settings.prevConfig = config;
    await plugin.saveSettings();

    if (config["pageSize"] == "Custom") {
      if (!isNumber(config["pageWidth"] ?? "") || !isNumber(config["pageHeight"] ?? "")) {
        alert("When the page size is Custom, the Width/Height cannot be empty.");
        return;
      }
    }

    const title = (modal.file as TFile)?.basename ?? modal.file?.name;

    if (modal.multiplePdf) {
      const outputPath = await getOutputPath(title);
      if (outputPath) {
        await Promise.all(
          webviews.map(async (wb, i) => {
            await exportToPDF(
              `${outputPath}/${docs[i].file.basename}.pdf`,
              { ...plugin.settings, ...config },
              wb,
              docs[i],
            );
          }),
        );
        modal.close();
      }
    } else {
      const outputFile = await getOutputFile(title, plugin.settings.isTimestamp);
      if (outputFile) {
        await exportToPDF(outputFile, { ...plugin.settings, ...config }, webviews[0], docs[0]);
        modal.close();
      }
    }
  }

  function initWebviewEvents(preview: any, docObj: any) {
    webviews.push(preview);
    lastPreview = preview; // keep track of the latest one

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
      await preview.executeJavaScript(modal.makeWebviewJs(docObj.doc));
      getPatchStyle().forEach(async (css) => {
        await preview.insertCSS(css);
      });
      if (docObj.resolve) {
        docObj.resolve();
      }
    };

    preview.addEventListener("dom-ready", handler);

    return {
      destroy() {
        preview.removeEventListener("dom-ready", handler);
      },
    };
  }

  // ── Page sizes ─────────────────────────────────────────
  const pageSizes = ["A0", "A1", "A2", "A3", "A4", "A5", "A6", "Legal", "Letter", "Tabloid", "Ledger", "Custom"];
  const pageSizeOptions = Object.fromEntries(pageSizes.map((s) => [s, s]));

  const marginOptions: Record<string, string> = {
    "0": "None",
    "1": "Default",
    "2": "Small",
    "3": "Custom",
  };

  // ── CSS Snippets ───────────────────────────────────────
  const snippets = $derived(modal.cssSnippets());
  const hasSnippets = $derived(Object.keys(snippets).length > 0 && settings.enabledCss);
  const snippetOptions = $derived({ "0": "Not select", ...snippets });

  // ── Preview area ref ───────────────────────────────────
  let previewEl: HTMLDivElement;

  onMount(() => {
    const resizeObserver = new ResizeObserver(() => {
      calcPageSize(previewEl);
    });
    resizeObserver.observe(previewEl);

    // Initial render
    renderPreview(true);

    return () => {
      resizeObserver.disconnect();
    };
  });

  function handleKeyup(event: KeyboardEvent) {
    if (event.key === "Enter") {
      handleExport();
    }
  }
</script>

<div id="better-export-pdf">
  <!-- PDF Preview Area -->
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
        <div class="webview-wrapper">
          <div class="print-size" style:visibility={config.pageSize === "Custom" ? "visible" : "hidden"}>
            {item.printSize ?? ""}
          </div>
          <webview
            src="app://obsidian.md/help.html"
            nodeintegration={true}
            class="pdf-preview-webview"
            style="--modal-scale: {scale};"
            use:initWebviewEvents={item}
          ></webview>
        </div>
      {/each}
    </div>
  </div>

  <!-- Settings Sidebar -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="setting-wrapper" onkeyup={handleKeyup}>
    <!-- Filename as Title -->
    <div
      use:settingToggle={{
        name: i18n.exportDialog.filenameAsTitle,
        tooltip: "Include file name as title",
        value: config.showTitle,
        onChange: (value) => {
          config.showTitle = value;
          toggleTitle(value);
        },
      }}
    ></div>

    <!-- Page Size -->
    <div
      use:settingDropdown={{
        name: i18n.exportDialog.pageSize,
        options: pageSizeOptions,
        value: config.pageSize as string,
        onChange: async (value) => {
          config.pageSize = value as TConfig["pageSize"];
          showCustomSize = value === "Custom";
          calcPageSize();
          await calcWebviewSize();
        },
      }}
    ></div>

    <!-- Custom Width / Height -->
    {#if showCustomSize}
      <div
        use:settingDoubleText={{
          name: "Width/Height",
          input1: {
            placeholder: "width",
            value: config.pageWidth ?? "",
            isDebounce: true,
            onChange: async (value) => {
              config.pageWidth = value;
              calcPageSize();
              await calcWebviewSize();
            },
          },
          input2: {
            placeholder: "height",
            value: config.pageHeight ?? "",
            onChange: (value) => {
              config.pageHeight = value;
            },
          },
        }}
      ></div>
    {/if}

    <!-- Margin -->
    <div
      use:settingDropdown={{
        name: i18n.exportDialog.margin,
        desc: "The unit is millimeters.",
        options: marginOptions,
        value: config.marginType,
        onChange: (value) => {
          config.marginType = value;
          showCustomMargin = value === "3";
        },
      }}
    ></div>

    <!-- Custom Margin Top/Bottom -->
    {#if showCustomMargin}
      <div
        use:settingDoubleText={{
          name: "Top/Bottom",
          input1: {
            placeholder: "margin top",
            value: config.marginTop ?? "",
            onChange: (value) => {
              config.marginTop = value;
            },
          },
          input2: {
            placeholder: "margin bottom",
            value: config.marginBottom ?? "",
            onChange: (value) => {
              config.marginBottom = value;
            },
          },
        }}
      ></div>

      <!-- Custom Margin Left/Right -->
      <div
        use:settingDoubleText={{
          name: "Left/Right",
          input1: {
            placeholder: "margin left",
            value: config.marginLeft ?? "",
            onChange: (value) => {
              config.marginLeft = value;
            },
          },
          input2: {
            placeholder: "margin right",
            value: config.marginRight ?? "",
            onChange: (value) => {
              config.marginRight = value;
            },
          },
        }}
      ></div>
    {/if}

    <!-- Scale -->
    <div
      use:settingSlider={{
        name: i18n.exportDialog.downscalePercent,
        limits: [0, 200, 1],
        value: config.scale,
        onChange: (value) => {
          config.scale = value;
        },
      }}
    ></div>

    <!-- Landscape -->
    <div
      use:settingToggle={{
        name: i18n.exportDialog.landscape,
        tooltip: "landscape",
        value: config.landscape,
        onChange: (value) => {
          config.landscape = value;
        },
      }}
    ></div>

    <!-- Display Header -->
    <div
      use:settingToggle={{
        name: i18n.exportDialog.displayHeader,
        tooltip: "Display header",
        value: config.displayHeader,
        onChange: (value) => {
          config.displayHeader = value;
        },
      }}
    ></div>

    <!-- Display Footer -->
    <div
      use:settingToggle={{
        name: i18n.exportDialog.displayFooter,
        tooltip: "Display footer",
        value: config.displayFooter,
        onChange: (value) => {
          config.displayFooter = value;
        },
      }}
    ></div>

    <!-- Open after export -->
    <div
      use:settingToggle={{
        name: i18n.exportDialog.openAfterExport,
        tooltip: "Open the exported file after exporting.",
        value: config.open,
        onChange: (value) => {
          config.open = value;
        },
      }}
    ></div>

    <!-- CSS Snippets -->
    {#if hasSnippets}
      <div
        use:settingDropdown={{
          name: i18n.exportDialog.cssSnippets,
          options: snippetOptions,
          value: config.cssSnippet ?? "0",
          onChange: async (value) => {
            config.cssSnippet = value;
            await renderPreview(false);
          },
        }}
      ></div>
    {/if}

    <!-- Export Button -->
    <div
      use:settingButton={{
        text: "Export",
        cta: true,
        onClick: () => handleExport(),
      }}
    ></div>

    <!-- Refresh Button -->
    <div
      use:settingButton={{
        text: "Refresh",
        onClick: () => refreshPreview(),
      }}
    ></div>

    <!-- Debug Button -->
    <div
      use:settingButton={{
        text: "Debug",
        hidden: !settings?.debug,
        onClick: () => lastPreview?.openDevTools(),
      }}
    ></div>
  </div>
</div>
