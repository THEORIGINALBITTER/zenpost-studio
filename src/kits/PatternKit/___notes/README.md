# ZenModal System - Dokumentation

Ein modernes, wiederverwendbares Modal-System für React mit Blur-Effekt und anpassbarem Close-Button.

## 📋 Inhaltsverzeichnis

- [Überblick](#überblick)
- [Komponenten](#komponenten)
- [Installation & Setup](#installation--setup)
- [Verwendung](#verwendung)
- [Features](#features)
- [Technische Details](#technische-details)
- [Anpassung](#anpassung)

## 🎯 Überblick

Das ZenModal System besteht aus drei Hauptkomponenten:

1. **ZenModal** - Die Basis-Modal-Komponente mit Portal-Rendering
2. **ZenCloseButton** - Wiederverwendbarer Close-Button mit Hover-Effekten
3. **ZenAboutModal** - Beispiel-Implementation eines About-Modals

## 🧩 Komponenten

### ZenModal

Die Kern-Modal-Komponente, die Portal-Rendering verwendet, um das Modal außerhalb der DOM-Hierarchie zu rendern.

**Dateipfad:** `src/kits/PatternKit/ZenModal.tsx`

**Props:**
```typescript
interface ZenModalProps {
  isOpen: boolean;        // Steuert die Sichtbarkeit des Modals
  onClose: () => void;    // Callback-Funktion zum Schließen
  children: React.ReactNode; // Modal-Inhalt
}
```

**Wichtige Features:**
- Portal-Rendering in `#zen-modal-root`
- Automatischer Blur-Effekt auf dem Hintergrund (`#root`)
- Verhindert Scrollen im Hintergrund
- Click-outside zum Schließen
- Smooth Transitions
- Responsive Design

### ZenCloseButton

Ein stilvoller, wiederverwendbarer Close-Button mit Gold-Hover-Effekt.

**Dateipfad:** `src/kits/DesignKit/ZenCloseButton.tsx`

**Props:**
```typescript
interface ZenCloseButtonProps {
  onClick?: () => void;           // Click-Handler
  size?: "sm" | "md";            // Größe des Buttons (default: "md")
  className?: string;            // Zusätzliche CSS-Klassen
}
```

**Styling:**
- Runder Button mit Border
- Hover-Effekt: Text und Border werden gold (#AC8E66)
- Smooth Transitions (200ms)
- Backdrop-Blur Effekt
- FontAwesome X-Icon (faXmark)

### ZenAboutModal

Beispiel-Implementation eines About-Modals mit Links.

**Dateipfad:** `src/kits/PatternKit/ZenAboutModal.tsx`

**Props:**
```typescript
interface ZenAboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}
```

## 🚀 Installation & Setup

### 1. HTML Setup

Füge die benötigten Container in deine `index.html` ein:

```html
<!doctype html>
<html lang="en">
  <head>
    <!-- ... -->
  </head>
  <body>
    <!-- Haupt-App Container -->
    <div id="root"></div>

    <!-- Modal Portal Container -->
    <div id="zen-modal-root"></div>

    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 2. Dependencies

Stelle sicher, dass folgende Packages installiert sind:

```bash
npm install react react-dom @fortawesome/react-fontawesome @fortawesome/free-solid-svg-icons
```

### 3. Tailwind CSS

Die Komponenten verwenden Tailwind CSS. Stelle sicher, dass folgende Klassen verfügbar sind:
- Backdrop-Blur: `backdrop-blur-lg`
- Custom z-index: `z-[10000]`, `z-[10001]`
- Border-Radius: `rounded-3xl`

## 💡 Verwendung

### Basis-Beispiel

```typescript
import { useState } from 'react';
import { ZenModal } from './kits/PatternKit/ZenModal';
import { ZenCloseButton } from './kits/DesignKit/ZenCloseButton';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Modal öffnen
      </button>

      <ZenModal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="relative">
          {/* Close Button oben rechts */}
          <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 50 }}>
            <ZenCloseButton onClick={() => setIsOpen(false)} />
          </div>

          {/* Modal Content */}
          <h2>Mein Modal Titel</h2>
          <p>Modal Inhalt hier...</p>
        </div>
      </ZenModal>
    </>
  );
}
```

### Erweiterte Verwendung - About Modal

```typescript
import { ZenAboutModal } from './kits/PatternKit/ZenAboutModal';

function App() {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <>
      <button onClick={() => setShowAbout(true)}>
        About
      </button>

      <ZenAboutModal
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
      />
    </>
  );
}
```

## ✨ Features

### 1. Background Blur Effekt

Wenn das Modal geöffnet ist, wird automatisch ein Blur-Effekt auf den Hintergrund angewendet:

```typescript
// Im ZenModal useEffect
if (isOpen) {
  const appRoot = document.getElementById('root');
  if (appRoot) {
    appRoot.style.filter = 'blur(4px)';
    appRoot.style.transition = 'filter 0.2s ease-in-out';
  }
  document.body.style.overflow = 'hidden';
}
```

**Warum funktioniert das?**
- Das Modal wird in `#zen-modal-root` gerendert (Portal)
- Der Blur wird nur auf `#root` angewendet
- Das Modal bleibt scharf und klar

### 2. Portal Rendering

```typescript
return ReactDOM.createPortal(modalContent, modalRoot);
```

**Vorteile:**
- Modal wird außerhalb der DOM-Hierarchie gerendert
- Verhindert z-index Konflikte
- Ermöglicht separates Styling von Hintergrund und Modal

### 3. Click-Outside zum Schließen

```typescript
<div onClick={onClose}>              {/* Äußerer Container - schließt */}
  <div onClick={(e) => e.stopPropagation()}> {/* Innerer Container - verhindert schließen */}
    {children}
  </div>
</div>
```

### 4. Scroll-Sperre

```typescript
document.body.style.overflow = 'hidden'; // Wenn Modal offen
document.body.style.overflow = '';        // Wenn Modal geschlossen
```

## 🔧 Technische Details

### Z-Index Hierarchie

```
z-[10000] - Modal Overlay Container
z-10      - Modal Content Box
z-50      - Close Button (innerhalb Modal)
z-[10001] - Optional für externe Elemente
```

### CSS-Klassen Übersicht

**ZenModal:**
- `fixed inset-0` - Vollbild Overlay
- `bg-black/60` - Halbtransparenter schwarzer Hintergrund
- `backdrop-blur-lg` - Blur-Effekt auf dem Overlay
- `rounded-3xl` - Abgerundete Ecken (24px)

**ZenCloseButton:**
- `rounded-full` - Perfekt runder Button
- `border border-[#3a3a3a]` - Dunkler Border
- `bg-[#1a1a1a]/80` - Semi-transparenter Hintergrund
- `hover:text-[#AC8E66]` - Gold beim Hovern
- `hover:border-[#AC8E66]` - Gold-Border beim Hovern
- `transition-all duration-200` - Smooth Transitions
- `pointer-events-auto` - **WICHTIG!** Ermöglicht Klicks

### Event Handling

**Problem:** Close Button wurde nicht klickbar

**Lösung:**
```typescript
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  console.log('ZenCloseButton clicked!');
  e.preventDefault();
  e.stopPropagation();
  if (onClick) {
    onClick();
  }
};
```

**Wichtige Punkte:**
- `e.stopPropagation()` verhindert, dass der Klick zum Overlay durchgeht
- `pointer-events-auto` in der className
- Inline-Styles für Position haben höhere Priorität

## 🎨 Anpassung

### Close Button Position ändern

```typescript
{/* Standard: Oben rechts */}
<div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 50 }}>
  <ZenCloseButton onClick={onClose} />
</div>

{/* Oben links */}
<div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 50 }}>
  <ZenCloseButton onClick={onClose} />
</div>

{/* Mehr Abstand */}
<div style={{ position: 'absolute', top: '32px', right: '32px', zIndex: 50 }}>
  <ZenCloseButton onClick={onClose} />
</div>
```

### Blur-Stärke anpassen

In `ZenModal.tsx`:

```typescript
// Stärker bluffen
appRoot.style.filter = 'blur(8px)';

// Schwächer bluffen
appRoot.style.filter = 'blur(2px)';
```

### Modal-Größe anpassen

```typescript
{/* Standard */}
<div className="relative max-w-lg w-[90%] z-10">

{/* Größer */}
<div className="relative max-w-2xl w-[90%] z-10">

{/* Kleiner */}
<div className="relative max-w-md w-[90%] z-10">
```

### Button-Größe ändern

```typescript
{/* Klein */}
<ZenCloseButton onClick={onClose} size="sm" />

{/* Mittel (Standard) */}
<ZenCloseButton onClick={onClose} size="md" />
```

### Farben anpassen

In `ZenCloseButton.tsx`:

```typescript
// Gold-Farbe ändern
const base = "... hover:text-[#DEINE_FARBE] hover:border-[#DEINE_FARBE] ...";
```

## 🐛 Troubleshooting

### Problem: Close Button funktioniert nicht

**Lösung:**
- Stelle sicher, dass `pointer-events-auto` in der className ist
- Verwende inline-Styles für die Position
- Prüfe, dass `e.stopPropagation()` im Click-Handler ist

### Problem: Kein Blur-Effekt sichtbar

**Lösung:**
- Stelle sicher, dass `#root` Element existiert
- Prüfe, dass das Modal in `#zen-modal-root` gerendert wird
- Browser-Support für `backdrop-filter` prüfen

### Problem: Modal wird hinter anderen Elementen angezeigt

**Lösung:**
- Erhöhe den z-index des Overlay-Containers
- Stelle sicher, dass Portal-Rendering funktioniert

## 📝 Best Practices

1. **Immer Portal verwenden** - Rendere Modals immer in einem separaten Container
2. **Cleanup beachten** - Stelle sicher, dass Styles beim Unmount zurückgesetzt werden
3. **Accessibility** - Füge `aria-label` zu Buttons hinzu
4. **Keyboard Support** - Erwäge ESC-Taste zum Schließen
5. **Focus Management** - Überlege, den Focus automatisch ins Modal zu setzen

## 🔄 Animation

Das Modal verwendet eine CSS-Animation für den Eingangseffekt:

```css
.animate-zenModalEnter {
  /* Definiere diese Animation in deinem CSS */
  animation: zenModalEnter 0.2s ease-in-out;
}

@keyframes zenModalEnter {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

## 📄 Lizenz

Dieses Komponenten-System ist Teil von ZenPost Studio.

---

**Erstellt von:** Denis Bitter
**Version:** 1.0.0
**Letzte Aktualisierung:** 2025

Made with 🧡 by Denis Bitter - Fullstack Developer 
