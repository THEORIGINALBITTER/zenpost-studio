# Doc Studio

Doc Studio generiert technische Dokumentation aus Projektdaten. Ziel ist es, aus einem bestehenden Projekt-Verzeichnis strukturierte, KI-generierte Markdown-Dokumente zu erstellen — und sie direkt im integrierten Editor zu bearbeiten.

## Wann Doc Studio nutzen?

- Du brauchst ein README fuer ein neues oder bestehendes Projekt
- Ein CHANGELOG soll aus Commit-Daten oder manuellen Eintraegen aufgebaut werden
- API-Dokumentation oder ein Contributing Guide fehlen
- Du willst technische Unterlagen (Data Room, Bug Report) als strukturiertes Markdown

## Ablauf in 4 Schritten

### 1. Projekt auswaehlen

Waehle ein lokales Verzeichnis als Projektbasis. Doc Studio liest daraus Metadaten wie Name, Beschreibung und vorhandene Dateien.

### 2. Projekt scannen

Der Scanner analysiert die Projektstruktur: Dateitypen, vorhandene README oder CHANGELOG, Code-Dateien. Die Ergebnisse fliessen automatisch in die KI-Generierung ein.

### 3. Template und Datenfelder

Waehle ein Template:

| Template | Inhalt |
| --- | --- |
| README | Projektbeschreibung, Setup, Usage, Features |
| CHANGELOG | Versionshistorie, Breaking Changes |
| API Dokumentation | Endpunkte, Parameter, Beispiele |
| Contributing Guide | Beitragsregeln, Branching, PR-Prozess |
| Data Room | Investoren-Unterlagen, Kennzahlen |
| Bug Report | Fehlerbeschreibung, Schritte, Umgebung |
| Entwurf | Freies Dokument ohne Template-Vorgabe |

Fuelle die Datenfelder aus (Produktname, Kurzbeschreibung, Setup-Schritte, Usage-Beispiele). Je mehr Felder ausgefuellt sind, desto praeziser ist das KI-Ergebnis.

### 4. Generieren, bearbeiten, exportieren

Nach der KI-Generierung oeffnet sich der Inline-Editor mit:

- **Markdown-Editor** — direkt bearbeiten
- **Preview** — gerendertes Ergebnis mit Seitenraendern und Thema
- **Vergleichsansicht** — Vorher/Nachher nach jeder KI-Runde
- **Export** — als Datei speichern oder in das Projektverzeichnis schreiben

## KI-Optionen

Im Editor kann die KI erneut aufgerufen werden, um das Dokument zu verfeinern:

- **Ton**: Professional, Casual, Technical, Enthusiastic
- **Laenge**: Kurz, Mittel, Lang
- **Zielgruppe**: Anfaenger, Intermediate, Experten
- **Sprache**: Deutsch, Englisch und 8 weitere

## YAML-Frontmatter

Jedes generierte Dokument erhaelt automatisch YAML-Frontmatter mit Metadaten:

```yaml
---
title: "README – mein-projekt"
date: "2026-02-28"
author: "Denis Bitter"
version: "1.0.4"
---
```

Der Titel setzt sich aus dem Template-Namen und dem Projektnamen zusammen.

## Tipps

- Fuelle mindestens Produktname, Kurzbeschreibung, Setup und Usage aus — das sind die vier Kernfelder fuer praezise Ergebnisse
- Nutze den Scan-Schritt: je mehr das Projekt an Dateien enthaelt, desto besser versteht die KI den Kontext
- Die Vergleichsansicht hilft dabei, KI-Runden sinnvoll einzusetzen — nur uebernehmen, was besser ist
- Speichere regelmaessig: Doc Studio schreibt direkt ins Projektverzeichnis zurueck
