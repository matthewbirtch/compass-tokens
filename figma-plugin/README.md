# Compass Token Sync - Figma Plugin

A Figma plugin that syncs foundation color tokens to the compass-tokens repository.

## 🚀 Installation

### For Development (Local Testing)

1. **Install dependencies**:
   ```bash
   cd figma-plugin
   npm install
   ```

2. **Build the plugin**:
   ```bash
   npm run build
   ```

3. **Load in Figma Desktop**:
   - Open Figma Desktop
   - Go to **Plugins** → **Development** → **Import plugin from manifest**
   - Select `figma-plugin/manifest.json`

### For Team Use (Publishing)

Once tested, publish the plugin privately to your Figma organization:
- Figma Desktop → **Plugins** → **Development** → **Publish private plugin**

## ⚙️ Setup

### 1. Create GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Name: `"Figma Plugin Sync"`
4. Select scope: ☑️ **`repo`** (full repository access)
5. Click **"Generate token"**
6. **Copy the token**

### 2. Configure Plugin

1. Open the plugin in Figma
2. Click **"⚙️ Settings"**
3. Paste your GitHub token
4. Click **"Save Token"**

Token is stored securely in Figma's client storage (local to your machine).

## 📖 Usage

### Normal Workflow

1. **Edit colors in Figma**
2. **Publish your library** (standard Figma workflow)
3. **Open the plugin**: Plugins → Compass Token Sync
4. **Click "Sync to GitHub"**
5. **Review the PR** created on GitHub
6. **Merge** when ready!

### Alternative: Save Locally

If you don't want to auto-create a PR:
1. Click **"💾 Save JSON Locally"**
2. Plugin downloads `color.json`
3. Manually copy to `tokens/src/foundation/color.json`
4. Commit and push yourself

## 🎨 What Gets Synced

**Synced** (foundation colors only):
- ✅ `blue/100` through `blue/800`
- ✅ `indigo/100` through `indigo/800`
- ✅ `neutral/0` through `neutral/1200`
- ✅ All color families: cyan, purple, teal, yellow, orange, green, red

**Not synced**:
- ❌ Theme variables (e.g., `Denim/Button BG`)
- ❌ Attachment colors (e.g., `attachment-blue`)
- ❌ Capitalized variants (e.g., `Blue/500`)
- ❌ Typography variables

Only variables matching pattern: `colorFamily/shade` (e.g., `blue/500`)

## 🔧 Development

### File Structure

```
figma-plugin/
├── manifest.json       - Plugin configuration
├── code.ts            - Main plugin logic
├── ui.html            - Plugin UI
├── ui.css             - Styling
├── package.json       - Dependencies
└── tsconfig.json      - TypeScript config
```

### Build Commands

```bash
# Build once
npm run build

# Watch mode (auto-rebuild on changes)
npm run watch
```

### Testing

1. Make changes to `code.ts`, `ui.html`, or `ui.css`
2. Run `npm run build`
3. In Figma: **Plugins** → **Development** → **Reload plugin** (or Cmd+Option+P)
4. Test the changes

## 🔒 Security

- GitHub token stored in Figma client storage (never sent anywhere except GitHub API)
- Token only has permissions you grant (recommend `repo` scope only)
- All changes go through PR review
- Can revoke token anytime from GitHub settings

## 🛠 Troubleshooting

### "Configure token in Settings"

You need to add your GitHub Personal Access Token in the plugin settings.

### "GitHub API error (401)"

Your token is invalid or expired. Generate a new one and save it in Settings.

### "GitHub API error (403)"

Your token doesn't have the `repo` scope. Create a new token with full repository access.

### "No changes detected"

Your Figma colors already match the repository. Make a color change and try again.

### Plugin doesn't load

1. Make sure you ran `npm run build`
2. Check that `dist/` folder exists with `code.js` and `ui.html`
3. Try removing and re-importing the plugin

## 📚 Resources

- [Figma Plugin API Docs](https://www.figma.com/plugin-docs/)
- [GitHub Repository Dispatch API](https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event)
- [Design Tokens Community Group](https://tr.designtokens.org/format/)
