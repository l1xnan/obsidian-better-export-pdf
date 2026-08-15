import { TFile, type App } from "obsidian";
import { parseObsidianLink, templateFileCandidates } from "./templatePath";

/**
 * Resolve the vault file a header/footer template path points at, without
 * reading its content. Supports both plain paths and Obsidian wiki-link
 * syntax ([[path]]).
 *
 * Resolution order:
 * 1. Obsidian's native link resolution relative to the source file
 *    (app.metadataCache.getFirstLinkpathDest) — handles relative paths and
 *    wiki-links from the exported document's location.
 * 2. Vault-root path lookup (app.vault.getAbstractFileByPath).
 * 3. When the path has no extension, retry with `.html` appended.
 *
 * Note: If a file has a specific extension (e.g., .htm), you must include it
 * in the path. The automatic .html extension is only added when no extension
 * is present.
 *
 * @param app - Obsidian App instance
 * @param filePath - Path to template file (supports [[path]] syntax)
 * @param sourceFilePath - Path to the source file being exported (for relative path resolution)
 * @param debugMode - Whether to show detailed logging
 * @returns The resolved TFile, or null if not found
 */
export function resolveTemplateFile(
  app: App | undefined,
  filePath: string,
  sourceFilePath?: string,
  debugMode = false,
): TFile | null {
  try {
    // Parse wiki-link syntax if present
    const cleanPath = parseObsidianLink(filePath);

    // Helper function to try finding a file with a single candidate path
    const tryResolveFile = (pathToTry: string): TFile | null => {
      // If we have a source file path, use Obsidian's native link resolution.
      // This handles both relative paths (just filename) and full paths from vault root.
      if (sourceFilePath && app) {
        const resolved = app.metadataCache.getFirstLinkpathDest(pathToTry, sourceFilePath);
        if (resolved instanceof TFile) {
          return resolved;
        }
      }

      // Fallback to direct vault path lookup (for vault root relative paths)
      if (app) {
        const file = app.vault.getAbstractFileByPath(pathToTry);
        if (file instanceof TFile) {
          return file;
        }
      }

      return null;
    };

    // Try the cleaned path first, then (if extensionless) with .html appended
    const candidates = templateFileCandidates(cleanPath);
    for (const [index, candidate] of candidates.entries()) {
      if (debugMode && index > 0) {
        console.debug(`  No extension found, trying with .html: "${candidate}"`);
      }
      const file = tryResolveFile(candidate);
      if (file instanceof TFile) {
        return file;
      }
    }

    return null;
  } catch (error) {
    if (debugMode) {
      console.error(`✗ Failed to resolve template file: ${filePath}`, error);
    }
    return null;
  }
}

/**
 * Read template file content from vault.
 * Supports both plain paths and Obsidian wiki-link syntax ([[path]]).
 *
 * @param app - Obsidian App instance
 * @param filePath - Path to template file (supports [[path]] syntax)
 * @param debugMode - Whether to show detailed logging
 * @param sourceFilePath - Path to the source file being exported (for relative path resolution)
 * @returns Template content or null if file not found/unreadable
 */
export async function readTemplateFile(
  app: App | undefined,
  filePath: string,
  debugMode = false,
  sourceFilePath?: string,
): Promise<string | null> {
  try {
    // Parse wiki-link syntax if present
    const cleanPath = parseObsidianLink(filePath);

    if (debugMode) {
      console.debug(`Attempting to read template file: "${filePath}" -> "${cleanPath}"`);
      if (sourceFilePath) {
        console.debug(`  Source file: "${sourceFilePath}"`);
      }
    }

    const file = resolveTemplateFile(app, filePath, sourceFilePath, debugMode);
    if (file instanceof TFile) {
      const content = await app!.vault.read(file);
      if (debugMode) {
        console.debug(`✓ Template file loaded successfully: ${file.path}`);
      }
      return content;
    }

    // File not found - always log warning to help with debugging
    console.warn(
      `⚠ Template file not found: ${filePath}\n` +
        `  Cleaned path: ${cleanPath}\n` +
        (sourceFilePath ? `  Source file: ${sourceFilePath}\n` : "") +
        `  Make sure the file exists in your vault.`,
    );
    return null;
  } catch (error) {
    console.error(`✗ Failed to read template file: ${filePath}`, error);
    return null;
  }
}
