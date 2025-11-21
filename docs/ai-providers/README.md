# AI Providers Overview

ZenPost Studio supports **4 AI providers** for intelligent code conversion and content transformation. Choose the one that best fits your needs:

---

## 🤖 Quick Comparison

| Provider | Cost | Privacy | Speed | Quality | Best For |
|----------|------|---------|-------|---------|----------|
| **OpenAI** | $$ | Cloud | ⚡⚡⚡ | ⭐⭐⭐⭐ | General purpose, proven reliability |
| **Anthropic** | $$ | Cloud | ⚡⚡ | ⭐⭐⭐⭐⭐ | Advanced reasoning, long context |
| **Ollama** | Free | 100% Local | ⚡⚡ | ⭐⭐⭐ | Privacy, offline, no API costs |
| **Custom** | Varies | Varies | Varies | Varies | Your own API endpoint |

---

## 📚 Detailed Provider Guides

Click on a provider below to see the complete setup guide:

### 🟢 [Ollama](./ollama-setup.md) - Local AI (Privacy-Focused)
**Cost:** Free
**Setup Time:** ~15 minutes
**Best For:** Privacy-conscious users, offline work, no API costs

**Pros:**
- ✅ 100% private - data never leaves your machine
- ✅ Completely free - no usage limits
- ✅ Works offline
- ✅ No rate limits

**Cons:**
- ❌ Requires ~8GB RAM minimum
- ❌ Initial model download (4-7GB)
- ❌ Slower than cloud APIs
- ❌ Quality slightly lower than GPT-4/Claude

**[→ Full Ollama Setup Guide](./ollama-setup.md)**

---

### 🔵 [Anthropic (Claude)](./anthropic-setup.md) - Advanced Reasoning
**Cost:** Pay-per-use (~$3-15 per 1M tokens)
**Setup Time:** ~5 minutes
**Best For:** High-quality outputs, complex tasks, long documents

**Pros:**
- ✅ Exceptional quality - best for nuanced content
- ✅ Long context - up to 200K tokens
- ✅ Less hallucination - more truthful responses
- ✅ $5 free credits for new users

**Cons:**
- ❌ Slightly more expensive than OpenAI
- ❌ Slower than GPT-4o-mini
- ❌ Requires credit card

**[→ Full Anthropic Setup Guide](./anthropic-setup.md)**

---

### 🟣 [OpenAI](./openai-setup.md) - Industry Standard
**Cost:** Pay-per-use (~$0.15-60 per 1M tokens)
**Setup Time:** ~5 minutes
**Best For:** General purpose, proven at scale, extensive documentation

**Pros:**
- ✅ Industry standard - most widely used
- ✅ Extensive model selection (GPT-4o, GPT-3.5, etc.)
- ✅ Fast and reliable
- ✅ $5 free trial credits
- ✅ Best price/quality ratio with GPT-4o-mini

**Cons:**
- ❌ Requires credit card (even for free trial)
- ❌ Rate limits on free tier
- ❌ Can be expensive with GPT-4

**[→ Full OpenAI Setup Guide](./openai-setup.md)**

---

### ⚙️ Custom API - Bring Your Own
**Cost:** Depends on your implementation
**Setup Time:** Varies
**Best For:** Custom AI implementations, proxy services, enterprise setups

**Use Cases:**
- Self-hosted AI models
- Corporate AI gateways
- AI proxy services (e.g., OpenRouter, together.ai)
- Custom fine-tuned models

**Requirements:**
- OpenAI-compatible API endpoint
- Custom base URL
- Optional API key

**Setup:**
1. Open ZenPost Studio Settings
2. Select "Custom" as AI Provider
3. Enter your Base URL (e.g., `https://your-api.com/v1`)
4. Enter API Key (if required)
5. Enter Model name
6. Save

---

## 🎯 Which Provider Should I Choose?

### Choose **Ollama** if you want:
- 🔒 Maximum privacy (data stays local)
- 💰 Zero cost (no API fees)
- 📡 Offline capability
- 🏃 No rate limits

