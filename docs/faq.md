---
next: false
---

# Questions

## The margin is back to the old value

Changing a margin in the dialog does not save it immediately. Click `Export`, or press `Enter`, and finish an export. That margin is what you get the next time the dialog opens. See [Export one note](export.md).

## The preview and the PDF differ

The HTML preview draws the note as one continuous page, so you will not see page breaks there. Pagination is in the PDF. In 2.0 you can switch the dialog to the PDF preview and check the pages before exporting. The two passes are rendered separately, so small differences remain. See [Limits](limits.md).

When an image size is hard to guess, set it with `<img>`. See [Page breaks](style.md#page-breaks).

## Title and author are missing from the page

`title` and `author` in front matter are stored as PDF document properties. A reader shows them under Document Properties. They are not lines in the page body. To print them, put the text in the header or footer. See [Header, footer, and metadata](header-footer.md#pdf-metadata).

## The font or background did not change

Put the print rules in `@media print`, and set Obsidian's font variables. A single `font-family` is often overridden by a more specific theme rule. A background color is included only when `Print background` is on. See [Style, background, and page breaks](style.md).

`CSS snippets` in the export dialog lists snippets that are not already enabled under `Appearance > CSS snippets`. Snippets you turned on globally are not in that list.

## How do I break a page?

Insert `<div class="break-page"></div>` and tell CSS to break the page there. You can also make `hr` start a new page, and then the note does not need that HTML. In a merged PDF, each note can end with a page break. See [Page breaks](style.md#page-breaks).

## The folder came out in the wrong order

`Export folder to PDF` sorts by file name. It does not follow the order you arranged in the file explorer. To choose the order, write a note with `toc: true` and export that note. See [Folder export](folder.md).

## Export without the dialog

Use the Obsidian CLI. It exports one note with the options saved last time, without the preview or a save dialog. See [Command line](cli.md).

## One long page

Set **Page Size** to `Custom` and **Margin** to `None`, then enter the width and height yourself. The size hint in the preview is only a guide. See [Export as one page](export.md#export-as-one-page).

## Properties showed up in the PDF

This plugin does not print the YAML block into the page. If properties still appear, check whether Obsidian's Properties in document is on, and whether another plugin is inserting that block into the preview.
