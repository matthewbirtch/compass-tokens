# Figma Token Sync - Quick Start Guide

## 🎯 What You Have

A **Figma plugin** that syncs design tokens from Figma to this repository!

**How it works**:
- ✅ Runs inside Figma Desktop (no API token needed!)
- ✅ Direct access to your color variables
- ✅ Syncs foundation colors + semantic attachment colors
- ✅ Transforms to DTCG format (uppercase HEX or references)
- ✅ Validates against project rules
- ✅ Creates PR automatically on GitHub

---

## 🚀 Setup Instructions

### **Step 1: Install Plugin Dependencies**

```bash
cd figma-plugin
npm install
```

### **Step 2: Build the Plugin**

```bash
npm run build
```

This creates the `dist/` folder with the compiled plugin.

### **Step 3: Load Plugin in Figma Desktop**

1. Open **Figma Desktop** (not browser!)
2. Go to **Plugins** → **Development** → **Import plugin from manifest...**
3. Navigate to and select: `figma-plugin/manifest.json`
4. Plugin is now loaded!

### **Step 4: Create GitHub Personal Access Token**

1. Go to https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Name: `"Figma Plugin Sync"`
4. **Required scope**: ☑️ **`repo`** (full repository access)
5. Expiry: **90 days** (recommended)
6. Click **"Generate token"**
7. **Copy the token immediately** (you won't see it again!)

### **Step 5: Configure Plugin**

1. In Figma, open your color library file
2. **Right-click** → **Plugins** → **Development** → **Compass Token Sync**
3. Plugin opens! Click **"⚙️ Settings"**
4. Paste your GitHub token
5. Click **"Save Token"**
6. Status should show: **"✅ Ready to sync"**

---

## 📖 Usage

### **Normal Workflow**

1. **Edit colors in Figma**
   - Make your color changes
   - Test in your designs

2. **Publish your Figma library** 
   - Standard Figma workflow
   - Ensures changes are finalized

3. **Open the plugin**
   - Right-click → Plugins → Compass Token Sync
   - (or use Quick Actions: Cmd/Ctrl + /)

4. **Click "Sync to GitHub"**
   - Plugin extracts colors
   - Creates PR on GitHub
   - Shows success message with PR link

5. **Review & Merge the PR**
   - Check the diff on GitHub
   - Merge when ready!

### **What You'll See in the Plugin**

```
🎨 Compass Token Sync
Sync foundation colors to GitHub

Status:
✅ Ready to sync
Last sync: 2/8/2026, 4:30 PM

[Sync to GitHub Button]
[💾 Save JSON Locally Button]

⚙️ Settings (click to expand)
ℹ️ What Gets Synced (click to expand)
```

---

## 🎨 What Gets Synced

**Foundation Colors**:
- ✅ Pattern: `blue/100` through `blue/800`
- ✅ Pattern: `indigo/100` through `indigo/800`
- ✅ Pattern: `neutral/0` through `neutral/1200`
- ✅ All families: cyan, purple, teal, yellow, orange, green, red
- ✅ Output: Uppercase HEX values (#1C58D9)
- ✅ File: `tokens/src/foundation/color.json`

**Semantic Attachment Colors**:
- ✅ Pattern: `attachment/blue`, `attachment/green`, `attachment/grey`
- ✅ 5 colors: blue, green, orange, red, grey
- ✅ Output: Foundation references ({color.foundation.blue.300})
- ✅ File: `tokens/src/semantic/attachment.json`

**Foundation Radius**:
- ✅ Pattern: `radius-xs`, `radius-full`
- ✅ 6 sizes: xs, s, m, l, xl, full
- ✅ Output: Numeric values (2, 4, 8) or "50%" for full
- ✅ File: `tokens/src/foundation/radius.json`

**Foundation Spacing**:
- ✅ Pattern: `spacing-xxxxs`, `spacing-xl`
- ✅ 8 sizes: xxxxs, xs, m, l, xl, xxl, xxxl, xxxxl
- ✅ Output: Numeric values (4, 8, 12, etc.)
- ✅ File: `tokens/src/foundation/spacing.json`

**Theme Colors (via Variable Modes)**:
- ✅ All 5 themes: Denim, Sapphire, Quartz, Onyx, Indigo
- ✅ All theme variables (sidebar-bg, button-bg, center-channel-bg, etc.)
- ✅ Output: HEX values or foundation references
- ✅ Automatically detects collection with theme modes
- ✅ Files: `tokens/src/themes/denim.json`, `sapphire.json`, `quartz.json`, `onyx.json`, `indigo.json`

**Not synced yet**:
- ❌ Typography variables
- ❌ Capitalized variants (e.g., `Blue/500`)

---

## 🛠 Troubleshooting

### **Plugin doesn't appear in Figma**

1. Make sure you're using **Figma Desktop** (not browser)
2. Check you ran `npm run build` in `figma-plugin/`
3. Check `figma-plugin/dist/` folder exists
4. Try: Plugins → Development → **Remove plugin**, then re-import

### **"Configure token in Settings"**

You need to add your GitHub Personal Access Token:
1. Open plugin
2. Click "⚙️ Settings"
3. Paste your token
4. Click "Save Token"

### **"GitHub API error (401)"**

Your token is invalid or expired:
1. Generate a new token (see Step 4 above)
2. Update in plugin settings

### **"GitHub API error (403)"**

Your token doesn't have the `repo` scope:
1. Generate a new token
2. Make sure to check ☑️ **`repo`**
3. Update in plugin settings

### **"GitHub API error (404)"**

The repository doesn't exist or token doesn't have access:
- Make sure you have access to `mattermost/compass-tokens`
- Check token has `repo` scope

### **No colors found / "Found 0 foundation color variables"**

Check your variable naming:
- Variables must match pattern: `blue/500`, `neutral/1000`
- Must be lowercase (not `Blue/500`)
- Only processes COLOR type variables

### **Plugin shows "No changes detected"**

Your Figma colors already match the repository - everything is in sync! ✅

To test:
1. Make a small color change
2. Try syncing again

---

## 💾 Alternative: Save Locally

If you don't want auto PR creation:

1. Click **"💾 Save JSON Locally"**
2. Plugin downloads `color.json` file
3. Manually copy to `tokens/src/foundation/color.json`
4. Commit and push yourself:
   ```bash
   git add tokens/src/foundation/color.json
   git commit -m "chore: sync foundation colors from Figma"
   git push
   ```

---

## 🔐 Security

- **Token storage**: Stored in Figma's client storage (local to your machine, never transmitted except to GitHub)
- **Token permissions**: Only needs `repo` scope (read/write repository access)
- **Revoke anytime**: https://github.com/settings/tokens
- **PR review**: All changes reviewed via pull request before merging
- **No API**: Plugin doesn't use Figma REST API (runs inside Figma, direct variable access)

---

## 🔄 Development Workflow

### Making Changes to the Plugin

1. Edit `code.ts`, `ui.html`, or `ui.css`
2. Run `npm run build`
3. In Figma: **Plugins** → **Development** → **Reload plugin** (or Cmd/Ctrl + Option/Alt + P)
4. Test your changes

### Watch Mode (Auto-rebuild)

```bash
npm run watch
```

Automatically rebuilds when you save changes (still need to reload in Figma).

---

## 📚 Additional Resources

- **Plugin README**: `figma-plugin/README.md` (detailed technical docs)
- **Main README**: `README.md` (full token system documentation)
- **Validation**: Run `npm run validate` to check token format
- **Figma Plugin Docs**: https://www.figma.com/plugin-docs/

---

## ✅ Success Checklist

After setup, you should be able to:

- [ ] Build the plugin (`npm run build`)
- [ ] Load plugin in Figma Desktop
- [ ] See plugin UI when opened
- [ ] Configure GitHub token in settings
- [ ] See "✅ Ready to sync" status
- [ ] Click "Sync to GitHub" button
- [ ] See success message
- [ ] Find auto-created PR on GitHub
- [ ] Merge PR successfully

---

**Ready?** Build the plugin and load it in Figma Desktop! 🚀
