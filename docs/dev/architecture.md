# Architektur

Diese Seite beschreibt die wichtigsten Bausteine, wie sie in der App umgesetzt sind.

## Oberflaeche

- React als UI-Schicht
- PatternKit als Komponentenbibliothek
- DesignKit fuer Branding und visuelle Elemente

## App-Runtime

- Desktop: Tauri
- Web: Browser-Version

## Services

- AI Service fuer Provider-Logik
- Storage ueber LocalStorage
- File-Handling im Converter und Export

## Datenfluss

1. Input entsteht im Editor oder per Import
2. Service verarbeitet und ruft KI an
3. Ergebnis landet im UI
4. Export oder Publishing
