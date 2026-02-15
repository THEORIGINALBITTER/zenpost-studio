# Contributing to ZenPost Studio

Thank you for your interest in contributing.

ZenPost Studio is built around architectural clarity, maintainability, and long-term thinking. Contributions should respect these principles.

---

## Philosophy

- Clarity over cleverness
- Architecture over shortcuts
- Explicit over implicit
- Local-first mindset
- Long-term maintainability

---

## Development Setup

```bash
git clone https://github.com/THEORIGINALBITTER/zenpost-studio.git
cd zenpost-studio
npm install
npm run dev
```

Desktop:

```bash
npm run tauri dev
```

---

## Branch Strategy

- `main` → stable
- `feature/*` → new features
- `fix/*` → bug fixes
- `refactor/*` → architectural improvements

---

## Pull Request Guidelines

Before submitting a PR:

- Code compiles
- No console errors
- No unused dependencies
- Clear naming
- No breaking changes without discussion

PR must include:

- What problem it solves
- Why it matters
- Architectural impact (if any)

---

## Code Style

- TypeScript strict mode
- Explicit types
- Functional React components
- No hidden side effects
- Modular separation per studio

---

## Studio Boundaries

Studios must remain logically separated:

- Converter logic must not depend on Content AI internals
- Doc Studio must stay metadata-driven
- Provider abstraction must remain clean

---

## AI Provider Contributions

Provider integrations must:

- Be isolated in abstraction layer
- Not leak provider-specific logic into UI
- Be fully configurable

---

## Questions

Open a GitHub discussion before large architectural changes.

ZenPost is not a feature playground.
It is a structured system.

Thank you.
