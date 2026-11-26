# Folder export

When you export many notes at once, `Plugin settings > Limit concurrency` sets how many are rendered together. The default is `5`. Lower it if the export feels heavy.

## One PDF

Right-click the folder in the file explorer and choose `Export folder to PDF`. The Markdown files are sorted by name and written into one PDF. The order you arranged in the file explorer is not used.

## One PDF per note

Right-click the same folder, choose `Export to PDF...`, then `Export each file to PDF`. Each note becomes its own PDF.

## Link order

To merge notes in an order you write yourself, create a note and turn on `toc`:

```markdown
---
toc: true
---

## Table of Contents

[[Note1|Title1]]
[[Note2]]
[[Note3]]
```

Export that note with `Better Export PDF`. The PDF starts with the contents page, then Note1, Note2, and Note3. Links on the contents page jump to those notes.

Do not use `Export folder to PDF` on the folder and expect it to read this note. That menu sorts by file name and ignores `toc`.

After the notes are in one PDF, a link in one note that points at another, such as `[[Note2#Heading]]`, is not yet an internal PDF jump. `[[#Heading]]` inside the same note does jump.
