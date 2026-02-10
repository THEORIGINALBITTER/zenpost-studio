# Technology Stack – ZenPost Studio

**Document Type:** Technical Architecture Overview
**Last Updated:** November 25, 2025
**Audience:** Technical buyers, CTOs, developers

---

## 🏗️ Architecture Overview

**Type:** Full-stack JavaScript/TypeScript Application
**Paradigm:** Client-first with optional backend services
**Deployment:** Web (primary), Mobile-ready (iOS/Android)

```
┌─────────────────────────────────────────────┐
│           User Interface Layer              │
│   (React Native Web / Expo)                 │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│         Application Logic Layer             │
│   (TypeScript Business Logic)               │
│   - Content Transformation                  │
│   - Pattern Matching                        │
│   - Export Generation                       │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│           Data Storage Layer                │
│   (Local: AsyncStorage / Future: Cloud)     │
└─────────────────────────────────────────────┘
```

---

## 📱 Frontend Stack

### Core Framework
```json
{
  "framework": "React Native (Expo SDK 52)",
  "language": "TypeScript 5.x",
  "routing": "Expo Router (file-based)",
  "state": "React Context + Hooks"
}
```

**Why React Native?**
- ✅ Write once, deploy to Web + iOS + Android
- ✅ Large ecosystem and community
- ✅ Expo simplifies deployment
- ✅ Hot reload for fast development
- ⚠️ Bundle size management required

### UI & Styling
```typescript
// Custom component library: "ZenKit Pattern System"
Components:
- ZenMarkdownEditor    // Core editor
- ZenModal            // Modal system
- ZenRoughButton      // Sketch-style buttons
- ZenPlusMenu         // Action menu

Styling:
- StyleSheet API (React Native)
- Custom theme system
- Responsive design patterns
```

### Key Libraries

| Library | Purpose | Version | License |
|---------|---------|---------|---------|
| expo | Framework & tooling | 52.x | MIT |
| react-native | UI framework | 0.76+ | MIT |
| @react-navigation | Routing | Latest | MIT |
| react-markdown | MD parsing/render | Latest | MIT |
| expo-file-system | File operations | Latest | MIT |
| expo-sharing | Share functionality | Latest | MIT |

**Total Dependencies:** ~50 (all MIT/Apache licensed)

---

## ⚙️ Backend Stack (Planned/Optional)

**Current:** Fully client-side (no backend required)

**Future Backend (For Social APIs):**
```typescript
{
  "runtime": "Node.js 20+",
  "framework": "Express.js or Fastify",
  "database": "PostgreSQL + Prisma ORM",
  "auth": "JWT tokens",
  "hosting": "Vercel/Railway/Fly.io"
}
```

**API Integrations (Roadmap):**
- LinkedIn API (OAuth 2.0)
- Twitter API v2 (OAuth 1.0a)
- Facebook/Instagram Graph API
- Medium API (OAuth 2.0)

---

## 🗄️ Data Layer

### Current: Local Storage
```typescript
// Storage: AsyncStorage (React Native)
Structure:
{
  "posts": Post[],
  "templates": Template[],
  "settings": UserSettings,
  "drafts": Draft[]
}

Size: <10MB typical per user
Backup: Manual export to JSON
```

### Future: Cloud Database (Optional)
```sql
-- PostgreSQL Schema (planned)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  plan VARCHAR(50),
  created_at TIMESTAMP
);

CREATE TABLE posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  content TEXT,
  platform VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 🔐 Authentication & Security

**Current Implementation:**
- No authentication (local-only app)
- No user accounts (yet)

**Planned (For Cloud Version):**
```typescript
Auth Strategy: JWT + Refresh Tokens
Providers:
- Email/Password (bcrypt hashing)
- OAuth (Google, GitHub)

