# Header and Footer Template File Support

> **Applies to:** `obsidian-better-export-pdf` **2.0.4-beta.1+** (fork build).
> Works in both export engines — Engine v1 and v2 (v2 is the default since 2.0).
> Verified in a live Obsidian vault (2026-08-15).
> Ported from the `obep-scavy` fork (1.11.1-beta.4) onto the upstream 2.0.3 base.

## Feature Overview

The plugin now supports reading header and footer HTML templates from external files specified in the frontmatter. This allows you to:

- Store complex templates separately from your markdown documents
- Reuse templates across multiple documents
- Keep your markdown files cleaner and more maintainable

## Usage

### Basic Example

Add these properties to your markdown file's frontmatter:

```yaml
---
title: My Document
headerTemplateFile: templates/my-header.html
footerTemplateFile: templates/my-footer.html
---
```

### Using Obsidian Wiki-Link Syntax

You can also use Obsidian's native wiki-link syntax:

```yaml
---
title: My Document
headerTemplateFile: [[templates/my-header.html]]
footerTemplateFile: [[templates/my-footer]]
---
```

Note: When using wiki-links without an extension, the plugin will automatically try adding `.html`.

### File Path Format

- Paths are resolved with Obsidian's native link resolution: **relative to the exporting document** (e.g. `[[header.html]]` for a template in the same folder) or **relative to the vault root** — both work, in plain or wiki-link form
- Supports both **plain paths** and **Obsidian wiki-link syntax** (`[[path]]`)
- Use forward slashes (`/`) for path separators
- The `.html` extension is optional when using wiki-link syntax
- Examples:
  - Plain path: `templates/header.html`
  - Wiki-link: `[[templates/header.html]]`
  - Wiki-link without extension: `[[templates/header]]` (will automatically try `.html`)
  - Same folder as the document: `[[header.html]]` or `[[header]]`
  - File in vault root: `header.html` or `[[header.html]]`
  - With alias (alias ignored): `[[templates/header.html|My Header]]`

## Priority Order

The plugin follows this priority order when determining which template to use:

### For Header Template:
1. **headerTemplateFile** (if specified and file exists)
2. **headerTemplate** (inline template in frontmatter)
3. Plugin settings default header template

### For Footer Template:
1. **footerTemplateFile** (if specified and file exists)
2. **footerTemplate** (inline template in frontmatter)
3. Plugin settings default footer template

## Template File Format

Template files should contain valid HTML. They can use the same Chromium print template syntax as inline templates:

```html
<div style="width: 100vw; font-size: 10px; text-align: center;">
  <span class="title"></span> - Page <span class="pageNumber"></span> of <span class="totalPages"></span>
</div>
```

### Available Variables

- `<span class="title"></span>` - Document title
- `<span class="pageNumber"></span>` - Current page number
- `<span class="totalPages"></span>` - Total number of pages
- `<span class="date"></span>` - Current date
- `<span class="url"></span>` - Document URL

You can also use template variables from frontmatter using the `{{variable}}` syntax. For example:

```html
<div style="width: 100vw; font-size: 10px; text-align: center;">
  {{author}} - {{title}}
</div>
```

## Error Handling

- If the specified file doesn't exist, the plugin logs a warning and falls back to the next priority option
- If the file can't be read, the plugin logs a warning and falls back to the next priority option
- The export will not fail if template files are missing; it will simply use the default templates

## Complete Example

**Frontmatter in `my-document.md`:**
```yaml
---
title: Annual Report 2024
author: John Doe
department: Engineering
headerTemplateFile: templates/corporate-header.html
footerTemplateFile: templates/corporate-footer.html
---
```

**Template file `templates/corporate-header.html`:**
```html
<div style="width: 100vw; font-size: 12px; text-align: center; padding: 5px; border-bottom: 2px solid #003366;">
  <strong>{{department}} Department</strong> - {{title}}
</div>
```

**Template file `templates/corporate-footer.html`:**
```html
<div style="width: 100vw; font-size: 10px; text-align: center; padding: 5px; color: #666;">
  Page <span class="pageNumber"></span> of <span class="totalPages"></span> | 
  Prepared by: {{author}} | 
  © 2024 Company Name
</div>
```

## Migration from Inline Templates

If you're currently using inline `headerTemplate` or `footerTemplate` in your frontmatter, you can migrate to file-based templates:

1. Create HTML files with your template content
2. Add `headerTemplateFile` and/or `footerTemplateFile` to your frontmatter
3. Remove the old `headerTemplate` and `footerTemplate` properties (optional)

The old properties will still work as fallbacks if the files aren't found.

## Technical Details

### Implementation
- Template files are read using the Obsidian Vault API (`app.vault.read()`)
- File reading happens at PDF export time (not cached)
- Template content is processed through the same renderer as inline templates,
  including `{{variable}}` substitution — in **both** engines (v1 and v2)
- Changes to template files take effect immediately on the next export; in the
  engine v2 PDF preview, editing a template file also invalidates the cached preview
- Implementation: `src/utils/templateFile.ts` (`resolveTemplateFile`,
  `readTemplateFile`) and `resolveHeaderFooterTemplates()` in `src/pdf.ts`

### Security
- Only files within the vault can be accessed
- No access to files outside the vault directory
- Standard Obsidian file permissions apply
