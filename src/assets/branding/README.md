# ZenPost Studio - Branding Assets

Zentrale Verwaltung aller Logo- und Icon-Dateien für Web und Desktop (Tauri).

## Logo-Dateien

### Haupt-Logos (Source)
- `logo-main.png` (61KB) - ZenPost Studio Haupt-Logo mit "B" im Zen-Kreis
- `logo-icon.png` (53KB) - Vereinfachte Icon-Version für kleine Größen

### Verwendung

#### In React-Komponenten
```tsx
import LogoMain from "../../assets/branding/logo-main.png?url";
import LogoIcon from "../../assets/branding/logo-icon.png?url";
```

#### Aktuell verwendet in:
- `src/kits/DesignKit/ZenLogoFlip.tsx` - Flip-Animation auf Welcome Screen
- `src/kits/PatternKit/ZenLogo.tsx` - Statisches Logo

## Tauri Desktop Icons

Generierte Platform-spezifische Icons befinden sich in `src-tauri/icons/`:

### macOS
- `icon.icns` (271KB) - macOS App Bundle Icon

### Windows
- `icon.ico` (37KB) - Windows Executable Icon
- `Square*.png` - Windows Store Logos (verschiedene Größen)

### Linux/Web
- `icon.png` (49KB) - Standard PNG Icon
- `32x32.png`, `128x128.png`, `128x128@2x.png` - Verschiedene Auflösungen

## Icon-Generierung

### Manuell mit Tauri CLI
```bash
npm run tauri icon src/assets/branding/logo-icon.png
```

Dies generiert automatisch alle benötigten Platform-Icons in `src-tauri/icons/`.

### Voraussetzungen
- Source-Icon sollte mindestens 1024x1024px sein (aktuell 512x512px ausreichend)
- PNG-Format mit transparentem Hintergrund
- Quadratisches Format

## Web Favicon

Für die Web-Version sollte ein Favicon in `public/` erstellt werden:

```bash
# Favicon aus logo-icon.png erstellen
cp src/assets/branding/logo-icon.png public/favicon.png
```

Dann in `index.html`:
```html
<link rel="icon" type="image/png" href="/favicon.png" />
```

## Performance-Optimierung

### ZenPost.png ist zu groß (1.5MB)
Das alte `ZenPost.png` ist für Web-Performance zu groß. Verwende stattdessen:
- `logo-main.png` für reguläre Anzeigen
- `logo-icon.png` für kleine Icons

### Empfohlene Größen
- Haupt-Logo: max. 200KB
- Icons: max. 50KB
- Optimierung mit: `npm install -D sharp` für Build-Pipeline

## Änderungen durchführen

### Logo-Update-Workflow
1. Neues Logo in `src/assets/branding/` ablegen
2. Icons neu generieren: `npm run tauri icon src/assets/branding/logo-icon.png`
3. Favicon für Web aktualisieren
4. Import-Pfade in Komponenten prüfen

### Betroffene Dateien bei Logo-Änderung
- `src/kits/DesignKit/ZenLogoFlip.tsx`
- `src/kits/PatternKit/ZenLogo.tsx`
- `public/index.html` (Favicon)
- `src-tauri/tauri.conf.json` (Icon-Referenzen)

## Best Practices

1. **Single Source of Truth**: Verwende `logo-icon.png` als Basis für alle generierten Icons
2. **Versionierung**: Bei Logo-Änderungen auch Version in `ZenLogoFlip.tsx` aktualisieren
3. **Performance**: Große Logos (>200KB) vor Web-Deployment optimieren
4. **Konsistenz**: Gleiche Farben (#AC8E66 Gold) in allen Branding-Assets

## Farben

**ZenPost Studio Brand Colors:**
- Gold: `#AC8E66`
- Dunkel: `#1A1A1A`
- Grau: `#777`, `#666`, `#888`
- Weiß: `#e5e5e5`, `#ccc`
