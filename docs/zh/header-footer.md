# 页眉页脚与元数据

## 页眉和页脚

通过 `Header Template` 和 `Footer Template` 设置页码，例如：

```html
<div style="width: 100vw;font-size:10px;text-align:center;">
  <span class="pageNumber"></span> / <span class="totalPages"></span>
</div>
```

这会得到类似 `3 / 5` 的页码。模板可以是任何合法的 HTML 片段，例如加入 base64 图片：

```html
<div style="width: 100vw;font-size:10px;text-align:center;">
  <img height="10px" width="10px" src="data:image/svg+xml;base64,xxx..." />
  <span class="title"></span>
</div>
```

Electron 会填入这些 class：

- `pageNumber` 和 `totalPages`
- `title`，文档标题
- `date`，打印时的日期
- `url`，文档位置

页脚上的一条线可以写在同一段 HTML 的边上：

```html
<div style="width:100vw;font-size:10px;border-top:1px solid #622423;margin-left:20px;margin-right:20px;">
  <span class="title"></span>
  <span style="float:right;"><span class="pageNumber"></span> / <span class="totalPages"></span></span>
</div>
```

选项说明见 [Electron `printToPDF`](https://www.electronjs.org/docs/latest/api/webview-tag#webviewprinttopdfoptions)。

也可以在笔记的 frontmatter 里写文档级别的模板：

- `headerTemplate`
- `footerTemplate`

## PDF 元数据

先打开 `插件设置 > PDF元数据`。下面这些 frontmatter 字段会写进 PDF 的文档属性，也就是 Calibre 或 PDF 阅读器里「文档属性」看到的内容。它们不会印在页面上。要在页面上看到标题或页码，用页眉或页脚模板。

- `title`
- `author`（多个名字用逗号连起来）
- `keywords`
- `subject`
- `created_at`
- `updated_at`
- `creator`，留空时写成 `Obsidian`

`producer` 固定是 `Obsidian`。
