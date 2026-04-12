<script lang="ts">
  import type BetterExportPdfPlugin from "../main";
  import type { ExportConfigType, ExportConfigModal } from "../modal";
  import { settingToggle, settingDropdown, settingSlider, settingButton, settingDoubleText } from "../actions";
  import * as electron from "electron";

  let {
    modal,
    plugin,
    config = $bindable(),
    pdfPreview,
    lastPreview,
    handleExport,
    refreshPreview,
  }: {
    modal: ExportConfigModal;
    plugin: BetterExportPdfPlugin;
    config: ExportConfigType;
    pdfPreview: any;
    lastPreview: electron.WebviewTag | null;
    handleExport: () => void;
    refreshPreview: () => Promise<void>;
  } = $props();

  const i18n = $derived(plugin.i18n);
  const settings = $derived(plugin.settings);

  // ── Derived visibility states ──────────────────────────
  let showCustomSize = $derived(config.pageSize === "Custom");
  let showCustomMargin = $derived(config.marginType === "3");

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

  function handleKeyup(event: KeyboardEvent) {
    if (event.key === "Enter") {
      handleExport();
    }
  }
</script>

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
        pdfPreview?.toggleTitle(value);
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
        config.pageSize = value as ExportConfigType["pageSize"];
        pdfPreview?.calcPageSize();
        await pdfPreview?.calcWebviewSize();
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
            pdfPreview?.calcPageSize();
            await pdfPreview?.calcWebviewSize();
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
          await pdfPreview?.renderPreview(false);
        },
      }}
    ></div>
  {/if}

  <!-- PDF Preview -->
  <div
    use:settingToggle={{
      name: "PDF Preview",
      tooltip: "PDF Preview",
      value: config.pdfPreview ?? false,
      onChange: (value) => {
        config.pdfPreview = value;
        if (value) {
          pdfPreview?.renderPreview(true);
        }
      },
    }}
  ></div>
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
