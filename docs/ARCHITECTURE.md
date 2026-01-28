# ZenPost Studio - Architektur-Dokumentation

**Version:** 1.0.0
**Author:** Denis Bitter
**Last Updated:** Dezember 2024

---

## 📋 Inhaltsverzeichnis

1. [Architektur-Übersicht](#architektur-übersicht)
2. [Layered Architecture](#layered-architecture)
3. [Komponenten-System](#komponenten-system)
4. [State Management](#state-management)
5. [Routing & Navigation](#routing--navigation)
6. [Service Layer](#service-layer)
7. [Design Patterns](#design-patterns)
8. [Data Flow](#data-flow)
9. [Performance](#performance)
10. [Security](#security)

---

## 🏗️ Architektur-Übersicht

### High-Level Architecture

```
┌────────────────────────────────────────────────────────┐
│                    User Interface                      │
│           (React Components + Zen Design)              │
└────────────────────────────────────────────────────────┘
                         ↕
┌────────────────────────────────────────────────────────┐
│                 Application Layer                      │
│         (App Router + Screen Management)               │
└────────────────────────────────────────────────────────┘
                         ↕
┌────────────────────────────────────────────────────────┐
│                Component Libraries                     │
│      (DesignKit + PatternKit + HelpDocStudio)         │
└────────────────────────────────────────────────────────┘
                         ↕
┌────────────────────────────────────────────────────────┐
│                  Service Layer                         │
│         (AI Service + Social Media Service)            │
└────────────────────────────────────────────────────────┘
                         ↕
┌────────────────────────────────────────────────────────┐
│                  External APIs                         │
│    (OpenAI, Anthropic, Ollama, Social Media APIs)     │
└────────────────────────────────────────────────────────┘
```

### Technology Stack

#### Frontend
- **React 19.1** - Component-based UI
- **TypeScript 5.8** - Type-safe development
- **Vite 7.0** - Fast build tool
- **Tailwind CSS 4.1** - Utility-first styling

#### Desktop
- **Tauri 2.9** - Desktop framework
- **Rust** - High-performance backend
- Plugins: opener, dialog, fs

#### Libraries
- **Rough.js 4.6** - Hand-drawn graphics
- **react-markdown 10.1** - Markdown rendering
- **Font Awesome 7.1** - Icons
- **Framer Motion 12.23** - Animations

---

## 🧱 Layered Architecture

### Layer 1: Application Layer

**Verantwortlich für:**
- Routing zwischen Screens
- Global State Management
- Lifecycle Management

**Komponenten:**
- `App1.tsx` - Main Application Router
- `main.tsx` - Entry Point

```typescript
// App1.tsx - Simplified
export const App1 = () => {
  const [screen, setScreen] = useState<Screen>('welcome');

  const renderScreen = () => {
    switch (screen) {
      case 'welcome': return <WelcomeScreen />;
      case 'converter': return <ConverterScreen />;
      case 'content-ai': return <ContentTransformScreen />;
      case 'doc-studio': return <DocStudioScreen />;
    }
  };

  return <div className="app-container">{renderScreen()}</div>;
};
```

### Layer 2: Screens Layer

**Verantwortlich für:**
- Business Logic der einzelnen Studios
- User Workflows
- Screen-spezifischer State

**Screens:**
```
screens/
├── WelcomeScreen.tsx          # Landing Page mit Studio-Auswahl
├── ConverterScreen.tsx        # File Converter mit Multi-Step Wizard
├── ContentTransformScreen.tsx # AI Content Transformation
├── DocStudioScreen.tsx        # Documentation Generator
├── converter-steps/           # Converter Wizard Steps
│   ├── Step1FileInput.tsx
│   ├── Step2Preview.tsx
│   ├── Step3Processing.tsx
│   └── Step4Download.tsx
└── transform-steps/           # Transform Wizard Steps
    ├── Step1SourceInput.tsx
    ├── Step2PlatformSelection.tsx
    ├── Step3Generation.tsx
    └── Step4TransformResult.tsx
```

**Screen-Pattern:**
```typescript
export const SomeScreen = () => {
  // Local state
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<Data>(initialData);

  // Event handlers
  const handleNext = () => setCurrentStep(prev => prev + 1);
  const handleBack = () => setCurrentStep(prev => prev - 1);

  // Render current step
  return (
    <div className="screen">
      <ZenHeader onBack={handleBack} />
      {renderStep(currentStep, data, { handleNext, setData })}
    </div>
  );
};
```

### Layer 3: PatternKit Layer

**Verantwortlich für:**
- Zusammengesetzte Komponenten
- Business-spezifische UI-Muster
- Wiederverwendbare Workflows

**Komponenten:**
```
PatternKit/
├── ZenHeader.tsx              # App Header mit Navigation
├── ZenMarkdownEditor.tsx      # Markdown Editor mit Preview
├── ZenPlusMenu.tsx            # Action Menu
├── ZenProcessTimer.tsx        # Loading States
├── ZenSubtitle.tsx            # Styled Subtitles
├── ZenInfoText.tsx            # Info Texts
├── ZenInfoFooter.tsx          # Footer mit Info-Link
└── ZenModalSystem/            # Modal System
    ├── components/
    │   ├── ZenModal.tsx
    │   ├── ZenModalHeader.tsx
    │   ├── ZenModalFooter.tsx
    │   ├── ZenRoughButton.tsx
    │   ├── ZenDropdown.tsx
    │   ├── ZenSlider.tsx
    │   └── ZenInfoBox.tsx
    ├── modals/
    │   ├── ZenAboutModal.tsx
    │   ├── ZenGithubModal.tsx
    │   ├── ZenSettingsModal.tsx
    │   ├── ZenMetadataModal.tsx
    │   └── ... weitere Modals
    └── config/
        └── ZenModalConfig.ts
```

**Pattern: Configuration-Driven Design**
```typescript
// ZenModalConfig.ts
export const MODAL_PRESETS = {
  about: {
    title: "About ZenPost Studio",
    subtitle: "Transform your content with AI",
    titleColor: "#AC8E66",
    subtitleColor: "#777",
    minHeight: "500px"
  },
  settings: {
    title: "Settings",
    subtitle: "Configure your preferences",
    titleColor: "#AC8E66",
    subtitleColor: "#777",
    minHeight: "600px"
  }
};

// Usage in Component
const modalPreset = getModalPreset('about');
```

### Layer 4: DesignKit Layer

**Verantwortlich für:**
- Basis UI-Primitives
- Low-Level Components
- Visual Design Elements

**Komponenten:**
```
DesignKit/
├── ZenBackButton.tsx          # Zurück-Navigation
├── ZenLogoFlip.tsx            # 3D Logo Animation
├── RoughCircle.tsx            # Hand-drawn Circles
└── ZenFooterText.tsx          # Copyright Footer
```

**Beispiel: ZenBackButton**
```typescript
export const ZenBackButton = ({ onClick }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rc = rough.canvas(canvas);
    // Draw arrow with rough.js
    rc.line(10, 20, 30, 20, {
      roughness: 0.3,
      stroke: "#AC8E66",
      strokeWidth: 2
    });
  }, []);

  return (
    <button onClick={onClick}>
      <canvas ref={canvasRef} width={40} height={40} />
      <span>Zurück</span>
    </button>
  );
};
```

### Layer 5: Service Layer

**Verantwortlich für:**
- API Integration
- Business Logic
- Data Transformation

**Services:**
```
services/
├── aiService.ts               # AI Provider Abstraction
└── socialMediaService.ts      # Social Media APIs
```

---

## 🔧 Komponenten-System

### HelpDocStudio - Walkthrough System

Ein vollständiges Tutorial-System mit Animation Support.

**Struktur:**
```
HelpDocStudio/
├── components/
│   ├── WalkthroughModal.tsx      # Modal Wrapper
│   ├── WalkthroughOverlay.tsx    # Hauptkomponente
│   ├── StepController.tsx        # Steuerelemente
│   └── LottiePlayer.tsx          # Animation Player
└── config/
    └── walkthroughSteps.ts       # Step Definitions
```

**Architektur:**
```
WalkthroughModal (Container)
    ↓
WalkthroughOverlay (Logic + UI)
    ├─→ LottiePlayer (Animation)
    ├─→ Step Content (Title, Description, Tip)
    └─→ StepController (Controls)
```

**Data Flow:**
```typescript
// 1. Steps Definition
export const CONTENT_AI_STUDIO_STEPS: WalkthroughStep[] = [
  { id, title, description, tip, animationData, duration }
];

// 2. Modal Integration
<WalkthroughModal
  isOpen={isOpen}
  onClose={onClose}
  autoStart={true}
/>

// 3. Overlay Rendering
<WalkthroughOverlay
  steps={CONTENT_AI_STUDIO_STEPS}
  onComplete={handleComplete}
  autoStart={true}
/>

// 4. Step Progression
useEffect(() => {
  if (isPlaying && !hasCompleted) {
    const timer = setTimeout(() => {
      nextStep();
    }, currentStep.duration);
    return () => clearTimeout(timer);
  }
}, [isPlaying, currentStepIndex]);
```

### ZenModalSystem

Konfigurationsgesteuertes Modal-System.

**Komponenten-Hierarchie:**
```
ZenModal (Container)
  ├─→ ZenModalHeader (Title + Subtitle)
  ├─→ Content Area (Children)
  └─→ ZenModalFooter (Copyright)
```

**Pre-built Modals:**
```typescript
// About Modal with Walkthrough
ZenAboutModal
  ├─→ Regular View
  │   ├─→ ZenModalHeader
  │   ├─→ Links (Wiki, GitHub, Support)
  │   └─→ "Hilfe & Tutorial" Button
  └─→ Walkthrough View
      └─→ WalkthroughOverlay

// GitHub Modal with Walkthrough
ZenGithubModal
  ├─→ Regular View
  │   ├─→ ZenModalHeader
  │   ├─→ Features List
  │   ├─→ "Repository verbinden" Button
  │   └─→ "Hilfe & Tutorial" Button
  └─→ Walkthrough View
      └─→ WalkthroughOverlay
```

**ZenRoughButton Variants:**
```typescript
// Default Size (320x56px)
<ZenRoughButton
  label="Click Me"
  icon={<Icon />}
  onClick={handler}
/>

// Compact Size (40x40px, circular)
<ZenRoughButton
  label=""
  size="compact"
  icon={<Icon />}
  onClick={handler}
/>
```

---

## 🔄 State Management

### Local State (React.useState)

Für Component-spezifischen State:

```typescript
// Screen State
const [currentStep, setCurrentStep] = useState(1);
const [content, setContent] = useState('');
const [isLoading, setIsLoading] = useState(false);

// Modal State
const [isModalOpen, setIsModalOpen] = useState(false);
const [showWalkthrough, setShowWalkthrough] = useState(false);
```

### Settings Storage (LocalStorage)

Für persistente Einstellungen:

```typescript
// Read Settings
const getSettings = () => {
  const stored = localStorage.getItem('zenpost_settings');
  return stored ? JSON.parse(stored) : defaultSettings;
};

// Save Settings
const saveSettings = (settings: Settings) => {
  localStorage.setItem('zenpost_settings', JSON.stringify(settings));
};

// Settings Structure
interface Settings {
  aiProvider: {
    provider: 'openai' | 'anthropic' | 'ollama' | 'custom';
    apiKey?: string;
    model: string;
    baseURL?: string;
  };
  socialMedia: {
    twitter?: { apiKey: string; apiSecret: string };
    linkedin?: { accessToken: string };
    // ... weitere Plattformen
  };
}
```

### Context API (geplant)

Für globalen Application State:

```typescript
// Geplant für v2.0
interface AppContext {
  user: User | null;
  settings: Settings;
  updateSettings: (settings: Settings) => void;
}

const AppContext = createContext<AppContext>(defaultContext);
```

---

## 🔀 Routing & Navigation

### Screen-based Navigation

Aktuell: State-based Routing in App1.tsx

```typescript
type Screen =
  | 'welcome'
  | 'converter'
  | 'content-ai'
  | 'doc-studio';

const [screen, setScreen] = useState<Screen>('welcome');

const navigate = (target: Screen) => {
  setScreen(target);
};
```

### Navigation Flow

```
WelcomeScreen
  ├─→ Converter Studio
  │     └─→ Step 1 → Step 2 → Step 3 → Step 4
  ├─→ Content AI Studio
  │     └─→ Step 1 → Step 2 → Step 3 → Step 4
  └─→ Doc Studio
        └─→ Input → Generation → Result
```

### Back Navigation

Jeder Screen hat einen ZenBackButton:

```typescript
<ZenHeader
  title="Screen Title"
  onBack={() => navigate('welcome')}
/>
```

---

## 🔌 Service Layer

### AI Service Architecture

**Interface Definition:**
```typescript
interface AIService {
  provider: AIProvider;
  generateContent(prompt: string, options: AIOptions): Promise<string>;
  validateCredentials(): Promise<boolean>;
  streamContent(
    prompt: string,
    onChunk: (chunk: string) => void
  ): Promise<void>;
}

interface AIOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}
```

**Provider Implementation:**
```typescript
// OpenAI Implementation
const openAIService: AIService = {
  provider: 'openai',

  async generateContent(prompt, options) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model,
        messages: [
          { role: 'system', content: options.systemPrompt || '' },
          { role: 'user', content: prompt }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 4000
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  },

  async validateCredentials() {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
};
```

**Provider Selection:**
```typescript
const getAIService = (provider: AIProvider): AIService => {
  switch (provider) {
    case 'openai': return openAIService;
    case 'anthropic': return anthropicService;
    case 'ollama': return ollamaService;
    case 'custom': return customService;
  }
};
```

### Social Media Service

**Interface:**
```typescript
interface SocialMediaService {
  platform: Platform;
  publishPost(content: Post): Promise<PostResponse>;
  schedulePost(content: Post, date: Date): Promise<ScheduleResponse>;
  deletePost(postId: string): Promise<boolean>;
}

interface Post {
  title?: string;
  content: string;
  tags?: string[];
  images?: File[];
  metadata?: Record<string, any>;
}
```

---

## 🎨 Design Patterns

### 1. Configuration-Driven Design

Zentrale Konfiguration statt Hard-Coded Values:

```typescript
// ❌ Bad: Hard-coded
const modal = (
  <div style={{ minHeight: '500px' }}>
    <h2 style={{ color: '#AC8E66' }}>Title</h2>
    <p style={{ color: '#777' }}>Subtitle</p>
  </div>
);

// ✅ Good: Configuration-driven
const config = getModalPreset('about');
const modal = (
  <ZenModalHeader
    title={config.title}
    subtitle={config.subtitle}
    titleColor={config.titleColor}
    subtitleColor={config.subtitleColor}
  />
);
```

### 2. Component Composition

Kleine, wiederverwendbare Komponenten:

```typescript
// Compose complex UIs
<ZenModal isOpen={isOpen} onClose={onClose}>
  <ZenModalHeader title="..." subtitle="..." />
  <div className="modal-content">
    <ZenDropdown options={...} />
    <ZenSlider value={...} />
    <ZenRoughButton label="Save" />
  </div>
  <ZenModalFooter />
</ZenModal>
```

### 3. Service Layer Abstraction

Einheitliche Schnittstelle für unterschiedliche Provider:

```typescript
// Caller Code (same for all providers)
const result = await aiService.generateContent(prompt, {
  model: 'gpt-4o',
  temperature: 0.7
});

// Works with OpenAI, Anthropic, Ollama, Custom
```

### 4. Step Wizard Pattern

Multi-Step Workflows mit State Management:

```typescript
const steps = [
  { id: 1, component: Step1, validate: () => Boolean(data.input) },
  { id: 2, component: Step2, validate: () => data.platforms.length > 0 },
  { id: 3, component: Step3, validate: () => true },
  { id: 4, component: Step4, validate: () => true }
];

const handleNext = () => {
  if (steps[currentStep].validate()) {
    setCurrentStep(prev => prev + 1);
  }
};
```

### 5. Render Props Pattern

Flexible Component Rendering:

```typescript
<DataFetcher
  url={url}
  render={(data, loading, error) => {
    if (loading) return <Spinner />;
    if (error) return <Error message={error} />;
    return <Content data={data} />;
  }}
/>
```

---

## 📊 Data Flow

### User Input → AI Generation → Result Display

```
[User Input]
    ↓
[Validation]
    ↓
[Prompt Engineering]
    ↓
[AI Service Call]
    ↓
[Response Parsing]
    ↓
[State Update]
    ↓
[UI Re-render]
    ↓
[Result Display]
```

**Detailed Flow Example (Content AI Studio):**

```typescript
// Step 1: User Input
const [content, setContent] = useState('');

// Step 2: Platform Selection
const [platforms, setPlatforms] = useState<Platform[]>([]);
const [styleOptions, setStyleOptions] = useState<StyleOptions>({
  tone: 'professional',
  length: 'medium',
  audience: 'intermediate'
});

// Step 3: Generation
const handleGenerate = async () => {
  setIsGenerating(true);

  try {
    // Build Prompt
    const prompt = buildPrompt(content, platforms[0], styleOptions);

    // Call AI Service
    const result = await aiService.generateContent(prompt, {
      model: settings.model,
      temperature: 0.7,
      maxTokens: 4000
    });

    // Update State
    setGeneratedContent(result);
    setCurrentStep(4);
  } catch (error) {
    setError(error.message);
  } finally {
    setIsGenerating(false);
  }
};

// Step 4: Display Result
return (
  <div className="result-container">
    <h3>{platforms[0]} Post</h3>
    <div className="content">{generatedContent}</div>
    <ZenRoughButton label="Copy" onClick={handleCopy} />
  </div>
);
```

---

## ⚡ Performance

### Optimization Strategies

**1. Code Splitting**
```typescript
// Lazy load heavy components
const ContentTransformScreen = lazy(() =>
  import('./screens/ContentTransformScreen')
);

<Suspense fallback={<Loading />}>
  <ContentTransformScreen />
</Suspense>
```

**2. Memoization**
```typescript
// Prevent unnecessary re-renders
const memoizedValue = useMemo(() =>
  expensiveComputation(data),
  [data]
);

const memoizedCallback = useCallback(() => {
  doSomething(data);
}, [data]);
```

**3. Virtual Scrolling (geplant)**
```typescript
// For large lists
<VirtualList
  items={items}
  itemHeight={60}
  renderItem={(item) => <ListItem item={item} />}
/>
```

**4. Request Debouncing**
```typescript
const debouncedSearch = useMemo(
  () => debounce((query) => performSearch(query), 300),
  []
);
```

### Bundle Size Optimization

- Tree-shaking aktiviert
- Dynamic Imports für Routes
- SVG Icons statt Image Files
- CSS Purging mit Tailwind

---

## 🔒 Security

### API Key Management

**Best Practices:**
```typescript
// ✅ Good: LocalStorage (encrypted geplant)
const apiKey = localStorage.getItem('zenpost_api_key');

// ❌ Bad: Never commit to code
const apiKey = 'sk-...'; // NEVER!

// ❌ Bad: Never expose in frontend code
console.log('API Key:', apiKey); // NEVER!
```

### Input Sanitization

```typescript
import DOMPurify from 'dompurify';

// Sanitize user input
const cleanContent = DOMPurify.sanitize(userInput);
```

### CORS & CSP

```html
<!-- Content Security Policy -->
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self';
           script-src 'self';
           style-src 'self' 'unsafe-inline';
           img-src 'self' data: https:;
           connect-src 'self' https://api.openai.com https://api.anthropic.com">
```

### Environment Variables

```bash
# .env (never commit)
VITE_OPENAI_API_KEY=sk-...
VITE_ANTHROPIC_API_KEY=sk-...

# Usage
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
```

---

## 🔮 Future Architecture

### Planned Improvements

**1. State Management mit Zustand/Redux**
```typescript
// Global State Store
const useAppStore = create((set) => ({
  settings: defaultSettings,
  updateSettings: (settings) => set({ settings }),
  user: null,
  login: (user) => set({ user })
}));
```

**2. React Router Integration**
```typescript
<BrowserRouter>
  <Routes>
    <Route path="/" element={<WelcomeScreen />} />
    <Route path="/converter" element={<ConverterScreen />} />
    <Route path="/content-ai" element={<ContentTransformScreen />} />
    <Route path="/doc-studio" element={<DocStudioScreen />} />
  </Routes>
</BrowserRouter>
```

**3. GraphQL API Layer**
```typescript
// Unified API Interface
const client = new ApolloClient({
  uri: 'https://api.zenpost.studio/graphql'
});

const { data } = useQuery(GET_USER_CONTENT);
```

**4. WebSocket für Real-time**
```typescript
// Live Collaboration
const socket = io('wss://api.zenpost.studio');

socket.on('content-updated', (data) => {
  updateContent(data);
});
```

---

**Made with ❤️ by Denis Bitter**

*Last Updated: Dezember 2024*
