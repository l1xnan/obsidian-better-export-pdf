# Header, footer, and metadata

## Header and footer

Write the header and footer in `Header Template` and `Footer Template`. This example prints a page number such as `3 / 5` in the center of each page:

```html
<div style="width: 100vw;font-size:10px;text-align:center;">
  <span class="pageNumber"></span> / <span class="totalPages"></span>
</div>
```

The template is an HTML fragment. For a small icon, put a base64 image in `src`:

```html
<div style="width: 100vw;font-size:10px;text-align:center;">
  <img height="10px" width="10px" src="data:image/svg+xml;base64,xxx..." />
  <span class="title"></span>
</div>
```

Electron fills these classes when printing. You do not put the text in yourself:

- `pageNumber` and `totalPages`
- `title`, the document title
- `date`, the formatted print date
- `url`, the document location

A line above the footer does not need its own element. Set `border-top` on the outer `div`:

```html
<div style="width:100vw;font-size:10px;border-top:1px solid #622423;margin-left:20px;margin-right:20px;">
  <span class="title"></span>
  <span style="float:right;"><span class="pageNumber"></span> / <span class="totalPages"></span></span>
</div>
```

See Electron [`printToPDF`](https://www.electronjs.org/docs/latest/api/webview-tag#webviewprinttopdfoptions).

When one note needs a different header or footer, set these fields in its front matter. They override the templates in the dialog:

- `headerTemplate`
- `footerTemplate`

## PDF metadata

Turn this on under `Plugin settings > PDF metadata`. The front matter fields below are written into the PDF document properties, which a reader shows as Document Properties. They do not appear in the page body. To print them, use the header or footer.

- `title`
- `author` (several names are joined with a comma)
- `keywords`
- `subject`
- `created_at`
- `updated_at`
- `creator`, or `Obsidian` when this field is empty

`producer` is always `Obsidian`.
