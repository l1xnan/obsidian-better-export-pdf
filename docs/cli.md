# Export from the Obsidian CLI

Requires the Obsidian 1.12 installer and **Settings → General → Command line interface**. The command uses the v2 print pipeline and your saved export settings. It does not open the preview or a save dialog.

```shell
obsidian better-export-pdf file="folder/note.md" path="D:/out/note.pdf"
obsidian better-export-pdf file="folder/note.md"
obsidian better-export-pdf open
```

- `file`: vault path. Defaults to the active note.
- `path`: PDF path. An absolute path is used as-is. A relative path is resolved from the vault root. Defaults to a `.pdf` beside the note.
- `open`: open the PDF when the export finishes.

The command exports one note at a time. Folder export stays on the file-explorer menus described in [Folder export](folder.md).
