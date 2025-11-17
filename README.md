# ZenPost Studio

A beautiful, minimalist file converter built with Tauri, React, and TypeScript. Convert between various file formats with an elegant Zen-inspired UI featuring hand-drawn sketchy borders powered by rough.js.

## Features

- **Multi-Format Support**: Convert between JSON, Markdown, GitHub Flavored Markdown, HTML, Text, PDF, and Code
- **AI-Powered Conversions**: Use AI (OpenAI, Anthropic, Ollama, or custom) for intelligent code conversions
- **Content Transform**: Transform Markdown into platform-specific content (LinkedIn, dev.to, Twitter, Medium, Reddit, GitHub Discussions, YouTube)
- **Step-by-Step Wizard**: Clean 4-step conversion process
- **Zen Design System**: Hand-drawn borders, generous spacing, and minimalist aesthetics
- **File Upload or Direct Input**: Flexibility in how you provide content
- **Desktop Application**: Built with Tauri for native performance

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Desktop Framework**: Tauri
- **Styling**: Tailwind CSS
- **UI Components**: Custom Zen Design System with rough.js
- **Icons**: Font Awesome
- **AI Integration**: Support for multiple providers (OpenAI, Anthropic, Ollama, Custom)

## Project Structure

```
src/
├── screens/
│   ├── WelcomeScreen.tsx          # Landing page
│   ├── ConverterScreen.tsx        # File format converter orchestrator
│   ├── ContentTransformScreen.tsx # Platform content transformer
│   ├── converter-steps/           # File converter step components
│   │   ├── Step1FormatSelection.tsx
│   │   ├── Step2ContentInput.tsx
│   │   ├── Step3Convert.tsx
│   │   └── Step4Result.tsx
│   └── transform-steps/           # Content transformer step components
│       ├── Step1SourceInput.tsx
│       ├── Step2PlatformSelection.tsx
│       ├── Step3StyleOptions.tsx
│       └── Step4TransformResult.tsx
├── kits/
│   ├── DesignKit/                 # Low-level UI primitives
│   │   ├── ZenBackButton.tsx
│   │   └── ZenCloseButton.tsx
│   └── PatternKit/                # High-level UI patterns
│       ├── ZenHeader.tsx
│       ├── ZenDropdown.tsx
│       ├── ZenRoughButton.tsx
│       ├── ZenModal.tsx
│       ├── ZenInfoFooter.tsx
│       └── ZenSubtitle.tsx
├── services/
│   └── aiService.ts               # AI provider configuration & content transformation
└── utils/
    └── fileConverter.ts           # File format conversion logic
```

## Design System - Zen Kit

### Philosophy
The Zen Design System emphasizes:
- **Generous Spacing**: Breathable layouts with `mb-20`, `mb-32` margins
- **Hand-Drawn Aesthetics**: rough.js for sketchy, organic borders
- **Minimal Color Palette**: Dark background (#1A1A1A) with gold accents (#AC8E66)
- **Monospace Typography**: Clean, technical feel

### Core Components

**DesignKit** (Primitives):
- `ZenBackButton` - Navigation back button with rough.js circle
- `ZenCloseButton` - Modal close button with rough.js circle

**PatternKit** (Patterns):
- `ZenHeader` - Top navigation with dynamic step indicators
- `ZenDropdown` - Custom select with rough.js rounded rectangle border
- `ZenRoughButton` - Primary action button
- `ZenModal` - Full-screen modal overlay
- `ZenInfoFooter` - Bottom settings/info icon
- `ZenSubtitle` - Descriptive text component

All components feature:
- Hover states (border color changes from `#3a3a3a` → `#AC8E66`)
- Consistent sizing (`sm`: 32px, `md`: 40-48px)
- Rounded corners (8px radius)
- Transparent backgrounds with layered canvas borders

## Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run Tauri desktop app
npm run tauri dev
```

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/)
- [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Configuration

### AI Settings
Configure AI providers in the settings modal:
- **OpenAI**: GPT-4, GPT-3.5
- **Anthropic**: Claude models
- **Ollama**: Local AI (requires Ollama server running)
- **Custom**: Your own API endpoint

Settings are stored in browser LocalStorage.

## Architecture Decisions

### Modular Step Components
Each conversion step is isolated in its own component:
- **Benefits**: Easy to extend, test, and maintain
- **Adding Steps**: Create new `StepN.tsx` in `converter-steps/` and register in `ConverterScreen.tsx`

### Zen Design System
Custom component library instead of using existing UI frameworks:
- **Rationale**: Precise control over aesthetics and hand-drawn style
- **rough.js Integration**: Unique sketchy borders not available in standard libraries

### Tauri over Electron
- **Smaller bundle size**: ~3MB vs ~100MB
- **Better performance**: Rust backend
- **Lower memory usage**: Native webview instead of bundled Chromium

## Contributing

Contributions welcome! Please follow the Zen design principles:
1. Generous spacing (minimum `mb-20` between major sections)
2. Use rough.js for all borders/shapes
3. Maintain the gold/dark color scheme
4. Keep components modular and focused

## License

Made with ❤️ by Denis Bitter

---

**ZenPost Studio** - Where simplicity meets functionality
