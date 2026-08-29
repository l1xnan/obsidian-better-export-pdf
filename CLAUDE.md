# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Install dependencies (skip Electron binary download):
```bash
set ELECTRON_SKIP_BINARY_DOWNLOAD=1 && pnpm i
```

Development build with watch mode:
```bash
pnpm dev
```

Production build (runs TypeScript check first):
```bash
pnpm build
```

Bump version (updates `manifest.json` and `versions.json`):
```bash
pnpm version
```

There are no automated tests in this project.

## Architecture

This is an Obsidian desktop plugin (Electron-based) that exports notes to PDF with bookmarks/outlines, header/footer, and live preview.

**Entry point:** `src/main.ts` — registers the plugin, commands (command palette + file context menu), and settings tab.

**Export flow (v2, the default):**

1. User triggers export → `ExportConfigModal` opens (`src/modal.ts`) and mounts the `ModalUI` Svelte component.
2. `ModalUI` (`src/components/ModalUI.svelte`) coordinates between the settings sidebar (`ExportSettings.svelte`) and the preview pane (`PdfPreviewV2.svelte`).
3. `PdfPreviewV2.svelte` calls `renderMarkdownV2` from `src/render.ts` to render each note as an `HTMLDivElement` attached to `document.body` under a `.print` wrapper. For multi-file exports (TOC notes or folder exports) these are either merged into one or kept separate based on `multiplePdf`.
4. To generate the PDF, the component calls `printToPdf` (IPC to Electron's main process via `print-to-pdf` channel) with `electron.PrintToPDFOptions` built by `makePrintOptions` in `src/pdf.ts`.
5. After the raw PDF bytes are returned, `editPDF` in `src/pdf.ts` post-processes them with `pdf-lib`: it reads `af://` anchor URIs injected during rendering to compute heading positions, then calls `setOutline` to write a PDF bookmark tree, and optionally sets PDF metadata from frontmatter.

**Anchor/link resolution mechanism:**
- During rendering, `modifyDest` (`src/utils/index.ts`) appends invisible `<a class="md-print-anchor" href="af://h2-0">` anchors to each heading, and maps heading text variations to those flags.
- `fixAnchors` converts `[[wikilink#heading]]` internal links and standard `#anchor` markdown links to `an://flag` URIs.
- After PDF generation, `getDestPosition` reads `af://` links to find the page/y-position of each heading, and `setAnchors` rewrites `an://` links to PDF internal `Dest` arrays pointing to those positions.

**V1 vs V2:** The plugin has two renderer versions selectable in settings. V1 (`PdfPreview.svelte`) uses a `<webview>` tag for rendering; V2 (default) injects rendered HTML directly into `document.body` and uses IPC. New work should target V2.

**Svelte actions** (`src/actions/index.ts`): Custom Svelte actions (`use:obsidianSetting`, `use:settingToggle`, `use:settingDropdown`, etc.) wrap Obsidian's `Setting` API so it can be used declaratively in Svelte templates. The `promote` helper lifts a `Setting`'s DOM children up into the Svelte node to flatten the DOM hierarchy.

**Key files:**
- `src/render.ts` — Markdown → HTML rendering, CSS extraction, canvas→image conversion
- `src/pdf.ts` — PDF post-processing: outlines, anchors, metadata, print options
- `src/utils/index.ts` — heading tree builder, anchor/link fixers, template renderer
- `src/utils/pageSize.ts` — calculates preview scale from container dimensions
- `src/utils/mutex.ts` — simple mutex to prevent concurrent `document.title` mutation during multi-file PDF export

**Build:** esbuild bundles everything into `build/main.js` (CJS format targeting ES2018). Svelte components are compiled via `esbuild-svelte`. `obsidian` and `electron` are externalized (provided by Obsidian at runtime). `styles.css` and `manifest.json` are also copied into `build/` at build time. The entire `build/` directory is what gets installed into an Obsidian vault's `.obsidian/plugins/better-export-pdf/` directory.

**Build output rule:** All compiled artifacts (`main.js`, `styles.css`, `manifest.json`) must always go into the `build/` folder. Never output compiled files to the project root. The `build/` directory is git-ignored.
