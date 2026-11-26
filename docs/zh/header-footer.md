# 页眉页脚与元数据

## 页眉和页脚

页眉和页脚写在 `Header Template`、`Footer Template` 里。下面这段会在每页中间印出页码，例如 `3 / 5`：

```html
<div style="width: 100vw;font-size:10px;text-align:center;">
  <span class="pageNumber"></span> / <span class="totalPages"></span>
</div>
```

模板就是一段 HTML。需要小图标时，把图片转成 base64 放进 `src`：

```html
<div style="width: 100vw;font-size:10px;text-align:center;">
  <img height="10px" width="10px" src="data:image/svg+xml;base64,xxx..." />
  <span class="title"></span>
</div>
```

下面这些 class 由 Electron 在打印时填上，不用自己写文字：

- `pageNumber` 和 `totalPages`
- `title`，文档标题
- `date`，打印时的日期
- `url`，文档位置

页脚上方的线不用另做一个元素，写在外层 `div` 的 `border-top` 上即可：

```html
<div style="width:100vw;font-size:10px;border-top:1px solid #622423;margin-left:20px;margin-right:20px;">
  <span class="title"></span>
  <span style="float:right;"><span class="pageNumber"></span> / <span class="totalPages"></span></span>
</div>
```

选项说明见 [Electron `printToPDF`](https://www.electronjs.org/docs/latest/api/webview-tag#webviewprinttopdfoptions)。

某一篇笔记要用不同的页眉页脚时，在它的 frontmatter 里写上下面两项，会盖过对话框里的模板：

- `headerTemplate`
- `footerTemplate`

## PDF 元数据

先在 `插件设置 > PDF元数据` 里打开这个功能。下面这些 frontmatter 会写入 PDF 的文档属性，用阅读器打开「文档属性」就能看到。它们不会出现在页面正文里；要印在纸上，仍然用页眉或页脚。

- `title`
- `author`（多个名字用逗号连起来）
- `keywords`
- `subject`
- `created_at`
- `updated_at`
- `creator`，留空时写成 `Obsidian`

`producer` 固定是 `Obsidian`。
