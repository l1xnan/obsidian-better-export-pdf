# Obsidian Better Export PDF

Better Export PDF 是一个 Obsidian PDF 导出增强插件，与官方的 PDF 导出功能相比，增加了导出书签大纲和给 PDF 添加页码功能。

## 功能

与官方导出 PDF 功能相比：

1. 自定义页边距
2. 导出包含书签大纲
3. 导出包含页码

## 安装

当前插件没有发布到官方插件商店，需要手动安装：

1. 在 [Release](https://github.com/l1xnan/obsidian-better-export-pdf/releases) 页面，下载 zip 包
2. 解压到: `{VaultFolder}/.obsidian/plugins/`
3. 重启 Obdisian，并再插件管理器中启用插件。

## 使用

在外观中将颜色将切换为浅色，然后：

1. 在当前 Markdown 视图的右上角，点击更多选项，选择 `Better to PDF`；
2. 打开命令慢板，选择 `Better Export PDF: Export Current file to PDF`。

## TODO

- [ ] 将内部链接内容自动添加到脚注/附录中；
- [ ] 支持 pagedjs 美化；
- [ ] 支持打印预览；
- [ ] 多个 Markdown 合并打印到一个 PDF 文件中；
- [ ] 完善默认 `@media print` css 样式；
