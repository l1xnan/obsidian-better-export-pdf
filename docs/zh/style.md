# 样式、背景与分页

## 自定义导出样式

在 `外观 > CSS 代码片段` 中添加只在打印时生效的 CSS。用 `@media print` 包起来，避免改到平时的阅读界面。

```css
@media print {
  body {
    --font-interface-override: "霞鹜文楷" !important;
    --font-text-override: "霞鹜文楷" !important;
    --font-print-override: "霞鹜文楷" !important;
    --font-monospace-override: "霞鹜文楷等宽" !important;
    --font-text-size: 20px !important;
    font-family: "思源宋体" !important;
  }
}
```

## 选择未启用的 CSS 片段

先在插件设置里打开 `Select CSS snippets`。导出对话框中会出现 `CSS snippets`，可以从 `外观 > CSS 片段` 里挑选尚未全局启用的片段。

字体没有变化时，多半是主题的规则比 `font-family` 更具体。用上面的变量。在 Obsidian 里检查预览，看是哪条规则盖住了它。

这段 CSS 里的背景色，只有打开 `Print background` 才会进 PDF。有的主题仍会用自己的 CSS 画出页面背景。

## 导出背景

默认导出会去掉主题带上的背景色。需要保留背景时，打开 `插件设置 > Print background`。

## 分页

在 Markdown 里插入：

```html
<div class="break-page"></div>
```

再用 CSS 片段定义：

```css
@media print {
  .break-page {
    break-before: page;
    break-inside: avoid;
  }
}
```

让 1 到 3 级标题各自另起一页：

```css
@media print {
  h1, h2, h3 {
    break-before: page;
  }
}
```

合成一份 PDF 时，每篇笔记是一个 `.markdown-preview-view`。每篇之后另起一页：

```css
@media print {
  .print > .markdown-preview-view {
    break-after: page;
  }
}
```

也可以把分隔线当成分页，笔记里就不用写 HTML：

```css
@media print {
  hr {
    break-after: page;
    visibility: hidden;
  }
}
```

比页面宽的图片会被裁掉。限制宽度，或用 `<img>` 指定尺寸：

```css
@media print {
  img {
    max-width: 100%;
    height: auto;
  }
}
```

更多打印相关 CSS 见 [MDN: Printing](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing)。