### Choose **Anthropic (Claude)** if you want:
- 🎓 Highest quality outputs
- 📚 Long document support (200K tokens)
- 🧠 Advanced reasoning
- ✍️ Nuanced, context-aware content

### Choose **OpenAI** if you want:
- 🏭 Industry-standard reliability
- ⚡ Fast responses (especially GPT-4o-mini)
- 💵 Best price/quality balance
- 📖 Extensive documentation

### Choose **Custom** if you have:
- 🏢 Enterprise AI setup
- 🔧 Custom fine-tuned models
- 🌐 AI proxy service
- 🛠️ Special requirements

---

## 💰 Cost Comparison

### Example: Convert 100 code files to documentation

| Provider | Cost | Speed |
|----------|------|-------|
| **Ollama** | $0 (Free) | Medium |
| **OpenAI (GPT-4o-mini)** | ~$0.10-0.20 | Very Fast |
| **OpenAI (GPT-4o)** | ~$2-3 | Fast |
| **Anthropic (Claude 3.5 Sonnet)** | ~$3-5 | Medium |
| **Anthropic (Claude 3 Opus)** | ~$15-20 | Slow |

### Example: Transform 50 markdown posts

| Provider | Cost | Speed |
|----------|------|-------|
| **Ollama** | $0 (Free) | Medium |
| **OpenAI (GPT-4o-mini)** | ~$0.05-0.10 | Very Fast |
| **OpenAI (GPT-4o)** | ~$1-2 | Fast |
| **Anthropic (Claude 3.5 Sonnet)** | ~$2-3 | Medium |

---

## 🔄 Switching Between Providers

You can **easily switch** between providers at any time:

1. Open **Settings** (⚙️ icon) in any ZenPost Studio feature
2. Select different **AI Provider**
3. Configure provider-specific settings
4. Click **"Speichern" (Save)**

**Note:** All settings are **shared** between File Converter and Content Transform features.

---

## 🚀 Quick Start Recommendations

### For Beginners:
**Start with:** OpenAI GPT-4o-mini
- Easy setup (~5 min)
- $5 free credits
- Best balance of cost/quality
- [→ OpenAI Setup Guide](./openai-setup.md)

### For Privacy-Conscious:
**Start with:** Ollama
- Completely free
- 100% private
- No data leaves your machine
- [→ Ollama Setup Guide](./ollama-setup.md)

### For Maximum Quality:
**Start with:** Anthropic Claude 3.5 Sonnet
- Superior reasoning
- Best for complex content
- $5 free credits
- [→ Anthropic Setup Guide](./anthropic-setup.md)

---

## 🆘 Need Help?

**Setup Issues:**
- [Ollama Troubleshooting](./ollama-setup.md#common-issues--solutions)
- [OpenAI Troubleshooting](./openai-setup.md#common-issues--solutions)
- [Anthropic Troubleshooting](./anthropic-setup.md#common-issues--solutions)

**Still Need Help?**
- [ZenPost Studio GitHub Issues](https://github.com/theoriginalbitter/zenpost-studio/issues)
- [Community Forum](#) (coming soon)

---

## 📊 Feature Support Matrix

| Feature | OpenAI | Anthropic | Ollama | Custom |
|---------|--------|-----------|--------|--------|
| **File Converter (Code → Docs)** | ✅ | ✅ | ✅ | ✅ |
| **Content Transform** | ✅ | ✅ | ✅ | ✅ |
| **Multi-language Support** | ✅ | ✅ | ✅ | Depends |
| **Custom Temperature** | ✅ | ✅ | ✅ | ✅ |
| **Offline Mode** | ❌ | ❌ | ✅ | Depends |
| **Free Tier** | $5 trial | $5 trial | ✅ Free | Depends |

---

**Happy coding with your chosen AI provider! 🚀**

[← Back to Wiki Home](../README.md)
