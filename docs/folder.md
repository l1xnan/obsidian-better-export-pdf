# Folder export

`Plugin settings > Limit concurrency` controls how many notes render at once. The default is `5`.

## One PDF for the folder

Right-click the folder and choose `Export folder to PDF`. The Markdown files are sorted by file name and written into one PDF. File Explorer order and a numeric prefix are not used. Choose the order with a `toc: true` note, below.

## One PDF per note

Right-click the folder, choose `Export to PDF...`, then `Export each file to PDF`.

## Export in link order

Create a note with `toc: true` and list the notes in the order you want:

```markdown
---
toc: true
---

## Table of Contents

[[Note1|Title1]]
[[Note2]]
[[Note3]]
```

Export that note with `Better Export PDF`. The PDF follows the table-of-contents page, then Note1, Note2, and Note3. Links on the contents page jump to those notes. Do not use `Export folder to PDF` on this note: that menu sorts by file name and ignores `toc`.

A link inside one included note that names another note, such as `[[Note2#Heading]]`, is not rewritten into a jump inside the PDF. A heading link in the same note, such as `[[#Heading]]`, is.
