# Dateien konvertieren

Der File Converter wandelt Inhalte zwischen verschiedenen Formaten um, bereinigt die Struktur und kann mit KI aus Code automatisch Dokumentation generieren.

## Unterstuetzte Formate

### Input-Formate

| Format | Dateitypen | Hinweis |
| --- | --- | --- |
| Markdown | .md, .markdown | Standard-Markdown |
| GFM | .md | GitHub Flavored Markdown (Task-Listen, erweiterte Features) |
| HTML | .html, .htm | HTML-Dokumente |
| Text | .txt, .text | Klartext |
| JSON | .json | Strukturierte Daten mit Titel, Inhalt, Metadaten |
| Editor.js | .json | Editor.js JSON-Format |
| DOCX | .docx | Microsoft Word (via Mammoth) |
| DOC | .doc | Word Legacy-Format |
| Pages | .pages | Apple Pages (ZIP-basiert mit HTML-Extraktion) |
| Code (AI) | .js, .ts, .py, .rs, .go, .java, .c, .cpp, .php, .rb, .swift u.v.m. | KI-gestuetzte Code-Analyse und README-Generierung |

### Output-Formate

| Format | Beschreibung |
| --- | --- |
| Markdown (MD) | Standard-Markdown |
| GFM | GitHub Flavored Markdown mit Task-Listen |
| HTML | Vollstaendiges HTML-Dokument mit CSS |
| JSON | Strukturierte Daten mit YAML-Frontmatter als Metadaten |
| Text (TXT) | Klartext ohne Formatierung |
| PDF | Ueber Druck-Dialog (HTML → PDF) |
| Editor.js | JSON-Format fuer Editor.js |
| README | KI-generierte Dokumentation aus Code |

## Ablauf (4 Schritte)

### Schritt 1: Format waehlen

- **Quellformat** auswaehlen (wird bei Datei-Upload automatisch erkannt)
- **Zielformat** auswaehlen

### Schritt 2: Inhalt eingeben

- Text manuell eingeben oder einfuegen
- Datei per Drag-and-Drop hochladen
- Format wird automatisch anhand der Dateiendung erkannt

### Schritt 3: Konvertieren

- Konvertierung starten
- Fortschritt wird angezeigt
- Bei Fehlern erscheint eine Meldung

### Schritt 4: Ergebnis

- Konvertierter Inhalt wird angezeigt
- **Download** — Als Datei speichern
- **In Content Studio oeffnen** — Weiterarbeiten im Editor (Web)
- **Neu starten** — Zurueck zum Anfang

## Code (AI) Modus

Besonders nuetzlich: Code-Dateien koennen per KI analysiert und als README-Dokumentation ausgegeben werden.

1. Quellformat: **Code (AI)**
2. Code-Datei hochladen oder einfuegen
3. Die KI analysiert Struktur, Funktionen und Abhaengigkeiten
4. Ergebnis: Strukturierte README mit Beschreibung, Usage und API-Referenz

Unterstuetzt: JavaScript, TypeScript, Python, Rust, Go, Java, C/C++, C#, PHP, Ruby, Swift, Kotlin, Scala

## Verarbeitungsdetails

- **HTML-Sanitisierung**: Schutz vor schaedlichem Code (via DOMPurify)
- **Markdown-Normalisierung**: Task-Listen, URL-Autolinks, Code-Block-Sprachen
- **Dokumentstruktur**: YAML-Frontmatter wird extrahiert/erstellt, H1-Titel erkannt
- **Format-Bruecken**: DOCX/Pages → HTML → Markdown → Zielformat
- **Sonderzeichen**: Werden bereinigt, Ueberschriften bleiben erhalten
