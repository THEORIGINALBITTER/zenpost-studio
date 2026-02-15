# Planner & Export

Der Content Planner verwaltet Posts ueber mehrere Plattformen, terminiert Veroeffentlichungen und trackt den Publishing-Workflow mit Checklisten.

## Planner-Tabs

### Planen

Verwaltet alle Posts mit Zeitplanung.

- Liste aller Posts (aus Editor, manuell erstellt oder terminiert)
- Datum und Uhrzeit pro Post setzen
- Status: Entwurf oder Geplant
- Posts bearbeiten oder loeschen
- Zeitplan speichern

### Kalender

Visuelle Kalenderansicht aller geplanten Posts.

- Monatsansicht mit Tagesnavigation
- Posts farblich nach Plattform gekennzeichnet
- Tagesdetailansicht fuer ausgewaehlten Tag
- Filterung nach Status (geplant / Entwurf)
- ICS-Export fuer Outlook, Google Calendar etc.

**Plattform-Farben:** LinkedIn, Twitter/X, Reddit, dev.to, Medium, Hashnode, GitHub — jede Plattform hat eine eigene Farbe im Kalender.

### Checkliste

Trackt Aufgaben vor der Veroeffentlichung.

- Vordefinierte Checklist-Templates pro Plattform
- Aufgaben: Content erstellt, Hashtags recherchiert, Bilder vorbereitet, Posting-Zeit festgelegt, Cross-Posting geplant, Analytics-Ziele gesetzt
- Aufgaben abhaken, hinzufuegen, bearbeiten, loeschen
- Fortschritt pro Post sichtbar
- Globale Aufgaben (nicht an Post gebunden)

## Export

Der Planner kann alle Daten in drei Formaten exportieren:

### Markdown

- Strukturiertes Markdown mit Abschnitten pro Plattform
- Post-Metadaten (Status, Datum, Uhrzeit, Zeichen-/Wortzahl)
- Checklisten-Zusammenfassung

### CSV

- Flaches Tabellenformat fuer Spreadsheet-Import
- Spalten: Post-ID, Plattform, Titel, Inhalt, Datum, Uhrzeit, Status, Zeichenzahl, Wortzahl, Quelle, Checklisten-Details
- Eine Zeile pro Post

### PDF

- Formatiertes PDF mit Seitenumbruechen
- Post-Zusammenfassungen mit Checklisten-Status
- Eingebettete Schriftarten und Paginierung

## Export-Ablauf

1. Im Planner den **Export**-Button klicken
2. Format waehlen: Markdown, CSV oder PDF
3. **Desktop**: Speicherort im Dialog waehlen
4. **Web**: Datei wird als Browser-Download bereitgestellt

## Datenquellen

Posts im Planner koennen aus verschiedenen Quellen stammen:

- **Aus dem Editor**: Transformierte Inhalte mit Plattform, Titel und Wortzahl
- **Manuell erstellt**: Direkt im Planner angelegte Posts
- **Terminierte Posts**: Zuvor geplante und gespeicherte Beitraege

## Datenspeicherung

- **Desktop (Tauri)**: `planner_posts.json` im Publishing-Verzeichnis, einzelne Posts als `.md`-Dateien mit Frontmatter
- **Web**: localStorage als Fallback
