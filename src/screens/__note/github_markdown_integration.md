# GitHub Markdown Integration - Implementierungsplan

## Problem

GitHub Flavored Markdown (GFM) hat spezielle Syntax-Erweiterungen:
- Task Lists: `- [ ] Todo item`
- Tables: `| Header | Header |`
- Strikethrough: `~~text~~`
- Autolinks: `https://example.com`
- Emoji: `:smile:` → 😄

**Standard Markdown** vs **GitHub Markdown** müssen unterschiedlich behandelt werden.

## Wo sollten wir es einbauen?

### ❌ **Option 1: Step 1 (Format Selection)**
```
Problem:
- Zu früh im Flow
- User wählt nur "Markdown" aus
- Keine Unterscheidung zwischen Standard MD / GitHub MD
```

### ✅ **Option 2: Step 1 erweitern mit Sub-Formaten** (EMPFOHLEN)
```
Lösung:
- Markdown → Markdown (Standard)
- Markdown → Markdown (GitHub)
- JSON → Markdown (GitHub)
```

**Vorteile:**
- User entscheidet sich gleich am Anfang
- Converter weiß genau, welches Format generiert werden soll
- Clean Separation of Concerns

### ⚠️ **Option 3: Step 3 mit Checkbox/Toggle**
```
Alternative:
- User wählt "Markdown" in Step 1
- In Step 3 erscheint Checkbox: "GitHub Flavored Markdown verwenden"
```

**Nachteil:**
- Extra UI-Element in Step 3
- Verwirrt User (eine Entscheidung zu viel)

## Implementierung: Option 2 (Empfohlen)

### 1. SupportedFormat erweitern

```typescript
// src/utils/fileConverter.ts
export type SupportedFormat =
  | 'json'
  | 'md'           // Standard Markdown
  | 'gfm'          // GitHub Flavored Markdown
  | 'html'
  | 'txt'
  | 'pdf'
  | 'code';
```

### 2. Format Options anpassen

```typescript
// src/screens/ConverterScreen.tsx
import { faGithub } from '@fortawesome/free-brands-svg-icons';

const formatOptions: FormatOption[] = [
  { value: 'code', label: 'Code (AI)', icon: faRobot },
  { value: 'json', label: 'JSON', icon: faFileCode },
  { value: 'md', label: 'Markdown', icon: faFileLines },
  { value: 'gfm', label: 'Markdown (GitHub)', icon: faGithub },  // NEU
  { value: 'html', label: 'HTML', icon: faFileAlt },
  { value: 'txt', label: 'Text', icon: faFileAlt },
  { value: 'pdf', label: 'PDF', icon: faFilePdf },
];
```

### 3. Converter Logic anpassen

```typescript
// src/utils/fileConverter.ts

/**
 * Markdown → GitHub Markdown
 * Fügt GFM-spezifische Features hinzu
 */
export function markdownToGithub(mdContent: string): ConversionResult {
  try {
    // 1. Parse mit marked (gfm: true ist bereits aktiviert)
    const html = marked.parse(mdContent);

    // 2. Zurück zu Markdown mit GFM-Extensions
    const gfmContent = turndownService.turndown(html);

    // 3. GFM-spezifische Enhancements
    let enhanced = gfmContent;

    // Task Lists erhalten
    enhanced = enhanced.replace(/\[ \]/g, '- [ ]');
    enhanced = enhanced.replace(/\[x\]/gi, '- [x]');

    // Emoji-Support
    enhanced = enhanced.replace(/:(\w+):/g, (match) => {
      // Emoji-Mapping (optional)
      return match;
    });

    return {
      success: true,
      data: enhanced,
    };
  } catch (error) {
    return {
      success: false,
      error: `GFM Konvertierung fehlgeschlagen: ${error}`,
    };
  }
}

/**
 * JSON → GitHub Markdown
 */
export function jsonToGithubMarkdown(jsonData: string | JSONContent): ConversionResult {
  try {
    // 1. Erst JSON → Standard Markdown
    const mdResult = jsonToMarkdown(jsonData);
    if (!mdResult.success || !mdResult.data) {
      return mdResult;
    }

    // 2. Dann Standard MD → GitHub MD
    return markdownToGithub(mdResult.data);
  } catch (error) {
    return {
      success: false,
      error: `JSON → GFM Konvertierung fehlgeschlagen: ${error}`,
    };
  }
}
```

### 4. convertFile() erweitern

```typescript
// src/utils/fileConverter.ts

export async function convertFile(
  content: string,
  fromFormat: SupportedFormat,
  toFormat: SupportedFormat,
  fileName: string = ''
): Promise<ConversionResult> {

  // ... bestehende Konvertierungen ...

  // NEUE GitHub Markdown Konvertierungen
  if (toFormat === 'gfm') {
    switch (fromFormat) {
      case 'json':
        return jsonToGithubMarkdown(content);
      case 'md':
        return markdownToGithub(content);
      case 'html':
        const mdResult = htmlToMarkdown(content);
        if (mdResult.success && mdResult.data) {
          return markdownToGithub(mdResult.data);
        }
        return mdResult;
      case 'code':
        const aiResult = await codeToReadme(content);
        if (aiResult.success && aiResult.data) {
          return markdownToGithub(aiResult.data);
        }
        return aiResult;
      default:
        return textToMarkdown(content);
    }
  }

  // ... rest of function ...
}
```

