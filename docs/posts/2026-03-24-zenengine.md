---
title: "ZenEngine"
date: "2026-03-24"
tags: [devlog]
readingTime: 2
---

# ZenEngine

ZenEngine ist die lokale Lern-Engine von ZenPost Studio. Sie lernt aus deinem Feedback und verbessert KI-Ergebnisse ueber Zeit — ohne Cloud, ohne Datenweitergabe.

## Was macht ZenEngine?

ZenEngine analysiert transformierte Inhalte und gibt Echtzeit-Vorschlaege direkt im Editor. Sie lernt aus deinen Reaktionen auf diese Vorschlaege und passt sich deinem Schreibstil an.

**Phase 1 (aktiv): Regel-Engine**
- Pure C++ Substring-Matching
- Laeuft lokal, ohne GPU
- Erkennt Formulierungen, die du haeufig aenderst oder behaelst
- Schlaegt Alternativen vor, die du in der Vergangenheit bestaetigt hast

**Phase 2 (geplant): Lokales Sprachmodell**
- Kleine LLMs (z.B. phi-3-mini via Ollama)
- Nur auf Apple Silicon aktiviert (arm-Architektur)
- Auf Intel mit Hinweis deaktiviert (zu langsam fuer Inline-Suggestions)

---

## Vorschlaege im Editor

ZenEngine zeigt Vorschlaege direkt im Schreibfluss an. Du entscheidest per Tastendruck:

| Aktion | Tastenkuerzel | Wirkung |
|--------|:---:|---|
| Vorschlag annehmen | `Tab` | Text wird uebernommen, Engine lernt positiv |
| Vorschlag ablehnen | `Esc` | Vorschlag verschwindet, Engine lernt negativ |
| Vorschlag ignorieren | Weiterschreiben | Kein Feedback, kein Lernen |

---

## Lernhistorie

ZenEngine speichert dein Feedback lokal. Du kannst den aktuellen Lernstand jederzeit einsehen:

**Oeffnen:** Einstellungen → ZenEngine → "Lernstatus anzeigen"

**Anzeige:**
- Anzahl positiver Rueckmeldungen (✓ angenommene Vorschlaege)
- Anzahl negativer Rueckmeldungen (× abgelehnte Vorschlaege)
- Stumm geschaltete Vorschlaege (– ignorierte Muster)

**Lernhistorie zuruecksetzen:**

Einstellungen → ZenEngine → "Lernhistorie zuruecksetzen"

Achtung: Alle stumm geschalteten Vorschlaege werden wieder aktiv. Diese Aktion kann nicht rueckgaengig gemacht werden.

---

## ZenEngine-Einstellungen

| Einstellung | Beschreibung |
|-------------|---|
| Engine aktiv | ZenEngine global ein- oder ausschalten |
| Vorschlaege im Editor | Inline-Vorschlaege waehrend des Schreibens |
| Lernmodus | Engine lernt aus Feedback (an/aus) |
| Schwellwert | Wie oft ein Muster bestaetigt werden muss, bevor es vorgeschlagen wird |

---

## Datenschutz

- Alle Lerndata bleiben auf deinem Geraet
- Kein Upload, keine Telemetrie
- Zuruecksetzen loescht alle lokalen Lerndaten vollstaendig

---

## Technischer Hintergrund

ZenEngine Phase 1 ist in C++ implementiert und wird ueber Tauri als native Binary eingebunden. Die Engine laeuft auf allen Plattformen (macOS, Windows, Linux) identisch schnell, da kein GPU-Zugriff benoetigt wird.

Die Kommunikation zwischen React-Frontend und C++-Engine erfolgt ueber Tauri-Commands (IPC). Latenz ist vernachlaessigbar (&lt;1ms fuer Regel-Matching).
