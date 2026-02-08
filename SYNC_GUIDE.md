# Figma Token Sync - Quick Start Guide

## 🎯 What You Have

A CLI tool that syncs foundation color tokens from Figma to this repository!

**Command**: `npm run sync:figma`

**What it does**:
- ✅ Fetches colors from Figma API
- ✅ Transforms to DTCG format (uppercase HEX)
- ✅ Validates against project rules
- ✅ Updates color.json
- ✅ Creates PR automatically

---

## 🚀 Setup Instructions

### **Step 1: Install Dependencies**

```bash
npm install
```

### **Step 2: Create Figma Personal Access Token**

1. Open Figma → **Settings** → **Account**
2. Scroll to **Personal Access Tokens**
3. Click **"Generate new token"**
4. Name it: `"Compass Token Sync"`
5. Click **"Generate"**
6. **Copy the token** (you won't see it again!)

### **Step 3: Get Your Figma File ID**

From your Figma URL:
```
https://figma.com/design/ABC123XYZ/Colors
                        ↑↑↑↑↑↑↑↑↑
                     This is your File ID
```

### **Step 4: Create .env File**

```bash
cp .env.example .env
```

Edit `.env` and paste your values:

```bash
FIGMA_API_TOKEN=figd_YOUR_TOKEN_HERE
FIGMA_FILE_ID=ABC123XYZ
```

### **Step 5: Install GitHub CLI (Optional)**

For automatic PR creation:

```bash
brew install gh
gh auth login
```

Follow the prompts to authenticate.

---

## 📖 Usage

### **Normal Workflow**

1. **Edit colors in Figma**
2. **Publish your Figma library** (standard workflow)
3. **Run the sync**:
   ```bash
   npm run sync:figma
   ```
4. **Review the PR** that was auto-created
5. **Merge** when ready!

### **What You'll See**

```
============================================================
FIGMA TOKEN SYNC
============================================================

1️⃣  Checking environment...
   ✓ Environment configured

2️⃣  Checking GitHub CLI...
   ✓ GitHub CLI authenticated

3️⃣  Fetching variables from Figma...
   File ID: ABC123XYZ
   ✓ Successfully fetched data from Figma

4️⃣  Extracting foundation colors...
   ✓ Found 92 foundation color variables

5️⃣  Transforming to DTCG format...

   Color Summary:
     • blue: 8 shades
     • indigo: 8 shades
     • neutral: 25 shades
     • cyan: 8 shades
     • purple: 8 shades
     • teal: 8 shades
     • yellow: 8 shades
     • orange: 8 shades
     • green: 8 shades
     • red: 8 shades

6️⃣  Validating tokens...
   ✓ Validation passed

7️⃣  Writing to color.json...
   ✓ Updated tokens/src/foundation/color.json

8️⃣  Checking for changes...
   ✓ Changes detected

9️⃣  Creating branch and committing...
   ✓ Created branch: figma-sync-20260208
   ✓ Created commit
   ✓ Pushed to remote

🔟 Creating pull request...
   ✓ Created Pull Request:
     https://github.com/mattermost/compass-tokens/pull/123

============================================================
✅ SYNC COMPLETE
============================================================
```

---

## 🛠 Troubleshooting

### **"FIGMA_API_TOKEN is not set"**

You need to create a `.env` file:
```bash
cp .env.example .env
```

Then edit it with your credentials.

### **"Invalid Figma API token"**

Double-check your token in `.env`. Make sure you copied it correctly when you generated it.

### **"Figma file not found"**

Check your `FIGMA_FILE_ID` in `.env`. Get it from your Figma URL.

### **"No foundation colors found"**

The script only syncs variables matching this pattern:
- `blue/500`, `neutral/1000`, `red/400`, etc.

It skips:
- Theme variables (`Denim/Button BG`)
- Attachment colors (`attachment-blue`)
- Capitalized variants (`Blue/500`)

### **"GitHub CLI not found"**

You can still use the tool! It will update `color.json` locally.

Then commit manually:
```bash
git add tokens/src/foundation/color.json
git commit -m "chore: sync foundation colors from Figma"
git push
```

---

## ✅ Validation

Test your tokens anytime:

```bash
npm run validate
```

This checks:
- HEX values are uppercase
- DTCG schema is valid
- No opacity variants in source
- All expected color families present

---

## 🎨 What Gets Synced

**Synced** (foundation colors):
- ✅ `blue/100` through `blue/800`
- ✅ `indigo/100` through `indigo/800`  
- ✅ `neutral/0` through `neutral/1200`
- ✅ All other color families: cyan, purple, teal, yellow, orange, green, red

**Not Synced**:
- ❌ Theme variables (e.g., `Denim/Button BG`)
- ❌ Semantic colors (e.g., `attachment-blue`)
- ❌ Capitalized display variants (e.g., `Blue/500`)
- ❌ Typography variables

---

## 🔐 Security

- Your Figma token is stored in `.env` (not committed to git)
- Token is only used to read variables (read-only access)
- You can revoke it anytime from Figma settings
- All changes go through PR review before merging

---

## 📚 Need Help?

1. Check this guide
2. Run `npm run validate` to check current state
3. Review the [main README](README.md) for full documentation
4. Check the [plan document](.cursor/plans/) for architecture details

---

**Ready?** Run `npm run sync:figma` to sync your first colors! 🚀
