# Theme Token Sync Implementation

## Overview

Added support for syncing **5 theme token files** from Figma Variable Modes to the repository.

## What Was Added

### Supported Themes

The plugin now extracts theme tokens from Figma Variable Modes:

- **Denim** → `tokens/src/themes/denim.json`
- **Sapphire** → `tokens/src/themes/sapphire.json`
- **Quartz** → `tokens/src/themes/quartz.json`
- **Onyx** → `tokens/src/themes/onyx.json`
- **Indigo** → `tokens/src/themes/indigo.json`

### How It Works

#### 1. Figma Variable Structure

In Figma, you have:
- **One collection**: "Themes" (or similar name)
- **5 modes**: Denim, Sapphire, Quartz, Onyx, Indigo
- **Variables**: `sidebar-bg`, `button-bg`, `center-channel-bg`, etc.
- **Values per mode**: Each variable has a different value for each mode

#### 2. Plugin Behavior

The plugin:
1. Detects any collection that has the theme mode names (Denim, Sapphire, etc.)
2. For each COLOR variable in that collection:
   - Extracts the value for EACH mode
   - Handles both:
     - **Direct colors**: Converted to HEX (e.g., `#1C58D9`)
     - **Aliases**: Converted to references (e.g., `{color.foundation.blue.500}`)
3. Creates/updates 5 separate JSON files (one per theme)
4. Only includes themes in the PR if they have actual changes

#### 3. Output Format

Each theme file follows DTCG format:

```json
{
  "$schema": "https://tr.designtokens.org/format/",
  "color": {
    "theme": {
      "denim": {
        "sidebar-bg": {
          "$type": "color",
          "$value": "{color.foundation.indigo.500}"
        },
        "button-bg": {
          "$type": "color",
          "$value": "{color.foundation.blue.500}"
        }
      }
    }
  }
}
```

### Implementation Details

#### Files Modified

1. **`figma-plugin/code.ts`**:
   - Added `TOKEN_FILES` for all 5 theme files
   - Added `THEME_MODE_TO_FILE` mapping
   - Added `extractThemeTokens()` function
   - Updated `validateAllTokens()` for theme validation
   - Updated `fetchAllCurrentTokens()` to fetch theme files
   - Updated `detectChanges()` to compare theme tokens
   - Integrated theme extraction into main sync flow

2. **`figma-plugin/ui.html`**:
   - Updated "What Gets Synced" section
   - Added theme count display in extraction stats
   - Shows theme files in changed files list

3. **`README.md`**:
   - Updated "What Gets Synced" section with theme details

4. **`SYNC_GUIDE.md`**:
   - Updated "What Gets Synced" section with theme details

#### Key Functions

**`extractThemeTokens()`**:
```typescript
async function extractThemeTokens() {
  // 1. Find collections with theme modes (Denim, Sapphire, etc.)
  // 2. For each COLOR variable in theme collection:
  //    - Process each mode separately
  //    - Extract value (HEX or reference)
  //    - Add to appropriate theme file structure
  // 3. Return tokens map with all 5 theme files
}
```

**Theme Change Detection**:
```typescript
// Only checks themes that were extracted from current file
for (const themeName of Object.keys(THEME_MODE_TO_FILE)) {
  const filePath = THEME_MODE_TO_FILE[themeName];
  
  if (newTokensMap[filePath]) {
    // Compare each variable in theme
    // Add to changedFiles if differences found
  }
}
```

### Multi-File Sync

The plugin now handles **up to 9 files** in a single sync:
1. `tokens/src/foundation/color.json`
2. `tokens/src/semantic/attachment.json`
3. `tokens/src/foundation/radius.json`
4. `tokens/src/foundation/spacing.json`
5. `tokens/src/themes/denim.json`
6. `tokens/src/themes/sapphire.json`
7. `tokens/src/themes/quartz.json`
8. `tokens/src/themes/onyx.json`
9. `tokens/src/themes/indigo.json`

**Smart file detection**: Only files with actual changes are included in the PR.

### Usage

#### In Figma Theme File

1. Open the Figma file containing the theme collection (with 5 modes)
2. Run the **Compass Token Sync** plugin
3. Click **"Sync to GitHub"**
4. Plugin will:
   - Extract theme tokens for all 5 modes
   - Also extract any foundation/semantic/radius/spacing tokens (if in same file)
   - Show extraction stats: "Themes: X tokens across 5 modes"
   - Create PR with changed theme files

#### Example Output

```
🎨 Syncing...
Extracting tokens from Figma...
Checking for theme variables...

Tokens extracted!
Colors: 200 | Attachment: 5 | Themes: 103 tokens across 5 modes | Total: 308

✅ Successfully synced 308 tokens!
Files: denim.json, sapphire.json, quartz.json, onyx.json, indigo.json
```

### Validation

**Theme validation** (basic):
- Checks correct structure: `color.theme.{themeName}`
- Validates token format: `$type` and `$value` present
- No specific reference validation yet (theme values can be HEX or references)

### GitHub Actions

No changes needed! The existing workflow already handles multiple files via the `client_payload.files` object.

### Benefits

1. **Single Plugin, Multiple Files**: One Figma file can now sync all 5 theme files
2. **Mode-Aware**: Automatically extracts different values per mode
3. **Smart Change Detection**: Only creates PR for themes that actually changed
4. **Consistent with Existing Patterns**: Uses same sync flow as other token types

## Testing Checklist

- [ ] Build plugin: `cd figma-plugin && npm run build`
- [ ] Open Figma file with theme collection (5 modes)
- [ ] Run plugin
- [ ] Click "Sync to GitHub"
- [ ] Verify extraction shows theme count
- [ ] Check PR on GitHub
- [ ] Verify all 5 theme files are updated (if changed)
- [ ] Verify correct token values in each file
- [ ] Merge PR
- [ ] Verify files in repo match Figma

## Limitations

- **No typography**: Typography tokens not yet supported
- **Hardcoded mode names**: Only works with exact names (Denim, Sapphire, Quartz, Onyx, Indigo)
- **Color variables only**: Only COLOR type variables are extracted for themes
- **Single collection**: Assumes themes are in one collection with 5 modes

## Future Enhancements

1. Support configurable theme names (not hardcoded)
2. Support more than 5 themes
3. Add detailed theme validation (reference checking)
4. Support non-color theme tokens (if needed)
5. Support multiple theme collections

---

**Status**: ✅ Implemented and ready for testing
