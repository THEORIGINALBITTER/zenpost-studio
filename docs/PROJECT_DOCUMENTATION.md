# ZenPost Studio - Vollständige Projektdokumentation

**Version:** 1.0.0
**Autor:** Denis Bitter
**Lizenz:** MIT
**Letzte Aktualisierung:** Dezember 2024

---

## 📋 Inhaltsverzeichnis

1. [Projektübersicht](#projektübersicht)
2. [Architektur](#architektur)
3. [Technologie-Stack](#technologie-stack)
4. [Komponenten-System](#komponenten-system)
5. [Feature-Dokumentation](#feature-dokumentation)
6. [API & Services](#api--services)
7. [Deployment](#deployment)
8. [Entwicklung](#entwicklung)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Projektübersicht

### Was ist ZenPost Studio?

ZenPost Studio ist eine AI-gestützte Content-Plattform, die drei spezialisierte Studios in einer Anwendung vereint:

- **Converter Studio**: Konvertierung und Bereinigung von Markdown und Editor.js Dateien
- **Content AI Studio**: KI-gestützte Transformation von Content für verschiedene Social Media Plattformen
- **Doc Studio**: Automatische Generierung von Projekt-Dokumentation

### Kern-Features

#### 1. **Multi-Studio Architektur**
- Separate, spezialisierte Workflows für unterschiedliche Aufgaben
- Einheitliches Design-System über alle Studios hinweg
- Zentrale Einstellungen und Konfiguration

#### 2. **Zen Design System**
- Minimalistisches, japanisch-inspiriertes Interface
- Hand-drawn Ästhetik mit rough.js
- Dunkles Theme (#1A1A1A) mit goldenen Akzenten (#AC8E66)
- Custom Components mit konsistentem Styling

#### 3. **AI Provider Unterstützung**
- OpenAI (GPT-4o, GPT-4o-mini)
- Anthropic (Claude 3.5 Sonnet, Claude 3 Opus)
- Ollama (lokale AI-Modelle)
- Custom API Support

#### 4. **Cross-Platform**
- Web-Anwendung (React + Vite)
- Desktop-Anwendung (Tauri)
- Zukünftig: Mobile App (React Native)

---

## 🏗️ Architektur

### Layered Architecture

```
┌──────────────────────────────────────────┐
│          Application Layer               │
│         (App1.tsx, Routing)              │
└──────────────────────────────────────────┘
                   ↓
┌──────────────────────────────────────────┐
│           Screens Layer                  │
│  (WelcomeScreen, ConverterScreen,        │
│   ContentTransformScreen, DocStudio)     │
└──────────────────────────────────────────┘
                   ↓
┌──────────────────────────────────────────┐
│          PatternKit Layer                │
│  (ZenModalSystem, ZenMarkdownEditor,     │
│   ZenHeader, ZenPlusMenu)                │
└──────────────────────────────────────────┘
                   ↓
┌──────────────────────────────────────────┐
│          DesignKit Layer                 │
│  (ZenBackButton, ZenLogoFlip,            │
│   RoughCircle, ZenSubtitle)              │
└──────────────────────────────────────────┘
                   ↓
┌──────────────────────────────────────────┐
│          Services Layer                  │
│  (aiService, socialMediaService)         │
└──────────────────────────────────────────┘
```

### Design Patterns

#### 1. **Configuration-Driven Design**
Zentrale Konfiguration für Modals, Dropdowns und andere Komponenten:

```typescript
// Beispiel: Modal Presets
export const MODAL_PRESETS = {
  about: {
    title: "About ZenPost Studio",
    subtitle: "Transform your content with AI",
    titleColor: "#AC8E66",
    // ...
  }
};
```

#### 2. **Component Composition**
Aufbau komplexer UIs aus wiederverwendbaren Primitiven:

```typescript
<ZenModal>
  <ZenModalHeader />
  <ZenModalContent />
  <ZenModalFooter />
</ZenModal>
```

#### 3. **Service Layer Abstraction**
Einheitliche Schnittstelle für verschiedene AI-Provider:

```typescript
interface AIService {
  generateContent(prompt: string, options: AIOptions): Promise<string>;
  validateCredentials(): Promise<boolean>;
}
```

#### 4. **Step Wizard Pattern**
Multi-Step Prozesse mit klar definierten Schritten:

```typescript
const steps = [
  { id: 1, label: "Input", component: Step1 },
  { id: 2, label: "Settings", component: Step2 },
  { id: 3, label: "Generate", component: Step3 },
  { id: 4, label: "Result", component: Step4 }
];
```

### Verzeichnisstruktur

```
zenpost-studio/
├── src/
│   ├── screens/                    # Haupt-Screens
│   │   ├── WelcomeScreen.tsx      # Landing Page
│   │   ├── ConverterScreen.tsx    # Converter Studio
│   │   ├── ContentTransformScreen.tsx  # Content AI Studio
│   │   ├── DocStudioScreen.tsx    # Doc Studio
│   │   ├── converter-steps/       # Converter Wizard Steps
│   │   └── transform-steps/       # Transform Wizard Steps
│   │
│   ├── kits/                       # Komponenten-Kits
│   │   ├── DesignKit/             # Basis-Komponenten
│   │   ├── PatternKit/            # Zusammengesetzte Komponenten
│   │   └── HelpDocStudio/         # Walkthrough System
│   │       ├── components/
│   │       │   ├── WalkthroughModal.tsx
│   │       │   ├── WalkthroughOverlay.tsx
│   │       │   ├── LottiePlayer.tsx
│   │       │   └── StepController.tsx
│   │       └── config/
│   │           └── walkthroughSteps.ts
│   │
│   ├── services/
│   │   ├── aiService.ts           # AI Provider Abstraktion
│   │   └── socialMediaService.ts  # Social Media APIs
│   │
│   ├── types/
│   │   └── scheduling.ts          # TypeScript Typen
│   │
│   ├── utils/
│   │   └── calendarExport.ts      # Kalender Export
│   │
│   ├── App1.tsx                   # Main Router
│   └── main.tsx                   # Entry Point
│
├── src-tauri/                     # Tauri Desktop App
│   ├── src/lib.rs                 # Rust Backend
│   └── Cargo.toml
│
├── docs/                          # Dokumentation
├── data-room/                     # Data Room Content
└── marketing/                     # Marketing Materials
```

---

## 💻 Technologie-Stack

### Frontend Core

| Technologie | Version | Zweck |
|------------|---------|-------|
| React | 19.1 | UI Framework |
| TypeScript | 5.8 | Type Safety |
| Vite | 7.0 | Build Tool & Dev Server |
| Tailwind CSS | 4.1 | Utility-First CSS |

### Design & UI

| Technologie | Version | Zweck |
|------------|---------|-------|
| Rough.js | 4.6 | Hand-drawn Graphics |
| react-markdown | 10.1 | Markdown Rendering |
| rehype-highlight | 7.0 | Code Syntax Highlighting |
| Font Awesome | 7.1 | Icons |
| Framer Motion | 12.23 | Animations |

### AI & Content Processing

| Technologie | Version | Zweck |
|------------|---------|-------|
| OpenAI SDK | Latest | GPT-4 Integration |
| Anthropic SDK | Latest | Claude Integration |
| Marked | 17.0 | Markdown Parsing |
| Turndown | 7.2 | HTML to Markdown |
| DOMPurify | 3.3 | HTML Sanitization |

### Desktop (Tauri)

| Technologie | Version | Zweck |
|------------|---------|-------|
| Tauri | 2.9 | Desktop Framework |
| Rust | Latest | Backend |
| tauri-plugin-opener | Latest | URL/File Opening |
| tauri-plugin-dialog | Latest | Native Dialogs |

---

## 🧩 Komponenten-System

### ZenModalSystem

Das zentrale Modal-System mit konfigurations-getriebenem Ansatz.

#### Komponenten

**1. ZenModal**
- Basis-Modal-Container
- Unterstützt verschiedene Größen (sm, md, lg, xl)
- Optional Close-Button
- Backdrop mit Click-to-Close

```typescript
<ZenModal
  isOpen={isOpen}
  onClose={onClose}
  size="lg"
  showCloseButton={true}
>
  {children}
</ZenModal>
```

**2. ZenModalHeader**
- Konfigurierbare Titel und Untertitel
- Anpassbare Farben und Größen
- Responsive Typography

```typescript
<ZenModalHeader
  title="Welcome"
  subtitle="Get started"
  titleColor="#AC8E66"
  subtitleColor="#777"
/>
```

**3. ZenRoughButton**
- Hand-drawn Button mit rough.js
- Zwei Größen: `default` und `compact`
- Varianten: `default` und `active`
- Optional Icon und Tooltip

```typescript
// Standard Button
<ZenRoughButton
  label="Click me"
  icon={<FontAwesomeIcon icon={faCheck} />}
  onClick={handleClick}
  title="Tooltip text"
/>

// Compact Button (rund, nur Icon)
<ZenRoughButton
  label=""
  size="compact"
  icon={<FontAwesomeIcon icon={faQuestion} />}
  onClick={handleClick}
/>
```

**4. ZenDropdown**
- Konfigurations-getriebenes Dropdown
- Unterstützt Icons
- Beschreibungen für jede Option
- Optional Info-Text

```typescript
<ZenDropdown
  label="Select Provider"
  value={provider}
  onChange={setProvider}
  options={[
    { value: 'openai', label: 'OpenAI', icon: faRobot },
    { value: 'anthropic', label: 'Anthropic', icon: faBrain }
  ]}
/>
```

**5. ZenSlider**
- Range Slider mit Labels
- Konfigurierbare Min/Max/Step Werte
- Optional Einheiten

```typescript
<ZenSlider
  label="Temperature"
  value={temperature}
  onChange={setTemperature}
  min={0}
  max={2}
  step={0.1}
  unit=""
/>
```

#### Pre-built Modals

**ZenAboutModal**
- Über-Dialog mit Links
- Integriertes Walkthrough-System
- Links zu Wiki, GitHub, Support
- "Hilfe & Tutorial" Button

**ZenGithubModal**
- GitHub Integration Dialog
- Repository-Verbindung
- Branch Management
- Versions-Historie
- Integriertes Walkthrough

**ZenSettingsModal**
- Tabbed Settings Dialog
- AI Settings Tab
- Social Media Settings Tab
- Persistente Settings Storage

**ZenMetadataModal**
- Projekt-Metadaten Editor
- Auto-Extraktion aus Content
- Autor-Info, Repository, Lizenz

**ZenGeneratingModal**
- Loading-State während AI-Generierung
- Progress-Animation
- Abbruch-Funktion

**ZenSaveSuccessModal**
- Erfolgs-Feedback nach Speichern
- Auto-Close nach Timeout
- Download-Button

**ZenPublishScheduler**
- Scheduling für Social Media Posts
- Plattform-spezifische Zeiten
- Kalender-Integration

**ZenContentCalendar**
- Monats-Kalender View
- Post-Scheduling
- Drag & Drop Support

**ZenTodoChecklist**
- Task-Management
- Checkbox-Listen
- Status-Tracking

### HelpDocStudio - Walkthrough System

Ein komplettes Tutorial/Walkthrough-System mit Lottie-Animationen.

#### Komponenten

**1. WalkthroughModal**
```typescript
<WalkthroughModal
  isOpen={isOpen}
  onClose={onClose}
  autoStart={true}
/>
```

**2. WalkthroughOverlay**
```typescript
<WalkthroughOverlay
  steps={CONTENT_AI_STUDIO_STEPS}
  onComplete={handleComplete}
  autoStart={true}
/>
```

**3. StepController**
- Play/Pause Controls
- Next/Previous Navigation
- Restart Funktion
- Progress Indicator

#### Walkthrough Steps Konfiguration

```typescript
// config/walkthroughSteps.ts
export const CONTENT_AI_STUDIO_STEPS: WalkthroughStep[] = [
  {
    id: 'step-1',
    title: 'Willkommen',
    description: 'Transformiere deinen Content mit KI-Power.',
    tip: 'Tipp-Text hier',
    animationData: undefined, // Lottie JSON
    duration: 3000, // ms
  },
  // weitere Steps...
];
```

#### Verfügbare Step-Sets

- `CONTENT_AI_STUDIO_STEPS` - Für Content AI Studio
- `ABOUT_MODAL_STEPS` - Für About Modal
- `GITHUB_STEPS` - Für GitHub Integration

### DesignKit

Basis-Komponenten für das Zen Design System.

**ZenBackButton**
- Zurück-Navigation
- Hand-drawn Pfeil
- Hover-Effekt

**ZenLogoFlip**
- 3D Flip-Animation
- Dual-Logo Display
- Click-Interaktivität

**ZenSubtitle**
- Stylisierter Untertitel
- Monospace Typography
- Konsistente Farben

**ZenInfoText**
- Kleine Info-Texte
- 9px Font-Size
- Optimal für Footer

**ZenInfoFooter**
- Footer mit Info-Icon
- Click-Handler für About-Dialog
- Optional fixed/static

**ZenFooterText**
- Copyright-Footer
- "Made with ❤️" Text
- Konsistente Positionierung

---

## 🎨 Feature-Dokumentation

### Converter Studio

**Zweck:** Konvertierung und Bereinigung von Markdown und Editor.js Dateien

#### Features

1. **Markdown Parsing**
   - Parse .md Dateien
   - Entfernung von Sonderzeichen
   - Link-Extraktion
   - Frontmatter-Handling

2. **Editor.js Konvertierung**
   - Block-JSON zu Markdown
   - Preservation von Code-Blöcken
   - Image-Handling
   - List-Formatting

3. **Smart Cleaning**
   - Entfernung von Smart Quotes
   - Normalisierung von Leerzeichen
   - Code-Block Preservation
   - Metadata Stripping

4. **Export-Optionen**
   - Markdown (.md)
   - HTML (.html)
   - Plain Text (.txt)
   - JSON (.json)

#### Workflow

```
Step 1: File Upload
   ↓
Step 2: Preview & Settings
   ↓
Step 3: Processing
   ↓
Step 4: Download Result
```

### Content AI Studio

**Zweck:** KI-gestützte Transformation von Content für verschiedene Plattformen

#### Unterstützte Plattformen

| Platform | Optimierungen |
|----------|---------------|
| LinkedIn | Professional Hooks, Hashtags, Engagement |
| Twitter/X | Thread-Splitting, Character Limits |
| dev.to | Technical Writing, Code Blocks |
| Medium | Long-form, Storytelling |
| Reddit | Community-focused, Subreddit Style |
| GitHub | Technical Q&A, Code Examples |
| Hashnode | Developer Blog Format |
| YouTube | Video Descriptions, Timestamps |

#### Style-Optionen

**Tone (Tonalität)**
- Professional - Für Business & Corporate
- Casual - Für Community & Social
- Technical - Für Developer Content
- Enthusiastic - Für Marketing & Promo

**Length (Länge)**
- Short - 1-2 Paragraphen, schnell konsumierbar
- Medium - 3-5 Paragraphen, ausgewogen
- Long - Artikel-Format, ausführlich

**Audience (Zielgruppe)**
- Beginner - Einfache Sprache, Erklärungen
- Intermediate - Balanced, einige Fachbegriffe
- Expert - Technical, Fachsprache

#### Workflow

```
Step 1: Content Input
   ↓ (Paste, Upload, oder Type)
Step 2: Platform Selection & Style
   ↓ (Choose Platforms, Set Options)
Step 3: AI Generation
   ↓ (OpenAI/Anthropic/Ollama)
Step 4: Review & Edit
   ↓ (Edit, Copy, Schedule)
Step 5: Publish/Schedule (Optional)
```

#### Edit-After-Transform Workflow

Neu in v1.0: Bearbeitung nach der Transformation

1. **Quick Edit**
   - Inline-Editing für jeden Post
   - Character Count Update
   - Syntax Highlighting

2. **Metadata Modal**
   - Titel, Tags, Description
   - Plattform-spezifische Metadaten
   - Auto-Save

3. **Quick Post**
   - CMD/CTRL + Enter Shortcut
   - Direkt zu Publishing
   - Skip zusätzliche Schritte

### Doc Studio

**Zweck:** Automatische Generierung von Projekt-Dokumentation

#### Dokumentations-Typen

**README.md**
- Projekt-Übersicht
- Installation Instructions
- Usage Examples
- Feature-Liste

**CHANGELOG.md**
- Version History
- Release Notes
- Breaking Changes
- Following Keep a Changelog Format

**API Documentation**
- Endpoint-Liste
- Request/Response Examples
- Authentication
- Rate Limits

**CONTRIBUTING.md**
- Development Setup
- Code Style Guidelines
- PR Process
- Issue Templates

**Blog Posts**
- dev.to Format
- Medium Format
- Hashnode Format
- Technical Writing Style

**Data Room**
- Executive Summary
- Market Analysis
- Financial Projections
- Technical Architecture
- Investor-ready Format

#### Smart Analysis Features

1. **Projekt-Struktur Erkennung**
   - Automatische Verzeichnis-Analyse
   - File-Type Detection
   - Framework Detection

2. **Dependency Analysis**
   - package.json Parsing
   - Cargo.toml Parsing
   - Requirements.txt Parsing

3. **Test Detection**
   - Test-Verzeichnisse
   - Test-Frameworks
   - Coverage Tools

4. **API Detection**
   - REST Endpoints
   - GraphQL Schemas
   - API Routes

#### Metadata Management

Zentrale Verwaltung von Projekt-Metadaten:

```typescript
interface ProjectMetadata {
  projectName: string;
  projectDescription: string;
  authorName: string;
  authorEmail: string;
  authorGithub: string;
  repositoryUrl: string;
  license: string;
  version: string;
  // ... weitere Felder
}
```

**Auto-Extraktion**
- Aus package.json
- Aus Cargo.toml
- Aus README.md
- Aus Git Config

---

## 🔌 API & Services

### AI Service

Zentrale Abstraktion für verschiedene AI-Provider.

#### Interface

```typescript
interface AIService {
  provider: 'openai' | 'anthropic' | 'ollama' | 'custom';
  generateContent(
    prompt: string,
    options: AIOptions
  ): Promise<string>;
  validateCredentials(): Promise<boolean>;
  streamContent(
    prompt: string,
    onChunk: (chunk: string) => void
  ): Promise<void>;
}
```

#### Unterstützte Provider

**OpenAI**
```typescript
const openaiService = {
  baseURL: 'https://api.openai.com/v1',
  models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
  requiresApiKey: true
};
```

**Anthropic**
```typescript
const anthropicService = {
  baseURL: 'https://api.anthropic.com/v1',
  models: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'],
  requiresApiKey: true
};
```

**Ollama**
```typescript
const ollamaService = {
  baseURL: 'http://localhost:11434',
  models: ['llama3.1', 'mistral', 'codellama', 'qwen2.5-coder'],
  requiresApiKey: false
};
```

#### Prompt Engineering

Optimierte Prompts für verschiedene Aufgaben:

1. **Content Transformation**
   - Plattform-spezifische Templates
   - Style-basierte Anpassungen
   - Character Limit Awareness

2. **Documentation Generation**
   - Strukturierte Ausgabe
   - Markdown Formatting
   - Code Block Handling

3. **Metadata Extraction**
   - JSON Output Parsing
   - Field Validation
   - Default Value Handling

### Social Media Service

Integration für direkte Veröffentlichung auf Social Media Plattformen.

#### Unterstützte Plattformen

**Twitter/X**
```typescript
interface TwitterAPI {
  postTweet(content: string): Promise<TweetResponse>;
  postThread(tweets: string[]): Promise<ThreadResponse>;
}
```

**LinkedIn**
```typescript
interface LinkedInAPI {
  sharePost(content: string): Promise<PostResponse>;
  uploadImage(file: File): Promise<ImageResponse>;
}
```

**Reddit**
```typescript
interface RedditAPI {
  submitPost(subreddit: string, title: string, content: string): Promise<PostResponse>;
}
```

**dev.to**
```typescript
interface DevToAPI {
  publishArticle(article: Article): Promise<ArticleResponse>;
}
```

**Medium**
```typescript
interface MediumAPI {
  createPost(post: Post): Promise<PostResponse>;
}
```

**GitHub Discussions**
```typescript
interface GitHubAPI {
  createDiscussion(repo: string, title: string, body: string): Promise<DiscussionResponse>;
}
```

#### Authentication

Alle API-Credentials werden lokal im Browser LocalStorage gespeichert:

```typescript
interface SocialMediaCredentials {
  twitter: { apiKey: string; apiSecret: string };
  linkedin: { accessToken: string };
  reddit: { clientId: string; clientSecret: string };
  devto: { apiKey: string };
  medium: { accessToken: string };
  github: { token: string };
}
```

**Security Best Practices:**
- Credentials nie in Code committen
- LocalStorage Encryption (geplant)
- Token Rotation Support
- Scope Limitation

---

## 🚀 Deployment

### Web Deployment (Vercel)

**Voraussetzungen:**
- Vercel Account
- GitHub Repository Connection

**Schritte:**

1. **Repository Vorbereiten**
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

2. **Vercel Projekt erstellen**
- Vercel Dashboard öffnen
- "New Project" klicken
- GitHub Repo auswählen
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

3. **Environment Variables** (Optional)
- `VITE_OPENAI_API_KEY`
- `VITE_ANTHROPIC_API_KEY`

4. **Deploy**
```bash
vercel --prod
```

**Custom Domain:**
```bash
vercel domains add zenpost-studio.com
```

### Desktop Deployment (Tauri)

**Voraussetzungen:**
- Rust installiert (`rustup`)
- Tauri CLI installiert

**Build für verschiedene Plattformen:**

**macOS:**
```bash
npm run tauri build
# Output: src-tauri/target/release/bundle/macos/
```

**Windows:**
```bash
npm run tauri build
# Output: src-tauri/target/release/bundle/msi/
```

**Linux:**
```bash
npm run tauri build
# Output: src-tauri/target/release/bundle/deb/
# oder: src-tauri/target/release/bundle/appimage/
```

**Code Signing:**

macOS:
```bash
# In src-tauri/tauri.conf.json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: YOUR NAME"
    }
  }
}
```

Windows:
```bash
# Certificate erforderlich
signtool sign /f certificate.pfx /p password app.exe
```

**Updater Configuration:**

```json
{
  "tauri": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://releases.zenpost-studio.com/{{target}}/{{current_version}}"
      ],
      "pubkey": "YOUR_PUBLIC_KEY"
    }
  }
}
```

---

## 🛠️ Entwicklung

### Setup

```bash
# Repository clonen
git clone https://github.com/theoriginalbitter/zenpost-studio.git
cd zenpost-studio

# Dependencies installieren
npm install

# Development Server starten
npm run dev

# Tauri Dev (Desktop)
npm run tauri dev
```

### Code Style Guidelines

#### TypeScript

**Naming Conventions:**
- Components: `PascalCase` mit "Zen" Prefix (z.B. `ZenButton`)
- Hooks: `camelCase` mit "use" Prefix (z.B. `useWalkthrough`)
- Types/Interfaces: `PascalCase` (z.B. `WalkthroughStep`)
- Functions: `camelCase` (z.B. `generateContent`)
- Constants: `UPPER_SNAKE_CASE` (z.B. `CONTENT_AI_STUDIO_STEPS`)

**File Structure:**
```typescript
// 1. Imports
import { useState } from 'react';
import type { ComponentProps } from './types';

// 2. Types/Interfaces
interface MyComponentProps {
  // ...
}

// 3. Constants
const DEFAULT_VALUE = 'default';

// 4. Component
export const MyComponent = ({ prop }: MyComponentProps) => {
  // ...
};
```

#### React Best Practices

1. **Functional Components Only**
   ```typescript
   // ✅ Good
   export const MyComponent = () => { ... };

   // ❌ Bad
   export class MyComponent extends React.Component { ... }
   ```

2. **Custom Hooks für Logic**
   ```typescript
   // ✅ Good
   const useWalkthrough = () => {
     const [currentStep, setCurrentStep] = useState(0);
     // ...
     return { currentStep, nextStep, prevStep };
   };
   ```

3. **Props Destructuring**
   ```typescript
   // ✅ Good
   const MyComponent = ({ title, onClose }: Props) => { ... };

   // ❌ Bad
   const MyComponent = (props: Props) => {
     const title = props.title;
     // ...
   };
   ```

#### Styling

**Inline Styles für Tauri-Kompatibilität:**
```typescript
// ✅ Good - Inline Styles
<div style={{
  backgroundColor: '#1A1A1A',
  padding: '20px'
}}>
  {content}
</div>

// ⚠️ OK - Tailwind für einfache Utilities
<div className="flex items-center gap-4">
  {content}
</div>
```

**Zen Color Palette:**
```typescript
const ZEN_COLORS = {
  background: '#1A1A1A',
  backgroundDark: '#0A0A0A',
  border: '#3A3A3A',
  accent: '#AC8E66',
  text: '#e5e5e5',
  textMuted: '#777',
  textDark: '#666',
};
```

#### Component Documentation

Alle öffentlichen Components sollten JSDoc-Kommentare haben:

```typescript
/**
 * WalkthroughOverlay - Haupt-Komponente für interaktive Tutorials
 *
 * Zeigt Step-by-Step Anleitungen mit Animationen, Beschreibungen
 * und interaktiven Controls.
 *
 * @example
 * ```tsx
 * <WalkthroughOverlay
 *   steps={CONTENT_AI_STUDIO_STEPS}
 *   onComplete={() => console.log('Done!')}
 *   autoStart={true}
 * />
 * ```
 *
 * @param steps - Array von WalkthroughStep Objekten
 * @param onComplete - Callback wenn Walkthrough abgeschlossen
 * @param autoStart - Startet automatisch beim Mount
 */
export const WalkthroughOverlay = ({
  steps,
  onComplete,
  autoStart = false,
}: WalkthroughOverlayProps) => {
  // ...
};
```

### Git Workflow

**Branch Naming:**
- Features: `feature/description` (z.B. `feature/walkthrough-system`)
- Fixes: `fix/description` (z.B. `fix/modal-close-bug`)
- Docs: `docs/description` (z.B. `docs/api-documentation`)

**Commit Messages:**
```bash
# Format: type(scope): message

feat(walkthrough): add WalkthroughOverlay component
fix(modal): resolve z-index issue in ZenModal
docs(readme): update installation instructions
refactor(ai-service): improve error handling
style(button): adjust ZenRoughButton hover state
test(converter): add unit tests for markdown cleaning
```

**Pull Request Process:**
1. Branch erstellen
2. Changes committen
3. Push zu GitHub
4. PR erstellen mit Template
5. Code Review anfordern
6. Tests müssen grün sein
7. Merge nach Approval

---

## 🧪 Testing

### Unit Tests

**Beispiel: Component Testing**
```typescript
import { render, screen } from '@testing-library/react';
import { ZenRoughButton } from './ZenRoughButton';

describe('ZenRoughButton', () => {
  it('renders with label', () => {
    render(<ZenRoughButton label="Click me" />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick handler', () => {
    const handleClick = jest.fn();
    render(<ZenRoughButton label="Click" onClick={handleClick} />);
    screen.getByText('Click').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders compact size correctly', () => {
    render(<ZenRoughButton label="" size="compact" />);
    // Assertions...
  });
});
```

### Integration Tests

**Beispiel: Workflow Testing**
```typescript
describe('Content AI Studio Workflow', () => {
  it('completes full transformation workflow', async () => {
    // Step 1: Input
    const { getByText, getByPlaceholderText } = render(<ContentTransformScreen />);
    fireEvent.change(getByPlaceholderText('Enter content...'), {
      target: { value: 'Test content' }
    });

    // Step 2: Platform Selection
    fireEvent.click(getByText('Next'));
    fireEvent.click(getByText('LinkedIn'));

    // Step 3: Generate
    fireEvent.click(getByText('Transform'));
    await waitFor(() => expect(getByText('Transformation complete')).toBeInTheDocument());

    // Step 4: Review
    expect(getByText(/Test content/)).toBeInTheDocument();
  });
});
```

### E2E Tests

Für End-to-End Tests verwenden wir Playwright:

```typescript
import { test, expect } from '@playwright/test';

test('user can transform content', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Select Content AI Studio
  await page.click('text=Content AI Studio');

  // Input content
  await page.fill('textarea', 'My blog post content');

  // Configure transformation
  await page.click('text=Next');
  await page.click('text=LinkedIn');
  await page.click('text=Transform');

  // Verify result
  await expect(page.locator('.result-container')).toBeVisible();
});
```

---

## 🔍 Troubleshooting

### Häufige Probleme

**Problem: "Module not found"**
```bash
# Lösung: Dependencies neu installieren
rm -rf node_modules package-lock.json
npm install
```

**Problem: "Tauri command not found"**
```bash
# Lösung: Tauri CLI installieren
npm install -g @tauri-apps/cli
```

**Problem: "AI API returns 401 Unauthorized"**
```javascript
// Lösung: API Key überprüfen in Settings Modal
// Stelle sicher, dass der Key gültig und nicht abgelaufen ist
```

**Problem: "Rough.js canvas not rendering"**
```typescript
// Lösung: useEffect dependency array überprüfen
useEffect(() => {
  // canvas drawing code
}, [isHovered, variant, size]); // Alle dependencies hinzufügen
```

**Problem: "Modal doesn't close"**
```typescript
// Lösung: onClose handler überprüfen
<ZenModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)} // Muss state updaten
>
```

### Debug-Tipps

**React DevTools verwenden:**
```bash
# Browser Extension installieren
# Components Tab → Props/State inspizieren
# Profiler Tab → Performance analysieren
```

**Console Logging:**
```typescript
// Strukturiertes Logging
console.log('[Component]', { prop1, prop2, state });

// Error Handling
try {
  // risky code
} catch (error) {
  console.error('[Feature] Error:', error);
}
```

**Network Debugging:**
```javascript
// AI Service Requests loggen
fetch(url, options)
  .then(response => {
    console.log('[AI Service] Response:', response.status);
    return response.json();
  })
  .catch(error => {
    console.error('[AI Service] Error:', error);
  });
```

---

## 📚 Weitere Ressourcen

### Dokumentation Links

- [README.md](../README.md) - Projekt-Übersicht
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment Guide
- [DATA_ROOM.md](./DATA_ROOM.md) - Data Room Features
- [SOCIAL_MEDIA_API_INTEGRATION.md](./SOCIAL_MEDIA_API_INTEGRATION.md) - API Integration
- [EXIT_STRATEGY.md](./EXIT_STRATEGY.md) - Business Strategy

### Community

- **GitHub Repository:** [github.com/theoriginalbitter/zenpost-studio](https://github.com/theoriginalbitter/zenpost-studio)
- **Issues:** [GitHub Issues](https://github.com/theoriginalbitter/zenpost-studio/issues)
- **Discussions:** [GitHub Discussions](https://github.com/theoriginalbitter/zenpost-studio/discussions)
- **Wiki:** [Documentation Wiki](https://theoriginalbitter.github.io/zenpost-studio/)

### Support

- **E-Mail:** saghallo@denisbitter.de
- **GitHub Issues:** Bug Reports & Feature Requests
- **Documentation:** Ausführliche Guides im docs-Ordner

---

**Made with ❤️ by Denis Bitter**

*Last Updated: Dezember 2024*
