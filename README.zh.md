# Obsidian Better Export PDF

[English](./README.md) | 中文

Better Export PDF 是一个 Obsidian PDF 导出增强插件，与官方的 PDF 导出功能相比，增加了导出预览、导出书签大纲和给 PDF 添加页码等功能。

## 功能

与官方导出 PDF 功能相比：

- 🚀支持导出预览
- 🎉支持导出PDF带大纲书签
- 🛩️支持自定义页边距
- ✨支持添加页面
- ... ...

## 安装

当前插件没有发布到官方插件商店，需要手动安装：

1. 在 [Release](https://github.com/l1xnan/obsidian-better-export-pdf/releases) 页面，下载 zip 包
2. 解压到: `{VaultFolder}/.obsidian/plugins/`
3. 重启 Obdisian，并再插件管理器中启用插件。

或者用 [BRAT Plugin](https://obsidian.md/plugins?id=obsidian42-brat)。

## 使用

1. 在当前 Markdown 视图的右上角，点击更多选项，选择 `Better Export PDF`；
2. 打开命令面板，选择 `Better Export PDF: Export Current File to PDF`。

如果导出的 PDF 页面异常，尝试在外观中将颜色将切换为浅色。


### 设置

可以通过设置 `Header Template` and `Footer Template` 配置来设置页码, 例如:
```html
<div style="width: 100vw;font-size:10px;text-align:center;">
    <span class="pageNumber"></span> / <span class="totalPages"></span>
</div>
```
可以实现类似 ` 3 / 5` 页码效果。详见[`<webview>.printToPDF(options)`](https://www.electronjs.org/docs/latest/api/webview-tag#webviewprinttopdfoptions)。


### 导出预览

![Export preview](./assets/preview0.png)

### 导出效果

![Export preview](./assets/preview1.png)

## TODO

- [ ] 将内部链接内容自动添加到脚注/附录中；
- [ ] 支持 pagedjs 美化；
- [x] 支持打印预览；
- [ ] 多个 Markdown 合并打印到一个 PDF 文件中；
- [ ] 完善默认 `@media print` css 样式；


## 赞助
如果这个插件帮到了您，请我喝一杯奶茶吧！


<img src="./assets/sponsor-chat.png" width="300px"/>
