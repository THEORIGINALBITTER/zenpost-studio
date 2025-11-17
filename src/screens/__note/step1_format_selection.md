# Step 1: Format Selection - Technische Dokumentation

## Übersicht

Step 1 ist der erste Schritt im 4-stufigen Konvertierungs-Wizard. Hier wählt der User das Quell- und Zielformat für die Datei-Konvertierung aus.

## Datei-Struktur

```
src/screens/converter-steps/Step1FormatSelection.tsx
```

## Komponenten-Hierarchie

```
ConverterScreen (Orchestrator)
  └── Step1FormatSelection
        ├── ZenSubtitle
        ├── ZenDropdown (Von Format)
        ├── FontAwesomeIcon (Pfeil)
        ├── ZenDropdown (Nach Format)
        └── ZenRoughButton (Weiter)
```

## Props Interface

```typescript
interface Step1FormatSelectionProps {
  fromFormat: SupportedFormat;           // Aktuelles Quellformat (z.B. 'code', 'json', 'md')
  toFormat: SupportedFormat;             // Aktuelles Zielformat
  formatOptions: FormatOption[];         // Array aller verfügbaren Formate
  onFromFormatChange: (format: SupportedFormat) => void;  // Callback wenn Quellformat geändert wird
  onToFormatChange: (format: SupportedFormat) => void;    // Callback wenn Zielformat geändert wird
  onNext: () => void;                    // Callback zum nächsten Step
}
```

## Verfügbare Formate

```typescript
const formatOptions: FormatOption[] = [
  { value: 'code', label: 'Code (AI)', icon: faRobot },
  { value: 'json', label: 'JSON', icon: faFileCode },
  { value: 'md', label: 'Markdown', icon: faFileLines },
  { value: 'html', label: 'HTML', icon: faFileAlt },
  { value: 'txt', label: 'Text', icon: faFileAlt },
  { value: 'pdf', label: 'PDF', icon: faFilePdf },
];
```

## UI-Layout & Spacing

Das Layout folgt den Zen Design Prinzipien mit großzügigen Abständen:

```
┌─────────────────────────────────────┐
│         Schritt 1: Format wählen    │  mb-4
├─────────────────────────────────────┤
│   Wähle das Quell- und Zielformat   │  mb-20 (80px)
├─────────────────────────────────────┤
│                                     │
│       Von Format: [Dropdown]        │  mb-32 (128px)
│                                     │
│              ↓ (Pfeil)              │  my-32 (128px oben + unten)
│                                     │
│       Nach Format: [Dropdown]       │  mb-32 (128px)
│                                     │
│           [Weiter Button]           │  mb-8
│                                     │
│    CODE (AI) nutzt AI für...        │
└─────────────────────────────────────┘
```

### Spacing-Breakdown:

- **Title → Subtitle**: `mb-4` (16px)
- **Subtitle → Von Format**: `mb-20` (80px)
- **Von Format → Pfeil**: `mb-32` (128px)
- **Pfeil Vertikal**: `my-32` (128px oben + 128px unten)
- **Pfeil → Nach Format**: `mb-32` (128px)
- **Nach Format → Button**: `mb-32` (128px)
- **Button → Info Text**: `mb-8` (32px)

## Zen-Komponenten im Detail

### 1. ZenDropdown
**Verwendung**: Format-Auswahl

```tsx
<ZenDropdown
  label="Von Format:"
  value={fromFormat}
  onChange={(value) => onFromFormatChange(value as SupportedFormat)}
  options={formatOptions.map((opt) => ({
    value: opt.value,
    label: opt.label,
  }))}
/>
```

**Features**:
- rough.js Border mit 8px Radius
- Zentrierter Text (`textAlign: 'center'`)
- Hover-Effekt: Border wechselt von `#3a3a3a` → `#AC8E66`
- Default Größe: 200px × 48px

### 2. Goldener Pfeil
**Verwendung**: Visuelle Verbindung zwischen den Formaten

```tsx
<div className="text-[#AC8E66] my-32">
  <FontAwesomeIcon icon={faArrowRight} size="2x" rotation={90} />
</div>
```

**Features**:
- FontAwesome Icon um 90° rotiert (zeigt nach unten)
- Goldene Farbe `#AC8E66`
- Symmetrischer Abstand oben/unten durch `my-32`

### 3. ZenRoughButton
**Verwendung**: Navigation zum nächsten Step

```tsx
<ZenRoughButton
  label="Weiter"
  icon={<FontAwesomeIcon icon={faArrowRight} className="text-[#AC8E66]" />}
  onClick={onNext}
/>
```

## Data Flow

```
User wählt Format
    ↓
onChange Event
    ↓
onFromFormatChange(newFormat) / onToFormatChange(newFormat)
    ↓
ConverterScreen: setFromFormat() / setToFormat()
    ↓
State Update
    ↓
Re-Render mit neuem Format
    ↓
User klickt "Weiter"
    ↓
onNext()
    ↓
ConverterScreen: setCurrentStep(2)
    ↓
Wechsel zu Step 2
```

