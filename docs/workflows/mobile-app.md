# Mobile App

Die ZenPost Mobile App (iOS) ergaenzt das Desktop-Studio: Du schreibst unterwegs Entwaerfe auf dem iPhone — ZenPost Studio importiert sie automatisch.

## Workflow

```
iPhone (ZenPost App)
  → Entwurf schreiben
  → AirDrop oder iCloud Sync
      ↓
  Mobile Inbox Ordner
      ↓
ZenPost Studio Desktop
  → "Inbox abrufen" im Dashboard
  → Entwurf oeffnet sich in Content AI Studio
```

---

## Einrichtung

### 1. Mobile Inbox Ordner festlegen

Einstellungen → Mobile APP → **"Aendern"**

Waehle einen lokalen Ordner, in den die iPhone-App ihre Entwaerfe ablegt. Empfohlen:

```
~/Documents/ZenPost/mobile-inbox/
```

### 2. Mobile App herunterladen

Einstellungen → Mobile APP → **DEV LOG Seite oeffnen**

Oder direkt: `https://zenpostapp.denisbitter.de`

Die Seite zeigt auch einen QR-Code zum schnellen Oeffnen auf dem iPhone.

### 3. Sync einrichten (AirDrop oder iCloud)

**Via AirDrop:**
- Entwurf in der iPhone-App teilen
- AirDrop → Mac auswaehlen
- Datei landet im Downloads-Ordner → manuell in den Inbox-Ordner verschieben

**Via iCloud Drive:**
- Inbox-Ordner in iCloud Drive ablegen
- iPhone-App speichert direkt in denselben iCloud-Ordner
- Automatische Synchronisation

---

## Entwaerfe importieren

### Desktop

1. Im Content AI Studio Dashboard auf **"Mobile Inbox abrufen"** klicken
2. ZenPost liest alle `.md`-Dateien aus dem Inbox-Ordner
3. Entwaerfe erscheinen als Karten im Dashboard
4. Klick auf einen Entwurf oeffnet ihn in Content AI Studio (Step 1)

### Web-Version

Im Web kann kein lokaler Ordner gelesen werden. Stattdessen:

1. Einstellungen → Mobile APP → Datei auswaehlen (Datei-Picker)
2. Oder: Entwurf direkt per Drag & Drop in den Editor ziehen

---

## Dateiformat

Entwaerfe der iPhone-App werden als Markdown-Dateien (`.md`) gespeichert. Das Format ist kompatibel mit dem ZenPost-Editor — kein Konvertierungsschritt noetig.

Optional: YAML-Frontmatter fuer Metadaten wird unterstuetzt:

```markdown
---
title: Mein Entwurf
date: 2026-03-23
tags: [devlog, zenpost]
---

Hier steht der eigentliche Inhalt...
```

---

## DEV LOG

Die DEV LOG-Seite (`https://zenpostapp.denisbitter.de`) zeigt den aktuellen Entwicklungsstand der Mobile App:

- Changelog
- Screenshots
- Bekannte Einschraenkungen
- Geplante Features

Erreichbar auch ueber: Einstellungen → Mobile APP → **DEV LOG Seite oeffnen**

---

## Fehlerbehebung

| Problem | Loesung |
|---------|---------|
| Inbox-Abruf zeigt keine Dateien | Ordnerpfad in Einstellungen pruefen |
| Dateien werden nicht gefunden | Dateiendung muss `.md` sein |
| iCloud Sync verzoegert | Kurz warten, iCloud braucht manchmal 1-2 Minuten |
| DEV LOG Seite oeffnet nicht | Internetverbindung pruefen |
