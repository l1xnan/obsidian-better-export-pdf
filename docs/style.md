# Style, background, and page breaks

## Custom export style

Add CSS that applies only when printing, under `Appearance > CSS snippets`. Wrap it in `@media print` so the reading view is left alone. The example below changes the font:

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

If a snippet should apply only while exporting, turn on `Select CSS snippets` in the plugin settings. The export dialog then shows `CSS snippets`, listing snippets that are not enabled under `Appearance > CSS snippets`.

When the font does not change, a theme rule is usually more specific than `font-family`. Switch to the variables above, then inspect the preview in Obsidian and see which rule is covering yours.

A background color in this CSS is included in the PDF only when `Print background` is also on. Some themes still paint their own background over it.

## Background

The export drops the theme background color. Turn on `Plugin settings > Print background` when you want to keep it.

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

A horizontal rule can be the page break, so the note does not need the HTML above:

```css
@media print {
  hr {
    break-after: page;
    visibility: hidden;
  }
}
```

An image wider than the page is clipped. Cap the width, or set the size on an `<img>`:

```css
@media print {
  img {
    max-width: 100%;
    height: auto;
  }
}
```

More print CSS is documented in [MDN: Printing](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing).
