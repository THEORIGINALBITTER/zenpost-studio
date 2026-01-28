# ZenPost Studio Wiki

Welcome to the **ZenPost Studio** documentation! This wiki contains comprehensive guides, tutorials, and references to help you get the most out of ZenPost Studio.

---

## 🚀 Quick Start

New to ZenPost Studio? Start here:

1. **[Installation Guide](../README.md#-quick-start)** ✅ - Install ZenPost Studio on your system
2. **[AI Provider Setup](./ai-providers/README.md)** ✅ - Configure your AI provider
3. **[Converter Studio](#-converter-studio)** ✅ - Convert files between formats
4. **[Content AI Studio](#-content-ai-studio)** ✅ - Transform content for social media

---

## 🤖 AI Provider Guides

ZenPost Studio supports **4 AI providers**. Choose the one that fits your needs:

### [📚 AI Providers Overview](./ai-providers/README.md)
Compare all providers and choose the right one for you.

### Setup Guides:

| Provider | Cost | Privacy | Best For | Guide |
|----------|------|---------|----------|-------|
| **Ollama** | Free | 100% Local | Privacy, offline work | [→ Setup Guide](./ai-providers/ollama-setup.md) |
| **OpenAI** | Pay-per-use | Cloud | General purpose, proven | [→ Setup Guide](./ai-providers/openai-setup.md) |
| **Anthropic** | Pay-per-use | Cloud | Advanced reasoning | [→ Setup Guide](./ai-providers/anthropic-setup.md) |
| **Custom** | Varies | Varies | Custom implementations | [→ Overview](./ai-providers/README.md#️-custom-api---bring-your-own) |

**Not sure which to choose?** See our [Quick Start Recommendations](./ai-providers/README.md#-quick-start-recommendations)

---

## 📖 Features

### 🔄 Converter Studio

Convert between various file formats with intelligent cleaning:

- **Markdown (.md)** - Parse, clean, and convert markdown files ✅
- **Editor.js Block-JSON** - Convert Editor.js JSON to markdown ✅
- **Smart Cleaning** - Remove special characters, fix formatting ✅
- **Multiple Export Formats** - Markdown, HTML, Text ✅
- **File Upload & Paste** - Drag & drop or paste content ✅

### 🎯 Content AI Studio

Transform Markdown into platform-specific content with AI:

- **LinkedIn Posts** - Professional posts with hooks and hashtags ✅
- **dev.to Articles** - Technical articles with proper formatting ✅
- **Twitter/X** - Thread-optimized content ✅
- **Medium** - Long-form storytelling format ✅
- **Reddit** - Community-focused discussions ✅
- **GitHub Discussions** - Technical Q&A format ✅
- **YouTube** - Video descriptions with timestamps ✅
- **Style Customization** - Tone, length, target audience ✅
- **Direct Publishing** - Optional API integration ✅
- **[API Integration Guide](./SOCIAL_MEDIA_API_INTEGRATION.md)** ✅

### 📚 Doc Studio

AI-powered documentation generator:

- **README.md** - Professional project documentation ✅
- **CHANGELOG.md** - Version history following Keep a Changelog ✅
- **API Docs** - Comprehensive API documentation ✅
- **CONTRIBUTING.md** - Contributor guidelines ✅
- **Blog Posts** - Dev.to, Medium, Hashnode ready articles ✅
- **Data Room** - Investor-ready documentation suite ✅
- **Project Analysis** - Automatic project structure detection ✅
- **[Metadata Management](./METADATA_REPLACEMENT.md)** ✅
- **[Data Room Setup](./DATA_ROOM.md)** ✅
- **[Full Project Documentation](./PROJECT_DOCUMENTATION.md)** ✅ NEW!

### 🎓 Help & Tutorial System

Interactive walkthrough system for all features:

- **WalkthroughOverlay** - Step-by-step tutorials with animations ✅
- **Content AI Studio Walkthrough** - 5-step guide for content transformation ✅
- **About Modal Walkthrough** - 4-step intro to ZenPost Studio ✅
- **GitHub Integration Walkthrough** - 4-step GitHub features guide ✅
- **Step Controller** - Play/Pause, Next/Previous, Restart controls ✅
- **Lottie Animation Support** - Visual aids for each step ✅

---

## 🎨 Design System

Learn about the Zen Design System:

- **[Design System Overview](./developer/components.md)** ✅
- **[Architecture Guide](./developer/architecture.md)** ✅
- **[Component Documentation](../src/kits/PatternKit/)** ✅

**Example Component Docs:**

- [ZenAISettingsModal](../src/kits/PatternKit/ZenAISettingsModal.README.md) ✅
- [ZenModalSystem](../src/kits/PatternKit/ZenModalSystem/) ✅
- [ZenLogoFlip](../src/kits/DesignKit/___notes/ZenLogoFlip_README.md) ✅

---

## 🛠️ Troubleshooting

Having issues? Check our troubleshooting guides:

### AI Provider Issues:
- **[Ollama Troubleshooting](./ai-providers/ollama-setup.md#-common-issues--solutions)**
- **[OpenAI Troubleshooting](./ai-providers/openai-setup.md#-common-issues--solutions)**
- **[Anthropic Troubleshooting](./ai-providers/anthropic-setup.md#-common-issues--solutions)**

### General Issues

- **[Common Issues & Solutions](./troubleshooting/general.md)** ✅
- **[API Errors](./troubleshooting/general.md#api-errors)** ✅
- **[Platform-Specific Issues](./troubleshooting/general.md#platform-specific-issues)** ✅

---

## 👨‍💻 For Developers

Contributing to ZenPost Studio? Start here:

- **[Project Architecture](./developer/architecture.md)** ✅
- **[Contributing Guide](./developer/contributing.md)** ✅
- **[Component Development](./developer/components.md)** ✅
- **[API Reference](./developer/api.md)** ✅

**Component Development:**

- **[Creating New Components](./developer/components.md#creating-new-components)** ✅
- **[Zen Design Principles](./developer/components.md#zen-design-principles)** ✅

---

## 📊 Comparison Tables

### AI Provider Comparison

| Feature | OpenAI | Anthropic | Ollama | Custom |
|---------|--------|-----------|--------|--------|
| **Cost** | $0.15-60/1M tokens | $3-15/1M tokens | Free | Varies |
| **Speed** | Very Fast | Medium | Medium | Varies |
| **Quality** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Varies |
| **Privacy** | Cloud | Cloud | 100% Local | Varies |
| **Free Trial** | $5 credits | $5 credits | ✅ Always free | Depends |
| **Offline** | ❌ | ❌ | ✅ | Depends |

**[→ Full Comparison](./ai-providers/README.md#-quick-comparison)**

---

## 🎯 Use Cases

Find guides for specific use cases:

### Code Documentation

- **Converting Code to Markdown** - Use Converter Studio ✅
- **Generating README files** - Use Doc Studio ✅
- **API Documentation** - Use Doc Studio with API template ✅

### Content Creation

- **Blog Post Transformation** - Use Content AI Studio ✅
- **Social Media Adaptation** - Multi-platform support ✅
- **Multi-Platform Publishing** - [API Integration Guide](./SOCIAL_MEDIA_API_INTEGRATION.md) ✅

### Development Workflows

- **[Exit Strategy Planning](./EXIT_STRATEGY.md)** ✅
- **[Deployment Guide](./DEPLOYMENT.md)** ✅
- **Team Collaboration** - Version control friendly markdown ✅

---

## 🆘 Getting Help

### Community & Support

- **GitHub Issues:** [Report bugs or request features](https://github.com/theoriginalbitter/zenpost-studio/issues)
- **Discussions:** [Community forum](https://github.com/theoriginalbitter/zenpost-studio/discussions)
- **Documentation:** You're here! 📚

### Additional Resources

- **[Main README](../README.md)** - Project overview ✅
- **[Deployment Guide](./DEPLOYMENT.md)** ✅
- **[Exit Strategy](./EXIT_STRATEGY.md)** ✅

---

## 📚 Table of Contents

### Getting Started

- [x] **[Installation & Quick Start](../README.md#-quick-start)** ✅
- [x] **[AI Provider Setup](./ai-providers/README.md)** ✅
- [x] **[Deployment Guide](./DEPLOYMENT.md)** ✅

### AI Providers

- [x] **[Provider Overview](./ai-providers/README.md)** ✅
- [x] **[Ollama Setup](./ai-providers/ollama-setup.md)** ✅
- [x] **[OpenAI Setup](./ai-providers/openai-setup.md)** ✅
- [x] **[Anthropic Setup](./ai-providers/anthropic-setup.md)** ✅

### Features

- [x] **Converter Studio** - Implemented ✅
- [x] **Content AI Studio** - Implemented ✅
- [x] **Doc Studio** - Implemented ✅
- [x] **[Social Media API Integration](./SOCIAL_MEDIA_API_INTEGRATION.md)** ✅
- [x] **[Metadata Replacement System](./METADATA_REPLACEMENT.md)** ✅

### Design System

- [x] **[Design System Overview](./developer/components.md)** ✅
- [x] **[Architecture](./developer/architecture.md)** ✅
- [x] **[Component READMEs](../src/kits/PatternKit/)** ✅

### Troubleshooting

- [x] **[AI Provider Issues](./ai-providers/)** ✅
- [x] **[Common Issues](./troubleshooting/general.md)** ✅
- [x] **[API Errors](./troubleshooting/general.md)** ✅

### Development

- [x] **[Project Architecture](./developer/architecture.md)** ✅
- [x] **[Contributing Guide](./developer/contributing.md)** ✅
- [x] **[Component Development](./developer/components.md)** ✅
- [x] **[API Reference](./developer/api.md)** ✅

### Business & Strategy

- [x] **[Data Room Documentation](./DATA_ROOM.md)** ✅
- [x] **[Exit Strategy](./EXIT_STRATEGY.md)** ✅
- [x] **[Deployment Options](./DEPLOYMENT.md)** ✅

---

## 🔄 Recent Updates

**2024-12-04:**

- ✅ **Walkthrough System** - Integriertes Tutorial-System mit WalkthroughOverlay
- ✅ **ZenRoughButton Compact Mode** - Neue `compact` Size für runde Icon-Buttons
- ✅ **GitHub Modal** - Neues Modal für GitHub Integration Features
- ✅ **Help & Tutorial Buttons** - Alle Modals haben jetzt integrierte Hilfe
- ✅ **Comprehensive Project Documentation** - Vollständige PROJECT_DOCUMENTATION.md
- ✅ **Enhanced Modal System** - About Modal und GitHub Modal mit Walkthrough
- ✅ **WelcomeScreen Improvements** - Kompakter Hilfe-Button neben Content AI Studio

**2024-11-28:**

- ✅ All three studios (Converter, Content AI, Doc) fully implemented
- ✅ Social media API integration complete
- ✅ Metadata replacement system operational
- ✅ Logo management system established
- ✅ Complete developer documentation
- ✅ Data room and exit strategy documentation
- ✅ Documentation fully updated to reflect current state

**2024-11-22:**

- ✅ Developer guides (Architecture, Components, API, Contributing)
- ✅ Troubleshooting documentation
- ✅ Component system documentation

**2024-11-17:**

- ✅ Complete AI Provider setup guides (Ollama, OpenAI, Anthropic)
- ✅ AI Providers overview with comparison tables
- ✅ ZenAISettingsModal component documentation
- ✅ Wiki structure initialized

---

## 🎉 Welcome!

Thank you for using ZenPost Studio! This wiki is **complete and comprehensive** with all major features documented.

**Can't find what you're looking for?**

- Check the [Table of Contents](#-table-of-contents) above
- Browse the [sidebar](./_sidebar.md) for quick navigation
- [Open an issue](https://github.com/theoriginalbitter/zenpost-studio/issues) to request additional documentation

---

**Where simplicity meets functionality** ✨

[← Back to Main README](../README.md)
