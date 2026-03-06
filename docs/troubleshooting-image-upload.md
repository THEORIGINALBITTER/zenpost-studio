# Bilder werden hochgeladen, aber nicht angezeigt - Ursache & Loesung

## Problem
Beim Export wirkt alles erfolgreich (Toast/Response), aber im Live-Post werden Bilder nicht angezeigt (404, leere Platzhalter).

## Haeufige Ursachen
1. Falscher Upload-Endpoint konfiguriert.
Beispiel: App nutzt `/upload_image.php`, Server-Logik liegt aber in `/upload_images.php`.
2. Upload schreibt in falschen Ordner.
Beispiel: Script schreibt nach `/stage01/images/...`, URL zeigt aber auf `/images/...`.
3. Rueckgabe-URL passt nicht zum echten Dateipfad.
Datei existiert, aber unter anderem Pfad als in der URL.
4. CORS blockiert Upload aus der App/WebView.
Beispiel: `Origin http://127.0.0.1:1420 is not allowed`.
5. Dateiname/Extension wird falsch erzeugt.
URL ohne korrekte Endung oder ungueltiger Name.

## So behebt man es
1. In ZenSettings -> API pruefen:
- API Base URL korrekt
- Upload Endpoint korrekt (bei euch: `/upload_images.php`)
2. Upload-Script korrekt schreiben lassen:
- Zielordner aus `$_SERVER['DOCUMENT_ROOT'] . '/images/zenpoststudio'`
- Verzeichnis anlegen, Schreibrechte pruefen
- URL aus oeffentlichem Basispfad sauber aufbauen
3. CORS sauber konfigurieren:
- Dev-Origin erlauben (`http://127.0.0.1:1420`)
- oder testweise `Access-Control-Allow-Origin: *`
4. Schreibrechte pruefen:
- `/images/zenpoststudio` muss existieren oder erstellt werden koennen
- und beschreibbar sein
5. Health-Checks nutzen:
- Ping pruefen
- Upsert pruefen
- Upload pruefen
- List pruefen
- Delete pruefen

## Was im Projekt verbessert wurde
1. Default-Upload-Endpoint auf `/upload_images.php` umgestellt.
2. Server-ZIP erzeugt jetzt `upload_images.php`.
3. Upload-Script robuster gemacht:
- DOCUMENT_ROOT-Pfad
- konsistente URL
- Extension-Validierung
- Debugfelder (`path`, `targetDir`, `documentRoot`)
4. Export zeigt Erfolg nur bei vollstaendigem Upload + Save.
5. API-UI verbessert:
- Mini-Beschriftungen ueber Feldern
- Health-Check-Buttons pro Endpoint

## Support-Quickcheck (wenn es noch hakt)
Bitte diese 3 Felder aus der Upload-Response pruefen/posten:

- `url`
- `path`
- `targetDir`

Damit sieht man sofort, ob URL und realer Serverpfad zusammenpassen.
