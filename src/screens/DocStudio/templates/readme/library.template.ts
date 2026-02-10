/**
 * README Template für Libraries/Packages
 * Fokus: Installation, API-Referenz, Usage Examples
 */

export const libraryTemplate = `# [Paketname]

> [Kurze Beschreibung - was macht diese Library?]

## Installation

\`\`\`bash
# npm
npm install [paketname]

# yarn
yarn add [paketname]

# pnpm
pnpm add [paketname]
\`\`\`

## Schnellstart

\`\`\`typescript
import { [Hauptexport] } from '[paketname]';

const result = [Hauptexport]({
  // Optionen
});
\`\`\`

## API-Referenz

### \`[Hauptfunktion](options)\`

[Beschreibung der Hauptfunktion]

**Parameter:**

| Parameter | Typ | Standard | Beschreibung |
|-----------|-----|----------|--------------|
| \`option1\` | \`string\` | \`"default"\` | [Beschreibung] |
| \`option2\` | \`boolean\` | \`false\` | [Beschreibung] |

**Rückgabewert:** \`[Typ]\` - [Beschreibung]

**Beispiel:**

\`\`\`typescript
const result = [Hauptfunktion]({
  option1: 'wert',
  option2: true,
});
\`\`\`

### \`[WeitereFunction]()\`

[Beschreibung]

## Verwendungsbeispiele

### Einfache Verwendung

\`\`\`typescript
// Beispiel 1
\`\`\`

### Fortgeschrittene Verwendung

\`\`\`typescript
// Beispiel 2
\`\`\`

## TypeScript

Diese Library ist vollständig in TypeScript geschrieben und enthält Typ-Definitionen.

\`\`\`typescript
import type { [TypeName] } from '[paketname]';
\`\`\`

## Browser-Unterstützung

| Browser | Version |
|---------|---------|
| Chrome  | 80+     |
| Firefox | 75+     |
| Safari  | 13+     |
| Edge    | 80+     |

## Contributing

Beiträge sind willkommen! Siehe [CONTRIBUTING.md](CONTRIBUTING.md).

## Lizenz

[MIT](LICENSE) © [Autor/Organisation]
`;
