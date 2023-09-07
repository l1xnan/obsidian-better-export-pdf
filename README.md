# Obsidian Better Export PDF

[中文](./README.zh.md)

Better Export PDF is an Obsidian PDF export enhancement plugin that adds the ability to export bookmarks outline and add page numbers to PDF compared to the official PDF export function.

## Features

Compared to the official Export PDF function:

1. Customize the margins
2. Export the outline containing bookmarks
3. Export the included page numbers

## Installation

The current plugin is not published to the official plugin store and needs to be manually installed:

1. Download the .zip file from [the latest Release](https://github.com/l1xnan/obsidian-better-export-pdf/releases), or from any other release version.
2. Unzip into: `{VaultFolder}/.obsidian/plugins/`
3. Reload Obsidian and enable the plug-in.

## Usage

1. In the upper right corner of the current Markdown view, click More options and select 'Better to PDF';
2. Open the command panel and select 'Better Export PDF: Export Current file to PDF'.

If the exported PDF page is abnormal, trying to change the color in the appearance will switch to a light color.

### Settings

Page number format can be easily set:

- `{page}` : indicates the current page number.
- `{pages}` : indicates the total page number;

For example, if the total page number 5, set `{page} / {pages}`, which means`1 / 5`, `2 / 5`...

## TODO

- [ ] Automatically adds internal link content to footnotes/appendices;
- [ ] Support pagedjs beautification;
- [ ] Support print preview;
- [ ] Print multiple Markdown files into one PDF file;
- [ ] Improves default '@media print' css style;

## Support This Plugin

This plugin takes a lot of work to maintain and continue adding features. If you want to fund the continued development of this plugin you can do so here:

<a href="https://www.buymeacoffee.com/l1xnan"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=nathangeorge&button_colour=6a8695&font_colour=ffffff&font_family=Poppins&outline_colour=000000&coffee_colour=FFDD00"></a>
