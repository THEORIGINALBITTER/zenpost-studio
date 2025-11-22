# Hacker News - Show HN Post

## Title (max 80 chars)

Show HN: ZenPost Studio – AI content transformation tool (open source)

## Alternative Titles

- Show HN: Transform content for any platform with AI (React + TypeScript)
- Show HN: Free AI tool to repurpose content across platforms
- Show HN: Privacy-first AI content transformation (no backend)

---

## Post

I built ZenPost Studio to solve a personal problem: wasting 2-3 hours adapting every article for different platforms (LinkedIn, dev.to, Twitter, Medium, Reddit).

**Demo:** https://github.com/theoriginalbitter/zenpost-studio (clone and run locally)

**How it works:**
1. Write content once in markdown
2. Select target platform (LinkedIn, Twitter, dev.to, etc.)
3. Choose AI provider (OpenAI, Claude, or local Ollama)
4. Get platform-optimized content in ~10 seconds

**Technical highlights:**

- **No backend:** Everything runs in browser. Direct API calls to AI providers.
- **Privacy-first:** API keys in LocalStorage only. Your content never touches my servers (there are none).
- **Multi-AI:** Unified interface for OpenAI, Claude, Ollama, or custom endpoints.
- **Local option:** Use Ollama (llama3.1, mistral) - completely free, runs on your machine.

**Tech stack:** React 18 + TypeScript + Vite. ~15KB bundle size for core. Well-typed, modular architecture.

**Also does:** Code → README documentation. Paste code, get professional docs with installation, usage, API reference.

**Open source:** MIT licensed. No telemetry, no tracking, no user accounts.

**Why I built it open source:** Commercial alternatives cost $50-100/month and lock you in. I wanted something transparent, privacy-respecting, and free.

**Interesting challenges:**

1. **Prompt engineering:** Getting platform-specific transformations right required a lot of iteration. LinkedIn wants hooks, Twitter wants threads, dev.to wants technical depth.

2. **Ollama integration:** Supporting local AI was tricky. CORS issues, different API format, model management. But worth it for privacy + cost ($0).

3. **No state management:** Intentionally avoided Redux/Zustand. LocalStorage + props is sufficient for this use case. Simpler architecture.

**What's next:**
- Desktop app (Tauri - planning to start next month)
- Plugin system for custom transformations
- Template library

**Try it:**
```bash
git clone https://github.com/theoriginalbitter/zenpost-studio.git
npm install && npm run dev
```

Happy to answer questions about architecture, AI integration, or design decisions!

---

## Comments Strategy

**If asked about privacy:**
"No backend servers at all. Your API keys are stored in browser LocalStorage only (same as cookies). API calls go direct from your browser to OpenAI/Claude/Ollama. I literally cannot see your content or keys. You can verify this in the source code - it's all open."

**If asked about cost:**
"Tool is free forever (MIT licensed). You pay only your AI provider:
- OpenAI: ~$0.01-0.05 per transformation
- Claude: ~$0.05-0.10 per transformation
- Ollama: $0 (runs on your computer, no API costs)

Compared to commercial tools at $50-100/month, this is significantly cheaper."

**If asked about business model:**
"Core tool is free forever (MIT licensed). We're building sustainable open source with optional cloud hosting ($9-29/month) for non-technical users who don't want to self-host. Also offering enterprise support contracts. Self-hosted version has ALL features - no feature gating. Think GitLab or Sentry model."

**If asked about Ollama:**
"Ollama lets you run AI models locally (llama3.1, mistral, codellama). Download once (~5GB), runs offline, 100% free. Privacy is perfect - your content never leaves your machine. Performance is good on modern hardware (M1 Mac, decent GPU)."

**If asked about competitors:**
"Main differences vs. commercial tools:
1. Open source (see exactly what it does)
2. No backend (privacy-first)
3. Bring your own AI (or use free Ollama)
4. Free forever (no subscription trap)
5. Customizable (fork it, modify it)"

