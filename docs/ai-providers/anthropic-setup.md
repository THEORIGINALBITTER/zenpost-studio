# Anthropic Claude Setup Guide

**Provider:** Anthropic (Claude)
**Type:** Cloud API
**Cost:** Pay-per-use (Free credits for new users)
**Best For:** Advanced reasoning, long-context tasks, high-quality outputs

---

## 📋 What is Claude?

Claude is Anthropic's AI assistant, known for:
- ✅ **Superior reasoning** - Excellent at complex tasks and nuanced understanding
- ✅ **Long context** - Handles up to 200K tokens (huge documents)
- ✅ **Truthfulness** - Less prone to hallucinations than other models
- ✅ **Code quality** - Exceptional at code analysis and generation

**Available Models:**
- **Claude 3.5 Sonnet** - Best balance of speed and intelligence (recommended)
- **Claude 3 Opus** - Most capable, highest quality
- **Claude 3 Haiku** - Fastest, most cost-effective

---

## 🚀 Step 1: Create an Anthropic Account

1. **Visit Anthropic Console**
   - Go to: [console.anthropic.com](https://console.anthropic.com/)
   - Click **"Sign Up"** or **"Get Started"**

2. **Sign Up**
   - Enter your **email address**
   - Create a **password**
   - Or use **Google** sign-in

3. **Verify Email**
   - Check your inbox for verification email
   - Click the verification link

4. **Complete Profile** (if prompted)
   - Enter your name
   - Optional: Company information
   - Agree to Terms of Service

---

## 💳 Step 2: Add Payment Method & Get Credits

### New Users: Free Credits

Anthropic offers **$5 in free credits** for new accounts:
- Valid for **3 months**
- No credit card required initially
- Enough for ~1,000+ API calls

### Add Payment Method

1. **Navigate to Billing**
   - In the [Anthropic Console](https://console.anthropic.com/)
   - Click **"Settings"** (gear icon)
   - Select **"Billing"**

2. **Add Credit Card**
   - Click **"Add payment method"**
   - Enter card details
   - Click **"Save"**

3. **Set Budget (Recommended)**
   - Click **"Set budget limit"**
   - Example: $10/month to avoid unexpected charges
   - Click **"Save"**

---

## 🔑 Step 3: Generate API Key

1. **Go to API Keys Section**
   - In [console.anthropic.com](https://console.anthropic.com/)
   - Click **"API Keys"** in left sidebar

2. **Create New Key**
   - Click **"Create Key"** button
   - Give it a name (e.g., "ZenPost Studio")
   - Click **"Create Key"**

3. **Copy Your API Key**
   - ⚠️ **IMPORTANT:** Copy the key **immediately**
   - Format: `sk-ant-api03-...`
   - You **cannot** see it again after closing the dialog

4. **Store Safely**
   - Save in password manager
   - Never commit to Git
   - Never share publicly

---

## 🔧 Step 4: Configure ZenPost Studio

1. **Open ZenPost Studio**

2. **Navigate to Settings**
   - Open **File Converter** or **Content Transform**
   - Click the **Settings icon** (⚙️) in bottom right corner

3. **Configure Claude**
   - **AI Provider:** Select `Anthropic`
   - **Model:** Select `claude-3-5-sonnet-20241022` (recommended)
   - **API Key:** Paste your `sk-ant-api03-...` key
   - **Temperature:** `0.3` (recommended for coding tasks)

4. **Click "Speichern" (Save)**

---

## ✅ Step 5: Test Your Setup

### Quick Test

1. **Open File Converter** in ZenPost Studio
2. **Select formats:**
   - From: `Code (AI)`
   - To: `Markdown`
3. **Paste test code:**
   ```javascript
   function calculateTotal(items) {
     return items.reduce((sum, item) => sum + item.price, 0);
   }
   ```
4. **Click "Konvertieren" (Convert)**
5. **Verify:** You should see AI-generated documentation!

### Test via cURL (Advanced)

```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_API_KEY_HERE" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "Hello, Claude!"}
    ]
  }'
```

**Expected response:**
```json
{
  "id": "msg_01...",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Hello! How can I help you today?"
    }
  ]
}
```

---

## 💰 Pricing & Costs

### Claude 3.5 Sonnet (Recommended)

| Metric | Price |
|--------|-------|
| **Input** | $3.00 / 1M tokens |
| **Output** | $15.00 / 1M tokens |

**Example Costs:**
- Convert 10 code files to docs: ~$0.05
- Transform 20 markdown posts: ~$0.10
- Daily usage (moderate): ~$0.50-$2.00

### Claude 3 Opus (Highest Quality)

| Metric | Price |
|--------|-------|
| **Input** | $15.00 / 1M tokens |
| **Output** | $75.00 / 1M tokens |

### Claude 3 Haiku (Fastest, Cheapest)

| Metric | Price |
|--------|-------|
| **Input** | $0.25 / 1M tokens |
| **Output** | $1.25 / 1M tokens |

**💡 Tip:** Start with **Claude 3.5 Sonnet** - best quality-to-price ratio

---

## 🛠️ Common Issues & Solutions

### Issue 1: "Invalid API Key"

**Problem:** API key is incorrect or expired

**Solutions:**
1. **Check format:** Key should start with `sk-ant-api03-`
2. **No extra spaces:** Ensure no leading/trailing spaces
3. **Regenerate key:**
   - Go to [console.anthropic.com](https://console.anthropic.com/)
   - Delete old key
   - Create new key
   - Update in ZenPost Studio

---

### Issue 2: "Rate limit exceeded"

**Problem:** Too many requests in short time

**Solutions:**
1. **Wait 60 seconds** - Rate limits reset quickly
2. **Upgrade tier:**
   - Go to Settings → Usage tiers
   - Higher usage = higher rate limits
3. **Check rate limits:**
   - Tier 1 (Free): 50 requests/minute
   - Tier 2: 1,000 requests/minute
   - Tier 3+: 2,000+ requests/minute

---

### Issue 3: "Insufficient credits / Balance"

**Problem:** No credits or payment method

**Solutions:**
1. **Check balance:**
   - [console.anthropic.com](https://console.anthropic.com/) → Billing
2. **Add payment method:**
   - Settings → Billing → Add payment method
3. **Free credits expired:**
   - Free $5 valid for 3 months
   - Add credit card to continue

---

### Issue 4: "Model not found"

**Problem:** Model name is incorrect

**Solution:** Use exact model names:
- ✅ `claude-3-5-sonnet-20241022`
- ✅ `claude-3-opus-20240229`
- ✅ `claude-3-haiku-20240307`
- ❌ `claude-3.5` (wrong)
- ❌ `sonnet` (wrong)

---

### Issue 5: High costs / Unexpected charges

**Problem:** API usage higher than expected

**Solutions:**
1. **Set budget limits:**
   - Settings → Billing → Set budget
   - Example: $10/month hard limit
2. **Monitor usage:**
   - Check Settings → Usage
   - Review requests and costs
3. **Use cheaper model:**
   - Switch to Claude 3 Haiku (10x cheaper)
4. **Lower temperature:**
   - Reduces token usage slightly

---

## 📊 Model Comparison

| Model | Speed | Quality | Cost | Best For |
|-------|-------|---------|------|----------|
| **Claude 3.5 Sonnet** ⭐ | Fast | Excellent | Medium | **General purpose, recommended** |
| **Claude 3 Opus** | Slower | Best | High | Complex reasoning, critical tasks |
| **Claude 3 Haiku** | Fastest | Good | Low | High-volume, simple tasks |

---

## 🔐 Security Best Practices

### API Key Safety

❌ **Never do this:**
```javascript
// DON'T commit API keys to Git
const API_KEY = "sk-ant-api03-...";  // WRONG!
```

✅ **Do this:**
```javascript
// Store in environment variables
const API_KEY = process.env.ANTHROPIC_API_KEY;

// Or use ZenPost Studio's settings (stored in LocalStorage)
```

### Key Management

1. **Rotate keys regularly** (every 3-6 months)
2. **Use separate keys** for different projects
3. **Delete unused keys** immediately
4. **Monitor usage** for suspicious activity

### If Key is Compromised

1. **Immediately delete** the key in [console.anthropic.com](https://console.anthropic.com/)
2. **Generate new key**
3. **Update** in ZenPost Studio
4. **Review billing** for unauthorized usage
5. **Contact support** if needed: support@anthropic.com

---

## 📈 Monitoring Usage & Costs

### View Usage Dashboard

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Click **"Usage"** in left sidebar
3. See:
   - Requests per day
   - Tokens consumed
   - Cost breakdown
   - Rate limit status

### Set Up Alerts

1. **Budget alerts:**
   - Settings → Billing → Notifications
   - Set threshold (e.g., 80% of budget)
   - Receive email when reached

2. **Usage tracking:**
   - Monitor daily/weekly costs
   - Export usage data (CSV)

---

## 🆙 Upgrade Your Account

### Usage Tiers

Anthropic automatically upgrades your tier based on usage:

| Tier | Requirements | Rate Limit | Benefits |
|------|--------------|------------|----------|
| **Tier 1** | $0 spent | 50 req/min | Free credits |
| **Tier 2** | $5+ spent | 1,000 req/min | Higher limits |
| **Tier 3** | $40+ spent | 2,000 req/min | Priority support |
| **Tier 4** | $200+ spent | 4,000 req/min | Custom limits |

### Enterprise

For high-volume usage:
- Contact sales@anthropic.com
- Custom pricing
- Dedicated support
- SLA guarantees

---

## 🔄 API Version Updates

Anthropic occasionally updates their API. To stay current:

1. **Subscribe to updates:**
   - [Anthropic Changelog](https://docs.anthropic.com/changelog)
   - Discord: [discord.gg/anthropic](https://discord.gg/anthropic)

2. **Check for deprecations:**
   - Old models may be deprecated
   - Update model names in ZenPost Studio

3. **Current API version:**
   - `anthropic-version: 2023-06-01` (current)

---

## 📚 Additional Resources

**Official Documentation:**
- [Anthropic Docs](https://docs.anthropic.com/)
- [API Reference](https://docs.anthropic.com/api-reference)
- [Model Comparison](https://docs.anthropic.com/models)

**Community:**
- [Anthropic Discord](https://discord.gg/anthropic)
- [Twitter/X: @AnthropicAI](https://twitter.com/AnthropicAI)

**Support:**
- Email: support@anthropic.com
- Console: [console.anthropic.com](https://console.anthropic.com/)

---

## 🎉 Next Steps

Now that Claude is configured, you can:

1. ✅ **Use File Converter** - Convert code to high-quality documentation
2. ✅ **Use Content Transform** - Create platform-specific content with nuanced tone
3. ✅ **Try different models:**
   - **Claude 3.5 Sonnet** - Best all-around (recommended)
   - **Claude 3 Opus** - Maximum quality for critical content
   - **Claude 3 Haiku** - Fast and cheap for high-volume tasks

---

**Enjoy Claude's exceptional AI capabilities! 🚀**
