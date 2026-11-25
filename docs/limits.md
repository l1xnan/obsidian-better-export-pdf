# Limits

- The CLI exports one note at a time. `file` is the vault path of that note. To merge a folder into one PDF, or to export each file separately, use the file-explorer menus. The CLI is the way to export without opening the preview or a save dialog.
- The HTML preview is one continuous page, so it does not show page breaks. The PDF preview shows pages. The HTML preview is rendered in the main window, and the PDF is rendered again from the same file list, so the two can still differ slightly.
- `title`, `author`, and the other metadata fields are PDF document properties. They are not printed on the page.
- Folder export sorts by file name. A link from one included note to another note is not turned into a jump inside the PDF.
