# OpenAI Setup Guide

**Provider:** OpenAI
**Type:** Cloud API
**Cost:** Pay-per-use (Free trial for new users)
**Best For:** General purpose, proven reliability, extensive model selection

---

## 📋 What is OpenAI?

OpenAI provides the GPT series of AI models, including:
- ✅ **Industry standard** - Most widely used AI API
- ✅ **Proven reliability** - Battle-tested at scale
- ✅ **Extensive models** - From GPT-3.5 to GPT-4o and o1
- ✅ **Great documentation** - Comprehensive guides and examples

**Available Models:**
- **GPT-4o** - Multimodal, fast, cost-effective (recommended)
- **GPT-4o-mini** - Fastest, cheapest GPT-4 variant
- **GPT-4** - Original GPT-4, high quality
- **GPT-3.5-turbo** - Fast, cheap, good for simple tasks
- **o1-preview** - Advanced reasoning (slow, expensive)

---

## 🚀 Step 1: Create an OpenAI Account

1. **Visit OpenAI Platform**
   - Go to: [platform.openai.com/signup](https://platform.openai.com/signup)
   - Click **"Sign up"**

2. **Sign Up**
   - Enter your **email address**
   - Create a **password**
   - Or use **Google/Microsoft** sign-in

3. **Verify Email**
   - Check your inbox for verification email from OpenAI
   - Click the verification link

4. **Verify Phone Number**
   - OpenAI requires phone verification
   - Enter your phone number
   - Enter the 6-digit code sent via SMS

---

## 💳 Step 2: Add Payment Method & Get Credits

### New Users: Free Trial

OpenAI offers **$5 in free credits** for new accounts:
- Valid for **3 months**
- Credit card required (but not charged during trial)
- Enough for ~500-1,000 API calls

### Add Payment Method

1. **Navigate to Billing**
   - Go to: [platform.openai.com/settings/organization/billing](https://platform.openai.com/settings/organization/billing)
   - Or click **"Settings"** → **"Billing"**

2. **Add Credit Card**
   - Click **"Add payment method"**
   - Enter card details (Visa, Mastercard, Amex supported)
   - Click **"Add payment method"**

3. **Set Usage Limits (Highly Recommended)**
   - Click **"Usage limits"**
   - Set **Hard limit**: $10/month (recommended to start)
   - Set **Soft limit**: $5/month (email notification)
   - Click **"Save"**

   **⚠️ Important:** Without limits, you could accumulate unexpected charges!

---

## 🔑 Step 3: Generate API Key

1. **Go to API Keys**
   - Visit: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - Or click **"API keys"** in left sidebar

2. **Create New Secret Key**
   - Click **"+ Create new secret key"**
   - Give it a name (e.g., "ZenPost Studio")
   - **Permissions:** All (default) or Custom
   - **Optional:** Set expiration date for security
   - Click **"Create secret key"**

3. **Copy Your API Key**
   - ⚠️ **CRITICAL:** Copy the key **immediately**
   - Format: `sk-proj-...` (new format) or `sk-...` (legacy)
   - You **cannot** see it again after closing

4. **Store Safely**
   - Save in password manager (1Password, LastPass, Bitwarden)
   - Never commit to Git
   - Never share publicly or in screenshots

---

## 🔧 Step 4: Configure ZenPost Studio

1. **Open ZenPost Studio**

2. **Navigate to Settings**
   - Open **File Converter** or **Content Transform**
   - Click the **Settings icon** (⚙️) in bottom right corner

3. **Configure OpenAI**
   - **AI Provider:** Select `OpenAI`
   - **Model:** Select `gpt-4o-mini` (recommended for cost)
   - **API Key:** Paste your `sk-proj-...` or `sk-...` key
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
   ```python
   def fibonacci(n):
       if n <= 1:
           return n
       return fibonacci(n-1) + fibonacci(n-2)
   ```
4. **Click "Konvertieren" (Convert)**
5. **Verify:** You should see AI-generated documentation!

### Test via cURL (Advanced)

```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "user", "content": "Hello, GPT!"}
    ]
  }'
```

**Expected response:**
```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1700000000,
  "model": "gpt-4o-mini",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Hello! How can I assist you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 9,
    "total_tokens": 19
  }
}
```

---

## 💰 Pricing & Costs

### GPT-4o-mini (Recommended for Most Users)

| Metric | Price |
|--------|-------|
| **Input** | $0.15 / 1M tokens |
| **Output** | $0.60 / 1M tokens |

**Example Costs:**
- Convert 10 code files to docs: ~$0.01-0.02
- Transform 20 markdown posts: ~$0.03-0.05
- Daily usage (moderate): ~$0.10-0.50

### GPT-4o (Faster, Higher Quality)

| Metric | Price |
|--------|-------|
| **Input** | $2.50 / 1M tokens |
| **Output** | $10.00 / 1M tokens |

### GPT-4 (Original, High Quality)

| Metric | Price |
|--------|-------|
| **Input** | $30.00 / 1M tokens |
| **Output** | $60.00 / 1M tokens |

### GPT-3.5-turbo (Legacy, Cheapest)

| Metric | Price |
|--------|-------|
| **Input** | $0.50 / 1M tokens |
| **Output** | $1.50 / 1M tokens |

**💡 Recommendation:**
- **Start with:** GPT-4o-mini (best value)
- **Upgrade to:** GPT-4o (better quality, still affordable)
- **Avoid:** GPT-4 (20x more expensive than GPT-4o)

---

## 🛠️ Common Issues & Solutions

### Issue 1: "Incorrect API key provided"

**Problem:** API key is wrong, expired, or has typo

**Solutions:**
1. **Check format:**
   - New format: `sk-proj-...`
   - Legacy format: `sk-...`
2. **No extra spaces:** Ensure no leading/trailing whitespace
3. **Regenerate key:**
   - Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - Delete old key
   - Create new key
   - Update in ZenPost Studio

---

### Issue 2: "You exceeded your current quota"

**Problem:** Out of credits or no payment method

**Solutions:**
1. **Check billing:**
   - Go to [platform.openai.com/settings/organization/billing](https://platform.openai.com/settings/organization/billing)
   - Verify payment method is active
2. **Free trial expired:**
   - Free $5 credits expire after 3 months
   - Add credit card to continue
3. **Hit usage limit:**
   - Increase hard limit in Settings → Usage limits
4. **Payment failed:**
   - Check if card was declined
   - Update payment method

---

### Issue 3: "Rate limit reached"

**Problem:** Too many requests too quickly

**Solutions:**
1. **Wait 60 seconds** - Rate limits reset every minute
2. **Check your tier:**
   - Free tier: 3 requests/min (GPT-4)
   - Tier 1 ($5+ spent): 500 requests/min
   - Tier 2 ($50+ spent): 5,000 requests/min
3. **Upgrade tier:**
   - Spend more to unlock higher rate limits
   - Or wait longer between requests

**Rate Limits by Tier:**

| Tier | Requirement | GPT-4o-mini | GPT-4o | GPT-4 |
|------|-------------|-------------|--------|-------|
| **Free** | $0 | 500 req/min | 500 req/min | 3 req/min |
| **Tier 1** | $5+ | 500 req/min | 500 req/min | 5,000 req/min |
| **Tier 2** | $50+ | 5,000 req/min | 5,000 req/min | 10,000 req/min |

---

### Issue 4: "The model does not exist"

**Problem:** Model name is incorrect or deprecated

**Solution:** Use exact model names:
- ✅ `gpt-4o-mini`
- ✅ `gpt-4o`
- ✅ `gpt-4-turbo`
- ✅ `gpt-3.5-turbo`
- ❌ `gpt-4o-mini-2024` (wrong)
- ❌ `gpt4` (wrong)

---

### Issue 5: High costs / Unexpected bill

**Problem:** API usage exceeded expectations

**Solutions:**
1. **Set hard limits:**
   - Settings → Billing → Usage limits
   - Set **Hard limit** (e.g., $10/month)
   - OpenAI will **stop API calls** when hit
2. **Monitor usage:**
   - Check Settings → Usage
   - Review daily costs
3. **Use cheaper model:**
   - Switch to GPT-4o-mini (much cheaper)
4. **Enable email alerts:**
   - Settings → Usage limits → Soft limit
   - Get notified before hitting hard limit

---

## 📊 Model Comparison

| Model | Speed | Quality | Cost/1M tokens | Best For |
|-------|-------|---------|----------------|----------|
| **GPT-4o-mini** ⭐ | Very Fast | Excellent | $0.15 | **Most use cases, recommended** |
| **GPT-4o** | Fast | Superior | $2.50 | High-quality outputs, multimodal |
| **GPT-4-turbo** | Medium | Superior | $10.00 | Complex reasoning |
| **GPT-3.5-turbo** | Fastest | Good | $0.50 | Simple tasks, high volume |
| **o1-preview** | Slow | Best | $15.00 | Advanced reasoning, research |

---

## 🔐 Security Best Practices

### API Key Safety

❌ **Never do this:**
```javascript
// DON'T hardcode API keys
const API_KEY = "sk-proj-...";  // WRONG!

// DON'T commit to Git
git add config.js  // If it contains keys
```

✅ **Do this:**
```javascript
// Use environment variables
const API_KEY = process.env.OPENAI_API_KEY;

// Or use ZenPost Studio settings (stored securely in LocalStorage)
```

### Key Management Best Practices

1. **Rotate keys regularly** (every 3-6 months)
2. **Use separate keys** for dev/prod
3. **Set expiration dates** on keys
4. **Delete unused keys** immediately
5. **Never share** keys in:
   - Screenshots
   - Support tickets
   - Public repositories
   - Slack/Discord messages

### If Key is Compromised

1. **Immediately revoke** at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. **Generate new key**
3. **Update** in ZenPost Studio
4. **Review usage** for unauthorized activity
5. **Contact support:** help.openai.com

---

## 📈 Monitoring Usage & Costs

### View Usage Dashboard

1. **Go to Usage page:**
   - [platform.openai.com/usage](https://platform.openai.com/usage)

2. **See metrics:**
   - Requests by day
   - Tokens consumed
   - Cost breakdown by model
   - Rate limit status

3. **Export data:**
   - Click "Export" for CSV download
   - Analyze in Excel/Google Sheets

### Cost Optimization Tips

1. **Use GPT-4o-mini** instead of GPT-4 (100x cheaper)
2. **Lower temperature** (0.3 vs 0.7) for deterministic outputs
3. **Shorter prompts** = fewer input tokens
4. **Set max_tokens** to limit response length
5. **Cache responses** if same request is repeated

---

## 🆙 Usage Tiers & Rate Limits

OpenAI automatically upgrades your tier based on spending:

| Tier | Total Spend | Rate Limits | Benefits |
|------|-------------|-------------|----------|
| **Free** | $0 | Low (3-500 req/min) | $5 free credits |
| **Tier 1** | $5+ | Medium (500-5K req/min) | Standard access |
| **Tier 2** | $50+ | High (5K-10K req/min) | Higher throughput |
| **Tier 3** | $100+ | Very High (10K+ req/min) | Priority support |
| **Tier 4** | $250+ | Highest (20K+ req/min) | Dedicated support |
| **Tier 5** | $1,000+ | Custom | Enterprise features |

**To check your tier:**
- Go to Settings → Limits
- See current tier and requirements for next tier

---

## 🔄 Model Updates & Deprecations

OpenAI occasionally updates models. Stay informed:

1. **Subscribe to updates:**
   - [OpenAI Blog](https://openai.com/blog)
   - [Changelog](https://platform.openai.com/docs/changelog)
   - [Twitter/X: @OpenAI](https://twitter.com/OpenAI)

2. **Deprecated models:**
   - `gpt-3.5-turbo-0301` → Deprecated
   - `text-davinci-003` → Deprecated
   - Use latest model aliases (e.g., `gpt-4o-mini`)

3. **Model aliases:**
   - `gpt-4o` → Always points to latest GPT-4o version
   - `gpt-4o-mini` → Always points to latest mini version

---

## 📚 Additional Resources

**Official Documentation:**
- [OpenAI Docs](https://platform.openai.com/docs)
- [API Reference](https://platform.openai.com/docs/api-reference)
- [Pricing](https://openai.com/pricing)
- [Rate Limits](https://platform.openai.com/docs/guides/rate-limits)

**Community:**
- [OpenAI Community Forum](https://community.openai.com/)
- [Discord (unofficial)](https://discord.gg/openai)
- [Twitter/X: @OpenAI](https://twitter.com/OpenAI)

**Support:**
- Help Center: [help.openai.com](https://help.openai.com/)
- Email: support@openai.com (paid accounts)

---

## 🆘 Getting Help

**Common Questions:**
- [OpenAI Help Center](https://help.openai.com/)
- [Community Forum](https://community.openai.com/)

**Contact Support:**
- **Paid accounts:** Email support@openai.com
- **Free accounts:** Use Help Center articles

**Report Issues:**
- [Status Page](https://status.openai.com/) - Check for outages
- [Bug Reports](https://community.openai.com/) - Community forum

---

## 🎉 Next Steps

Now that OpenAI is configured, you can:

1. ✅ **Use File Converter** - Convert code to professional documentation
2. ✅ **Use Content Transform** - Create platform-optimized content
3. ✅ **Try different models:**
   - **GPT-4o-mini** - Fast and cheap (recommended start)
   - **GPT-4o** - Higher quality, still affordable
   - **GPT-3.5-turbo** - Ultra-fast for simple tasks

4. ✅ **Monitor costs:**
   - Set usage limits
   - Check dashboard weekly
   - Optimize model choice

---

**Happy coding with OpenAI! 🚀**
