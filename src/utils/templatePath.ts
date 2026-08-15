/**
 * Pure helpers for resolving header/footer template file paths.
 * No Obsidian runtime imports — unit-testable outside the vault.
 */

/**
 * Parse Obsidian wiki-link syntax to extract the actual file path.
 * Handles formats like [[path]], [[path|alias]], and plain paths.
 * Note: Pipe characters within wiki-links are treated as alias separators.
 * @param linkText - The link text which may contain [[ ]] wrappers
 * @returns The cleaned file path
 */
export function parseObsidianLink(linkText: string): string {
  if (!linkText) {
    return linkText;
  }

  // Remove [[ ]] wrappers if present
  let cleanPath = linkText.trim();
  const isWikiLink = cleanPath.startsWith("[[") && cleanPath.endsWith("]]");
  if (isWikiLink) {
    cleanPath = cleanPath.slice(2, -2);
  }

  // Handle [[path|alias]] format - only process pipe if this was a wiki-link
  if (isWikiLink) {
    const pipeIndex = cleanPath.indexOf("|");
    if (pipeIndex !== -1) {
      cleanPath = cleanPath.slice(0, pipeIndex);
    }
  }

  return cleanPath.trim();
}

/**
 * Check if a path has a file extension.
 * More robust than checking for dots, as it only checks the final path segment.
 * Note: Obsidian vault paths always use forward slashes (/) regardless of OS.
 * @param path - The file path to check
 * @returns True if the path has an extension
 */
export function hasFileExtension(path: string): boolean {
  const lastSlash = path.lastIndexOf("/");
  const fileName = lastSlash >= 0 ? path.slice(lastSlash + 1) : path;
  const lastDot = fileName.lastIndexOf(".");
  // Check if there's a dot and it's not at the start of the filename (hidden files)
  return lastDot > 0;
}

/**
 * Candidate paths to try for a template file, in order.
 * The cleaned path itself, plus — when it has no extension — the path with
 * `.html` appended (automatic extension for wiki-links like [[header]]).
 * @param cleanPath - Path with wiki-link syntax already stripped
 * @returns Paths to attempt resolution with, best match first
 */
export function templateFileCandidates(cleanPath: string): string[] {
  const candidates = [cleanPath];
  if (!hasFileExtension(cleanPath)) {
    candidates.push(cleanPath + ".html");
  }
  return candidates;
}
