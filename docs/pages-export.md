# 📄 Apple Pages Dokumente in ZenPost Studio verwenden

## Übersicht

Apple Pages verwendet ein proprietäres Dateiformat (.pages), das ZenPost Studio nicht direkt einlesen kann. Um deine Pages-Dokumente in ZenPost Studio zu verwenden, musst du sie zunächst als DOCX-Datei exportieren.

## Warum DOCX?

- ✅ **Formaterhaltung**: DOCX behält alle Formatierungen, Bilder und Tabellen bei
- ✅ **Kompatibilität**: DOCX wird von ZenPost Studio nativ unterstützt
- ✅ **Automatische Konvertierung**: ZenPost Studio konvertiert DOCX automatisch zu Markdown
- ✅ **Qualität**: Bessere Konvertierungsqualität als direkte Pages-Konvertierung

## Schritt-für-Schritt Anleitung

### Schritt 1: Pages-Dokument öffnen

Öffne dein Dokument in Apple Pages.

![Pages öffnen](https://via.placeholder.com/800x400?text=Pages+öffnen)

### Schritt 2: Export-Menü öffnen

1. Klicke in der Menüleiste auf **Ablage**
2. Wähle **Exportieren** > **Word...**

Alternativ kannst du auch die Tastenkombination `⌥⌘E` (Option + Command + E) verwenden.

![Export-Menü](https://via.placeholder.com/800x400?text=Export-Menü)

### Schritt 3: Format wählen

Im Export-Dialog:

1. Stelle sicher, dass **Word** (.docx) als Format ausgewählt ist
2. **Optional**: Aktiviere "Advanced Options" für weitere Einstellungen:
   - **Compatibility**: Wähle "DOCX" (empfohlen)
   - **Require password to open**: Nur bei Bedarf aktivieren

![Format wählen](https://via.placeholder.com/800x400?text=Format+wählen)

### Schritt 4: Datei speichern

1. Wähle einen Speicherort (z.B. Downloads, Desktop)
2. Gib einen aussagekräftigen Dateinamen ein
3. Klicke auf **Exportieren**

![Datei speichern](https://via.placeholder.com/800x400?text=Datei+speichern)

### Schritt 5: In ZenPost Studio hochladen

1. Öffne **ZenPost Studio**
2. Gehe zu **Content AI Transform** (Schritt 1)
3. Klicke auf **"Datei hochladen"**
4. Wähle deine exportierte DOCX-Datei aus
5. ZenPost Studio konvertiert die Datei automatisch zu Markdown

![ZenPost Studio Upload](https://via.placeholder.com/800x400?text=ZenPost+Studio+Upload)

## Was passiert bei der Konvertierung?

ZenPost Studio führt folgende Schritte automatisch aus:

1. **DOCX-Parsing**: Liest die DOCX-Datei mit dem Mammoth-Konverter
2. **HTML-Zwischenschritt**: Konvertiert DOCX zu HTML
3. **Markdown-Konvertierung**: Wandelt HTML zu sauberem Markdown um
4. **AI-Optimierung**: Die AI optimiert den Content für deine Zielplattform

### Unterstützte Elemente

| Element | Unterstützt | Hinweise |
|---------|-------------|----------|
| Text & Formatierung | ✅ | Fett, Kursiv, Unterstrichen |
| Überschriften | ✅ | H1-H6 |
| Listen | ✅ | Nummeriert & Aufzählungen |
| Tabellen | ✅ | Werden als Markdown-Tabellen konvertiert |
| Bilder | ⚠️ | Werden eingebettet (Base64) |
| Links | ✅ | Bleiben erhalten |
| Code-Blöcke | ✅ | Werden als Fenced Code Blocks konvertiert |
| Farben | ❌ | Gehen verloren (Markdown-Limitation) |
| Komplexe Layouts | ⚠️ | Werden vereinfacht |

## Häufige Probleme & Lösungen

### Problem: Datei wird nicht akzeptiert

**Lösung**:
- Stelle sicher, dass du DOCX (nicht DOC) exportiert hast
- Prüfe, ob die Datei nicht beschädigt ist
- Versuche, die Datei erneut zu exportieren

### Problem: Formatierung geht verloren

**Lösung**:
- Markdown unterstützt nur grundlegende Formatierungen
- Komplexe Layouts werden automatisch vereinfacht
- Die AI optimiert den Content für bessere Lesbarkeit

### Problem: Bilder werden nicht angezeigt

**Lösung**:
- Bilder werden als Base64 eingebettet
- Große Bilder können die Konvertierung verlangsamen
- Verwende komprimierte Bilder für bessere Performance

### Problem: Tabellen sehen anders aus

**Lösung**:
- Markdown-Tabellen sind simpler als Pages-Tabellen
- Komplexe Tabellen-Layouts werden vereinfacht
- Die Struktur bleibt erhalten

## Tipps für beste Ergebnisse

### Vor dem Export

1. **Vereinfache dein Layout**: Je einfacher das Layout, desto besser die Konvertierung
2. **Prüfe Bilder**: Komprimiere große Bilder vorher
3. **Entferne unnötige Formatierungen**: Weniger ist mehr
4. **Nutze Standard-Formatvorlagen**: Überschriften, Listen, etc.

### Nach dem Export

1. **Prüfe die Markdown-Vorschau**: Nutze die Preview-Funktion in ZenPost Studio
2. **Korrigiere bei Bedarf**: Der Markdown-Editor erlaubt Anpassungen
3. **Nutze die AI**: Lass die AI den Content optimieren
4. **Teste verschiedene Plattformen**: Prüfe, wie der Content auf verschiedenen Plattformen aussieht

## Alternative: Direkter Markdown-Export

Wenn du häufig mit Markdown arbeitest, kannst du auch:

1. In Pages direkt zu **Plain Text** exportieren
2. Den Text in einen Markdown-Editor kopieren
3. Manuell Markdown-Formatierungen hinzufügen

Dies gibt dir mehr Kontrolle, ist aber zeitaufwendiger.

## Weitere Unterstützung

- 📖 [ZenPost Studio Dokumentation](https://theoriginalbitter.github.io/zenpost-studio/)
- 💬 [GitHub Issues](https://github.com/theoriginalbitter/zenpost-studio/issues)
- 📧 Support: [E-Mail](mailto:support@zenpost.studio)

---

**Letzte Aktualisierung**: November 2025
**Version**: 1.0
