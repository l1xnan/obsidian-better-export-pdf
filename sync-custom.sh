#!/usr/bin/env bash
# sync-custom.sh
# Pull upstream better-export-pdf updates and re-apply our custom patch.
#
# Usage:
#   ./sync-custom.sh              — check for updates, apply patch if new version found
#   ./sync-custom.sh --force      — re-apply patch regardless
#
# Locations
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ORIG="$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents/GHSNotes/.obsidian/plugins/better-export-pdf"
PLUGIN_CUSTOM="$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents/GHSNotes/.obsidian/plugins/better-export-pdf-custom"
PATCH_FILE="$REPO_DIR/custom.patch"

echo "=== better-export-pdf custom sync ==="

# 1. Pull latest releases info from GitHub
echo ""
echo "Checking upstream version..."
UPSTREAM_VERSION=$(curl -s https://api.github.com/repos/l1xnan/obsidian-better-export-pdf/releases/latest \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['tag_name'])" 2>/dev/null | sed 's/^v//')

INSTALLED_VERSION=$(python3 -c "import json; d=json.load(open('$PLUGIN_ORIG/manifest.json')); print(d['version'])")
CUSTOM_VERSION=$(python3 -c "import json; d=json.load(open('$PLUGIN_CUSTOM/manifest.json')); print(d['version'])")

echo "  Installed (original): $INSTALLED_VERSION"
echo "  Custom plugin:        $CUSTOM_VERSION"
echo "  Upstream latest:      ${UPSTREAM_VERSION:-unknown}"

# 2. Check if update needed
if [ "$1" != "--force" ] && [ "$INSTALLED_VERSION" = "${UPSTREAM_VERSION:-$INSTALLED_VERSION}" ]; then
  echo ""
  echo "Already up to date (v$INSTALLED_VERSION). Use --force to re-apply patch."
  exit 0
fi

if [ -n "$UPSTREAM_VERSION" ] && [ "$INSTALLED_VERSION" != "$UPSTREAM_VERSION" ]; then
  echo ""
  echo "New version available: $INSTALLED_VERSION -> $UPSTREAM_VERSION"
  echo "Download the new release from Obsidian community plugins, then re-run this script."
  echo "The original plugin will be updated by Obsidian automatically."
  echo ""
  echo "After Obsidian updates the original plugin, run: ./sync-custom.sh --force"
  exit 1
fi

# 3. Apply patch to the updated original main.js
echo ""
echo "Applying custom patch to main.js (v$INSTALLED_VERSION)..."

# Backup current custom main.js
cp "$PLUGIN_CUSTOM/main.js" "$PLUGIN_CUSTOM/main.js.bak"

# Try to apply patch
if patch --dry-run -s "$PLUGIN_ORIG/main.js" "$PATCH_FILE" > /dev/null 2>&1; then
  cp "$PLUGIN_ORIG/main.js" "$PLUGIN_CUSTOM/main.js"
  patch "$PLUGIN_CUSTOM/main.js" "$PATCH_FILE"
  echo ""
  echo "✓ Patch applied cleanly."

  # Update version in custom manifest to match original
  python3 -c "
import json
with open('$PLUGIN_CUSTOM/manifest.json') as f:
    m = json.load(f)
m['version'] = '$INSTALLED_VERSION'
with open('$PLUGIN_CUSTOM/manifest.json', 'w') as f:
    json.dump(m, f, indent=2)
print('✓ Custom manifest version updated to $INSTALLED_VERSION')
"

  # Copy styles.css too
  cp "$PLUGIN_ORIG/styles.css" "$PLUGIN_CUSTOM/styles.css"

  # Save new baseline
  cp "$PLUGIN_ORIG/main.js" "$REPO_DIR/main.js.baseline-$INSTALLED_VERSION"
  echo "✓ Baseline saved: main.js.baseline-$INSTALLED_VERSION"

  # Regenerate patch against new baseline
  diff -u "$PLUGIN_ORIG/main.js" "$PLUGIN_CUSTOM/main.js" > "$PATCH_FILE"
  echo "✓ Patch file updated"

  echo ""
  echo "Done. Reload Obsidian to activate (Cmd+R or restart)."

else
  echo ""
  echo "✗ Patch did not apply cleanly — upstream code changed around our edit."
  echo ""
  echo "Run a manual diff to see what changed:"
  echo "  diff $REPO_DIR/main.js.baseline-$INSTALLED_VERSION $PLUGIN_ORIG/main.js | grep -A5 -B5 'cssSnippet'"
  echo ""
  echo "Then edit the patch file manually: $PATCH_FILE"
  echo "Or re-apply the change by hand at the cssSnippet injection block in:"
  echo "  $PLUGIN_ORIG/main.js"
  echo ""
  # Restore backup
  cp "$PLUGIN_CUSTOM/main.js.bak" "$PLUGIN_CUSTOM/main.js"
  echo "Custom plugin restored from backup — no changes made."
  exit 1
fi
