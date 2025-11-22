# Reddit Launch Posts

## r/programming

**Title:** I built a free AI tool to transform content for any platform (open source)

**Post:**

Hey r/programming,

I spent the last few months building ZenPost Studio - a free, open-source tool that uses AI to transform your content for different platforms.

**TL;DR:** Write once in markdown → AI transforms it for LinkedIn, dev.to, Twitter, Medium, Reddit in seconds. Also converts code to professional documentation. 100% privacy-first (no backend). MIT licensed.

GitHub: https://github.com/theoriginalbitter/zenpost-studio

**The Problem:**

Every time I write a technical article, I need to share it on multiple platforms. But each platform needs different formatting:
- LinkedIn wants professional tone + hooks + hashtags
- dev.to wants technical depth + code examples
- Twitter wants thread format
- Medium wants storytelling
- Reddit wants community tone + TL;DR

Manually adapting content takes 2-3 hours per article.

**The Solution:**

ZenPost Studio uses AI to do this automatically. Pick your platform, click transform, done.

**Features:**

- **Content Transformation**: One markdown → Multiple platforms
- **Code → Docs**: Paste code, get professional README
- **Markdown Editor**: Real-time preview, syntax highlighting
- **Multi-AI Support**: OpenAI, Claude, or local Ollama (free)
- **Privacy First**: No backend, runs in browser
- **Beautiful UI**: Hand-drawn Zen design (rough.js)

**Tech Stack:**

React 18 + TypeScript + Vite + Tailwind CSS
No backend - everything runs in your browser
Direct API calls to AI providers

**Why I Built This:**

I was tired of:
1. Wasting hours on manual reformatting
2. Commercial tools that cost $50+/month
3. Tools that don't respect privacy
4. Vendor lock-in

So I built something open source that solves all four.

**Try it:**

```bash
git clone https://github.com/theoriginalbitter/zenpost-studio.git
npm install && npm run dev
```

Takes 3 minutes to set up. Configure your AI provider (OpenAI, Claude, or free Ollama), and start transforming.

**Cost:**

Tool: $0 (open source)
AI: ~$0.01-0.05 per transformation (or $0 with local Ollama)

Commercial alternatives: $29-99/month

**Open Source:**

MIT licensed. Fork it, customize it, contribute.
Looking for contributors! Especially for:
- Desktop app (Tauri)
- Plugin system
- Custom templates
- Mobile version

**What do you think?**

Is content repurposing a pain point for you? Any features you'd want to see?

Happy to answer questions!

---

## r/webdev

**Title:** Built a free AI content transformation tool with React + TypeScript (Show and Tell)

**Post:**

Built ZenPost Studio over the last few months - an AI-powered content transformation tool.

**What it does:** Transform markdown content for any platform (LinkedIn, dev.to, Twitter, etc.) or convert code to documentation.

**Tech:** React 18, TypeScript, Vite, Tailwind, rough.js

**GitHub:** https://github.com/theoriginalbitter/zenpost-studio
**Demo:** Clone and run locally (no deployment yet, coming soon)

**Why I built this:**

I write technical articles and was spending 2+ hours manually adapting them for different platforms. Decided to automate it with AI.

**Architecture:**

- **Layered design**: Screens → PatternKit → DesignKit → Services
- **Multi-AI support**: Unified service layer for OpenAI, Claude, Ollama, Custom
- **Privacy-first**: No backend, LocalStorage for config only
- **Component composition**: Modular ZenModalSystem

**Interesting tech decisions:**

1. **No backend**: Everything runs in browser. Direct API calls to AI providers.
2. **Rough.js**: Hand-drawn UI instead of Bootstrap/Material. Zen aesthetic.
3. **Unified AI service**: Abstract OpenAI/Claude/Ollama behind single interface.
4. **TypeScript everywhere**: Type-safe components, services, configs.

**Features:**

- Real-time markdown editor with live preview
- Platform-specific transformations (LinkedIn, Twitter, dev.to, etc.)
- Code → README documentation
- Beautiful dark theme with gold accents
- Completely free & open source

**Coming soon:**

- Desktop app (Tauri)
- Custom transformation templates
- Plugin system
- Mobile version

**Looking for:**

- Feedback on architecture
- Contributors (especially Tauri/Rust experience)
- Feature suggestions

**Questions welcome!**

What would you want to see in a tool like this?

---

## r/reactjs

**Title:** [Project] AI-powered content transformation tool built with React 18 + TypeScript

**Post:**

Hey React community!

Just finished v1 of ZenPost Studio - an AI content transformation tool built entirely with React 18 + TypeScript.

**GitHub:** https://github.com/theoriginalbitter/zenpost-studio

**Stack:**

- React 18.3 (hooks, functional components)
- TypeScript 5.6 (strict mode)
- Vite 6.0 (dev server + build)
- Tailwind CSS 3.4
- rough.js (hand-drawn UI)
- react-markdown + react-syntax-highlighter

**Architecture Highlights:**

**1. Layered Component Design:**
```
Screens (orchestration)
  ↓
PatternKit (business components)
  ↓
DesignKit (primitives)
  ↓
Services (business logic)
```

**2. ZenModalSystem:**

Built a complete modal system with:
- Centralized configuration (ZenModalConfig.ts)
- Composable components (Header, Footer, Content)
- Preset system for consistent styling
- Provider-specific info boxes

**3. Service Layer Abstraction:**

Unified interface for multiple AI providers:
```typescript
// Single interface, multiple implementations
analyzeCode(code: string): Promise<Result>
transformContent(markdown: string, config: TransformConfig): Promise<Result>

// Supports: OpenAI, Claude, Ollama, Custom
```

**4. No Global State:**

