# Obsidian Better Export PDF

[English](./README.md) | 中文

Better Export PDF 是一个 Obsidian PDF 导出增强插件，与官方的 PDF 导出功能相比，增加了导出预览、导出书签大纲和给 PDF 添加页码等功能。

## 功能

与官方导出 PDF 功能相比：

- 🚀 支持导出预览
- 🎉 支持导出 PDF 带大纲书签
- 🛩️ 支持自定义页边距
- ✨ 支持自定义页眉/页脚（例如：添加页码）
- 💥 支持将文档属性添加到 PDF 元数据中
- 🎇 支持导出的 PDF 时，保留文档内链接跳转
- 🎈 多个笔记文件（整个目录或者指定文件）合并打印到一个 PDF 文件中
- 🌸 整个目录中的笔记文件批量导出到单独的 PDF 文件中
- 🍬 支持导出任意尺寸 PDF，可以将所有内容导出为一页
- ... ...

## 安装

在官方商店中搜索 [`Better Export PDF`](obsidian://show-plugin?id=better-export-pdf) 安装。

### 手动安装

1. 在 [Release](https://github.com/l1xnan/obsidian-better-export-pdf/releases) 页面，下载 zip 包
2. 解压到: `{VaultFolder}/.obsidian/plugins/`
3. 重启 Obdisian，并再插件管理器中启用插件。

或者用 [BRAT Plugin](https://obsidian.md/plugins?id=obsidian42-brat)。

## 使用

1. 选择导出目标：
   -. 在当前 Markdown 视图的右上角，点击更多选项，选择 `Better Export PDF`；
   -. 打开命令面板，选择 `Better Export PDF: Export Current File to PDF`；
   -. 在文件树中，右键文件夹选择`Export folder to PDF`。
2. 在弹出对话框中，修改相关配置。
3. 点击`Export`，选择导出路径，如果不用修改配置，可以直接按 `Enter` 键，触发导出操作。

### 设置页眉/页脚

可以通过设置 `Header Template` and `Footer Template` 配置来设置页码, 例如:

```html
<div style="width: 100vw;font-size:10px;text-align:center;">
  <span class="pageNumber"></span> / <span class="totalPages"></span>
</div>
```

可以实现类似 `3 / 5` 页码效果。详见[`<webview>.printToPDF(options)`](https://www.electronjs.org/docs/latest/api/webview-tag#webviewprinttopdfoptions)。

可以是任何合法的 HTML 片段，例如添加`base64`格式的图片：

```html
<div style="width: 100vw;font-size:10px;text-align:center;">
  <img height="10px" width="10px" src="data:image/svg+xml;base64,xxx..." />
  <span class="title"></span>
</div>
```

可以在`frontMatter`中配置文档级别的页眉/页脚模板：

- `headerTemplate`
- `footerTemplate`

### 自定义导出样式

如果想进一步定制 PDF 导出样式，可以在`外观>CSS代码片段`中添加自定义的 CSS，例如自定义字体和字号：

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

### 选择未启用的 CSS 片段

首先，在插件配置中启用 `Select CSS snippets` 选项。这时候在导出 PDF 的弹窗中可以看到 `CSS snippets` 选项，然后你可以选择在 `外观 > CSS 片段` 中没有全局启用的 CSS。

### 导出背景

默认情况下，导出的 PDF 会删除主题所得带背景色，如果你需要这个背景色，可以`插件设置 > Print background` 配置中打开它。

### 添加 PDF 元数据

可以通过配置文档的 `frontMatter` 给 PDF 添加元数据，支持的字段项有：

- `title`
- `author`
- `keywords`
- `created_at`
- `updated_at`
- `creator`
- `producer`

### 多文件导出

#### 快速导出

侧边栏选择文件夹，右键选择菜单 `Export folder to PDF`，即可将整个文件夹内容导出到一个 PDF 文件中，这样不保证文件导出顺序；

#### 自定义导出

新建一个目录笔记，添加如下类似内容，需要添加 `toc: true` 文档属性：

```markdown
---
toc: true
---

## 目录

[[笔记1|标题1]]
[[笔记2]]
[[笔记3]]
```

这样插件会按照 `当前目录页`、`笔记1`、`笔记2`.. 的顺序导出笔记。导出的 PDF，目录页锚点支持点击跳转。

### 文件夹批量导出

侧边栏选择文件夹，右键选择菜单 `Export each file to PDF`，即可将整个文件夹每一个文件批量导出为 PDF 文件

### 导出为一页

导出对话框， **Page Size** 选择 `Custom`，**Margin** 设置为 `None`，根据文档情况自行设置页面尺寸。

---

**注意:** 你可以通过`插件设置 > 限制并发数` 调整多文件导出时渲染阶段的并发数量，以此来减少资源消耗，或者提高速度，默认为 `5`。

## 效果

### 导出预览

![Export preview](./assets/preview0.png)

### 导出效果

![Export preview](./assets/preview1.png)

## TODO

- [ ] 将内部链接内容自动添加到脚注/附录中；
- [ ] 支持 pagedjs 美化；
- [x] 支持打印预览；
- [x] 多个 Markdown 合并打印到一个 PDF 文件中；
- [x] 完善默认 `@media print` css 样式；
- [x] 支持将文档属性添加到 PDF 元数据中；
- [x] 保留文档内链接跳转；

## 赞助

如果这个插件帮到了您，请点击 Star 或者我喝一杯奶茶吧！

<div align="center">
<img src="./assets/sponsor-chat.png" width="300px"/>
<img src="./assets/sponsor-alipay.png" width="300px"/>
</div>
