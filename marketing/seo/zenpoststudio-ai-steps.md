# ZenPost Studio AI: Step 1 bis 4 (Technische Doku)

## Scope

Diese Doku beschreibt den Content-AI-Flow in `ContentTransformScreen` mit Fokus auf Step 1 bis Step 4, inklusive Datenfluss, State-Wechsel und zentralen Callbacks.

- Orchestrator: `src/screens/ContentTransformScreen.tsx`
- Step 1: `src/screens/transform-steps/Step1SourceInput.tsx`
- Step 2: `src/screens/transform-steps/Step2PlatformSelection.tsx`
- Step 3: `src/screens/transform-steps/Step3StyleOptions.tsx`
- Step 4: `src/screens/transform-steps/Step4TransformResult.tsx`

## High-Level Ablauf

1. Step 1 sammelt/editiert Source-Content + Meta.
2. Step 2 bestimmt Zielplattform(en).
3. Step 3 definiert AI-Parameter und startet Transformation.
4. Step 4 zeigt Ergebnis, erlaubt Nachbearbeitung, Export, Posting und Rueckfluss in Step 1.

## Step 1: Source Input

### Verantwortung

- Content-Eingabe (Block/Markdown)
- Datei-/Artikel-/Draft-Tabs
- Vergleichsbasis (saved base oder anderer Tab)
- Autosave/Restore
- Meta-Daten inkl. Bildfelder
- Vorschau- und Save-Aktionen

### Wichtige Inputs

- `sourceContent`, `fileName`, `postMeta`
- `docTabs`, `activeDocTabId`, `dirtyDocTabs`
- `comparisonBase*`, `autosave*`

### Wichtige Outputs/Callbacks

- `onSourceContentChange`
- `onPreview` (springt nach Step 4 Preview)
- `onSaveToProject`, `onSaveAsToProject`, `onSaveToServer`
- `onMetaChange`
- `onNext`

### Gate

- `handleNextFromStep1()` blockiert ohne Inhalt (`sourceContent.trim()`)

## Step 2: Platform Selection

### Verantwortung

- Auswahl der Zielplattform(en)
- Single-Select: Klick waehlt Plattform und geht direkt weiter
- Multi-Select: Klick toggelt Plattformen, Weiter ueber Next

### Wichtige Inputs

- `selectedPlatform`
- `multiSelectMode`, `selectedPlatforms`

### Wichtige Outputs/Callbacks

- `onPlatformChange`
- `onSelectedPlatformsChange`
- `onNext`, `onBack`

### Gate

- `step2CanProceed = selected count > 0`
- `handleNextFromStep2()` nur wenn Auswahl vorhanden

## Step 3: Style Options

### Verantwortung

- AI-Transformationsparameter setzen:
  - Tone
  - Length
  - Audience
  - Target Language
- Optional pro Plattform eigene Style-Overrides
- Transform starten oder Quick Actions ausfuehren

### Wichtige Inputs

- `tone`, `length`, `audience`, `targetLanguage`
- `styleMode` (`global`/`platform`)
- `activeStylePlatform` (bei Multi-Platform)

### Wichtige Outputs/Callbacks

- `onToneChange`, `onLengthChange`, `onAudienceChange`, `onTargetLanguageChange`
- `onTransform`
- `onQuickAction` (`improve`, `continue`, `summarize`, `markdown`)
- `onBackToEditor`

## Step 4: Transform Result

### Verantwortung

- Ergebnisdarstellung + Editor im Result-Context
- Vergleich Original vs Ergebnis
- Header-Actions (copy, download, edit, post...)
- Multi-Platform Result-Tabs
- Posting-/Planner-/Posten-Flow
- Rueckfuehrung von Ergebnissen nach Step 1 (Version-Tabs)

### Wichtige Inputs

- `transformedContent`
- `platform`
- `multiPlatformMode`, `transformedContents`, `activeResultTab`
- `originalContent`, `originalLabel`
- `postMeta`

### Wichtige Outputs/Callbacks

- `onContentChange` (aendert transformed content + source meta)
- `onBack` (zurueck in Step 1 mit Result-Tab-Upsert)
- `onOpenPlatformSelection`
- `onGoToTransform`
- `onMetaChange`

## Datenfluss und State-Owner

- Primarer State-Owner ist `ContentTransformScreen`.
- Step-Komponenten sind weitgehend controlled components.
- `openDocTabs` + `docTabContents` bilden die zentrale Dokumentebene.
- Step-4-Ergebnisse koennen als `derived` Tabs in Step 1 zurueckgespielt werden.
- Vergleichsbasen werden pro Tab gehalten (`step1ComparisonBaseByTab`).

## Multi-Platform Modus

- Plattformauswahl in Step 2 als Array.
- Style in Step 3 optional global oder pro Plattform.
- Ergebnisse in Step 4 pro Plattform-Tab (`transformedContents`).
- Bei `onBack` werden Resultate in editierbare `derived` Tabs ueberfuehrt.

## Header-Actions (relevant)

- Step 1: Save/Preview-Workflows
- Step 2: Selection-gesteuertes Weiter
- Step 3: Transform/QuickAction
- Step 4: `copy`, `download`, `edit`, `post`, `post_all`, `reset`, `back_*`

## Integrationen

- AI-Transformation: `services/aiService`
- Posting: `services/socialMediaService`
- Bilder/Cloud: `services/cloudStorageService`, `ZenImageGalleryModal`
- Text-/Bild-Engine: `services/zenEngineService`
- Vergleich: `services/documentComparisonService`
- Autosave: `services/editorSettingsService`

## Kurzfazit

Der Step-Flow ist technisch konsistent aufgebaut: Step 1 als Content-Quelle, Step 2 als Kanalrouting, Step 3 als Transformationssteuerung und Step 4 als Ergebnis-/Publish-Hub mit Rueckkanal in die Editor-Ebene.
