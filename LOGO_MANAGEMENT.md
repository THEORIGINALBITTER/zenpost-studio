# ZenPost Studio - Logo Management Guide

## Übersicht

Alle Branding-Assets sind jetzt zentral in `src/assets/branding/` organisiert.

## Struktur

```
src/assets/branding/
├── logo-main.png       # Haupt-Logo (B im Zen-Kreis, 61KB)
├── logo-icon.png       # Icon-Version für kleine Größen (53KB)
└── README.md           # Detaillierte Dokumentation

src-tauri/icons/        # Automatisch generierte Platform-Icons
├── icon.icns           # macOS
├── icon.ico            # Windows
├── icon.png            # Linux/Web
└── ...                 # Weitere Platform-spezifische Icons

public/
└── favicon.png         # Web Favicon (kopiert von logo-icon.png)
```

## Verwendung

### In React-Komponenten

```tsx
import LogoMain from "../../assets/branding/logo-main.png?url";
```

**Aktuell verwendet:**
- [src/kits/DesignKit/ZenLogoFlip.tsx](src/kits/DesignKit/ZenLogoFlip.tsx) - Logo-Flip-Animation

### Icons regenerieren

Wenn du das Logo änderst, regeneriere alle Platform-Icons:

```bash
npm run icons:generate
```

Dies erzeugt automatisch:
- macOS: `icon.icns`
- Windows: `icon.ico` + Store Logos
- Linux: `icon.png` in verschiedenen Größen

## Wichtige Befehle

| Befehl | Beschreibung |
|--------|--------------|
| `npm run icons:generate` | Generiert alle Platform-Icons aus logo-icon.png |
| `npm run icons:info` | Zeigt Info über Icon-Generierung |

## Logo-Update-Workflow

1. **Neues Logo erstellen**
   - Mindestens 1024x1024px (aktuell: 512x512px ausreichend)
   - PNG mit transparentem Hintergrund
   - Quadratisches Format
   - Als `src/assets/branding/logo-icon.png` speichern

2. **Icons regenerieren**
   ```bash
   npm run icons:generate
   ```

3. **Favicon aktualisieren**
   ```bash
   cp src/assets/branding/logo-icon.png public/favicon.png
   ```

4. **Build testen**
   ```bash
   npm run build
   ```

## Performance-Hinweis

⚠️ Das alte `ZenPost.png` (1.6MB) ist für Web-Performance zu groß!

**Empfehlung:** Für die Rückseite der Flip-Animation eine optimierte Version erstellen oder das Logo durch Text ersetzen.

## Betroffene Dateien bei Logo-Änderung

- [src/kits/DesignKit/ZenLogoFlip.tsx](src/kits/DesignKit/ZenLogoFlip.tsx)
- [public/favicon.png](public/favicon.png)
- [index.html](index.html) - Favicon-Link
- [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json) - Icon-Referenzen

## Brand Colors

- **Gold:** `#AC8E66`
- **Dunkel:** `#1A1A1A`
- **Grau:** `#777`, `#666`, `#888`
- **Weiß:** `#e5e5e5`, `#ccc`

## Weitere Infos

Siehe [src/assets/branding/README.md](src/assets/branding/README.md) für detaillierte technische Dokumentation.
