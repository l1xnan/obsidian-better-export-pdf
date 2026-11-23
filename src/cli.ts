import * as electron from "electron";
import { MarkdownView, Notice, TFile, requireApiVersion, type CliData } from "obsidian";
import path from "path";
import type BetterExportPdfPlugin from "./main";
import type { ExportConfigType } from "./modal";
import { editPDF, makePrintOptions, writePdfFile } from "./pdf";
import { printFilesInHiddenWindow } from "./render";
import { safeParseInt } from "./utils";
const fs = require("fs").promises;

function vaultBase(plugin: BetterExportPdfPlugin): string {
  // @ts-ignore
  return plugin.app.vault.adapter.basePath as string;
}

function cliConfig(plugin: BetterExportPdfPlugin, open: boolean): ExportConfigType & BetterExportPdfPlugin["settings"] {
  return {
    pageSize: "A4",
    marginType: "1",
    showTitle: plugin.settings.showTitle ?? true,
    open,
    scale: 100,
    landscape: false,
    marginTop: "10",
    marginBottom: "10",
    marginLeft: "10",
    marginRight: "10",
    displayHeader: plugin.settings.displayHeader ?? true,
    displayFooter: plugin.settings.displayHeader ?? true,
    cssSnippet: "0",
    ...plugin.settings,
    ...(plugin.settings.prevConfig ?? {}),
    open,
  };
}

function resolveFile(plugin: BetterExportPdfPlugin, fileParam?: string): TFile | string {
  if (!fileParam) {
    const file = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.file;
    if (!file) {
      return "Error: no active note. Pass file=<vault path>.";
    }
    return file;
  }
  const abstract = plugin.app.vault.getAbstractFileByPath(fileParam);
  if (!(abstract instanceof TFile)) {
    return `Error: file not found: ${fileParam}`;
  }
  return abstract;
}

function resolveOutput(plugin: BetterExportPdfPlugin, file: TFile, pathParam?: string): string {
  const base = vaultBase(plugin);
  if (!pathParam) {
    const directory = path.posix.dirname(file.path);
    const name = `${file.basename}.pdf`;
    return path.join(base, directory === "." ? "" : directory, name);
  }
  if (path.isAbsolute(pathParam)) {
    return pathParam;
  }
  return path.join(base, pathParam);
}

export async function exportNoteFromCli(plugin: BetterExportPdfPlugin, params: CliData): Promise<string> {
  const file = resolveFile(plugin, params.file);
  if (typeof file === "string") {
    return file;
  }

  const outputFile = resolveOutput(plugin, file, params.path);
  const config = cliConfig(plugin, params.open === "true");

  try {
    await fs.mkdir(path.dirname(outputFile), { recursive: true });
    const printed = await printFilesInHiddenWindow({
      app: plugin.app,
      files: [file],
      config,
      options: { ...makePrintOptions(config, plugin.app.metadataCache.getFileCache(file)?.frontmatter), filepath: outputFile },
    });

    let data: Uint8Array = await fs.readFile(outputFile);
    data = await editPDF(data, {
      headings: printed.headings,
      frontMatter: printed.frontMatter,
      displayMetadata: config.displayMetadata,
      maxLevel: safeParseInt(config.maxLevel, 6),
    });
    const writeError = await writePdfFile(outputFile, data);
    if (writeError) {
      return `Error: ${writeError}`;
    }
    if (config.open) {
      // @ts-ignore
      electron.remote.shell.openPath(outputFile);
    }
    new Notice(`Exported ${outputFile}`);
    return outputFile;
  } catch (error) {
    console.error(error);
    const message = `导出 PDF 失败：${(error as Error)?.message ?? error}`;
    new Notice(message);
    return `Error: ${message}`;
  }
}

export function registerExportCli(plugin: BetterExportPdfPlugin) {
  if (!requireApiVersion("1.12.2") || typeof plugin.registerCliHandler !== "function") {
    return;
  }
  plugin.registerCliHandler(
    "better-export-pdf",
    "Export a note to PDF with the v2 print pipeline and saved settings, without a dialog.",
    {
      file: {
        description: "Vault-relative note path. Defaults to the active note.",
      },
      path: {
        description: "Output PDF path. Absolute, or relative to the vault. Defaults to a PDF beside the note.",
      },
      open: {
        description: "Open the PDF after export.",
      },
    },
    (params) => exportNoteFromCli(plugin, params),
  );
}
