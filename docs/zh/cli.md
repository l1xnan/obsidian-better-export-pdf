# 用 Obsidian CLI 导出

需要 Obsidian 1.12 安装包，并在 **设置 → 通用 → Command line interface** 中打开命令行。这条命令使用 v2 打印，并沿用已保存的导出设置。不会打开预览，也不会弹出保存窗口。

```shell
obsidian better-export-pdf file="文件夹/笔记.md" path="D:/out/note.pdf"
obsidian better-export-pdf file="文件夹/笔记.md"
obsidian better-export-pdf open
```

- `file`：库内路径。不传时使用当前打开的笔记。
- `path`：PDF 路径。绝对路径直接使用，相对路径相对库根目录。不传时写到笔记旁边，扩展名换成 `.pdf`。
- `open`：导出完成后打开 PDF。

命令行每次只导出一篇笔记。文件夹导出请用文件列表的右键菜单，见 [文件夹导出](folder.md)。
