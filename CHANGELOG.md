# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),  
and this project adheres to a calm, intentional release philosophy.

---

## [1.0.10] – 2026-09-16

### Fixed

#### Content Planner
- Kalender-Edits (Datum/Uhrzeit, Drag & Drop, Löschen) konnten durch einen verzögerten Cloud-Poll-Snapshot wieder rückgängig gemacht werden, wenn `reloadScheduledPosts` (z.B. beim Öffnen des Planers oder nach Login/Fokus-Wechsel) den bestehenden Schutz gegen laufende Saves umging.
- Gelöschte Posts konnten durch einen veralteten Cloud-Snapshot wieder im Kalender auftauchen (neues Tombstone-Set als Schutz).
- Ein zweiter, unabhängiger Cloud-Sync-Pfad in `usePlannerStorage` hatte dieselbe Race Condition wie oben beschrieben noch einmal – jetzt mit eigenem In-Flight-Schutz abgesichert.
- `getTodayDate()` nutzte UTC statt lokaler Zeit, was je nach Zeitzone zu einem falschen "heute"-Datum im Kalender führen konnte.
- Fehlgeschlagene Cloud-Saves im Planer werden jetzt sichtbar gemacht (Warnhinweis im Kalender-Header) statt nur im Log zu verschwinden.

#### Zen Note Studio
- Tags/Farben konnten durch einen Cloud-Poll überschrieben werden, während eine lokale Änderung noch gespeichert wurde.
- Gelöschte Notizen konnten durch einen verzögerten Reload wieder in der Liste auftauchen.
- Ein fehlgeschlagenes Löschen einer Notiz ließ den Lösch-Button dauerhaft im Lade-Zustand hängen.

#### Publishing Engine
- Ein Fehler beim Veröffentlichen eines geplanten Posts (z.B. Netzwerkfehler) wurde nicht abgefangen und blieb dem Nutzer als unbehandelter Fehler verborgen, statt als fehlgeschlagener Post markiert zu werden.

## [Unreleased]

### Changed

#### Content AI Studio
- Multi-Plattform-Transformation nutzt jetzt plattformbezogene Stilprofile statt nur globaler Einstellungen.
- Step 3 bietet zwei Modi:
  - `Pro Plattform`
  - `Für alle gleich`
- Für Multi-Select kann pro Plattform ein eigenes Profil (Tonalität, Länge, Zielgruppe) gepflegt werden.
- Das aktive Plattform-Profil kann auf alle gewählten Plattformen übernommen werden.
- Beim Transformieren wird je Plattform die effektive Konfiguration angewendet.
- Planner-Flow verbessert:
  - Editor-Entwurf kann direkt im Planner übernommen werden (nicht-blockierend).
  - Plattform-Auswahl beim Übernehmen aus dem Editor ergänzt (kein harter LinkedIn-Fallback).
  - Dedupe-Logik beim Öffnen geplanter Dateien verbessert (kein doppelter Tab bei gleicher Datei).

#### UI Components
- `ZenDropdown` API erweitert:
  - Neue Varianten: `default`, `input`, `button`.
  - Legacy-Variante `compact` bleibt als Alias zu `input` kompatibel.
  - `button`-Variante ist auf visuelle Alignment-Nähe zu `ZenRoughButton` optimiert.
  - Optionales `triggerHeight` bleibt für lokale Feinanpassungen verfügbar.

#### Build Workflow
- Neuer Befehl `npm run build:clean` für vollständigen Clean-Build (`dist` + `src-tauri/target` + Tauri Build).
- `scripts/build-all.sh` startet jetzt mit Full-Clean, um alte Build-Artefakte im Release-Prozess zu vermeiden.

## [ZenPost] – Initial Public Release

**Release Date:** 2026-02-01  
🔗 https://github.com/THEORIGINALBITTER/zenpost-studio/releases/tag/ZenPost

### Added

#### ZenPost Editor
- Local markdown editor with focused writing experience
- Clean export to `.md` and `.txt`
- Preview and formatting normalization

#### Converter Studio
- Markdown parsing and cleanup
- Editor.js JSON → Markdown conversion
- Smart character and formatting cleanup
- Export to Markdown, HTML, and Plain Text

#### Content AI Studio
- AI-based content transformation for:
  - LinkedIn
  - dev.to
  - Twitter / X
  - Medium
  - Reddit
  - GitHub Discussions
  - YouTube descriptions
- Control over tone, length, and audience
- Platform-specific formatting logic
- Optional direct publishing via API

#### Doc Studio
- Structured documentation workspace
- Generation of:
  - README.md
  - CHANGELOG.md
  - API documentation
  - CONTRIBUTING.md
  - Blog and article drafts
- Data Room structure for long-term project clarity
- Automatic project analysis:
  - Folder & structure detection
  - Language & dependency detection
  - Test and API discovery
- Metadata-driven documentation output

#### AI Integration
- Support for multiple providers:
  - OpenAI
  - Anthropic
  - Ollama (local-first)
  - Custom API endpoints
- Unified provider abstraction layer

#### Design & UX
- Zen-inspired dark interface
- Hand-drawn accents via rough.js
- Calm motion and restrained animations
- Monospace-focused typography
- Custom Zen UI components (Modal, Dropdown, Buttons)

#### Platform Support
- Web application (browser-based)
- Desktop application via Tauri:
  - Windows
  - macOS
  - Linux
- Native file system access
- Offline-capable workflows

---

### Notes

This release establishes the **stable public foundation** of ZenPost Studio.

Future releases will focus on:
- Workflow refinement
- Doc Studio depth
- Export stability
- Long-term maintainability

ZenPost Studio is intentionally not feature-driven,  
but clarity-driven.

---
