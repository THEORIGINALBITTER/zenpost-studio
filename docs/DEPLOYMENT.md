# GitHub Pages Deployment Guide

This guide shows you how to deploy the ZenPost Studio Wiki to GitHub Pages.

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Push to GitHub

Make sure all wiki files are committed and pushed to GitHub:

```bash
git add docs/
git commit -m "Add Docsify wiki documentation"
git push origin main
```

### Step 2: Enable GitHub Pages

1. **Go to your GitHub repository:**
   - `https://github.com/denisbitter/zenpost-studio`

2. **Navigate to Settings:**
   - Click **"Settings"** tab (top right)

3. **Go to Pages:**
   - In left sidebar, click **"Pages"**

4. **Configure Source:**
   - **Source:** Deploy from a branch
   - **Branch:** `main` (or your default branch)
   - **Folder:** `/docs`
   - Click **"Save"**

5. **Wait for Deployment:**
   - GitHub Pages will build and deploy automatically
   - Takes ~2-3 minutes
   - You'll see: **"Your site is live at https://denisbitter.github.io/zenpost-studio/"**

---

## ✅ Verify Deployment

### Check Deployment Status

1. Go to **Actions** tab in GitHub
2. You should see: **"pages build and deployment"** workflow
3. Wait for green checkmark ✅

### Visit Your Wiki

Once deployed, visit:
- **Wiki URL:** https://denisbitter.github.io/zenpost-studio/

You should see the ZenPost Studio Wiki with:
- 📚 Sidebar navigation
- 🔍 Search functionality
- 📖 All documentation pages
- 🎨 Zen-themed dark design

---

## 🔄 Updating the Wiki

Every time you push changes to the `docs/` folder, GitHub Pages automatically redeploys:

```bash
# Make changes to docs/
vim docs/ai-providers/ollama-setup.md

# Commit and push
git add docs/
git commit -m "Update Ollama setup guide"
git push origin main

# GitHub Pages automatically redeploys (2-3 minutes)
```

---

## 🛠️ Troubleshooting

### Issue 1: 404 Error - Page Not Found

**Problem:** Wiki shows 404 error

**Solutions:**
1. **Check GitHub Pages is enabled:**
   - Settings → Pages → Source should be `/docs`
2. **Check .nojekyll exists:**
   - Make sure `docs/.nojekyll` file exists (empty file)
3. **Wait for deployment:**
   - Check Actions tab for deployment status
4. **Clear browser cache:**
   - Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

---

### Issue 2: Styles Not Loading

**Problem:** Wiki shows but styling is broken

**Solutions:**
1. **Check index.html:**
   - Make sure `docs/index.html` exists
   - Check CDN links are correct
2. **Clear cache:**
   - Hard refresh browser
3. **Check browser console:**
   - F12 → Console tab
   - Look for errors loading CSS/JS

---

### Issue 3: Sidebar Not Showing

**Problem:** Left sidebar is missing

**Solution:**
1. **Check _sidebar.md exists:**
   - File should be at `docs/_sidebar.md`
2. **Check Docsify config:**
   - In `docs/index.html`, verify: `loadSidebar: true`

---

### Issue 4: Search Not Working

**Problem:** Search box doesn't find results

**Solutions:**
1. **Wait for indexing:**
   - Search index builds on first visit
   - Refresh page after 30 seconds
2. **Check search plugin:**
   - Verify search plugin is loaded in `index.html`

---

### Issue 5: Changes Not Showing

**Problem:** Pushed changes but wiki not updated

**Solutions:**
1. **Check deployment status:**
   - GitHub → Actions tab
   - Look for failed builds
2. **Clear GitHub Pages cache:**
   - Wait 5-10 minutes
   - GitHub Pages caches content
3. **Force rebuild:**
   - Make a small change (add space)
   - Commit and push again

---

## 🎨 Customization

### Change Theme Color

Edit `docs/index.html`:

```css
:root {
  --theme-color: #AC8E66;  /* Change this to your color */
}
```

### Add Custom Pages

1. Create new markdown file in `docs/`:
   ```bash
   echo "# New Page" > docs/new-page.md
   ```

2. Add to sidebar `docs/_sidebar.md`:
   ```markdown
   - [New Page](new-page.md)
   ```

3. Commit and push:
   ```bash
   git add docs/
   git commit -m "Add new page"
   git push
   ```

---

## 📊 Analytics (Optional)

### Add Google Analytics

Edit `docs/index.html` and add to `window.$docsify`:

```javascript
window.$docsify = {
  // ... existing config
  ga: 'UA-XXXXXXXXX-X',  // Your Google Analytics ID
}
```

---

## 🔐 Custom Domain (Optional)

### Use Custom Domain Instead of github.io

1. **Buy a domain** (e.g., `zenpost.studio`)

2. **Add CNAME file:**
   ```bash
   echo "docs.zenpost.studio" > docs/CNAME
   ```

3. **Configure DNS:**
   - Add CNAME record:
     - Name: `docs`
     - Value: `denisbitter.github.io`

4. **Enable HTTPS:**
   - Settings → Pages → Enforce HTTPS (automatic)

5. **Access wiki:**
   - `https://docs.zenpost.studio`

---

## 🆘 Getting Help

**GitHub Pages Documentation:**
- https://docs.github.com/en/pages

**Docsify Documentation:**
- https://docsify.js.org/

**ZenPost Studio Issues:**
- https://github.com/denisbitter/zenpost-studio/issues

---

## 📚 What Got Deployed?

Your wiki includes:

### Files:
```
docs/
├── index.html           # Docsify configuration
├── .nojekyll           # GitHub Pages config
├── _sidebar.md         # Navigation sidebar
├── README.md           # Home page
├── DEPLOYMENT.md       # This file
└── ai-providers/
    ├── README.md       # AI providers overview
    ├── ollama-setup.md
    ├── openai-setup.md
    └── anthropic-setup.md
```

### Features:
- ✅ Dark theme with Zen colors
- ✅ Search functionality
- ✅ Sidebar navigation
- ✅ Syntax highlighting
- ✅ Copy code buttons
- ✅ Responsive design
- ✅ Auto-deployment on push

---

## 🎉 Next Steps

1. ✅ **Wiki is live!** Share the link: https://denisbitter.github.io/zenpost-studio/
2. 📝 **Add more docs** - Create guides for features, troubleshooting, etc.
3. 🎨 **Customize** - Adjust colors, add logo, customize footer
4. 📊 **Track usage** - Add analytics (optional)

---

**Your ZenPost Studio Wiki is now live! 🚀**
