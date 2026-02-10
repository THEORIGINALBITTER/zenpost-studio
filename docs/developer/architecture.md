# Architecture Overview

**ZenPost Studio Technical Architecture**

Understanding the structure and organization of the ZenPost Studio codebase.

---

## 📋 Table of Contents

- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Core Architecture](#core-architecture)
- [Data Flow](#data-flow)
- [Design Patterns](#design-patterns)
- [State Management](#state-management)
- [Services Layer](#services-layer)
- [Component Architecture](#component-architecture)

---

## 📁 Project Structure

```
zenpost-studio/
├── docs/                      # Docsify documentation
│   ├── ai-providers/         # Provider setup guides
│   ├── developer/            # Developer documentation
│   └── troubleshooting/      # Troubleshooting guides
│
├── src/
│   ├── kits/                 # Reusable component kits
│   │   ├── DesignKit/       # Low-level design primitives
│   │   └── PatternKit/      # High-level UI patterns
│   │       └── ZenModalSystem/  # Modal system
│   │
│   ├── screens/             # Main application screens
│   │   ├── HomeScreen.tsx
│   │   ├── FileConverterScreen.tsx
│   │   ├── ContentTransformScreen.tsx
│   │   ├── converter-steps/ # File converter wizard steps
│   │   └── transform-steps/ # Content transform wizard steps
│   │
│   ├── services/            # Business logic & API services
│   │   └── aiService.ts    # AI provider abstraction
│   │
│   ├── App.tsx             # Main app component & routing
│   ├── index.css           # Global styles
│   └── main.tsx            # Entry point
│
├── public/                  # Static assets
├── package.json            # Dependencies & scripts
├── tsconfig.json           # TypeScript configuration
├── tailwind.config.js      # Tailwind CSS config
└── vite.config.ts          # Vite build configuration
```

---

## 🛠️ Technology Stack

### Core Framework
- **React 18.3** - UI framework
- **TypeScript 5.6** - Type safety
- **Vite 6.0** - Build tool & dev server

### Styling
- **Tailwind CSS 3.4** - Utility-first CSS
- **Rough.js 4.6** - Hand-drawn graphics
- **PostCSS** - CSS processing

### UI Libraries
- **react-markdown 9.0** - Markdown rendering
- **FontAwesome 6.7** - Icons
- **react-syntax-highlighter 15.6** - Code highlighting

### Development Tools
- **ESLint 9.17** - Code linting
- **TypeScript ESLint** - TypeScript linting
- **Vite PWA Plugin** - Progressive Web App support

---

## 🏗️ Core Architecture

### Layered Architecture

```
┌─────────────────────────────────────┐
│         Screens Layer               │
│  (HomeScreen, FileConverter, etc.)  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│       PatternKit Layer              │
│    (Modals, Headers, Cards)         │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│       DesignKit Layer               │
│  (Buttons, Borders, Primitives)     │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│        Services Layer               │
│      (AI, Storage, Utils)           │
└─────────────────────────────────────┘
```

### Component Hierarchy

1. **Screens** - Top-level application views
2. **Patterns** - Composed business components
3. **Primitives** - Basic reusable components
4. **Services** - Business logic & external APIs

---

## 🔄 Data Flow

### File Converter Flow

```
User Input (Code)
    ↓
[FileConverterScreen]
    ↓
Step 1: Format Selection
    ↓
Step 2: Code Input
    ↓
Step 3: AI Processing
    ↓
aiService.analyzeCode()
    ↓
[AI Provider API]
    ↓
Step 4: Result Display
    ↓
User Download/Copy
```

### Content Transform Flow

```
User Input (Markdown)
    ↓
[ContentTransformScreen]
    ↓
Step 1: Source Input
    ↓
Step 2: Platform Selection
    ↓
Step 3: Style Options
    ↓
Step 4: AI Transformation
    ↓
aiService.transformContent()
    ↓
[AI Provider API]
    ↓
Step 5: Result Display
    ↓
User Copy to Clipboard
```

---

## 🎨 Design Patterns

### 1. Component Composition Pattern

Components are built using composition rather than inheritance:

```tsx
// Modal composed from smaller components
<ZenModal>
  <ZenModalHeader />
  <ZenModalContent>
    <ZenDropdown />
    <ZenSlider />
  </ZenModalContent>
  <ZenModalFooter />
</ZenModal>
```

### 2. Configuration-Driven Design

Centralized configuration for consistency:

```typescript
// Modal presets
export const MODAL_PRESETS: Record<string, ModalPreset> = {
  'ai-settings': {
    title: 'AI-Einstellungen',
    minHeight: '520px',
    titleColor: '#AC8E66',
    // ...
  }
};

// AI provider info
export const AI_PROVIDER_INFO: Record<string, InfoBoxConfig> = {
  openai: {
    title: 'OpenAI',
    description: 'Benötigt API-Key...',
    links: [...]
  }
};
```

### 3. Step Wizard Pattern

Multi-step processes use dedicated step components:

```tsx
// File Converter Steps
<Step1FormatSelection />
<Step2CodeInput />
<Step3Processing />
<Step4ResultDisplay />

// Content Transform Steps
<Step1SourceInput />
<Step2PlatformSelection />
<Step3StyleOptions />
<Step4AITransform />
<Step5ResultDisplay />
```

### 4. Service Layer Pattern

Business logic is abstracted into services:

```typescript
// aiService.ts
export async function analyzeCode(code: string): Promise<Result>
export async function transformContent(markdown: string, config: TransformConfig): Promise<Result>
export function loadAIConfig(): AIConfig
export function saveAIConfig(config: AIConfig): void
```

### 5. Provider Abstraction Pattern

Multiple AI providers through unified interface:

```typescript
type AIProvider = 'openai' | 'anthropic' | 'ollama' | 'custom';

// Single interface, multiple implementations
const result = await callAI(prompt, config);
// Internally routes to correct provider
```

---

## 💾 State Management

### Local Component State

Most state is managed with React hooks:

```tsx
// useState for local state
const [selectedFormat, setSelectedFormat] = useState('markdown');
const [isProcessing, setIsProcessing] = useState(false);
const [result, setResult] = useState<string | null>(null);
```

### Persistent State (LocalStorage)

Configuration persisted via LocalStorage:

```typescript
// AI Configuration
localStorage.setItem('zenpost_ai_config', JSON.stringify(config));

// User dismissed notifications
localStorage.setItem('zenpost_settings_dismissed', 'true');
```

### No Global State Management

ZenPost Studio intentionally avoids Redux/MobX/Zustand:
- Simple application with minimal shared state
- Props drilling is manageable
- LocalStorage for persistence
- Reduced complexity and bundle size

---

## 🔧 Services Layer

### aiService.ts

**Purpose:** Unified interface for all AI providers

**Key Functions:**
```typescript
// Code analysis
analyzeCode(code: string): Promise<CodeAnalysisResult>

// Content transformation
transformContent(markdown: string, config: TransformConfig): Promise<TransformResult>

// Configuration
loadAIConfig(): AIConfig
saveAIConfig(config: AIConfig): void

// Provider utilities
getAvailableProviders(): AIProvider[]
getModelsForProvider(provider: AIProvider): string[]
detectLanguage(code: string): string
```

**Provider Support:**
- OpenAI (GPT-4o, GPT-4o-mini, GPT-3.5-turbo)
- Anthropic (Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku)
- Ollama (Local models: llama3.1, mistral, codellama, etc.)
- Custom API (User-defined endpoints)

**API Abstraction:**
Each provider has different API formats, abstracted by the service:

```typescript
// OpenAI format
{
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: '...' }]
}

// Anthropic format
{
  model: 'claude-3-5-sonnet-20241022',
  messages: [{ role: 'user', content: '...' }],
  max_tokens: 4096
}

// Ollama format
{
  model: 'llama3.1',
  prompt: '...',
  stream: false
}
```

---

## 🧩 Component Architecture

### Modal System Architecture

The modal system follows a hierarchical structure:

```
ZenModal (Base Container)
  ├── ZenModalHeader
  │   ├── ZenCloseButton
  │   └── ZenSaveButton
  │
  ├── Modal Content Area
  │   ├── ZenDropdown
  │   ├── ZenSlider
  │   ├── ZenInfoBox
  │   │   └── Links
  │   └── Custom Content
  │
  └── ZenModalFooter
      └── ZenFooterText
```

**Configuration System:**
```typescript
// Centralized presets
const preset = getModalPreset('ai-settings');

// Provider-specific info
const providerInfo = getProviderInfo('openai');

// Slider configs
const tempConfig = getSliderConfig('temperature');
```

### Design System Components

**Hierarchy:**
```
DesignKit (Primitives)
  ├── RoughBorder
  ├── RoughCircle
  ├── PaperBG
  ├── ZenCloseButton
  ├── ZenBackButton
  ├── ZenSaveButton
  └── ZenSettingsButton

PatternKit (Patterns)
  ├── ZenButton
  ├── ZenCard
  ├── ZenHeader
  ├── ZenMarkdownEditor
  ├── ZenMarkdownPreview
  └── ZenModalSystem/
      ├── components/
      └── modals/
```

---

## 🎯 Routing & Navigation

### Simple Hash-based Routing

```tsx
// App.tsx
const [currentScreen, setCurrentScreen] = useState<Screen>('home');

// Navigation
<ZenButton onClick={() => setCurrentScreen('file-converter')}>
  File Converter
</ZenButton>

// Conditional rendering
{currentScreen === 'home' && <HomeScreen />}
{currentScreen === 'file-converter' && <FileConverterScreen />}
{currentScreen === 'content-transform' && <ContentTransformScreen />}
```

**Why not React Router?**
- Simple 3-screen app
- No URL parameters needed
- Smaller bundle size
- Faster initial load

---

## 🔒 Security Considerations

### API Key Storage

**Current Implementation:**
```typescript
// LocalStorage (client-side only)
localStorage.setItem('zenpost_ai_config', JSON.stringify({
  apiKey: 'sk-...'
}));
```

**Security Notes:**
- LocalStorage is accessible via JavaScript
- Keys never sent to ZenPost servers
- All API calls go directly to provider
- User responsible for key security

**Best Practices:**
- Never commit API keys to Git
- Rotate keys regularly
- Use environment variables in production
- Consider browser extensions for key management

### XSS Protection

- React escapes all rendered content by default
- Markdown rendering uses `react-markdown` (safe)
- No `dangerouslySetInnerHTML` usage
- Content Security Policy headers recommended

---

## 📦 Build & Deployment

### Development Build

```bash
npm run dev
# Starts Vite dev server on http://127.0.0.1:5173
```

### Production Build

```bash
npm run build
# Output: dist/
# - Minified JavaScript
# - Optimized CSS
# - Asset fingerprinting
# - Source maps
```

### Build Output Structure

```
dist/
├── index.html              # Entry HTML
├── assets/
│   ├── index-[hash].js    # Main bundle
│   ├── index-[hash].css   # Styles
│   └── [assets]           # Images, fonts
└── docs/                  # Documentation (optional)
```

### Deployment Options

1. **GitHub Pages** (Recommended)
   ```bash
   npm run build
   # Deploy dist/ to gh-pages branch
   ```

2. **Vercel**
   - Connect GitHub repo
   - Auto-deploy on push

3. **Netlify**
   - Drag & drop dist/ folder
   - Or connect Git repo

4. **Static Hosting**
   - Upload dist/ to any web server
   - Configure for SPA (redirect to index.html)

---

## 🧪 Testing Strategy

### Current Testing Approach

**Manual Testing:**
- UI/UX testing in browser
- Cross-browser compatibility
- Mobile responsiveness
- AI provider integration testing

**Future Testing Goals:**
- Unit tests for services
- Component testing with React Testing Library
- E2E tests with Playwright
- Visual regression testing

---

## 🔄 Future Architecture Considerations

### Potential Improvements

1. **Server-Side API Proxy**
   - Hide API keys from client
   - Rate limiting
   - Usage analytics

2. **State Management**
   - Consider Zustand if app grows
   - Better undo/redo support

3. **Routing**
   - React Router if URL sharing needed
   - Deep linking support

4. **Offline Support**
   - Service Worker
   - IndexedDB for drafts
   - Offline AI (WebLLM)

5. **Plugin System**
   - Custom AI providers
   - Custom export formats
   - Community extensions

---

## 📚 Related Documentation

- [Component Library](./components.md)
- [API Reference](./api.md)
- [Contributing Guide](./contributing.md)

---

## 🆘 Questions?

**Architecture Questions:**
- [GitHub Discussions](https://github.com/theoriginalbitter/zenpost-studio/discussions)
- [GitHub Issues](https://github.com/theoriginalbitter/zenpost-studio/issues)
