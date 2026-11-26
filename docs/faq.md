# Questions from issues

## The margin I picked is gone the next time I export

The export dialog is built this way. It saves the options in the dialog only when you export. Click `Export`, or press `Enter`. The next time the dialog opens, it loads the configuration from that export. A change you make only to try, and then leave by closing the dialog, is temporary and is not saved.

## The preview and the PDF look different

The HTML preview is one continuous page, so it has no page breaks. The PDF does. Version 2 also has a PDF preview. The two can still differ slightly. See [Limits](limits.md).

To change an image size without guessing, use an `<img>` tag. See [Style, background, and page breaks](style.md#page-breaks).

## Title and author do not appear on the page

`title` and `author` are PDF document properties. They are not printed in the page body. Put visible text in the header or footer. See [Header, footer, and metadata](header-footer.md#pdf-metadata).

## How do I change the font or the background?

Add a print CSS snippet, and use Obsidian's font variables. A plain `font-family` is often overridden by the theme. A background color in that CSS is printed only when `Print background` is on. See [Style, background, and page breaks](style.md).

The export dialog's snippet list only offers snippets that are not already enabled under `Appearance > CSS snippets`.

## How do I break a page?

Insert `<div class="break-page"></div>`, or turn a horizontal rule into a page break with CSS. In a combined PDF, each note can start on its own page. See [Page breaks](style.md#page-breaks).

## The folder came out in the wrong order

`Export folder to PDF` sorts by file name. It does not follow the file explorer. For a chosen order, write a note with `toc: true` and export that note, not the folder. See [Folder export](folder.md).

## Can I export without the dialog?

Yes. The Obsidian CLI exports one note and does not open the preview or a save window. It does not export a folder. See [Command line](cli.md).

## How do I fit a note on one long page?

Set **Page Size** to `Custom` and **Margin** to `None`, then set the page size yourself. The hint in the preview is an estimate. See [Export as one page](export.md#export-as-one-page).

## YAML or properties show up in the PDF

This plugin does not print the YAML block. If properties appear, check Obsidian's Properties in document setting. Another plugin can also inject that block.
