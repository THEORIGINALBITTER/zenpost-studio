# ZenPost Studio

**AI-powered content studio for markdown conversion, content transformation, and documentation generation.**

Transform your markdown for social media, convert files, or generate professional documentation - all with a beautiful Zen-inspired interface and AI support.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://zenpost-studio.vercel.app)
[![Version](https://img.shields.io/badge/version-0.1.0-blue)](https://github.com/theoriginalbitter/zenpost-studio)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## ✨ Three Studios, One Platform

### 🔄 Converter Studio
Convert and clean markdown & Editor.js files:
- **Markdown (.md)** - Parse, clean, and convert markdown files
- **Editor.js Block-JSON** - Convert Editor.js JSON to markdown
- **Smart Cleaning** - Remove special characters, fix formatting
- **Multiple Export Formats** - Markdown, HTML, Text

### 🎯 Content AI Studio
Transform content with AI for social media platforms:
- **LinkedIn** - Professional posts with hooks and hashtags
- **dev.to** - Technical articles with proper formatting
- **Twitter/X** - Thread-optimized content
- **Medium** - Long-form storytelling format
- **Reddit** - Community-focused discussions
- **GitHub Discussions** - Technical Q&A format
- **YouTube** - Video descriptions with timestamps
- **Style Options** - Choose tone, length, and target audience
- **Direct Publishing** - Optional API integration for direct posting

### 📚 Doc Studio
AI-powered documentation generator:
- **README.md** - Professional project documentation
- **CHANGELOG.md** - Version history following Keep a Changelog
- **API Docs** - Comprehensive API documentation
- **CONTRIBUTING.md** - Contributor guidelines
- **Blog Posts** - Dev.to, Medium, Hashnode ready articles
- **Data Room** - Investor-ready documentation suite
- **Project Analysis** - Automatic project structure detection
- **Metadata Management** - Author info, license, repository details

---

## 🤖 AI Provider Support

Use your preferred AI provider:
- **OpenAI** - GPT-4o, GPT-4o-mini, GPT-3.5-turbo
- **Anthropic** - Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
- **Ollama** - Local AI (llama3.1, mistral, codellama, qwen2.5-coder)
- **Custom API** - Bring your own AI endpoint

---

## 🎨 Zen Design System

Beautiful, minimalist interface inspired by Japanese aesthetics:
- **Hand-drawn Aesthetics** - Powered by rough.js
- **Dark Theme** - Easy on the eyes (#1A1A1A)
- **Gold Accents** - Elegant color palette (#AC8E66)
- **Monospace Typography** - Clean, technical feel
- **Generous Spacing** - Breathable layouts
- **Custom Components** - ZenDropdown, ZenRoughButton, ZenModal
- **Hover Tooltips** - Helpful contextual information
- **Responsive Design** - Works on all screen sizes

---

## 💻 Cross-Platform

- **Web App** - Run in any modern browser
- **Desktop App** - Native desktop application with Tauri
  - Windows, macOS, Linux support
  - Smaller bundle size (~3MB vs ~100MB with Electron)
  - Better performance with Rust backend
  - Native file system integration
  - Offline support

---

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/theoriginalbitter/zenpost-studio.git
cd zenpost-studio

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Desktop App (Tauri)
npm run tauri dev        # Development
npm run tauri build      # Production
```

### Configuration

1. **Open ZenPost Studio** in your browser (http://localhost:5173)
2. **Click Settings** (⚙️ icon in header)
3. **AI Settings Tab**:
   - Select AI Provider (OpenAI, Anthropic, Ollama, or Custom)
   - Enter API Key (if required)
   - Choose Model (e.g., gpt-4o-mini, claude-3-5-sonnet)
4. **Social Media Settings Tab** (optional):
   - Configure API credentials for direct posting
   - Supports Twitter, Reddit, LinkedIn, dev.to, Medium, GitHub
5. **Save Settings**

---

## 🛠️ Tech Stack

### Frontend
- **React 19.1** - UI framework
- **TypeScript 5.8** - Type safety
- **Vite 7.0** - Build tool & dev server
- **Tailwind CSS 4.1** - Utility-first CSS

### Design & UI
- **Rough.js 4.6** - Hand-drawn graphics
- **react-markdown 10.1** - Markdown rendering
- **rehype-highlight 7.0** - Code syntax highlighting
- **Font Awesome 7.1** - Icons
- **Framer Motion 12.23** - Smooth animations

### AI & Content
- **OpenAI, Anthropic, Ollama** - Multiple AI providers
- **Marked 17.0** - Markdown parsing
- **Turndown 7.2** - HTML to markdown conversion
- **DOMPurify 3.3** - Secure HTML sanitization

### Desktop (Tauri)
- **Tauri 2.9** - Native desktop application framework
- **Rust** - High-performance backend
- Cross-platform file system operations
- Native dialogs and system integration

---

## 📁 Project Structure

```
zenpost-studio/
├── src/
│   ├── screens/                    # Main application screens
│   │   ├── WelcomeScreen.tsx      # Landing page with studio selection
│   │   ├── ConverterScreen.tsx    # File converter
│   │   ├── ContentTransformScreen.tsx  # Content AI Studio
│   │   ├── DocStudioScreen.tsx    # Documentation generator
│   │   ├── converter-steps/       # Converter wizard components
│   │   └── transform-steps/       # Transform wizard components
│   │
│   ├── kits/                       # Reusable component kits
│   │   ├── DesignKit/             # Low-level primitives
│   │   │   ├── ZenBackButton.tsx
│   │   │   ├── ZenLogoFlip.tsx
│   │   │   └── RoughCircle.tsx
│   │   │
│   │   └── PatternKit/            # High-level patterns
│   │       ├── ZenHeader.tsx
│   │       ├── ZenMarkdownEditor.tsx
│   │       ├── ZenPlusMenu.tsx
│   │       ├── ZenProcessTimer.tsx
│   │       └── ZenModalSystem/
│   │           ├── components/
│   │           │   ├── ZenModal.tsx
│   │           │   ├── ZenDropdown.tsx
│   │           │   ├── ZenRoughButton.tsx
│   │           │   └── ZenSlider.tsx
│   │           ├── modals/
│   │           │   ├── ZenSettingsModal.tsx
│   │           │   ├── ZenMetadataModal.tsx
│   │           │   ├── ZenGeneratingModal.tsx
│   │           │   ├── ZenContentCalendar.tsx
│   │           │   └── ZenPublishScheduler.tsx
│   │           └── config/
│   │               └── ZenModalConfig.ts
│   │
│   ├── services/
│   │   ├── aiService.ts           # AI provider abstraction
│   │   └── socialMediaService.ts  # Social media API integration
│   │
│   ├── types/
│   │   └── scheduling.ts          # TypeScript types
│   │
│   ├── utils/
│   │   └── calendarExport.ts      # Calendar/ICS export
│   │
│   ├── App1.tsx                   # Main app router
│   └── main.tsx                   # Entry point
│
├── src-tauri/                     # Tauri desktop app
│   ├── src/
│   │   └── lib.rs                # Rust backend
│   ├── Cargo.toml                # Rust dependencies
│   └── capabilities/
│
├── docs/                          # Documentation
├── data-room/                     # Data Room content
├── marketing/                     # Marketing materials
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

---

## 🎯 Key Features in Detail

### Content AI Studio - Style Options
- **Tone**: Professional, Casual, Technical, Enthusiastic
- **Length**: Short (1-2 paragraphs), Medium (3-5 paragraphs), Long (article)
- **Audience**: Beginner, Intermediate, Expert
- **Platform-Specific Optimization**: Each platform gets tailored formatting

### Doc Studio - Smart Analysis
- **Automatic Detection**: Analyzes your project structure
- **File Type Detection**: Identifies programming languages
- **Dependency Analysis**: Reads package.json, Cargo.toml, etc.
- **Test Detection**: Checks for test directories
- **API Detection**: Finds API routes and endpoints

### Converter Studio - Intelligent Cleaning
- **Smart Quotes**: Converts special quotes to standard ASCII
- **Link Extraction**: Pulls out and formats URLs
- **Code Block Preservation**: Maintains code formatting
- **Metadata Stripping**: Removes unnecessary frontmatter

---

## 🏗️ Architecture

### Layered Design

```
┌─────────────────────────────────────┐
│         Screens Layer               │
│    (WelcomeScreen, Studios)         │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│       PatternKit Layer              │
│  (ZenModalSystem, ZenMarkdownEditor)│
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│       DesignKit Layer               │
│    (Buttons, Borders, Primitives)   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│        Services Layer               │
│   (aiService, socialMediaService)   │
└─────────────────────────────────────┘
```

### Design Patterns
1. **Configuration-Driven Design** - Centralized modal configs
2. **Component Composition** - Build complex UIs from primitives
3. **Service Layer Abstraction** - Unified AI provider interface
4. **Step Wizard Pattern** - Multi-step processes
5. **Custom Tooltips** - Zen-styled hover tooltips with animations

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup

```bash
# Fork and clone the repo
git clone https://github.com/YOUR_USERNAME/zenpost-studio.git
cd zenpost-studio

# Install dependencies
npm install

# Create a branch
git checkout -b feature/your-feature-name

# Make changes and test
npm run dev

# Commit and push
git add .
git commit -m "feat: add your feature"
git push origin feature/your-feature-name
```

### Code Style Guidelines
- **TypeScript** for all new code
- **Inline styles** for Tauri/React Native compatibility
- **Zen color palette** - Use #AC8E66 for accents, #1A1A1A for backgrounds
- **Component naming** - Prefix with "Zen" (e.g., ZenButton, ZenModal)
- **Accessibility** - Always include ARIA labels and keyboard navigation
- **Documentation** - Add JSDoc comments for public APIs

### Pull Request Process
1. Update documentation if adding new features
2. Add tests if applicable
3. Ensure all existing tests pass
4. Update README.md with details of changes
5. Request review from maintainers

---

## 🐛 Known Issues & Roadmap

### Current Limitations
- Social media direct posting requires API credentials
- Ollama requires local installation
- Some AI providers have rate limits

### Upcoming Features
- [ ] More AI providers (Google Gemini, Cohere)
- [ ] Batch processing for multiple files
- [ ] Custom template support
- [ ] Plugin system for extensions
- [ ] Mobile app (React Native)
- [ ] Collaborative editing
- [ ] Version history

---

## 📝 License

MIT License - See [LICENSE](LICENSE) file for details

**Made with ❤️ by [Denis Bitter](https://github.com/theoriginalbitter)**

---

## 🔗 Links

- **Live Demo:** [https://zenpost-studio.vercel.app](https://zenpost-studio.vercel.app)
- **GitHub Repository:** [https://github.com/theoriginalbitter/zenpost-studio](https://github.com/theoriginalbitter/zenpost-studio)
- **Issues & Bug Reports:** [GitHub Issues](https://github.com/theoriginalbitter/zenpost-studio/issues)
- **Discussions:** [GitHub Discussions](https://github.com/theoriginalbitter/zenpost-studio/discussions)
- **Author:** [Denis Bitter](https://github.com/theoriginalbitter)

---

## 🙏 Acknowledgments

- **Rough.js** - Beautiful hand-drawn graphics by [Preet Shihn](https://github.com/rough-stuff/rough)
- **OpenAI, Anthropic, Ollama** - Amazing AI providers
- **Tauri** - Modern desktop app framework
- **React Community** - Incredible ecosystem
- **All Contributors** - Thank you for your support!

---

## 💡 Tips & Tricks

### For Content AI Studio
- Use "Professional" tone for LinkedIn and Medium
- Use "Technical" tone for dev.to and GitHub
- Use "Casual" tone for Twitter and Reddit
- Experiment with different lengths for optimal engagement

### For Doc Studio
- Fill out project metadata for better documentation
- Use "Technical" tone for API docs
- Use "Casual" tone for README files
- Generate multiple versions with different audiences

### For Converter Studio
- Clean markdown before transforming for best results
- Use the preview to verify formatting
- Download cleaned versions for backup

---

**ZenPost Studio** - Transform your content with AI, beautifully. 🎨✨
