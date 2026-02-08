# Multi-Token Sync Implementation

This document describes the multi-token sync feature added to the Compass Token Sync Figma plugin.

## Overview

The plugin now supports syncing **multiple token types** from a single Figma file:
- **Foundation Colors** - Raw HEX color values
- **Semantic Attachment Colors** - File type indicator colors with references to foundation colors

## What Changed

### 1. Plugin Core (`figma-plugin/code.ts`)

**New Token Detection**:
- `categorizeVariable()` - Automatically detects token type by naming pattern
- `FOUNDATION_COLOR_PATTERN` - Matches `blue/500`, `neutral/1000`, etc.
- `SEMANTIC_ATTACHMENT_PATTERN` - Matches `attachment/blue`, `attachment/grey`, etc.

**Multi-Token Extraction**:
- `extractAllTokens()` - Replaces old `extractColors()`
- Processes both foundation and semantic tokens in one pass
- Resolves variable aliases for semantic tokens (e.g., `attachment/blue` → `{color.foundation.blue.300}`)

**Enhanced Validation**:
- `validateFoundationTokens()` - Validates HEX format, no opacity variants
- `validateSemanticTokens()` - Validates references or HEX, warns on direct HEX usage
- `validateAllTokens()` - Orchestrates validation for all token types

**Smart Change Detection**:
- `detectChanges()` - Returns which files have changes
- `hasFoundationColorChanges()` - Compares foundation color values
- `hasSemanticAttachmentChanges()` - Compares semantic references
- Only changed files are sent to GitHub Actions

**Multi-File Support**:
- `TOKEN_FILES` constant defines all supported token files
- `fetchAllCurrentTokens()` - Fetches multiple files from GitHub
- `triggerGitHubSync()` - Sends only changed files in payload

### 2. GitHub Actions (`.github/workflows/sync-tokens.yml`)

**Multi-File Updates**:
```yaml
- name: Update token files
  run: |
    # Parse files payload and update each file
    FILES='${{ toJson(github.event.client_payload.files) }}'
    echo "$FILES" | jq -r 'to_entries | .[] | "\(.key)|\(.value)"' | while IFS='|' read -r filepath content; do
      echo "Updating $filepath"
      echo "$content" | jq '.' > "$filepath"
    done
```

**Enhanced Change Detection**:
- Checks entire `tokens/src/` directory for changes
- Lists all changed files in PR description
- Only creates PR if changes detected

### 3. Validation Script (`scripts/validate-tokens.js`)

**Dual Validation**:
- `validateFoundationTokens()` - Foundation color rules
- `validateSemanticAttachmentTokens()` - Semantic token rules with reference validation

**Expected Values**:
- `EXPECTED_FAMILIES` - 10 color families with shade counts
- `EXPECTED_SEMANTIC_ATTACHMENT` - 5 semantic colors

**Enhanced Output**:
```
============================================================
TOKEN VALIDATION
============================================================

📄 Foundation Colors
------------------------------------------------------------
✅ All validations passed!

📄 Semantic Attachment Colors
------------------------------------------------------------
✅ All validations passed!
```

### 4. Plugin UI (`figma-plugin/ui.html`)

**Multi-Token Stats**:
```javascript
case 'extracted':
  const totalTokens = msg.data.total.processed;
  const foundationCount = msg.data.foundationColors.processed;
  const semanticCount = msg.data.semanticAttachment.processed;
  
  showProgress(
    'Tokens extracted!',
    `Foundation colors: ${foundationCount} | Semantic attachment: ${semanticCount} | Total: ${totalTokens}`
  );
```

**Enhanced Success Messages**:
- Shows token counts by type
- Lists changed files
- Displays total tokens synced

### 5. Documentation

**Updated Files**:
- `README.md` - Updated "What Gets Synced" section with both token types
- `SYNC_GUIDE.md` - Added semantic attachment details
- `figma-plugin/ui.html` - Updated info section in plugin UI

## Token Naming Conventions

### Foundation Colors
```
Pattern: {family}/{shade}
Examples:
  - blue/500 → #1C58D9
  - neutral/1000 → #1C1E21
  - red/400 → #D24B4E

Families: blue, indigo, neutral, cyan, purple, teal, yellow, orange, green, red
Shades: 100-800 (most families), 0-1200 (neutral)
```

### Semantic Attachment Colors
```
Pattern: attachment/{color}
Examples:
  - attachment/blue → {color.foundation.blue.300}
  - attachment/green → {color.foundation.green.600}
  - attachment/grey → {color.foundation.neutral.500}

Colors: blue, green, orange, red, grey
Output: DTCG references to foundation colors
```

## File Structure

```
tokens/src/
├── foundation/
│   └── color.json          # Foundation colors (HEX values)
└── semantic/
    └── attachment.json     # Semantic attachment colors (references)
```

## Validation Rules

### Foundation Colors
- ✅ Must have `$type: "color"`
- ✅ Must have `$value` as uppercase HEX (#RRGGBB)
- ❌ No opacity variants (-8, -16, etc.)
- ⚠️ Warns if shade count doesn't match expected

### Semantic Attachment Colors
- ✅ Must have `$type: "color"`
- ✅ Must have `$value` as reference (`{color.foundation.blue.300}`) or HEX
- ⚠️ Warns if using direct HEX instead of reference
- ⚠️ Warns if expected colors are missing

## GitHub PR Format

When changes are detected, the plugin creates a PR with:

**Title**: `chore: sync tokens from Figma`

**Body**:
```markdown
## 🎨 Sync Design Tokens from Figma

This PR updates design tokens synced from Figma via the Compass Token Sync plugin.

**Synced at**: 2026-02-08T10:30:00.000Z
**Source**: figma-plugin

### Files Changed
tokens/src/foundation/color.json, tokens/src/semantic/attachment.json

### What Changed
Review the diffs to see updated token values:
- Foundation colors: Raw HEX color values
- Semantic tokens: References to foundation colors

---
*Auto-generated via Figma plugin*
```

## Usage

1. **Edit tokens in Figma**:
   - Foundation: Edit colors named like `blue/500`
   - Semantic: Edit colors named like `attachment/blue` (should reference foundation colors)

2. **Sync via plugin**:
   - Open plugin in Figma
   - Click "Sync to GitHub"
   - Plugin extracts both token types
   - Validates structure and values
   - Checks for changes
   - Creates PR if changes detected

3. **Review PR**:
   - Check changed files
   - Verify values are correct
   - Merge when ready

## Future Enhancements

Potential additions for Phase 2+:
- **Multi-file configuration** - Select which Figma file to sync from
- **Spacing/Radius tokens** - Dimension token support
- **Typography tokens** - Font family, size, weight
- **Theme tokens** - Variable modes → theme JSON files
- **Selective sync** - Choose which token types to sync

## Testing

Run validation locally:
```bash
npm run validate
```

Build plugin:
```bash
cd figma-plugin
npm run build
```

Test in Figma:
1. Load plugin in Figma Desktop
2. Open color library file
3. Run plugin
4. Check console for detailed logs
5. Verify PR created on GitHub
