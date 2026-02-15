# FAQ

## Laeuft ZenPost auch offline?

Ja, wenn du lokale KI (Ollama) verwendest. Alle Transformationen laufen dann auf deinem Rechner. Cloud-Provider benoetigen eine Internetverbindung.

## Wo werden Daten gespeichert?

- **Desktop**: Im Projektordner (falls konfiguriert) oder im App-Verzeichnis
- **Web**: Im localStorage des Browsers
- **AI-Config**: Immer in localStorage (`zenpost_ai_config`)
- **Social-Media-Keys**: In localStorage — werden nie an ZenPost-Server gesendet

## Welche Plattformen werden unterstuetzt?

9 Plattformen fuer Content-Transformation: LinkedIn, Twitter/X, Medium, Reddit, dev.to, GitHub Discussion, GitHub Blog, YouTube und Blog Post.

6 Plattformen fuer direktes Posting (mit API-Key): Twitter/X, Reddit, LinkedIn, dev.to, Medium, GitHub.

## Kann ich mehrere Plattformen gleichzeitig transformieren?

Ja. Im Multi-Plattform-Modus waehlst du in Schritt 2 mehrere Plattformen aus. Alle Transformationen laufen parallel und das Ergebnis zeigt einen Tab pro Plattform.

## In welchen Sprachen kann transformiert werden?

10 Zielsprachen: Deutsch, Englisch, Spanisch, Franzoesisch, Italienisch, Portugiesisch, Chinesisch, Japanisch, Koreanisch, Russisch. Der Quelltext kann in jeder Sprache sein.

## Was macht der Auto-Modus bei der KI?

Er analysiert deinen Input (Laenge, Komplexitaet, Fachsprache) und waehlt automatisch das beste verfuegbare Modell. Voraussetzung: Mindestens ein Provider mit gueltigem API-Key.

## Kann ich eigene KI-Modelle nutzen?

Ja, auf zwei Wegen:

- **Ollama**: Jedes Ollama-kompatible Modell (`ollama pull <modellname>`)
- **Custom API**: Eigener Endpoint mit OpenAI-kompatiblem Format

## Welche Dateiformate kann ich konvertieren?

**Import**: Markdown, GFM, HTML, Text, JSON, Editor.js, DOCX, DOC, Pages, Code (20+ Programmiersprachen)

**Export**: Markdown, GFM, HTML, JSON, Text, PDF, Editor.js, README (aus Code)

## Was ist der Content Planner?

Ein Planungstool fuer Social-Media-Inhalte mit Kalenderansicht, Zeitplanung, Checklisten und Export (Markdown/CSV/PDF). Erreichbar ueber das Planner-Icon im Hauptmenue.

## Was ist der Unterschied zwischen Desktop und Web?

| Feature | Desktop | Web |
| --- | --- | --- |
| Lokale KI (Ollama) | Ja | Nein |
| Datei-Export | Nativer Dialog | Browser-Download |
| Projektordner | Ja | Nein |
| Auto-Save | In Projektordner | localStorage |
| Social-Media Posting | Ja | Ja |

## Warum sieht das Ergebnis jedes Mal anders aus?

KI-Modelle sind nicht deterministisch. Bei gleicher Eingabe koennen leicht unterschiedliche Ergebnisse entstehen. Fuer konsistentere Ergebnisse: Temperature auf 0.0-0.2 setzen (Einstellungen → AI → Stil).

## Wie aendere ich den Stil der Transformation?

In Schritt 3 der Transformation:

- **Tonalitaet**: Professional, Casual, Technical, Enthusiastic
- **Laenge**: Short (1-2 Absaetze), Medium (3-5), Long (Artikel)
- **Zielgruppe**: Anfaenger, Intermediate, Experten
- **Temperature**: Im Einstellungen-Modal (0.0 = praezise, 1.0 = kreativ)
