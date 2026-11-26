# 命令行导出

命令行从 Obsidian 1.12 开始提供。安装这个版本后，到 **设置 → 通用 → Command line interface** 里把它打开。

`better-export-pdf` 使用 v2 引擎，并沿用上次在对话框里导出时保存的配置。它不会打开预览，也不会弹出保存窗口，适合在脚本里导出单篇笔记。

```shell
obsidian better-export-pdf file="文件夹/笔记.md" path="D:/out/note.pdf"
obsidian better-export-pdf file="文件夹/笔记.md"
obsidian better-export-pdf open
```

- `file`：笔记在库里的路径。不写时，导出当前打开的笔记。
- `path`：PDF 的保存路径。绝对路径按你写的位置保存；相对路径从库的根目录算起。不写时，PDF 放在笔记旁边，只是把扩展名换成 `.pdf`。
- `open`：导出完成后打开这个 PDF。

这条命令一次只能导出一篇笔记。要合并整个文件夹，或把文件夹里的笔记分别导出，用文件列表的右键菜单，见 [文件夹导出](folder.md)。
