# ZenPost Studio - Release Update

**Datum:** 2026-02-16  
**Typ:** Workflow + Content AI Improvements

## Highlights

- Multi-Plattform-Transformation unterstützt jetzt plattformbezogene Stilprofile (statt nur globale Einstellungen).
- Step 3 bietet zwei Modi: `Pro Plattform` und `Für alle gleich`.
- Build-Workflow wurde für verlässlichere, frische Tauri-Bundles verbessert.

## Changed

### Content AI Studio - Plattformspezifische Profile

- Für alle Zielplattformen wurden sinnvolle Standard-Profile eingeführt:
  - `tone`
  - `length`
  - `audience`
- In Multi-Platform-Mode kann pro Plattform ein eigenes Profil bearbeitet werden.
- Zusätzlich kann das aktuell aktive Profil mit einem Klick auf alle gewählten Plattformen angewendet werden.
- Beim Transformieren wird je Plattform die effektive Konfiguration verwendet.

### Step 3 UX Verbesserungen

- Neuer Modus-Switch in den KI-Einstellungen:
  - `Pro Plattform`
  - `Für alle gleich`
- Neue Plattform-Auswahl im Modus `Pro Plattform`, um gezielt z. B. `dev.to` und `Medium` unterschiedlich zu konfigurieren.

## Build & Release Improvements

- Neues Script in `package.json`:
  - `build:clean` = vollständiger Clean-Build (`dist` + `src-tauri/target` löschen, danach Tauri-Build)
- `scripts/build-all.sh` startet jetzt ebenfalls mit einem Full-Clean:
  - verhindert alte Build-Artefakte im Release-Prozess

## Why this matters

- Höhere Content-Qualität pro Plattform durch klare Tonalitäts-Trennung.
- Besserer Multi-Platform-Flow für "1x schreiben, mehrfach plattformgerecht transformieren".
- Verlässlichere Release-Builds ohne alte Cache-/Artefakt-Effekte.

## Betroffene Dateien

- `src/screens/ContentTransformScreen.tsx`
- `src/screens/transform-steps/Step3StyleOptions.tsx`
- `scripts/build-all.sh`
- `package.json`
