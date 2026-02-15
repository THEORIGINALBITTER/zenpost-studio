
<img width="1200" height="630" alt="github_zenpostStudioBanner" src="https://github.com/user-attachments/assets/cdcfb874-58e1-4ab1-8420-78f99df63558" />

Why ZenPost Studio?
- Write once, publish everywhere (9+ platforms)
- Local-first AI via Ollama (Desktop)
- Optional cloud providers (OpenAI, Anthropic)
- Markdown + Block editor workflow
- Built for engineers, educators & builders
# ZenPost Studio

> **Local-first AI-powered content & documentation platform**  
> Built for engineers, technical educators, and teams who value clarity over noise.

[![Version](https://img.shields.io/github/v/release/THEORIGINALBITTER/zenpost-studio)](https://github.com/THEORIGINALBITTER/zenpost-studio/releases)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Build](https://img.shields.io/badge/build-stable-success)]()
[![Desktop](https://img.shields.io/badge/desktop-tauri-blue)]()
[![AI](https://img.shields.io/badge/AI-local--first-gold)]()

---
> **Aktueller stabiler Stand:**  
> https://github.com/THEORIGINALBITTER/zenpost-studio/releases/tag/ZenPost
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



