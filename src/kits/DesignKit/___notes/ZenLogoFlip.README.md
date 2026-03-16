# ZenLogoFlip - 3D Flip Animation Component

Eine elegante 3D-Flip-Karte, die beim Hover das B-Logo in das ZenPost-Logo mit Versionsinformationen umwandelt.

## 🎯 Features

- **3D Flip Animation** - Smooth Y-Achsen-Rotation (180°)
- **Hover-Aktivierung** - Automatisches Flippen beim Mouse-Over
- **Responsive Design** - Passt sich der Container-Größe an
- **Glasmorphism-Effekt** - Backdrop-blur auf der Rückseite
- **Dual-Logo Display** - Zeigt beide Logos geschmeidig

## 🚀 Verwendung

### Basis-Beispiel

```typescript
import { ZenLogoFlip } from './kits/DesignKit/ZenLogoFlip';

function App() {
  return (
    <div style={{ width: '200px', height: '200px' }}>
      <ZenLogoFlip />
    </div>
  );
}
```

### Mit Custom Styling

```typescript
<div className="w-48 h-48">
  <ZenLogoFlip className="my-custom-class" />
</div>
```

### In About Modal verwenden

```typescript
import { ZenLogoFlip } from '../DesignKit/ZenLogoFlip';

export const ZenAboutModal = ({ isOpen, onClose }: ZenAboutModalProps) => {
  return (
    <ZenModal isOpen={isOpen} onClose={onClose}>
      <div className="relative flex flex-col min-h-[480px]">
        {/* Logo Flip Card */}
        <div className="w-32 h-32 mx-auto mb-4">
          <ZenLogoFlip />
        </div>

        {/* Rest des Contents */}
        {/* ... */}
      </div>
    </ZenModal>
  );
};
```

## 🎨 Anpassung

### Flip-Geschwindigkeit ändern

```css
.zen-logo-flip-inner {
  transition: transform 0.6s; /* Standard: 0.6s */
}

/* Schneller */
.zen-logo-flip-inner {
  transition: transform 0.3s;
}

/* Langsamer */
.zen-logo-flip-inner {
  transition: transform 1s;
}
```

### Rückseiten-Styling anpassen

```css
.zen-logo-flip-back {
  background: rgba(26, 26, 26, 0.8); /* Hintergrund */
  border: 1px solid #AC8E66;          /* Border-Farbe */
  border-radius: 12px;                /* Abrundung */
  backdrop-filter: blur(10px);        /* Blur-Stärke */
}
```

### Text-Farben ändern

In der Komponente:

```typescript
{/* Version Text */}
<p className="font-mono text-xs text-[#DEINE_FARBE] font-semibold">
  Version 1.0
</p>

{/* Jahr Text */}
<p className="font-mono text-xs text-[#DEINE_FARBE]">
  2025
</p>
```

## 📐 Größen-Empfehlungen

```typescript
{/* Klein */}
<div className="w-24 h-24">
  <ZenLogoFlip />
</div>

{/* Mittel (empfohlen) */}
<div className="w-32 h-32">
  <ZenLogoFlip />
</div>

{/* Groß */}
<div className="w-48 h-48">
  <ZenLogoFlip />
</div>
```

## 🔧 Technische Details

### CSS Perspective

```css
.zen-logo-flip-container {
  perspective: 1000px; /* 3D-Tiefe */
}
```

**Höherer Wert** = Flacherer Effekt
**Niedrigerer Wert** = Dramatischerer 3D-Effekt

### Transform-Style

```css
.zen-logo-flip-inner {
  transform-style: preserve-3d; /* Erhält 3D-Transformation */
}
```

### Backface Visibility

```css
.zen-logo-flip-front,
.zen-logo-flip-back {
  backface-visibility: hidden; /* Versteckt Rückseite */
}
```

Verhindert, dass die Rückseite durchscheint.

## 🎬 Animation Flow

1. **Initial State**: Vorderseite (BLogo) ist sichtbar
2. **Hover**: 180° Y-Rotation startet
3. **Mid-Flip**: Übergangsphase (0.3s)
4. **End State**: Rückseite (ZenPost + Text) ist sichtbar
5. **Mouse Leave**: Rotation zurück zu 0°

## 🐛 Troubleshooting

### Problem: Flip funktioniert nicht

**Lösung:**
- Stelle sicher, dass der Container eine definierte Größe hat
- Prüfe, dass `transform-style: preserve-3d` gesetzt ist

### Problem: Rückseite scheint durch

**Lösung:**
- `backface-visibility: hidden` prüfen
- Browser-Support für 3D-Transforms prüfen

### Problem: Animation ist ruckelig

**Lösung:**
- GPU-Beschleunigung aktivieren mit `will-change: transform`
- Transition-Dauer anpassen

## 💡 Best Practices

1. **Container-Größe** - Definiere immer eine feste Größe für den Container
2. **Hover-Area** - Der gesamte Container ist hover-sensitiv
3. **Performance** - Vermeide zu viele Flip-Cards gleichzeitig
4. **Mobile** - Überlege Touch-Gesten als Alternative zu Hover

## 🎯 Erweiterte Verwendung

### Mit Click statt Hover

```typescript
const [isFlipped, setIsFlipped] = React.useState(false);

// Modifiziere die Komponente:
<div
  className={`zen-logo-flip-container ${isFlipped ? 'flipped' : ''}`}
  onClick={() => setIsFlipped(!isFlipped)}
>
  {/* ... */}
</div>

// CSS anpassen:
.zen-logo-flip-container.flipped .zen-logo-flip-inner {
  transform: rotateY(180deg);
}
```

### Mit Auto-Flip nach Zeit

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    // Flip nach 2 Sekunden
  }, 2000);
  return () => clearTimeout(timer);
}, []);
```

## 📦 Props

```typescript
interface ZenLogoFlipProps {
  className?: string; // Zusätzliche CSS-Klassen
}
```

## 🎨 Assets benötigt

- `src/assets/BLogo_ico.png` - B-Logo Icon (Vorderseite)
- `src/assets/ZenPost.png` - ZenPost Logo (Rückseite)

---





**Erstellt von:** Denis Bitter
**Version:** 1.0.0

Made with <3 by Denis Bitter - Fullstack Develop
 