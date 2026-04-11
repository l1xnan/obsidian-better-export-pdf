<script lang="ts">
  import { onMount } from "svelte";
  import type BetterExportPdfPlugin from "../main";
  import type { TConfig, SvelteModal } from "./SvelteModal";
  import { settingToggle, settingDropdown, settingSlider, settingButton, settingDoubleText, icon } from "../actions";
  import type { ParamType } from "../render";

  let {
    modal,
    plugin,
    config = $bindable(),
  }: {
    modal: SvelteModal;
    plugin: BetterExportPdfPlugin;
    config: TConfig;
  } = $props();

  const i18n = $derived(plugin.i18n);
  const settings = $derived(plugin.settings);

  // ── Derived visibility states ──────────────────────────
  let showCustomSize = $state(config.pageSize === "Custom");
  let showCustomMargin = $state(config.marginType === "3");

  // Progress
  let renderStates = $state<{ filename: string; status: number }[]>([]);

  export function initRenderStates(data: ParamType[]) {
    data.forEach((param) => {
      renderStates.push({ status: 0, filename: param.file.name });
    });
  }
  export function updateRenderStates(i: number) {
    renderStates[i].status = 1;

    console.log("renderStates:", renderStates);
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
    // Bind previewDiv on the modal so external logic can reference it
    modal.previewDiv = previewEl;

    const resizeObserver = new ResizeObserver(() => {
      modal.calcPageSize(previewEl);
    });
    resizeObserver.observe(previewEl);

    // Initial render
    modal.appendWebviews(previewEl).then(() => {
      modal.togglePrintSize();
    });

    return () => {
      resizeObserver.disconnect();
    };
  });

  function handleKeyup(event: KeyboardEvent) {
    if (event.key === "Enter") {
      modal.handleExport();
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
    <div bind:this={previewEl}></div>
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
          modal.toggleTitle(value);
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
          await modal.onPageSizeChange();
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
              modal.calcPageSize();
              await modal.calcWebviewSize();
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
            await modal.onCssSnippetChange();
          },
        }}
      ></div>
    {/if}

    <!-- Export Button -->
    <div
      use:settingButton={{
        text: "Export",
        cta: true,
        onClick: () => modal.handleExport(),
      }}
    ></div>

    <!-- Refresh Button -->
    <div
      use:settingButton={{
        text: "Refresh",
        onClick: () => modal.refreshPreview(),
      }}
    ></div>

    <!-- Debug Button -->
    <div
      use:settingButton={{
        text: "Debug",
        hidden: !settings?.debug,
        onClick: () => modal.preview?.openDevTools(),
      }}
    ></div>
  </div>
</div>
