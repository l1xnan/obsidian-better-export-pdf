# Obsidian Better Export PDF

English | [中文](./README.zh.md)

Better Export PDF is an Obsidian PDF export enhancement plugin that adds the ability to export bookmarks outline, export preview and add page numbers to PDF compared to the official PDF export function.

## Features

Compared to the official Export PDF feature:

- 🚀Support export preview
- 🎉Export the outline bookmarks
- 🛩️Customize the margins
- ✨Export the page numbers
- 💥Support add PDF metadata from front matter;
- ... ...

## Installation

The current plugin is not published to the official plugin store and needs to be manually installed:

1. Download the .zip file from [the latest Release](https://github.com/l1xnan/obsidian-better-export-pdf/releases), or from any other release version.
2. Unzip into: `{VaultFolder}/.obsidian/plugins/`
3. Reload Obsidian and enable the plug-in.

or use the [BRAT Plugin](https://obsidian.md/plugins?id=obsidian42-brat).

## Usage

1. In the upper right corner of the current Markdown view, click More options and select `Better Export PDF`;
2. Open the command panel and select `Better Export PDF: Export Current File to PDF`.

If the exported PDF page is abnormal, trying to change the color in the appearance will switch to a light color.


### Settings

Set page numbers using the `Header Template` and `Footer Template`, for example:
```html
<div style="width: 100vw;font-size:10px;text-align:center;">
    <span class="pageNumber"></span> / <span class="totalPages"></span>
</div>
```
See details [`<webview>.printToPDF(options)`](https://www.electronjs.org/docs/latest/api/webview-tag#webviewprinttopdfoptions).

### Export preview

![Export preview](./assets/preview0.png)

### Effect picture

![Export preview](./assets/preview1.png)


## TODO

- [ ] Automatically adds internal link content to footnotes/appendices;
- [ ] Support pagedjs beautification;
- [x] Support print preview;
- [ ] Export multiple Markdown files into one PDF file;
- [ ] Improves default `@media print` css style;
- [x] Support add PDF metadata from front matter;
- [ ] Export internal links within file;

## Support This Plugin

This plugin takes a lot of work to maintain and continue adding features. If you want to fund the continued development of this plugin you can do so here:

<a href="https://www.buymeacoffee.com/l1xnan"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=nathangeorge&button_colour=6a8696&font_colour=ffffff&font_family=Poppins&outline_colour=000000&coffee_colour=FFDD00"></a>
