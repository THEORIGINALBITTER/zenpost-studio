# HelpDocStudio - Interactive Walkthrough System

Ein interaktives Tutorial-System mit Lottie-Animationen für ZenPost Studio.

## 📁 Struktur

```
HelpDocStudio/
├── components/
│   ├── LottiePlayer.tsx          # Lottie Animation Wrapper
│   ├── StepController.tsx        # Navigation & Controls
│   ├── WalkthroughOverlay.tsx    # Haupt-Overlay Komponente
│   └── WalkthroughModal.tsx      # Modal Integration
├── animations/
│   └── demo-click.json           # Demo Lottie Animation
├── config/
│   └── walkthroughSteps.ts       # Step-Definitionen
└── index.ts
```

## 🚀 Features

- ✅ Interaktive Step-by-Step Tutorials
- ✅ Lottie-Animationen für flüssige Visualisierungen
- ✅ Play/Pause/Navigation Controls
- ✅ Progress Bar pro Step
- ✅ Auto-advance zwischen Steps
- ✅ ZenModal Integration
- ✅ Vollständig konfigurierbar

## 💡 Verwendung

### Im WelcomeScreen integriert

Der Walkthrough ist bereits im WelcomeScreen integriert:
- Klicke auf das "?" Icon neben "Content AI Studio"
- Das Tutorial startet automatisch

### Eigene Integration

```tsx
import { WalkthroughModal } from '../kits/HelpDocStudio';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Tutorial starten
      </button>

      <WalkthroughModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        autoStart={true}
      />
    </>
  );
}
```

## 🎨 Lottie-Animationen hinzufügen

### Option 1: LottieFiles verwenden (empfohlen)

1. Gehe zu [LottieFiles.com](https://lottiefiles.com)
2. Suche nach passenden Animationen (z.B. "mouse click", "loading", "success")
3. Lade die JSON-Datei herunter
4. Speichere sie in `animations/`
5. Importiere in `config/walkthroughSteps.ts`:

```ts
import mouseClickAnimation from '../animations/mouse-click.json';

export const CONTENT_AI_STUDIO_STEPS: WalkthroughStep[] = [
  {
    id: 'step-1-welcome',
    title: 'Willkommen',
    description: 'Klicke hier...',
    animationData: mouseClickAnimation, // <-- Hier einfügen
    duration: 3000,
  },
  // ...
];
```

### Option 2: LottieFiles Creator (kostenlos, kein After Effects nötig)

1. Gehe zu [LottieFiles Creator](https://lottiefiles.com/creator)
2. Erstelle deine eigene Animation mit dem visuellen Editor
3. Exportiere als JSON
4. Wie Option 1 einbinden

### Option 3: After Effects (professionell)

1. Erstelle Animation in After Effects
2. Exportiere mit Bodymovin Plugin
3. JSON in `animations/` speichern
4. Einbinden wie Option 1

## 🛠 Konfiguration

### Steps anpassen

Bearbeite [config/walkthroughSteps.ts](./config/walkthroughSteps.ts):

```ts
export const CONTENT_AI_STUDIO_STEPS: WalkthroughStep[] = [
  {
    id: 'step-1-welcome',
    title: 'Dein Titel',
    description: 'Deine Beschreibung',
    tip: 'Optional: Ein hilfreicher Tipp',
    animationData: yourAnimation, // Lottie JSON
    duration: 3000, // Wie lange dieser Step angezeigt wird (ms)
  },
  // Füge weitere Steps hinzu...
];
```

### Styling anpassen

Die Komponenten nutzen inline-styles im Zen-Design-System:
- Farben: `#AC8E66` (Gold), `#1A1A1A` (Dunkel)
- Font: `monospace`
- Borders: `#3A3A3A`

Passe die Styles direkt in den Komponenten an:
- [WalkthroughOverlay.tsx](./components/WalkthroughOverlay.tsx) - Haupt-Layout
- [StepController.tsx](./components/StepController.tsx) - Controls

## 📦 Dependencies

- `lottie-react`: Lottie Animation Player für React
- `@fortawesome/react-fontawesome`: Icons für Controls

## 🎯 Nächste Schritte

1. **Echte Animationen erstellen/downloaden**
   - Für jeden Step eine passende Animation finden
   - In `animations/` speichern und in Steps einbinden

2. **Für andere Studios erweitern**
   - Erstelle neue Step-Configs für Converter Studio und Doc Studio
   - Exportiere weitere Walkthrough-Definitionen

3. **Wiki-Integration**
   - Die gleichen Lottie-Animationen können im Wiki verwendet werden
   - Einfach die JSON-Files in die GitHub Pages Docs einbinden

4. **First-Launch Detection**
   - LocalStorage nutzen um zu prüfen, ob User die App zum ersten Mal öffnet
   - Automatisch Walkthrough beim ersten Start zeigen

## 🔗 Nützliche Links

- [LottieFiles](https://lottiefiles.com) - Riesige Library mit kostenlosen Animationen
- [LottieFiles Creator](https://lottiefiles.com/creator) - Visueller Animation Editor
- [Lottie React Docs](https://www.npmjs.com/package/lottie-react) - Library Dokumentation
- [After Effects + Bodymovin](https://aescripts.com/bodymovin/) - Professionelle Animations-Erstellung

## 💬 Beispiel-Animationen für Content AI Studio

Empfohlene Suchbegriffe auf LottieFiles:

1. **Step 1 - Welcome**: "cursor click", "hand click", "pointer"
2. **Step 2 - Upload**: "upload file", "drag drop", "paste"
3. **Step 3 - Transform**: "ai processing", "robot thinking", "transform"
4. **Step 4 - Result**: "success checkmark", "completed", "done"
5. **Step 5 - Export**: "download", "save file", "export"
