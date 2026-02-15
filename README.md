# ZenPost Studio

> **Local-first AI-powered content & documentation platform**  
> Built for engineers, technical educators, and teams who value clarity over noise.

[![Version](https://img.shields.io/github/v/release/THEORIGINALBITTER/zenpost-studio)](https://github.com/THEORIGINALBITTER/zenpost-studio/releases)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Build](https://img.shields.io/badge/build-stable-success)]()
[![Desktop](https://img.shields.io/badge/desktop-tauri-blue)]()
[![AI](https://img.shields.io/badge/AI-local--first-gold)]()

---

## Mission

ZenPost Studio exists to bring architectural clarity to content.

Modern teams struggle with:

- Platform fragmentation  
- Documentation entropy  
- AI tools without structural integration  

ZenPost Studio unifies writing, transformation, documentation, and publishing  
into a calm, modular system.

Not another AI wrapper.  
A content architecture platform.

---

## Platform Overview

ZenPost Studio is built as a modular studio system:

```
ZenPost Studio
│
├── Converter Studio
├── Content AI Studio
├── Content Planner
└── Doc Studio
```

Each studio solves a distinct domain problem —  
all sharing a structured internal content model.

---

## Architecture

```
┌───────────────────────────┐
│        Web Client         │
│  React + TypeScript       │
└──────────────┬────────────┘
               │
        Provider Abstraction
               │
 ┌─────────────┴─────────────┐
 │                           │
Cloud AI               Local AI
(OpenAI, Anthropic)    (Ollama)
 │                           │
 └─────────────┬─────────────┘
               │
        Transformation Engine
               │
        Structured Content Model
               │
        Documentation Engine
               │
          File System Layer
      (Browser / Tauri Native)
```

### Core Principles

- Local-first by design  
- Explicit AI provider separation  
- Stateless transformation logic  
- Metadata-driven documentation  
- Long-term readability  

---

## Studios

### Converter Studio

Structured format normalization layer.

- Markdown parsing & normalization
- Editor.js JSON → Markdown transformation
- HTML export
- Plain text extraction
- Formatting artifact cleanup

Designed for maintainable content pipelines.

---

### Content AI Studio

Multi-platform transformation with controlled AI workflows.

Supported targets:

- LinkedIn
- dev.to
- X / Twitter threads
- Medium
- Reddit
- GitHub Discussions
- YouTube descriptions

Features:

- Tone & audience control
- Platform-aware formatting
- Multi-tab document editing
- Multi-platform parallel transformation
- Optional direct publishing APIs
- Cloud or local AI providers

AI as infrastructure — not gimmick.

---

### Content Planner

Integrated publishing lifecycle system.

- Monthly visual calendar
- Drag & drop scheduling
- Post state tracking (draft / scheduled / published / failed)
- Direct editing integration
- Auto-persistence
- Platform metadata tagging

Built for structured publishing operations.

---

### Doc Studio

Project-aware documentation workspace.

Supports:

- README generation
- CHANGELOG (Keep a Changelog compatible)
- API documentation
- CONTRIBUTING guidelines
- Technical articles
- Data Room documentation

### Smart Project Analysis

- Automatic structure detection
- Language & dependency analysis
- Test & API discovery
- Metadata extraction

Documentation that survives team turnover.

---

## AI Provider Support

ZenPost Studio integrates multiple providers via an abstraction layer.

Supported:

- OpenAI
- Anthropic
- Ollama (local models like llama3, mistral, qwen, codellama)
- Custom self-hosted APIs

### Deployment Philosophy

| Version  | AI Mode |
|----------|---------|
| Web      | Cloud AI |
| Desktop  | Local AI (Ollama) |

Clear separation. Clear responsibility.

---

## Technology Stack

Frontend:
- React
- TypeScript
- TailwindCSS

Desktop:
- Tauri (Rust backend)
- Native file system access
- Offline capable

Architecture:
- Modular studio pattern
- Provider abstraction layer
- Transformation engine
- Structured content model

---

## Installation

```bash
git clone https://github.com/THEORIGINALBITTER/zenpost-studio.git
cd zenpost-studio
npm install
npm run dev
```

---

## Desktop Build

```bash
npm run tauri build
```

Lightweight native bundle.  
Offline capable.  
Local AI ready.

---

## Roadmap

- Structured project templates
- AI prompt versioning
- Team collaboration layer
- Plugin system
- Self-hosted enterprise mode
- Provider analytics dashboard

---

## Philosophy

ZenPost Studio is built on a simple idea:

Clarity scales. Noise does not.

Software should support thinking — not fragment it.

---

## Author

Denis Bitter  
Software Architect · Developer · Instructor  

Design + Code.  
Architecture + Education.

---

## License

MIT License





# ZenPost Studio

**A calm, local-first content & documentation studio powered by AI.**

ZenPost Studio helps you write, transform, and document content with clarity.
From markdown conversion to AI-assisted publishing and structured project documentation — all in one focused, Zen-inspired workspace.

> **Aktueller stabiler Stand:**  
> https://github.com/THEORIGINALBITTER/zenpost-studio/releases/tag/ZenPost

---

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://zenpost-studio.vercel.app)
[![Version](https://img.shields.io/badge/version-0.1.0-blue)](https://github.com/theoriginalbitter/zenpost-studio)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## ✨ Three Studios. One Calm Platform.

ZenPost Studio is intentionally structured into three focused studios — each solving a real problem without noise or platform pressure.

---

## 🔄 Converter Studio

Clean, convert, and normalize content formats.

- **Markdown (.md)** – Parse, clean, and normalize markdown
- **Editor.js JSON** – Convert block-based JSON to markdown
- **Smart Cleaning** – Remove broken characters and formatting artifacts
- **Export Formats** – Markdown, HTML, Plain Text

Designed for clarity, version control, and long-term readability.

---

## 🎯 Content AI Studio

Transform existing content for different platforms — without rewriting everything from scratch.

Supported targets:
- LinkedIn
- dev.to
- Twitter / X (threads)
- Medium
- Reddit
- GitHub Discussions
- YouTube descriptions (incl. timestamps)

Features:
- Tone, length, and audience control
- Platform-specific formatting
- Optional direct publishing via API
- Works with local or hosted AI providers
- **Multi-tab document editing** – Work on multiple documents simultaneously
- **Multi-platform transformation** – Transform to multiple platforms at once

---

## 📅 Content Planner

Plan, schedule, and manage your content publishing with an integrated calendar.

- **Visual Calendar** – Monthly overview of scheduled posts
- **Drag & Drop** – Easily reschedule posts by dragging to new dates
- **Status Tracking** – Draft, scheduled, published, and failed states
- **Direct Editing** – Open scheduled posts directly in Content AI Studio
- **Auto-save** – Changes are automatically persisted
- **Platform Tags** – Visual indicators for target platforms

---

## 📚 Doc Studio

A structured documentation and analysis workspace — not just a generator.

- **README.md**
- **CHANGELOG.md** (Keep a Changelog compatible)
- **API Documentation**
- **CONTRIBUTING.md**
- **Technical Blog Articles**
- **Data Room** (investor & stakeholder ready)

### Smart Project Analysis
- Automatic structure detection
- Language & dependency analysis
- Test & API discovery
- Metadata-driven documentation

Doc Studio is built for projects that should still make sense in five years.

---

## 🤖 AI Provider Support

Use AI the way *you* want:

- **OpenAI** (GPT-4o, GPT-4o-mini, GPT-3.5)
- **Anthropic** (Claude 3.5 Sonnet, Opus, Haiku)
- **Ollama** (local models like llama3, mistral, qwen, codellama)
- **Custom APIs** (self-hosted or internal endpoints)

Local-first is a first-class citizen.

---

## 🎨 Zen Design System

A UI designed to stay out of your way.

- Hand-drawn accents (rough.js)
- Calm dark theme (#1A1A1A)
- Gold highlights (#AC8E66)
- Monospace typography
- Generous spacing & restrained motion
- Custom Zen components (Modal, Dropdowns, Buttons)

No dashboards. No clutter. Just work.

---

## 💻 Web & Desktop

- **Web App** – Any modern browser
- **Desktop App (Tauri)**  
  - Windows, macOS, Linux  
  - ~3MB bundle size  
  - Native file system access  
  - Offline capable  

---




## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/theoriginalbitter/zenpost-studio.git
cd zenpost-studio
npm install
npm run dev



