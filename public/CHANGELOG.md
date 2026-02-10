# Changelog

All notable changes to ZenPost Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Social media API integrations for direct publishing
- Template library for common document types
- Collaborative editing features

---

## [0.1.1] - 2026-02

### Added
- **Content Planner** with visual calendar and drag & drop scheduling
- Multi-tab document editing in Content AI Studio
- Multi-platform transformation (transform to multiple platforms at once)
- License & Account tab in Settings Modal
- Freemium/License system with feature gating
- Line numbers in Markdown Editor
- Metadata modal with placeholder replacement
- Calendar click-to-add functionality
- Edit-after-transform workflow with quick posting shortcut

### Changed
- Improved Planner UI and multi-tab editor experience
- Redesigned ZenUpgradeModal in consistent Zen style
- Redesigned FeatureGate with full-screen centered upgrade prompt
- Enhanced UI/UX with multiple visual improvements

### Fixed
- Cursor disappearing issue in metadata modal input fields
- Persistent error message and settings modal in Step 4
- TypeScript build errors
- EditTabs logic correction

---

## [0.1.0] - 2026-01

### Added
- **Converter Studio** - Clean, convert, and normalize content formats
  - Markdown (.md) parsing and normalization
  - Editor.js JSON to Markdown conversion
  - Smart cleaning of broken characters and formatting artifacts
  - Export to Markdown, HTML, Plain Text

- **Content AI Studio** - Transform content for different platforms
  - LinkedIn, dev.to, Twitter/X, Medium, Reddit support
  - GitHub Discussions and YouTube descriptions
  - Tone, length, and audience control
  - Platform-specific formatting

- **Doc Studio** - Structured documentation workspace
  - README.md generation
  - CHANGELOG.md (Keep a Changelog compatible)
  - API Documentation
  - CONTRIBUTING.md templates
  - Data Room documents
  - Smart project analysis with structure detection

- **AI Provider Support**
  - OpenAI (GPT-4o, GPT-4o-mini, GPT-3.5)
  - Anthropic (Claude 3.5 Sonnet, Opus, Haiku)
  - Ollama (local models)
  - Custom API endpoints

- **Zen Design System**
  - Hand-drawn accents with rough.js
  - Calm dark theme (#1A1A1A)
  - Gold highlights (#AC8E66)
  - Custom modal system and components

- **Desktop App (Tauri)**
  - Windows, macOS, Linux support
  - Native file system access
  - Offline capable
  - ~3MB bundle size

---

## Links

- [Repository](https://github.com/theoriginalbitter/zenpost-studio)
- [Live Demo](https://zenpost-studio.vercel.app)
- [Releases](https://github.com/THEORIGINALBITTER/zenpost-studio/releases)
