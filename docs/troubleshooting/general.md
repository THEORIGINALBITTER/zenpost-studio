# General Troubleshooting

**Common Issues & Solutions**

Solutions to general problems with ZenPost Studio.

---

## 📋 Table of Contents

- [Installation Issues](#installation-issues)
- [Build & Development Issues](#build--development-issues)
- [Application Issues](#application-issues)
- [Performance Issues](#performance-issues)
- [Browser Compatibility](#browser-compatibility)

---

## 🔧 Installation Issues

### Issue 1: npm install fails

**Problem:** Dependencies fail to install

**Symptoms:**
```bash
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solutions:**

**1. Clear npm cache:**
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**2. Use correct Node version:**
```bash
# Check Node version
node --version

# Should be 18.x or higher
# If not, install latest LTS from https://nodejs.org
```

**3. Try legacy peer deps:**
```bash
npm install --legacy-peer-deps
```

---

### Issue 2: "Module not found" errors

**Problem:** Import errors after installation

**Symptoms:**
```
Error: Cannot find module 'react'
Error: Cannot find module '@fortawesome/react-fontawesome'
```

**Solutions:**

**1. Reinstall dependencies:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**2. Check package.json:**
Ensure all required dependencies are listed:
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@fortawesome/react-fontawesome": "^0.2.2",
    // ...
  }
}
```

**3. Install missing package:**
```bash
npm install <package-name>
```

---

## 🏗️ Build & Development Issues

### Issue 1: Dev server won't start

**Problem:** `npm run dev` fails or hangs

**Symptoms:**
```bash
npm run dev
# Nothing happens or error occurs
```

**Solutions:**

**1. Check port availability:**
```bash
# Check if port 5173 is in use
lsof -i :5173

# Kill process if needed
kill -9 <PID>
```

**2. Clear Vite cache:**
```bash
rm -rf node_modules/.vite
npm run dev
```

**3. Check for syntax errors:**
```bash
npm run lint
```

---

### Issue 2: Build fails

**Problem:** `npm run build` fails with errors

**Symptoms:**
```bash
npm run build
# TypeScript errors or build failures
```

**Solutions:**

**1. Check TypeScript errors:**
```bash
npx tsc --noEmit
```

Fix any TypeScript errors shown.

**2. Clear build artifacts:**
```bash
rm -rf dist
npm run build
```

**3. Check for circular dependencies:**

Look for import cycles in error messages.

**4. Increase Node memory (if out of memory):**
```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

---

### Issue 3: Hot reload not working

**Problem:** Changes don't reflect in browser

**Solutions:**

**1. Hard refresh:**
- Chrome/Firefox: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)

**2. Clear browser cache:**
- Open DevTools → Network tab → Check "Disable cache"

**3. Restart dev server:**
```bash
# Stop server (Ctrl+C)
npm run dev
```

**4. Check file watchers:**

On Linux, you may need to increase file watchers:
```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## 🖥️ Application Issues

### Issue 1: App shows blank screen

**Problem:** Application loads but shows nothing

**Solutions:**

**1. Check browser console:**
- Press `F12` or right-click → Inspect
- Look for JavaScript errors in Console tab

**2. Check for JavaScript disabled:**
- Ensure JavaScript is enabled in browser settings

**3. Clear browser cache:**
```bash
# Hard refresh
Cmd+Shift+R (Mac)
Ctrl+Shift+R (Windows/Linux)
```

**4. Try incognito/private mode:**

This disables extensions that might interfere.

---

### Issue 2: Settings not saving

**Problem:** AI settings don't persist after refresh

**Symptoms:**
- Configure AI provider
- Refresh page
- Settings are lost

**Solutions:**

**1. Check LocalStorage:**

Open DevTools → Application tab → LocalStorage → Check for `zenpost_ai_config`

**2. Enable LocalStorage:**

Some browsers/extensions block LocalStorage:
- Disable privacy extensions temporarily
- Check browser privacy settings
- Allow cookies and site data

**3. Check for browser errors:**

Console may show LocalStorage errors:
```
QuotaExceededError: The quota has been exceeded
```

**Solution:** Clear browser data for this site.

---

### Issue 3: "AI service not configured" error

**Problem:** Error when trying to convert/transform

**Solutions:**

**1. Configure AI provider:**
- Click Settings icon (⚙️) in bottom right
- Select provider (OpenAI, Anthropic, Ollama)
- Enter API key (if required)
- Select model
- Click Save

**2. Check API key format:**

**OpenAI:**
- Should start with `sk-proj-` or `sk-`
- No extra spaces

**Anthropic:**
- Should start with `sk-ant-api03-`
- No extra spaces

**Ollama:**
- No API key needed
- Ensure Ollama is running: `ollama serve`

---

### Issue 4: AI transformation fails

**Problem:** "Failed to generate" or "Error occurred" message

**Solutions:**

**1. Check API key:**
- Ensure key is valid and not expired
- Test key with provider's dashboard

**2. Check network connection:**
- Ensure internet is connected (for cloud providers)
- Check browser DevTools → Network tab for failed requests

**3. Check provider status:**

**OpenAI:**
- [status.openai.com](https://status.openai.com)

**Anthropic:**
- [status.anthropic.com](https://status.anthropic.com)

**Ollama:**
```bash
# Check if Ollama is running
curl http://127.0.0.1:11434/api/tags
```

**4. Check rate limits:**

You may have hit API rate limits:
- Wait a few minutes
- Check provider dashboard for usage

**5. Try different model:**

Some models may be unavailable:
- Switch to different model in settings
- OpenAI: Try `gpt-4o-mini`
- Anthropic: Try `claude-3-5-sonnet-20241022`

---

### Issue 5: Slow AI responses

**Problem:** AI takes very long to respond

**Solutions:**

**1. For Ollama (local):**

**Check system resources:**
```bash
# Check CPU/RAM usage
top

# Ollama needs significant RAM (8GB+ recommended)
```

**Use smaller model:**
```bash
# Instead of llama3.1 (4.7GB), try:
ollama pull mistral  # Smaller, faster
```

**2. For cloud providers:**

**Check network speed:**
- Slow internet connection = slow responses
- Try different network

**Use faster model:**
- OpenAI: `gpt-4o-mini` (faster than `gpt-4o`)
- Anthropic: `claude-3-haiku-20240307` (fastest)

**3. Check browser performance:**
- Close other tabs
- Disable heavy extensions
- Restart browser

---

## ⚡ Performance Issues

### Issue 1: App is slow/laggy

**Problem:** UI feels sluggish

**Solutions:**

**1. Clear browser cache:**
```bash
# Hard refresh
Cmd+Shift+R (Mac)
Ctrl+Shift+R (Windows/Linux)
```

**2. Check browser extensions:**

Disable extensions one by one to find culprit:
- Ad blockers
- Privacy extensions
- Developer tools

**3. Check system resources:**

Close other applications to free up RAM.

**4. Try different browser:**

Chrome, Firefox, Safari, or Edge.

---

### Issue 2: Large markdown files slow down editor

**Problem:** Typing is slow with large content

**Solutions:**

**1. Disable live preview:**

Click "Preview" toggle to turn off real-time rendering.

**2. Break content into sections:**

Split large documents into smaller pieces.

**3. Use external editor:**

For very large files:
1. Write in VSCode or other editor
2. Paste final content into ZenPost Studio

---

## 🌐 Browser Compatibility

### Supported Browsers

**✅ Fully Supported:**
- Chrome 90+ (Recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

**⚠️ Partial Support:**
- Older browsers may have issues
- Mobile browsers work but with limited features

### Issue: Features not working in Safari

**Problem:** Some UI elements broken in Safari

**Solutions:**

**1. Update Safari:**
- Ensure latest version (Safari 14+)

**2. Enable JavaScript:**
- Safari → Preferences → Security → Enable JavaScript

**3. Clear cache:**
- Safari → Preferences → Privacy → Manage Website Data → Remove All

---

### Issue: Mobile browser issues

**Problem:** App doesn't work well on mobile

**Known Limitations:**
- Desktop-focused design
- Some features may not work on small screens
- Touch interactions may be limited

**Solutions:**

**1. Use desktop mode:**

In mobile browser:
- Chrome: Menu → Desktop site
- Safari: AA icon → Request Desktop Website

**2. Use desktop browser:**

For best experience, use ZenPost Studio on desktop.

**Future:** Mobile-optimized version planned.

---

## 🔍 Debugging Tips

### Enable Detailed Logging

**1. Open Browser DevTools:**
- `F12` or Right-click → Inspect
- Go to Console tab

**2. Check for errors:**

Look for red error messages.

**3. Check Network tab:**

- See failed API requests
- Check request/response details

### Common Console Errors

**1. CORS errors:**
```
Access to fetch at '...' has been blocked by CORS policy
```

**Solution:**
- Ollama: Ensure proper CORS setup
- Custom API: Enable CORS on your server

**2. LocalStorage errors:**
```
QuotaExceededError: The quota has been exceeded
```

**Solution:**
- Clear browser data
- Disable unnecessary extensions

**3. Network errors:**
```
Failed to fetch
TypeError: NetworkError when attempting to fetch resource
```

**Solution:**
- Check internet connection
- Check API provider status
- Verify API endpoint URL

---

## 📚 Additional Resources

**Provider-Specific Issues:**
- [OpenAI Troubleshooting](../ai-providers/openai-setup.md#common-issues--solutions)
- [Anthropic Troubleshooting](../ai-providers/anthropic-setup.md#common-issues--solutions)
- [Ollama Troubleshooting](../ai-providers/ollama-setup.md#common-issues--solutions)

**Get Help:**
- [GitHub Issues](https://github.com/theoriginalbitter/zenpost-studio/issues)
- [GitHub Discussions](https://github.com/theoriginalbitter/zenpost-studio/discussions)

---

## 🆘 Still Having Issues?

**1. Search existing issues:**
- [GitHub Issues](https://github.com/theoriginalbitter/zenpost-studio/issues)

**2. Create new issue:**
- Include:
  - Browser & version
  - Operating system
  - Error messages (screenshots)
  - Steps to reproduce
  - Console logs (if applicable)

**3. Join discussions:**
- [GitHub Discussions](https://github.com/theoriginalbitter/zenpost-studio/discussions)

---

**We're here to help! 🙏**
