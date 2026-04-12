<script lang="ts">
  import type BetterExportPdfPlugin from "../main";
  import type { TConfig, ExportConfigModal } from "../modal";
  import * as electron from "electron";
  import { isNumber } from "../utils";
  import ExportSettings from "./ExportSettings.svelte";
  import PdfPreview from "./PdfPreview.svelte";

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
  let docs = $state<any[]>([]);

  let pdfPreview = $state<PdfPreview | null>(null);

  const settings = $derived(plugin.settings);

  export async function onCssSnippetChange() {
    await pdfPreview?.renderPreview(false);
  }

  export async function refreshPreview() {
    await pdfPreview?.renderPreview(true);
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

    await pdfPreview?.handlePrintToPDF();

        modal.close();
  }
</script>

<div id="better-export-pdf">
  <!-- PDF Preview Area -->
  <PdfPreview
    {modal}
    {plugin}
    {config}
    bind:webviews
    bind:docs
    bind:lastPreview
    bind:completed
    bind:this={pdfPreview}
  />

  <!-- Settings Sidebar -->
  <ExportSettings {modal} {plugin} bind:config {pdfPreview} {lastPreview} {handleExport} {refreshPreview} />
</div>
