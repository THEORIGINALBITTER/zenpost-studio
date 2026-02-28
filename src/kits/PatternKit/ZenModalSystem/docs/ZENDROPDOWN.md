# ZenDropdown

`ZenDropdown` ist das zentrale Select/Dropdown-Element im ZenModal-System.

## Varianten

- `variant="default"`  
  Standard-Dropdown für allgemeine UI-Bereiche.

- `variant="input"`  
  Kompakter Input-Look für Formularreihen und dichte Controls.

- `variant="button"`  
  Button-orientierter Look für Reihen mit `ZenRoughButton` (visuell angeglichen).

- `variant="compact"`  
  Legacy-Alias, wird intern wie `input` behandelt (für bestehende Aufrufe).

## Wichtige Props

- `value: string`
- `onChange: (value: string) => void`
- `options: Array<{ value: string; label: string }>`
- `variant?: "default" | "input" | "button" | "compact"`
- `theme?: "dark" | "paper"`
- `triggerHeight?: number` (optional, nur für gezielte lokale Feinjustierung)

## Beispiele

```tsx
<ZenDropdown
  value={platform}
  onChange={setPlatform}
  options={platformOptions}
  variant="default"
/>
```

```tsx
<ZenDropdown
  value={platform}
  onChange={setPlatform}
  options={platformOptions}
  variant="input"
/>
```

```tsx
<ZenDropdown
  value={platform}
  onChange={setPlatform}
  options={platformOptions}
  variant="button"
/>
```

## Hinweis zur Konsistenz

Wenn Dropdown und `ZenRoughButton` in derselben Zeile stehen, bevorzugt:

1. `variant="button"` für `ZenDropdown`
2. `size="small"` für `ZenRoughButton`
3. `triggerHeight` nur bei Restabweichungen nutzen
