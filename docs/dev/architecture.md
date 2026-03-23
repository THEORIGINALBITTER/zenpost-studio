# Architektur

ZenPost Studio ist eine hybride Desktop + Web App, gebaut mit Tauri (Rust) als Shell und React als UI-Schicht.

## Stack-Uebersicht

```
┌─────────────────────────────────────────────┐
│              React Frontend                  │
│  PatternKit · DesignKit · Tailwind CSS       │
├──────────────────────┬──────────────────────┤
│   Tauri (Desktop)    │   Browser (Web)       │
│   Rust + C++ (IPC)   │   localStorage / OPFS │
├──────────────────────┴──────────────────────┤
│              Services (TypeScript)           │
│  AI · Storage · Publishing · ZenEngine       │
└─────────────────────────────────────────────┘
```

---

## Frontend

**React 18** als UI-Schicht. Kein globales State-Management-Framework — State wird per Props und lokalen `useState`/`useReducer`-Hooks verwaltet. Schwere Komponenten nutzen `useMemo` und `useCallback` zur Rendering-Optimierung.

**PatternKit** ist das interne Komponentensystem (`src/kits/PatternKit/`):
- `ZenModal`, `ZenDropdown`, `ZenSlider`, `ZenMarkdownEditor`, `ZenBlockEditor`
- `ZenMarkdownPreview` — rendert Markdown mit Blob-URL-Cache fuer Bilder
- `ZenModalSystem` — Modalverwaltung mit dedizierten Inhalten pro Modal

**DesignKit** (`src/kits/DesignKit/`) liefert Tokens, Farben, Typografie.

**Tailwind CSS** fuer Utility-Klassen, ergaenzt durch inline-Styles fuer dynamische Werte.

---

## Desktop-Runtime (Tauri)

**Tauri v2** als native Shell. Rust-Backend stellt System-APIs bereit:

| Plugin | Funktion |
|--------|----------|
| `plugin-fs` | Dateisystem-Zugriff (lesen, schreiben, mkdir) |
| `plugin-dialog` | Datei- und Ordner-Dialoge |
| `plugin-opener` | URLs im System-Browser oeffnen |
| `plugin-shell` | Shell-Kommandos ausfuehren |
| `plugin-http` | HTTP-Requests aus Rust (CORS-frei) |

**C++-Integration (ZenEngine):**

ZenEngine ist als natives Binary implementiert und wird ueber Tauri-IPC aufgerufen. Kommunikation via `invoke()` vom Frontend.

---

## Services (TypeScript)

Alle Business-Logik liegt in `src/services/`:

| Service | Datei | Zweck |
|---------|-------|-------|
| AI Service | `aiService.ts` | Provider-Abstraktion (Ollama, OpenAI, Anthropic, Custom) |
| Editor Settings | `editorSettingsService.ts` | Einstellungen + Autosave-Verwaltung |
| Social Media | `socialMediaService.ts` | API-Keys + direktes Posting |
| PHP Blog | `phpBlogService.ts` | Blog-Upload + Manifest-Verwaltung |
| Mobile Inbox | `mobileInboxService.ts` | Entwurfs-Import vom iPhone |
| ZenStudio Settings | `zenStudioSettingsService.ts` | App-weite Einstellungen + ZenGedanken |
| App Config | `appConfigService.ts` | Projektpfade, Datenverzeichnisse |
| Web Project | `webProjectService.ts` | Browser-Modus: FileSystemDirectoryHandle + IndexedDB |

---

## Datenspeicherung

| Daten | Desktop | Web |
|-------|---------|-----|
| Editor-Settings | JSON-Datei im Projektordner | localStorage |
| AI-Config | localStorage | localStorage |
| Social-Keys | localStorage | localStorage |
| Autosave-Versionen | `.md`-Dateien im `.zenpost/editor/autosaves/` | localStorage |
| Artikel (Content AI) | JSON + Markdown im Projektordner | localStorage / OPFS |
| Planner-Daten | JSON im Publishing-Verzeichnis | localStorage |
| ZenEngine-Lerndata | Lokale Binary-Daten | — |

---

## Screens & Navigation

Die App hat keine Router-Library — Navigation erfolgt ueber `activeScreen`-State in `App1.tsx`:

| Screen | Komponente |
|--------|-----------|
| Getting Started | `GettingStartedScreen` |
| Content AI Studio | `ContentTransformScreen` |
| Doc Studio | `DocStudioScreen` |
| Converter | `FileConverterScreen` |
| Content Studio Dashboard | `ContentStudioDashboardScreen` |

---

## Build

| Ziel | Kommando |
|------|---------|
| Web-Dev | `npm run dev` |
| Desktop-Dev | `npm run tauri dev` |
| Web-Build | `npm run build` |
| Desktop-Build | `npm run tauri build` |

Plattform-Artefakte: `.dmg` (macOS), `.AppImage` (Linux), `.msi` (Windows)

CI/CD: GitHub Actions (`tauri-build.yml`) — baut alle 3 Plattformen parallel bei jedem Push auf `main`.