Intentionally avoided Redux/Zustand:
- LocalStorage for persistence
- Props drilling is manageable
- Simpler architecture
- Smaller bundle

**5. TypeScript Patterns:**

- Strict interfaces for all props
- Configuration-driven design
- Type-safe service layer
- No `any` types

**Interesting Challenges:**

**Challenge 1: React Native compatibility**

Had to use inline styles instead of Tailwind classes:
```tsx
// ❌ Doesn't work in React Native
<div className="mb-2">

// ✅ Works everywhere
<div style={{ marginBottom: '8px' }}>
```

**Challenge 2: rough.js canvas rendering**

Hand-drawn borders require canvas management:
```typescript
const canvasRef = useRef<HTMLCanvasElement>(null);
const rc = rough.canvas(canvas);

// Re-render on hover
const drawCircle = (strokeColor: string) => {
  rc.circle(size/2, size/2, size-4, {
    stroke: strokeColor,
    roughness: 0.5
  });
};
```

**Challenge 3: Markdown preview performance**

Large documents were slow. Solution:
- Toggle-able preview (don't render if not visible)
- Debounced rendering
- react-markdown with proper memo

**What's next:**

- Desktop app with Tauri
- Plugin system
- Custom templates
- Performance optimizations

**Feedback wanted:**

- Is the architecture overengineered?
- Should I use Zustand for state?
- Any React patterns I'm missing?

**Try it:**
```bash
git clone https://github.com/theoriginalbitter/zenpost-studio.git
npm install && npm run dev
```

**Questions about the code?**

Happy to dive into any architectural decisions or React patterns!

---

## r/opensource

**Title:** ZenPost Studio - Free AI content transformation tool (MIT licensed)

**Post:**

Just open-sourced ZenPost Studio - an AI-powered tool for transforming content across platforms.

**Repo:** https://github.com/theoriginalbitter/zenpost-studio

**What it does:**

- Transform markdown for LinkedIn, dev.to, Twitter, Medium, Reddit, etc.
- Convert code to professional documentation
- Real-time markdown editor with live preview
- Support multiple AI providers (OpenAI, Claude, local Ollama)

**Why open source:**

1. **Transparency:** See exactly what it does with your content
2. **Privacy:** No backend, your data stays local
3. **Community:** Better together
4. **No lock-in:** Fork it, customize it, own it
5. **Free forever:** No freemium trap

**Tech:**

React 18 + TypeScript + Vite + Tailwind
MIT licensed
Well-documented (comprehensive wiki)

**Looking for:**

- Contributors (all levels welcome!)
- Feature ideas
- Bug reports
- Documentation improvements
- Design feedback

**Easy first issues:**

- Add new platform transformations
- Improve markdown editor
- Create custom themes
- Write tests

**How to contribute:**

1. Fork the repo
2. Check issues labeled "good first issue"
3. Submit PR
4. Join discussions

**Roadmap:**

- Desktop app (Tauri)
- Plugin system
- Template library
- Mobile apps
- i18n support

**No CLA, no corporate ownership**

Pure community-driven project. MIT licensed. Do whatever you want with it.

**Star it if you find it useful!**

Any questions about contributing or the project?

---

## r/SideProject

**Title:** I built an AI content transformation tool to save 10+ hours per week

**Post:**

**Project:** ZenPost Studio
**Link:** https://github.com/theoriginalbitter/zenpost-studio
**Status:** Live & free to use

**The Itch I'm Scratching:**

I write technical content and was wasting 2-3 hours per article adapting it for different platforms. LinkedIn wants one format, Twitter another, dev.to something else.

Built this to automate it.

**What it does:**

Write once → AI transforms for any platform:
- LinkedIn (professional + hooks)
- Twitter (thread format)
- dev.to (technical depth)
- Medium (storytelling)
- Reddit (community tone)

Also: Code → professional README in seconds.

**Tech Stack:**

React + TypeScript + Vite
No backend (runs in browser)
Multiple AI providers (OpenAI, Claude, free Ollama)

**Time to Build:**

~3 months (evenings + weekends)
- Month 1: Core architecture
- Month 2: AI integration + features
- Month 3: Polish + documentation

**Hardest Part:**

Getting platform-specific transformations right. Each platform has different best practices. Spent a lot of time on prompt engineering.

**Proudest Feature:**

Privacy-first architecture. No backend servers. Your API keys never leave your browser. Completely transparent (open source).

**Monetization:**

Not planning to. It's free & open source. Might add optional paid hosting later, but core tool stays free forever.

**Results:**

Personal use: Saves me 10+ hours per week
Early feedback: 3 people already using it daily
GitHub: Growing slowly but steady

**What's Next:**

- Desktop app (Tauri)
- Mobile version
- Plugin system
- Custom templates

**Try it:**

```bash
git clone https://github.com/theoriginalbitter/zenpost-studio.git
npm install && npm run dev
```

**Feedback wanted:**

- Would you use this?
- What features would make it more useful?
- Any concerns about privacy/security?

Happy to answer questions!

---

**Notes for posting:**

- **r/programming**: Technical focus, show architecture
- **r/webdev**: Web tech focus, React/TypeScript details
- **r/reactjs**: Deep React patterns, component design
- **r/opensource**: Community focus, contribution opportunities
- **r/SideProject**: Personal story, problem-solving angle

**Posting Strategy:**

1. Post to r/SideProject first (most accepting)
2. Wait for feedback, iterate
3. Post to r/opensource (community building)
4. Post to r/webdev (show technical chops)
5. Post to r/reactjs (React community)
6. Post to r/programming (wider reach, but stricter mods)

**Timing:**

- Best days: Tuesday-Thursday
- Best times: 8-10 AM EST (US audience), 2-4 PM EST (Europe)
- Avoid: Monday mornings, Friday afternoons, weekends
