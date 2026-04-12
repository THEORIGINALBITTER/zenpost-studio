# Tag 02 – Das Bild das alles eingefroren hat

*Ein ehrliches Entwickler-Tagebuch*

Denis Bitter · 18. März 2026 · 5 min read

---

Es gibt Bugs die man kommen sieht. Und es gibt Bugs die einen um 14 Uhr eiskalt erwischen, während man eigentlich nur schnell ein Foto in den Editor ziehen will.

Heute war so ein Tag.

## Was passiert ist

Ich ziehe ein Bild in den Editor. 15 Megabyte, ein normaler Screenshot vom MacBook.

Die App friert ein.

Nicht kurz. Nicht mit einer Fehlermeldung. Einfach — nichts mehr. Der Cursor dreht sich, das Fenster reagiert nicht, nach 30 Sekunden ist alles weg.

Beim zweiten Versuch das gleiche. Beim dritten auch.

## Warum das passiert ist

Das Problem war nicht das Bild. Das Problem war meine Lösung.

Wenn man in einer Web-App ein Bild einfügt, muss man es irgendwo speichern. Der klassische Weg: das Bild als base64-String direkt in den Editor-State schreiben. Aus 15 MB Bilddatei werden so etwa 20 MB Text — und dieser Text landet komplett im Arbeitsspeicher des WebViews.

```
15 MB Bild
    ↓
base64 encoding (+33%)
    ↓
~20 MB String im Editor-State
    ↓
WebView friert ein
    ↓
App-Absturz
```

Der WebView — die Browser-Engine die Tauri für die App-Oberfläche nutzt — ist nicht dafür gebaut, 20-Megabyte-Strings in Echtzeit zu verarbeiten. Das ist als würde man versuchen, einen LKW durch eine Fahrradschleuse zu fahren.

## Was GitHub macht — und warum das schlauer ist

Ich habe kurz überlegt wie andere das lösen. GitHub zum Beispiel.

Wenn man bei GitHub ein Bild in ein Issue zieht, passiert nichts Magisches. Das Bild wird auf GitHub-Server hochgeladen, man bekommt eine URL zurück, und im Text steht nur `![foto](https://github.com/.../foto.png)`.

Kein base64. Kein riesiger String. Nur ein Link.

Das ist der richtige Weg. Nicht weil GitHub groß ist — sondern weil es das einzige macht das Sinn ergibt: **Dateien gehören ins Dateisystem, nicht in den Text.**

## Die Lösung für ZenPost Studio

ZenPost läuft in zwei Modi: als Desktop-App via Tauri, und als Web-Version im Browser.

Für die **Desktop-App** war die Lösung einfach. Tauri hat direkten Dateisystemzugriff. Bild wird neben dem Dokument gespeichert, in einem `_assets/` Ordner:

```
mein-artikel.md
_assets/
  20260318-screenshot.jpg   ← Bild liegt hier
```

Im Markdown steht dann nur der absolute Pfad. Beim Anzeigen wird die Datei gelesen und als Blob-URL geladen — kein base64, kein Speicherproblem.

Für die **Web-Version** war es komplizierter. Browser haben kein Dateisystem. Oder?

## OPFS — das versteckte Dateisystem im Browser

Ich kannte OPFS bis heute nicht. Origin Private File System. Es ist seit 2022 in jedem modernen Browser eingebaut, kaum jemand redet darüber.

Das Konzept ist simpel: Jede Web-App bekommt ein privates, persistentes Dateisystem vom Browser. Kein Permission-Dialog. Kein Ablaufdatum. Einfach da.

```javascript
const root = await navigator.storage.getDirectory();
const dir = await root.getDirectoryHandle('zenpost-images', { create: true });
const file = await dir.getFileHandle('foto.jpg', { create: true });
const writable = await file.createWritable();
await writable.write(imageFile);
await writable.close();
```

Bild ist gespeichert. Im Markdown steht `opfs://zenpost-images/foto.jpg`. Beim Anzeigen wird die Datei aus OPFS geladen und als Blob-URL ins `<img>` Tag gegeben.

Das Ergebnis:

```
Vorher: 20 MB String im Editor-State → Absturz
Nachher: "opfs://zenpost-images/foto.jpg" → 42 Zeichen
```

## Was ich dabei gelernt habe

Manchmal ist der Bug nicht der Bug. Der eigentliche Fehler war eine Annahme die ich nie hinterfragt hatte: dass Bilder als base64 in den Editor-State gehören. Das war nie richtig — es hat nur lange funktioniert weil die Bilder klein genug waren.

Großes Bild, falsches Fundament → Absturz.

Kleines Bild, falsches Fundament → funktioniert zufällig.

Der Fix hat einen halben Tag gekostet. Das Verstehen des Problems drei Stunden, die Implementierung eine. OPFS war die eleganteste Lösung die ich mir nicht selbst ausgedacht habe — der Browser hatte sie die ganze Zeit parat.

## Stand heute

- Desktop: Bilder landen im `_assets/` Ordner neben dem Dokument
- Web: Bilder landen in OPFS, persistent im Browser
- Block-Editor und Markdown-Editor: beide unterstützen das neue System
- Preview (Step 4): zeigt lokale Bilder korrekt an
- Limit: 50 MB pro Bild — nicht wegen Performance, sondern wegen Vernunft

Der Absturz ist weg. Das Bild ist da. Weiter.

---

*ZenPost Studio wird öffentlich gebaut. Jeden Schritt, jeden Bug, jede Entscheidung.*
*Nächster Eintrag: Zero-Knowledge Cloud — warum wir einen Server bauen auf den wir selbst keinen Zugriff haben.*

---

**Tags:** #BuildingInPublic #Tauri #WebDev #OPFS #DevLog #ZenPostStudio
