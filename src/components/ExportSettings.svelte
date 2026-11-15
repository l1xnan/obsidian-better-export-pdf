<script lang="ts">
  import type BetterExportPdfPlugin from "../main";
  import type { ExportConfigType, ExportConfigModal } from "../modal";
  import { settingToggle, settingDropdown, settingSlider, settingButton, settingDoubleText } from "../actions";

  let {
    modal,
    plugin,
    config = $bindable(),
    pdfPreview,
    handleExport,
    refreshPreview,
  }: {
    modal: ExportConfigModal;
    plugin: BetterExportPdfPlugin;
    config: ExportConfigType;
    pdfPreview: any;
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
  const pageSizeOptions = $derived(Object.fromEntries(
    pageSizes.map((s) => [s, s === "Custom" ? i18n.exportDialog.customPageSize : s]),
  ));

  const marginOptions: Record<string, string> = $derived({
    "0": i18n.exportDialog.marginNone,
    "1": i18n.exportDialog.marginDefault,
    "2": i18n.exportDialog.marginSmall,
    "3": i18n.exportDialog.marginCustom,
  });

  // ── CSS Snippets ───────────────────────────────────────
  const snippets = $derived(modal.cssSnippets());
  const hasSnippets = $derived(Object.keys(snippets).length > 0 && settings.enabledCss);
  const snippetOptions = $derived({ "0": i18n.exportDialog.cssNone, ...snippets });

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
      tooltip: i18n.exportDialog.filenameAsTitle,
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
        await pdfPreview?.handleChangeSize?.();
      },
    }}
  ></div>

  <!-- Custom Width / Height -->
  {#if showCustomSize}
    <div
      use:settingDoubleText={{
        name: i18n.exportDialog.widthHeight,
        input1: {
          placeholder: i18n.exportDialog.width,
          value: config.pageWidth ?? "",
          isDebounce: true,
          onChange: async (value) => {
            config.pageWidth = value;
            await pdfPreview?.handleChangeSize?.();
          },
        },
        input2: {
          placeholder: i18n.exportDialog.height,
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
      desc: i18n.exportDialog.marginDescription,
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
        name: i18n.exportDialog.topBottom,
        input1: {
          placeholder: i18n.exportDialog.marginTop,
          value: config.marginTop ?? "",
          onChange: (value) => {
            config.marginTop = value;
          },
        },
        input2: {
          placeholder: i18n.exportDialog.marginBottom,
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
        name: i18n.exportDialog.leftRight,
        input1: {
          placeholder: i18n.exportDialog.marginLeft,
          value: config.marginLeft ?? "",
          onChange: (value) => {
            config.marginLeft = value;
          },
        },
        input2: {
          placeholder: i18n.exportDialog.marginRight,
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
      tooltip: i18n.exportDialog.landscapeTooltip,
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
      tooltip: i18n.exportDialog.headerTooltip,
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
      tooltip: i18n.exportDialog.footerTooltip,
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
      tooltip: i18n.exportDialog.openAfterExportTooltip,
      value: config.open,
      onChange: (value) => {
        config.open = value;
      },
    }}
  ></div>

  <!-- CSS Snippets -->
  {#if hasSnippets && settings.version == "1"}
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

  <!-- Export Button -->
  <div
    use:settingButton={{
      text: i18n.exportDialog.exportButton,
      cta: true,
      onClick: () => handleExport(),
    }}
  ></div>

  <!-- Refresh Button -->
  {#if settings.version == "1"}
    <div
      use:settingButton={{
        text: i18n.exportDialog.refreshButton,
        onClick: () => refreshPreview(),
      }}
    ></div>
  {/if}

  <!-- Debug Button -->
  <div
    use:settingButton={{
      text: i18n.exportDialog.debugButton,
      hidden: !settings?.debug,
      onClick: () => pdfPreview?.handleOpenDevTools(),
    }}
  ></div>
</div>
