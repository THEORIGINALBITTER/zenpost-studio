# macOS Installation (Unsigned Build)

ZenPost Studio wird aktuell ohne Apple Notarisierung verteilt.
Beim ersten Start kann macOS den Start blockieren.

## Option 1: Rechtsklick (empfohlen)

1. `ZenPost Studio.app` in `Programme` ablegen.
2. Rechtsklick auf `ZenPost Studio.app`.
3. `Öffnen` klicken.
4. Im zweiten Dialog erneut `Öffnen`.

## Option 2: Quarantine-Flag entfernen

Wenn Option 1 keinen Öffnen-Button zeigt:

```bash
xattr -dr com.apple.quarantine "/Applications/ZenPost Studio.app"
```

Danach die App normal starten.

