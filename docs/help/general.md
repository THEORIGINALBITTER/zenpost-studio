# Allgemeine Probleme

## App startet nicht

**Symptom:** App bleibt beim Start haengen oder Fenster bleibt leer.

**Loesungen:**

1. App komplett beenden und neu starten
2. System neu starten
3. Cache leeren: App-Daten im Systemverzeichnis loeschen
4. Falls wiederholt: Neuinstallation von [GitHub Releases](https://github.com/theoriginalbitter/zenpost-studio/releases)

## Export funktioniert nicht

**Symptom:** Kein Output, Zielordner bleibt leer, Download startet nicht.

**Loesungen:**

- **Desktop**: Schreibrechte fuer den Zielordner pruefen
- **Web**: Pop-up-Blocker kann den Download verhindern — Ausnahme hinzufuegen
- Anderen Zielordner versuchen
- Export erneut ausloesen

## Dateien werden nicht erkannt

**Symptom:** Datei erscheint nicht im Import oder wird nicht verarbeitet.

**Loesungen:**

- Unterstuetzte Formate pruefen: .md, .html, .txt, .json, .docx, .doc, .pages, Code-Dateien
- Dateiendung pruefen (z.B. `.markdown` statt `.md` wird auch akzeptiert)
- Bei unbekanntem Format: Datei zuerst manuell in Markdown oder Text konvertieren

## Editor zeigt keinen Inhalt

**Symptom:** Editor ist leer obwohl eine Datei geoeffnet wurde.

**Loesungen:**

- Dateiformat pruefen — manche Formate werden erst nach Konvertierung angezeigt
- Bei DOCX/Pages: Die Konvertierung dauert einen Moment
- Datei manuell oeffnen und Inhalt per Copy-Paste einfuegen

## Projektordner nicht verfuegbar

**Symptom:** Auto-Save oder Projektfunktionen nicht nutzbar.

**Loesungen:**

- **Web**: Projektordner sind im Web nicht verfuegbar (kein Dateisystem-Zugriff)
- **Desktop**: Einstellungen → Editor → "Projekt waehlen" — Ordner auswaehlen
- Ordner muss existieren und Schreibrechte haben

## Einstellungen gehen verloren

**Symptom:** Nach Browser-/App-Neustart sind Einstellungen weg.

**Ursache:** localStorage wurde geloescht (z.B. durch Browser-Bereinigung).

**Loesungen:**

- Private/Inkognito-Modus vermeiden (localStorage wird beim Schliessen geloescht)
- Browser-Einstellungen: "Daten beim Schliessen loeschen" deaktivieren
- Desktop-Version nutzen — dort werden Daten im Projektordner gespeichert

## Social-Media Posting schlaegt fehl

**Symptom:** Post wird nicht veroeffentlicht, Fehlermeldung erscheint.

**Loesungen:**

- API-Keys in Einstellungen → Social Media APIs pruefen
- Alle Pflichtfelder ausgefuellt? (Plattformabhaengig)
- Rate Limits des Providers beachten
- Internetverbindung pruefen
