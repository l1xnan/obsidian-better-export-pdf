<script lang="ts">
  import type BetterExportPdfPlugin from "../main";
  import type { ExportConfigType, ExportConfigModal } from "../modal";
  import * as electron from "electron";
  import { isNumber } from "../utils";
  import ExportSettings from "./ExportSettings.svelte";
  import { untrack } from "svelte";
  import PdfPreview from "./PdfPreview.svelte";
  import PdfPreview2 from "./PdfPreviewV2.svelte";

  let {
    modal,
    plugin,
  }: {
    modal: ExportConfigModal;
    plugin: BetterExportPdfPlugin;
  } = $props();

  let config = $state<ExportConfigType>(untrack(() => $state.snapshot(modal.defaultConfig)));

  let lastPreview = $state<electron.WebviewTag | null>(null);

  let pdfPreview = $state<PdfPreview | null>(null);

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
  {#if plugin.settings?.version == "v1"}
    <PdfPreview {modal} {plugin} {config} bind:lastPreview bind:this={pdfPreview} />
  {:else}
    <PdfPreview2 {modal} {plugin} {config} bind:this={pdfPreview} />
  {/if}

  <!-- Settings Sidebar -->
  <ExportSettings {modal} {plugin} bind:config {pdfPreview} {lastPreview} {handleExport} {refreshPreview} />
</div>