**If asked about React vs. other frameworks:**
"Chose React because:
1. Ecosystem maturity (react-markdown, syntax highlighting)
2. TypeScript support is excellent
3. Vite makes it fast
4. Planning Tauri desktop app (works great with React)
5. Familiar to most developers (easy contributions)"

**If someone suggests Next.js:**
"Considered it, but didn't need SSR/SSG. Everything runs client-side by design (privacy). Vite + React is simpler and faster for this use case. No server = no backend to maintain."

**If asked about AI quality:**
"Quality depends on your AI provider:
- GPT-4o: Excellent, balanced
- GPT-4o-mini: Good, cheaper, faster
- Claude 3.5: Superior for nuanced tone
- Ollama llama3.1: Surprisingly good for free

I use Claude 3.5 for important content, GPT-4o-mini for quick stuff, Ollama for experiments."

**If someone mentions prompt engineering:**
"Spent most time on prompts. Each platform has different characteristics:
- LinkedIn: Need hook in first line, bullets, 3-5 hashtags
- Twitter: 280-char chunks, thread numbering, engaging questions
- dev.to: Front matter, code blocks, technical depth
- Medium: Storytelling, longer paragraphs, subheadings

Prompts are in aiService.ts - contributions welcome to improve them!"

**If asked about tests:**
"Currently manual testing (it's just me). Would love help adding:
- Unit tests for services
- Component tests with React Testing Library
- E2E with Playwright
Great first contribution opportunity!"

**If asked about contribution:**
"Absolutely! Check issues labeled 'good first issue':
- Add new platform transformations
- Improve prompts
- Design custom themes
- Write documentation
- Add tests

No CLA, no corporate ownership. Pure community project."

---

## Expected Questions & Answers

**Q: Can I self-host this?**
A: It's entirely client-side, so just clone and `npm run build`, then serve the `dist/` folder anywhere (Vercel, Netlify, GitHub Pages, your own server). No backend setup needed.

**Q: What about rate limits?**
A: Depends on your AI provider. OpenAI has tiered limits based on usage. Ollama is unlimited (runs locally). Rate limiting is handled by AI providers, not the tool.

**Q: Does this work offline?**
A: With Ollama, yes! Download models once, use forever offline. With OpenAI/Claude, you need internet for API calls.

**Q: How does code documentation work?**
A: You paste code, AI analyzes it (detects language, understands structure), generates README with:
- Project description
- Installation steps
- Usage examples
- API reference
- Contributing guide
Takes ~30 seconds, surprisingly good quality.

**Q: Can I customize transformations?**
A: Currently prompts are hardcoded in aiService.ts. Planning to add:
- Custom templates (save your prompt variations)
- Plugin system (community-contributed transformations)
- Advanced settings (tone, length, audience)

**Q: What's the bundle size?**
A: Production build is ~300KB gzipped. Core functionality is ~15KB. Most size is from dependencies (react-markdown, syntax highlighter). Could optimize further with code splitting.

**Q: Why rough.js?**
A: Wanted hand-drawn aesthetic instead of standard Bootstrap/Material look. rough.js gives that sketchy, organic feel. Makes it visually distinct. Plus it's fun!

**Q: Security concerns?**
A: Valid concern. Here's the security model:
- No backend = no server-side vulnerabilities
- Open source = audit the code yourself
- LocalStorage only = no server-side storage
- Direct API calls = no proxy that could log
- TypeScript = type safety

Main risk: XSS if you paste malicious markdown. react-markdown handles this safely.

---

## Posting Strategy

**Best time to post:**
- Monday-Thursday, 8-10 AM PT
- Avoid Friday afternoon (gets buried)
- Avoid weekends (less traffic)

**Follow-up:**
- Monitor comments closely for first 2-3 hours
- Answer questions quickly and thoroughly
- Be humble, technical, helpful
- Don't be salesy

**What NOT to do:**
- Don't ask for upvotes
- Don't be defensive about criticism
- Don't ignore negative feedback
- Don't spam multiple posts

**If it doesn't get traction:**
- Try again in a month with better title
- Add demo video/screenshots
- Deploy live demo
- Get some testimonials first