## State Management

Der State wird **nicht** in Step1 verwaltet, sondern im Parent (ConverterScreen):

```typescript
// In ConverterScreen.tsx
const [fromFormat, setFromFormat] = useState<SupportedFormat>('code');
const [toFormat, setToFormat] = useState<SupportedFormat>('md');

// Props für Step1
<Step1FormatSelection
  fromFormat={fromFormat}
  toFormat={toFormat}
  formatOptions={formatOptions}
  onFromFormatChange={setFromFormat}
  onToFormatChange={setToFormat}
  onNext={() => setCurrentStep(2)}
/>
```

**Warum?**
- Step-übergreifende Daten müssen zentral gespeichert werden
- Step 3 braucht die Format-Auswahl für die Konvertierung
- Single Source of Truth Prinzip

## Validierung

**Keine explizite Validierung nötig**, weil:
1. Dropdowns bieten nur gültige Optionen
2. Default-Werte sind immer gesetzt (`code` → `md`)
3. User kann immer "Weiter" klicken (keine Bedingungen)

## Rendering Logik

```typescript
// In ConverterScreen.tsx
const renderStepContent = () => {
  switch (currentStep) {
    case 1:
      return (
        <Step1FormatSelection
          fromFormat={fromFormat}
          toFormat={toFormat}
          formatOptions={formatOptions}
          onFromFormatChange={setFromFormat}
          onToFormatChange={setToFormat}
          onNext={() => setCurrentStep(2)}
        />
      );
    // ...
  }
};
```

## CSS Klassen

```css
.flex-1              /* Nimmt verfügbaren Platz ein */
.flex-col            /* Vertikales Layout */
.items-center        /* Horizontal zentriert */
.justify-center      /* Vertikal zentriert */
.px-6               /* Padding links/rechts */

/* Typography */
.font-mono          /* Monospace Font */
.text-3xl           /* 30px Font Size */
.text-[#e5e5e5]     /* Helles Grau für Text */
.text-[#AC8E66]     /* Gold für Akzente */
.text-[#777]        /* Dunkleres Grau für Info */
```

## Best Practices

### ✅ DO
- Großzügige Abstände verwenden (`mb-20`, `mb-32`)
- Props von Parent übernehmen (nicht eigenen State)
- Zen-Komponenten verwenden (ZenDropdown, ZenRoughButton)
- Klare, semantische Callback-Namen

### ❌ DON'T
- Keine eigenen useState-Hooks in der Komponente
- Keine direkte API-Calls (gehört in Parent)
- Keine Sideffects in Callbacks
- Keine Magic Numbers (immer Tailwind-Klassen)

## Erweiterungen

### Weitere Formate hinzufügen:
```typescript
// In ConverterScreen.tsx
const formatOptions: FormatOption[] = [
  // ... bestehende Formate
  { value: 'xml', label: 'XML', icon: faFileCode },
  { value: 'yaml', label: 'YAML', icon: faFileLines },
];
```

### Custom Validierung:
```typescript
// Beispiel: Verhindere gleiche Formate
const handleNext = () => {
  if (fromFormat === toFormat) {
    alert('Quell- und Zielformat müssen unterschiedlich sein');
    return;
  }
  onNext();
};
```

## Performance

**Optimierungen**:
- Keine unnötigen Re-Renders (Props von Parent kontrolliert)
- formatOptions als Konstante außerhalb der Komponente
- Callbacks mit useCallback wrappen (optional)

```typescript
// Optional in ConverterScreen.tsx
const handleFromFormatChange = useCallback((format: SupportedFormat) => {
  setFromFormat(format);
}, []);
```

## Testing Checkliste

- [ ] User kann "Von Format" auswählen
- [ ] User kann "Nach Format" auswählen
- [ ] Ausgewählte Werte werden korrekt angezeigt
- [ ] "Weiter" Button führt zu Step 2
- [ ] Spacing ist korrekt (visueller Test)
- [ ] Hover-Effekte funktionieren
- [ ] Alle Formate in Dropdowns vorhanden

## Accessibility

```tsx
// Label für Screen Reader
<label className="text-[#999] text-sm font-mono mb-3">
  Von Format:
</label>

// Button mit aria-label
<button aria-label="Zum nächsten Schritt">
  Weiter
</button>
```

## Zusammenfassung

Step 1 ist eine **reine Präsentations-Komponente** (Presentational Component):
- Kein eigener State
- Nur UI-Rendering
- Props-driven
- Callbacks für Interaktionen
- Folgt Zen Design Prinzipien

Der State lebt im **ConverterScreen** (Container Component):
- Verwaltet alle Steps
- Koordiniert Datenfluss
- Enthält Business Logic
