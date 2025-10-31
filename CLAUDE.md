# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Obsidian plugin that enhances PDF export functionality beyond the official export feature. It adds bookmarks/outlines, page numbers, custom headers/footers, PDF metadata, and supports batch/multi-file exports.

## Build & Development Commands

```bash
# Install dependencies (skip Electron binary download if needed)
set ELECTRON_SKIP_BINARY_DOWNLOAD=1 && npm install

# Development mode (watch mode with sourcemaps)
npm run dev

# Production build (includes TypeScript check)
npm run build

# Version bump (updates manifest.json and versions.json)
npm run version
```

## Architecture

### Core Components

**main.ts** - Plugin entry point
- Registers commands, settings tab, and context menu handlers
- Manages plugin lifecycle and settings persistence
- Adds "Better Export PDF" and "Export folder to PDF" menu items to file context menus
- Supports generating TOC.md files for multi-file exports

**modal.ts** - Export configuration dialog
- Handles the interactive export UI with live preview
- Manages export configurations (page size, margins, headers/footers, CSS snippets)
- Coordinates the rendering and PDF generation pipeline
- Supports both single file and batch/folder exports with concurrency control via p-limit

**render.ts** - Markdown to HTML rendering
- Converts Markdown files to HTML using Obsidian's internal MarkdownRenderer
- Applies CSS styles including print media queries
- Handles special cases: dataview queries, canvas elements, internal embeds
- Uses custom CSS patch to fix printing layout issues
- Manages async post-processing (embeds, images, plugins)
- Waits for dynamic content rendering (dataview, charts) with timeout mechanisms

**pdf.ts** - PDF generation and manipulation
- Uses Electron's printToPDF API for initial PDF generation
- Uses pdf-lib to add outlines/bookmarks from document headings
- Converts internal links (af:// and an://) to PDF anchor destinations
- Adds metadata (title, author, keywords) from frontmatter
- Supports custom page sizes, margins, and header/footer templates

### Key Workflows

**Single File Export:**
1. User opens ExportConfigModal via command/menu
2. Modal renders markdown to HTML using renderMarkdown()
3. HTML is injected into hidden webview elements
4. Webview.printToPDF() generates initial PDF
5. editPDF() adds outlines and metadata using pdf-lib
6. Final PDF saved to user-selected location

**Multi-File Export (TOC mode):**
- Create a markdown file with `toc: true` frontmatter
- List files using wiki-links `[[filename]]` in desired order
- Right-click TOC file → "Better Export PDF"
- Plugin exports all linked files in order with clickable TOC

**Batch Export:**
- Right-click folder → "Export each file to PDF"
- Exports each file to separate PDF
- Uses concurrency limiting (default: 5) to manage resource usage

### Rendering Pipeline Details

The rendering system works by:
1. Opening file in temporary leaf to access view data
2. Parsing markdown with frontmatter extraction
3. Processing block IDs for internal anchor links
4. Using MarkdownRenderer.render() to convert MD → HTML fragment
5. Applying MarkdownRenderer.postProcess() for embeds, plugins, etc.
6. Converting canvas elements to base64 images
7. Fixing internal links (removing href for external files, keeping block refs)
8. Waiting for async content with DOM mutation observer

### Link Handling

Two types of internal links in PDFs:
- **af://** (anchor from) - source link positions
- **an://** (anchor to) - destination link positions

These are collected during PDF generation and converted to proper PDF Dest annotations in setAnchors().

## Settings & Configuration

Plugin settings stored in `BetterExportPdfPluginSettings`:
- Header/footer templates (HTML with special classes: .pageNumber, .totalPages, .title)
- Default export options (showTitle, maxLevel, printBackground, etc.)
- Debug mode and timestamp options
- Concurrency limit for multi-file exports
- CSS snippet enablement

Frontmatter fields for per-document overrides:
- `toc: true` - enables multi-file TOC mode
- `title`, `author`, `keywords`, `subject`, `creator` - PDF metadata
- `headerTemplate`, `footerTemplate` - per-document header/footer HTML

## Technology Stack

- TypeScript with strict null checks
- Svelte 5 (for Progress component)
- esbuild for bundling (with esbuild-svelte plugin)
- Electron APIs (webview, printToPDF, dialog)
- pdf-lib for PDF manipulation
- Obsidian API v1.8.7+
- p-limit for concurrency control

## Important Implementation Notes

1. **CSS Handling**: The plugin collects all stylesheets and extracts @media print rules to apply them during rendering. Custom CSS patch fixes layout issues with print mode.

2. **Async Content**: Wait mechanisms are in place for plugins that render async content (dataview, charts). Uses MutationObserver with 2s timeout by default.

3. **Canvas Elements**: Converted to base64 images before PDF generation since canvas doesn't export to PDF properly.

4. **Leaf Management**: Temporary leaves are created for rendering and cleaned up after to avoid cluttering workspace.

5. **Internal Links**: Links within the same file (block references) are preserved, but links to other files have href removed in exported PDF.

6. **Concurrency**: Adjustable via settings to balance performance vs resource usage during batch exports.

7. **Webview Scale**: Default scale of 0.75 used for preview rendering (customizable).
