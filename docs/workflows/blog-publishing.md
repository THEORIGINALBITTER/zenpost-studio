# Blog Publishing mit ZenPost Studio

ZenPost Studio kann Artikel direkt auf deinen eigenen Blog-Server hochladen — Markdown, Metadaten und Titelbilder in einem Schritt.

## Voraussetzungen

- Eigener Webserver mit PHP 7.4+
- Schreibrechte auf dem Server
- ZenPost Studio (Desktop oder Web)

---

## Einrichtung (einmalig)

### 1. API Key festlegen

Öffne **Einstellungen → Media Transformation → Blog-Tab**. Erstelle einen neuen Blog-Eintrag und wähle **PHP Upload** als Deploy-Typ. Trage einen geheimen API Key ein (z.B. `meinKey123`).

### 2. PHP-Paket herunterladen

Klicke auf **PHP Paket herunterladen**. Du erhältst eine ZIP-Datei mit 2 Dateien:

| Datei | Funktion |
|-------|----------|
| `zenpost-upload.php` | Empfängt Posts + Bilder, speichert sie auf dem Server |
| `.htaccess` | Aktiviert CORS für `manifest.json` (nötig für Dashboard) |

### 3. Dateien hochladen

Lade **beide Dateien** direkt in dein Blog-Hauptverzeichnis hoch — **nicht in einen Unterordner**.

```
/zenpostapp/
  zenpost-upload.php   ← hier
  .htaccess            ← hier
  posts/               ← wird automatisch erstellt
  _assets/             ← wird automatisch erstellt
  manifest.json        ← wird automatisch erstellt
```

### 4. Upload-URL eintragen

Trage die vollständige URL in die Einstellungen ein:

```
https://meinserver.de/zenpostapp/zenpost-upload.php
```

### 5. Fertig

Der Status zeigt **"Konfiguriert — Web + Desktop App bereit"** wenn alles stimmt.

---

## Artikel schreiben und hochladen

1. **Direkt schreiben** im Content AI Studio starten
2. Im **Metadaten-Panel** (links) ausfüllen:
   - Titel, Untertitel, Tags, Datum
   - Titelbild per Drag & Drop in das Bild-Feld ziehen
3. **Speichern → Auf Server** klicken

ZenPost Studio lädt automatisch:
- Den Artikel als `.md` in `posts/`
- Das Titelbild in `_assets/`
- Die aktualisierte `manifest.json`

---

## Titelbilder

**So funktioniert es:**

```
Bild per Drag & Drop → Post-Metadaten
  ↓ beim Server-Upload
zenpost-upload.php empfängt Bild
  ↓
Gespeichert in: /zenpostapp/_assets/cover-slug.jpg
  ↓
URL in manifest.json: https://meinserver.de/zenpostapp/_assets/cover-slug.jpg
```

Kein manuelles Hochladen nötig. Die URL wird automatisch im `manifest.json` unter `coverImage` eingetragen und steht sofort für deine Blog-App bereit.

**Unterstützte Formate:** JPG, PNG, WebP, GIF

---

## Ordnerstruktur auf dem Server

```
/zenpostapp/
  zenpost-upload.php
  .htaccess
  manifest.json          ← Alle Posts als Index (wird bei jedem Upload aktualisiert)
  posts/
    tag-01-mein-artikel.md
    tag-02-zweiter-post.md
  _assets/
    cover-tag-01-mein-artikel.jpg
    cover-tag-02-zweiter-post.png
```

---

## manifest.json Format

```json
{
  "site": {
    "title": "Mein Blog",
    "subtitle": "Beschreibung",
    "author": "Name",
    "url": "https://meinserver.de/blog"
  },
  "posts": [
    {
      "slug": "tag-01-mein-artikel",
      "title": "Tag 01 – Mein erster Artikel",
      "subtitle": "Was ich gelernt habe",
      "date": "2026-03-19",
      "tags": ["devlog", "zenpost"],
      "coverImage": "https://meinserver.de/zenpostapp/_assets/cover-tag-01.jpg",
      "readingTime": 4
    }
  ]
}
```

---

## Fehlerbehebung

| Problem | Ursache | Lösung |
|---------|---------|--------|
| Upload schlägt fehl (401) | Falscher API Key | Key in Einstellungen und PHP-Datei prüfen |
| Upload schlägt fehl (400) | Ungültiger Dateiname | Titel enthält Sonderzeichen — ZenPost wandelt automatisch um |
| Bilder nicht sichtbar | `_assets/` nicht beschreibbar | Serverrechte prüfen (chmod 755) |
| manifest.json leer | Erster Upload | Wird automatisch beim ersten Post erstellt |
| Dashboard zeigt keine Posts | CORS-Fehler | `.htaccess` fehlt oder mod_headers nicht aktiv |

---

## Unterschied: PHP Upload vs. FTP/SFTP

| | PHP Upload | FTP/SFTP |
|-|-----------|----------|
| Funktioniert im Browser | Ja | Nein (nur Desktop) |
| Einrichtung | 2 Dateien hochladen | FTP-Zugangsdaten nötig |
| Sicherheit | API Key | FTP-Credentials |
| Empfohlen für | Alle Nutzer | Fortgeschrittene |