### 5. File Extension Handler

```typescript
// src/utils/fileConverter.ts

export function getFileExtension(format: SupportedFormat): string {
  switch (format) {
    case 'json':
      return '.json';
    case 'md':
      return '.md';
    case 'gfm':
      return '.md';  // GitHub MD ist auch .md
    case 'html':
      return '.html';
    case 'txt':
      return '.txt';
    case 'pdf':
      return '.pdf';
    case 'code':
      return '.md';
    default:
      return '.txt';
  }
}

export function detectFormatFromFilename(filename: string): SupportedFormat | null {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'json':
      return 'json';
    case 'md':
    case 'markdown':
      return 'md';  // Standard, User kann zu GFM wechseln
    case 'html':
    case 'htm':
      return 'html';
    case 'txt':
    case 'text':
      return 'txt';
    case 'pdf':
      return 'pdf';
    default:
      return 'code';
  }
}
```

## GitHub Markdown Features

### 1. Task Lists
```markdown
Eingabe (Standard MD):
- [ ] Task 1
- [x] Task 2

Ausgabe (GFM):
- [ ] Task 1
- [x] Task 2
```

### 2. Tables
```markdown
Eingabe:
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |

Ausgabe (GFM - wird beibehalten):
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
```

### 3. Strikethrough
```markdown
Eingabe:
~~deleted text~~

Ausgabe (GFM):
~~deleted text~~
```

### 4. Autolinks
```markdown
Eingabe:
https://github.com

Ausgabe (GFM):
[https://github.com](https://github.com)
```

### 5. Code Blocks mit Syntax Highlighting
```markdown
Eingabe:
```javascript
const foo = 'bar';
```

Ausgabe (GFM - mit Language Identifier):
```javascript
const foo = 'bar';
```
```

## Konfiguration für marked

```typescript
// src/utils/fileConverter.ts

// Für Standard Markdown
const standardMarked = new marked.Marked({
  breaks: false,
  gfm: false,
});

// Für GitHub Markdown
const githubMarked = new marked.Marked({
  breaks: true,
  gfm: true,
  headerIds: true,
  mangle: false,
});

// Verwende je nach Format
export function parseMarkdown(content: string, isGithub: boolean = false) {
  const parser = isGithub ? githubMarked : standardMarked;
  return parser.parse(content);
}
```

## UI/UX Änderungen

### Step 1 Dropdown
```
Von Format:
├── Code (AI)
├── JSON
├── Markdown
├── Markdown (GitHub) ← NEU
├── HTML
├── Text
└── PDF

Nach Format:
├── Code (AI)
├── JSON
├── Markdown
├── Markdown (GitHub) ← NEU
├── HTML
├── Text
└── PDF
```

### Icon für GitHub Markdown
```typescript
import { faGithub } from '@fortawesome/free-brands-svg-icons';

{ value: 'gfm', label: 'Markdown (GitHub)', icon: faGithub }
```

## Testing

### Test Cases:
1. **JSON → GitHub Markdown**
   - Input: `{ "title": "Test", "content": "Hello" }`
   - Output: `# Test\n\nHello` (mit GFM features)

2. **Markdown → GitHub Markdown**
   - Input: Standard MD mit Tables
   - Output: Korrekt formatierte GFM Tables

3. **Code → GitHub Markdown (AI)**
   - Input: TypeScript Code
   - Output: README.md mit GFM code blocks

4. **HTML → GitHub Markdown**
   - Input: `<h1>Title</h1><ul><li>Item</li></ul>`
   - Output: `# Title\n\n- Item`

## Dependencies

Bereits installiert:
- ✅ `marked` (mit gfm: true Support)
- ✅ `turndown` (HTML → Markdown)

Neu benötigt:
- ❌ Keine! Alles bereits vorhanden

## Migration Path

### Phase 1: Backend Ready
1. `SupportedFormat` Type erweitern
2. `convertFile()` Funktion erweitern
3. Neue Converter-Funktionen hinzufügen

### Phase 2: UI Integration
1. `formatOptions` Array erweitern
2. GitHub Icon importieren
3. Step 1 testen

### Phase 3: Testing
1. Alle Konvertierungs-Kombinationen testen
2. Edge Cases prüfen
3. User Feedback sammeln

## Zusammenfassung

**Empfehlung: Option 2 - Step 1 erweitern**

✅ Vorteile:
- Clean implementation
- User entscheidet früh im Flow
- Keine zusätzlichen Steps
- Klar getrennte Formate

✅ Aufwand:
- Minimal (1-2 Stunden)
- Keine Breaking Changes
- Nutzt bestehende Infrastruktur

✅ User Experience:
- Intuitiv
- Keine Verwirrung
- GitHub-User erkennen sofort "Markdown (GitHub)"
