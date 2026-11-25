# Header, footer, and metadata

## Header and footer

Set page numbers with `Header Template` and `Footer Template`:

```html
<div style="width: 100vw;font-size:10px;text-align:center;">
  <span class="pageNumber"></span> / <span class="totalPages"></span>
</div>
```

This prints a number such as `3 / 5`. The template can be any HTML fragment, including a base64 image:

```html
<div style="width: 100vw;font-size:10px;text-align:center;">
  <img height="10px" width="10px" src="data:image/svg+xml;base64,xxx..." />
  <span class="title"></span>
</div>
```

These classes are filled in by Electron:

- `pageNumber` and `totalPages`
- `title`, the document title
- `date`, the formatted print date
- `url`, the document location

A line above the footer can be a border on the same HTML:

```html
<div style="width:100vw;font-size:10px;border-top:1px solid #622423;margin-left:20px;margin-right:20px;">
  <span class="title"></span>
  <span style="float:right;"><span class="pageNumber"></span> / <span class="totalPages"></span></span>
</div>
```

See Electron [`printToPDF`](https://www.electronjs.org/docs/latest/api/webview-tag#webviewprinttopdfoptions).

A note can also set its own templates in front matter:

- `headerTemplate`
- `footerTemplate`

## PDF metadata

Turn on `Plugin settings > PDF metadata`. These front matter fields are then written into the PDF document properties, the same place Calibre and a PDF reader's Document Properties look. They are not printed on the page. To show a title or a page number, use the header or footer template.

- `title`
- `author` (several names are joined with a comma)
- `keywords`
- `subject`
- `created_at`
- `updated_at`
- `creator`, or `Obsidian` when this field is empty

`producer` is always `Obsidian`.
