# ZenPost Studio

**AI-powered content transformation and file conversion tool with a beautiful Zen-inspired interface.**

Transform your markdown content for different platforms (LinkedIn, dev.to, Twitter, Medium, etc.) or convert code into professional documentation - all powered by AI.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://zenpost-studio.vercel.app)
[![Documentation](https://img.shields.io/badge/docs-wiki-blue)](https://theoriginalbitter.github.io/zenpost-studio/)
[![GitHub](https://img.shields.io/github/stars/theoriginalbitter/zenpost-studio?style=social)](https://github.com/theoriginalbitter/zenpost-studio)

---

## ✨ Features

### 🎯 Content Transform
Transform your markdown content for specific platforms with AI:
- **LinkedIn** - Professional posts with hooks and hashtags
- **dev.to** - Technical articles with proper formatting
- **Twitter/X** - Thread-optimized content
- **Medium** - Long-form storytelling format
- **Reddit** - Community-focused discussions
- **GitHub Discussions** - Technical Q&A format
- **YouTube** - Video script format with timestamps

### 📝 Markdown Editor
Real-time markdown editor with live preview:
- **Live Preview Toggle** - See rendered output instantly
- **Syntax Highlighting** - Code blocks with proper highlighting
- **GitHub Flavored Markdown** - Full GFM support
- **Auto-growing Textarea** - Expands as you type

### 🔄 File Converter
AI-powered code documentation generator:
- **Multi-Language Support** - TypeScript, JavaScript, Python, Java, C++, Go, Rust, PHP, Ruby, Swift, Kotlin
- **Intelligent Analysis** - AI understands your code structure
- **Professional Documentation** - Generate comprehensive README files
- **Multiple Export Formats** - Markdown, HTML, Text, PDF

### 🤖 AI Provider Support
Use your preferred AI provider:
- **OpenAI** - GPT-4o, GPT-4o-mini, GPT-3.5-turbo
- **Anthropic** - Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
- **Ollama** - Local AI (llama3.1, mistral, codellama, qwen2.5-coder)
- **Custom API** - Bring your own AI endpoint

### 🎨 Zen Design System
Beautiful, minimalist interface:
- **Hand-drawn Aesthetics** - Powered by rough.js
- **Dark Theme** - Easy on the eyes
- **Monospace Typography** - IBM Plex Mono, Courier Prime
- **Generous Spacing** - Breathable layouts
- **Gold Accents** - Elegant color palette (#AC8E66)

### 💻 Cross-Platform
- **Web App** - Run in any modern browser
- **Desktop App** - Native desktop application with Tauri (coming soon)
  - Windows, macOS, Linux support
  - Smaller bundle size (~3MB vs ~100MB with Electron)
  - Better performance with Rust backend
  - Native system integration

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

# Desktop App (Tauri - coming soon)
npm run tauri dev        # Development
npm run tauri build      # Production
```

### Configuration

1. **Open ZenPost Studio** in your browser (http://localhost:5173)
2. **Click Settings** (⚙️ icon in bottom right)
3. **Select AI Provider** (OpenAI, Anthropic, Ollama, or Custom)
4. **Enter API Key** (if required)
5. **Choose Model** (e.g., gpt-4o-mini, claude-3-5-sonnet-20241022)
6. **Save Settings**

---

## 📚 Documentation

**Complete documentation available at:** [https://theoriginalbitter.github.io/zenpost-studio/](https://theoriginalbitter.github.io/zenpost-studio/)

- [Quick Start Guide](https://theoriginalbitter.github.io/zenpost-studio/#/)
- [AI Provider Setup](https://theoriginalbitter.github.io/zenpost-studio/#/ai-providers/README)
  - [OpenAI Setup](https://theoriginalbitter.github.io/zenpost-studio/#/ai-providers/openai-setup)
  - [Anthropic Setup](https://theoriginalbitter.github.io/zenpost-studio/#/ai-providers/anthropic-setup)
  - [Ollama Setup](https://theoriginalbitter.github.io/zenpost-studio/#/ai-providers/ollama-setup)
- [Troubleshooting](https://theoriginalbitter.github.io/zenpost-studio/#/troubleshooting/general)
- [Developer Docs](https://theoriginalbitter.github.io/zenpost-studio/#/developer/architecture)

---

## 🛠️ Tech Stack

### Frontend
- **React 18.3** - UI framework
- **TypeScript 5.6** - Type safety
- **Vite 6.0** - Build tool & dev server
- **Tailwind CSS 3.4** - Utility-first CSS

### Design & UI
- **Rough.js 4.6** - Hand-drawn graphics
- **react-markdown 9.0** - Markdown rendering
- **react-syntax-highlighter 15.6** - Code highlighting
- **Font Awesome 6.7** - Icons

### AI Integration
- Multiple provider support via unified service layer
- LocalStorage for configuration persistence
- Direct API calls (no backend required)

### Desktop (Coming Soon)
- **Tauri** - Native desktop application framework
- **Rust** - High-performance backend
- Cross-platform support (Windows, macOS, Linux)

---

## 📁 Project Structure

```
zenpost-studio/
├── docs/                           # Documentation (Docsify)
│   ├── ai-providers/              # AI setup guides
│   ├── developer/                 # Developer documentation
│   └── troubleshooting/           # Troubleshooting guides
│
├── src/
│   ├── screens/                   # Main application screens
│   │   ├── WelcomeScreen.tsx     # Landing page
│   │   ├── ConverterScreen.tsx   # File converter orchestrator
│   │   ├── ContentTransformScreen.tsx  # Content transformer
│   │   ├── converter-steps/      # File converter wizard
│   │   └── transform-steps/      # Content transform wizard
│   │
│   ├── kits/                      # Reusable component kits
│   │   ├── DesignKit/            # Low-level primitives
│   │   │   ├── ZenBackButton.tsx
│   │   │   ├── ZenCloseButton.tsx
│   │   │   ├── ZenSaveButton.tsx
│   │   │   ├── ZenSettingsButton.tsx
│   │   │   ├── RoughBorder.tsx
│   │   │   └── RoughCircle.tsx
│   │   │
│   │   └── PatternKit/           # High-level patterns
│   │       ├── ZenHeader.tsx
│   │       ├── ZenButton.tsx
│   │       ├── ZenCard.tsx
│   │       ├── ZenMarkdownEditor.tsx    # NEW
│   │       ├── ZenMarkdownPreview.tsx   # NEW
│   │       ├── ZenSettingsNotification.tsx
│   │       └── ZenModalSystem/          # NEW - Complete modal system
│   │           ├── components/
│   │           │   ├── ZenModal.tsx
│   │           │   ├── ZenModalHeader.tsx
│   │           │   ├── ZenModalFooter.tsx
│   │           │   ├── ZenDropdown.tsx
│   │           │   ├── ZenSlider.tsx
│   │           │   └── ZenInfoBox.tsx
│   │           ├── modals/
│   │           │   ├── ZenAISettingsModal.tsx
│   │           │   └── ZenAboutModal.tsx
│   │           ├── config/
│   │           │   └── ZenModalConfig.ts
│   │           └── docs/
│   │
│   ├── services/
│   │   └── aiService.ts          # AI provider abstraction
│   │
│   ├── App.tsx                   # Main app & routing
│   └── main.tsx                  # Entry point
│
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

---

## 🎨 Design System - Zen Kit

### Philosophy

The Zen Design System emphasizes:
- **Generous Spacing** - Breathable layouts with ample whitespace
- **Hand-Drawn Aesthetics** - rough.js for organic, sketchy borders
- **Minimal Color Palette** - Dark theme with gold accents
- **Monospace Typography** - Clean, technical feel
- **Accessibility** - ARIA labels, keyboard navigation

### Color Palette

```css
--theme-color: #AC8E66        /* Primary gold */
--theme-color-dark: #8A6E4E   /* Darker gold */
--accent-color: #D4AF78       /* Light gold */
--base-background: #1A1A1A    /* Dark background */
--secondary-bg: #2A2A2A       /* Lighter dark */
--border-color: #3a3a3a       /* Subtle borders */
--text-primary: #e5e5e5       /* Light text */
--text-secondary: #999        /* Gray text */
--text-muted: #777            /* Muted text */
```

### Component Kits

**DesignKit** (Low-level primitives):
- Buttons (Close, Back, Save, Settings)
- Borders (RoughBorder, RoughCircle)
- Backgrounds (PaperBG)
- Logo components

**PatternKit** (High-level patterns):
- Headers, Cards, Buttons
- Markdown Editor & Preview
- Modal System (complete)
- Form components
- Notification components

**Full component documentation:** [Component Library](https://theoriginalbitter.github.io/zenpost-studio/#/developer/components)

---

## 🏗️ Architecture

### Layered Architecture

```
┌─────────────────────────────────────┐
│         Screens Layer               │
│  (WelcomeScreen, ConverterScreen)   │
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
│      (aiService, storage)           │
└─────────────────────────────────────┘
```

### Key Design Patterns

1. **Configuration-Driven Design** - Centralized configs for modals, providers, sliders
2. **Component Composition** - Build complex UIs from simple primitives
3. **Service Layer Abstraction** - Unified AI provider interface
4. **Step Wizard Pattern** - Multi-step processes with isolated components
5. **Provider Abstraction** - Support multiple AI providers through single interface

**Full architecture documentation:** [Architecture Overview](https://theoriginalbitter.github.io/zenpost-studio/#/developer/architecture)

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](https://theoriginalbitter.github.io/zenpost-studio/#/developer/contributing) for details.

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

### Code Style

- **TypeScript** for all new code
- **Inline styles** for React Native compatibility
- **Zen color palette** - No random colors
- **Accessibility** - ARIA labels, keyboard navigation
- **Component documentation** - Update docs for new components

---

## 📝 License

MIT License - Made with ❤️ by [Denis Bitter](https://github.com/theoriginalbitter)

---

## 🔗 Links

- **Live Demo:** [https://zenpost-studio.vercel.app](https://zenpost-studio.vercel.app)
- **Documentation:** [https://theoriginalbitter.github.io/zenpost-studio/](https://theoriginalbitter.github.io/zenpost-studio/)
- **GitHub Repository:** [https://github.com/theoriginalbitter/zenpost-studio](https://github.com/theoriginalbitter/zenpost-studio)
- **Issues & Bug Reports:** [GitHub Issues](https://github.com/theoriginalbitter/zenpost-studio/issues)
- **Discussions & Questions:** [GitHub Discussions](https://github.com/theoriginalbitter/zenpost-studio/discussions)

---

## 🙏 Acknowledgments

- **Rough.js** - Beautiful hand-drawn graphics
- **OpenAI, Anthropic, Ollama** - AI provider support
- **React Community** - Amazing ecosystem
- **All Contributors** - Thank you!

---

**ZenPost Studio** - Transform your content with AI, beautifully.