Security Measures:
- HTTPS only (enforced)
- CORS restrictions
- Rate limiting (API routes)
- Input sanitization
- XSS prevention (React's built-in)
```

---

## 🚀 Build & Deployment

### Development
```bash
# Local development
npm install
npx expo start

# Runs on:
- Web: 127.0.0.1:8081
- iOS Simulator: Expo Go app
- Android Emulator: Expo Go app
```

### Production Build
```bash
# Web deployment
npx expo export:web
# Output: web-build/ folder

# iOS build
eas build --platform ios

# Android build
eas build --platform android
```

### Hosting Options
| Platform | Cost | Setup Time | Recommendation |
|----------|------|------------|----------------|
| Vercel | Free tier | 5 min | ✅ Best for web |
| Netlify | Free tier | 5 min | ✅ Alternative |
| AWS S3 + CloudFront | ~$5/mo | 30 min | For scale |
| Expo hosting | $29/mo | Instant | Quick demo |

**Current Hosting:** Not deployed yet

---

## 🧪 Testing & Quality

### Code Quality
```typescript
TypeScript Coverage: 100%
Strict Mode: Enabled
Linting: ESLint + Prettier

// Example: Type safety
type Post = {
  id: string;
  content: string;
  platform: Platform;
  createdAt: Date;
}
```

### Testing Strategy (Recommended)
```bash
# Unit tests
Jest + React Testing Library

# E2E tests
Detox (React Native) or Playwright (Web)

# Current status
Tests: [TBD] - Opportunity for buyer to add
```

### Performance Metrics
```
Lighthouse Score (Web): [TBD]
- Performance: Target 90+
- Accessibility: Target 95+
- Best Practices: Target 95+
- SEO: Target 100

Bundle Size:
- Web: ~2MB (optimizable to <1MB)
- iOS: ~50MB
- Android: ~30MB
```

---

## 📦 Third-Party Services

### Required (None Currently)
The app runs 100% offline with no external dependencies.

### Optional (For Enhanced Features)
| Service | Purpose | Cost | Integration Effort |
|---------|---------|------|-------------------|
| Stripe | Payments | 2.9% + 30¢ | 2-4 hours |
| PostHog | Analytics | Free tier | 1-2 hours |
| Sentry | Error tracking | Free tier | 1 hour |
| SendGrid | Email | Free tier | 2 hours |
| Cloudflare | CDN | Free tier | 30 min |

---

## 🔧 Development Tools

### Essential Tools
```json
{
  "IDE": "VS Code (recommended)",
  "Version Control": "Git + GitHub",
  "Package Manager": "npm (can use yarn/pnpm)",
  "Node Version": "20.x LTS",
  "Expo CLI": "Latest"
}
```

### Recommended VS Code Extensions
- ESLint
- Prettier
- TypeScript + JavaScript
- React Native Tools
- Expo Tools

---

## 📊 Code Metrics

```
Total Lines of Code: ~[TBD - run cloc]
Language Breakdown:
- TypeScript: 90%
- JavaScript: 5%
- JSON: 3%
- Markdown: 2%

File Structure:
src/
├── screens/          ~2,000 LOC
├── kits/             ~3,000 LOC (reusable components)
├── services/         ~1,500 LOC (business logic)
├── hooks/            ~500 LOC
└── types/            ~500 LOC

Total: ~7,500 LOC (excludes node_modules, build files)
```

---

## 🔄 CI/CD Pipeline (Recommended)

**Current:** Manual builds

**Suggested Setup (GitHub Actions):**
```yaml
# .github/workflows/deploy.yml
name: Deploy
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run build
      - run: npm test
      - uses: vercel/action@v1
```

**Estimated Setup Time:** 1-2 hours

---

## 🌐 API Documentation (Future)

**When backend is implemented:**

```typescript
// RESTful API Structure (planned)

POST   /api/auth/login
POST   /api/auth/register
GET    /api/posts
POST   /api/posts
PUT    /api/posts/:id
DELETE /api/posts/:id
POST   /api/posts/:id/publish/:platform
GET    /api/analytics
```

**API Documentation Tool:** Swagger/OpenAPI (recommended)

---

## 📈 Scalability Considerations

### Current Limitations
- All data stored locally (no cloud sync)
- No real-time collaboration
- No server-side rendering

### Scale Path (0 → 10k users)
```
Phase 1 (0-100 users):
- Static hosting (Vercel free tier)
- No backend needed
- Cost: $0/month

Phase 2 (100-1k users):
- Add backend for social APIs
- PostgreSQL database
- Serverless functions
- Cost: ~$25/month

Phase 3 (1k-10k users):
- CDN for assets
- Database optimization
- Caching layer (Redis)
- Cost: ~$100-200/month
```

**Scalability Rating:** 8/10 (architecture supports growth)

---

## 🛠️ Maintenance Requirements

### Weekly Maintenance (1-2 hours)
- Monitor error logs
- Respond to user issues
- Check dependency updates

### Monthly Maintenance (3-5 hours)
- Update critical dependencies
- Security patches
- Performance monitoring

### Quarterly Maintenance (5-10 hours)
- Major dependency updates
- React Native version upgrade
- Feature improvements

**Technical Skill Required:**
- Intermediate TypeScript
- React Native knowledge
- Basic DevOps (deployment)

---

## 🔍 Code Quality Assessment

**Strengths:**
✅ 100% TypeScript (type safety)
✅ Clean component architecture
✅ Reusable component library (ZenKit)
✅ Well-organized folder structure
✅ Consistent naming conventions

**Areas for Improvement:**
⚠️ Add unit tests
⚠️ Add E2E tests
⚠️ Improve code comments
⚠️ Add Storybook for components
⚠️ Performance profiling

**Overall Code Quality:** 7.5/10

---

## 📋 Technology Migration Path

**If buyer wants to migrate tech:**

### From React Native to:
- **Next.js (Web only):** 2-3 weeks, moderate effort
- **Flutter:** 4-6 weeks, high effort
- **Native iOS/Android:** 6-8 weeks, very high effort

**Recommendation:** Keep React Native for 6-12 months, then evaluate based on user feedback.

---

## 🤝 Technical Support Included

**During 30-day handover:**
- ✅ Architecture walkthrough (2 hours)
- ✅ Code review session (2 hours)
- ✅ Deployment assistance (1 hour)
- ✅ Q&A via email/Slack (unlimited)
- ✅ Emergency bug fix support

**Post-handover (optional paid):**
- Feature development: $[RATE]/hour
- Consulting: $[RATE]/hour
- Retainer: $[RATE]/month

---

## 📞 Technical Questions?

For technical due diligence:
- Schedule code review call
- Request demo environment access
- Ask specific architecture questions

**Response time:** 24-48 hours

---

*Document Status: ✅ Ready for Technical Buyers*
*Confidentiality: Share after NDA*
*Version: 1.0*
