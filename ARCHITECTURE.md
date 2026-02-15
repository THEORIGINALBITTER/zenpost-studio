# ZenPost Studio Architecture

ZenPost Studio is structured as a modular content platform.

---

## High-Level Architecture

```
Web UI (React)
      │
Provider Abstraction Layer
      │
Transformation Engine
      │
Structured Content Model
      │
Documentation Engine
      │
File System Layer
```

Desktop version introduces:

```
Tauri Backend (Rust)
      │
Native File System
      │
Local AI (Ollama)
```

---

## Core Components

### 1. Structured Content Model

Internal normalized representation used by:

- Converter Studio
- Content AI Studio
- Doc Studio

Ensures transformation consistency.

---

### 2. Transformation Engine

Stateless transformation logic:

- Platform formatting
- Markdown normalization
- Multi-target generation

No provider logic inside transformation.

---

### 3. Provider Abstraction Layer

Abstracts:

- OpenAI
- Anthropic
- Ollama
- Custom APIs

Unified interface:

```
generateContent(input, config)
```

Providers must not affect UI structure.

---

### 4. Documentation Engine

Metadata-driven:

- Project scanning
- Dependency detection
- API discovery
- Template-driven output

---

## Desktop Architecture

Built with Tauri.

Benefits:

- Native performance
- ~3MB bundle size
- Local file system access
- Offline AI workflows

---

## Design System

- Dark theme (#1A1A1A)
- Gold highlight (#AC8E66)
- Monospace typography
- Minimal motion
- Rough.js accents

UI supports thinking, not distraction.

---

## Architectural Principles

- Separation of concerns
- Deterministic transformations
- Provider independence
- Local-first preference
- Explicit configuration
