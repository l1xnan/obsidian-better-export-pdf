# Command line

The CLI is available from Obsidian 1.12. After installing that version, turn it on under **Settings → General → Command line interface**.

`better-export-pdf` prints with the v2 engine and the options saved by your last export from the dialog. It does not open the preview or a save window, so it fits a script that exports a single note.

```shell
obsidian better-export-pdf file="folder/note.md" path="D:/out/note.pdf"
obsidian better-export-pdf file="folder/note.md"
obsidian better-export-pdf open
```

- `file`: the note's path inside the vault. Omit it to export the note that is open.
- `path`: where to write the PDF. An absolute path is used as written. A relative path is resolved from the vault root. Omit it and the PDF is written next to the note, with the extension changed to `.pdf`.
- `open`: open the PDF when the export finishes.

The command exports one note per run. To merge a folder, or to export each note in a folder separately, use the file-explorer menu. See [Folder export](folder.md).
