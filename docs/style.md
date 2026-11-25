# Style, background, and page breaks

## Custom export style

Add print-only CSS under `Appearance > CSS snippets`. Wrap it in `@media print` so the reading view stays unchanged.

```css
@media print {
  body {
    --font-interface-override: "Times New Roman" !important;
    --font-text-override: "Times New Roman" !important;
    --font-print-override: "Times New Roman" !important;
    --font-monospace-override: "Consolas" !important;
    --font-text-size: 20px !important;
    font-family: "Times New Roman" !important;
  }
}
```

## Disabled CSS snippets

Enable `Select CSS snippets` in the plugin settings. The export dialog then shows `CSS snippets`, where you can pick snippets that are not enabled globally under `Appearance > CSS snippets`.

If the font does not change, a theme rule is probably more specific than `font-family`. Use the variables above. In Obsidian, inspect the preview to see which rule wins.

A background color in this CSS shows up in the PDF only when `Print background` is on. Some themes still paint a page background with their own CSS.

## Background

The export leaves out the theme background color. Turn on `Plugin settings > Print background` to keep it.

## Page breaks

Add this to the note:

```html
<div class="break-page"></div>
```

Then add a CSS snippet:

```css
@media print {
  .break-page {
    break-before: page;
    break-inside: avoid;
  }
}
```

Start a new page at headings level 1 through 3:

```css
@media print {
  h1, h2, h3 {
    break-before: page;
  }
}
```

In a combined PDF, each note is a `.markdown-preview-view`. Start a new page after every note:

```css
@media print {
  .print > .markdown-preview-view {
    break-after: page;
  }
}
```

A horizontal rule can be the page break, so the note stays free of HTML:

```css
@media print {
  hr {
    break-after: page;
    visibility: hidden;
  }
}
```

An image wider than the page is clipped. Limit it, or set the size with an `<img>` tag:

```css
@media print {
  img {
    max-width: 100%;
    height: auto;
  }
}
```

More print CSS is documented in [MDN: Printing](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing).
