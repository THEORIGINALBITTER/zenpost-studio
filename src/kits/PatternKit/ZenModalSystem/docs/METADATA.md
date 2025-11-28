# Projekt-Metadaten System

## Übersicht

Das Projekt-Metadaten Modal unterstützt sowohl **Standard-Felder** als auch **dynamische Felder** aus Dokumenten.

## Standard-Felder

Diese Felder sind immer verfügbar:

- **Autor-Informationen**
  - Name
  - E-Mail

- **Unternehmen & Lizenz**
  - Firmenname
  - Lizenz (MIT, Apache, GPL, etc.)
  - Jahr

- **Links & URLs**
  - Website
  - Repository URL
  - Contributing Guide URL

## Dynamische Felder

Metadaten werden automatisch aus dem Dokument extrahiert, wenn es ein **YAML Frontmatter** enthält:

### Beispiel Markdown mit Frontmatter

```markdown
---
title: Mein Artikel
author: John Doe
tags: react, typescript, tutorial
category: Development
publishedDate: 2025-01-15
---

# Mein Artikel Inhalt

Lorem ipsum...
```

### Extrahierte Felder

Die folgenden Felder werden automatisch erkannt und im Modal angezeigt:
- `title` → Title
- `author` → Author
- `tags` → Tags
- `category` → Category
- `publishedDate` → Published Date

## Verwendung

### Metadaten aus Dokument extrahieren

```typescript
import { extractMetadataFromContent } from './ZenMetadataModal';

const content = `
---
title: My Article
author: John Doe
tags: react, typescript
---

# Content here
`;

const metadata = extractMetadataFromContent(content);
// { title: 'My Article', author: 'John Doe', tags: 'react, typescript' }
```

### Modal mit Standard + Dynamischen Feldern

```typescript
import { ZenMetadataModal, extractMetadataFromContent } from './ZenMetadataModal';

// Standard-Metadaten
const standardMetadata = {
  authorName: 'Max Mustermann',
  authorEmail: 'max@example.com',
  companyName: 'Meine Firma GmbH',
  license: 'MIT',
  year: '2025',
  website: 'https://example.com',
  repository: 'https://github.com/user/repo',
  contributingUrl: 'https://github.com/user/repo/CONTRIBUTING.md',
};

// Dynamische Metadaten aus Dokument
const documentContent = `---
title: My Blog Post
category: Technology
tags: AI, Machine Learning
---

Content...`;

const dynamicMetadata = extractMetadataFromContent(documentContent);

// Kombiniert: Standard + Dynamisch
const combinedMetadata = {
  ...standardMetadata,
  ...dynamicMetadata,
};

<ZenMetadataModal
  isOpen={isOpen}
  onClose={handleClose}
  metadata={combinedMetadata}
  onSave={handleSave}
/>
```

## Unterstützte Frontmatter-Formate

### YAML Frontmatter (aktuell unterstützt)
```markdown
---
title: My Article
author: John Doe
---
```

### Zukünftige Erweiterungen
- TOML Frontmatter
- JSON Frontmatter
- HTML Meta-Tags Extraktion
- DOCX Properties Extraktion

## Features

✅ **Automatische Erkennung**: Frontmatter wird automatisch erkannt
✅ **Flexible Felder**: Beliebige Metadaten werden unterstützt
✅ **Standard + Dynamisch**: Standard-Felder bleiben immer verfügbar
✅ **Übersichtliche Anzeige**: Dynamische Felder in eigener Sektion
✅ **Bearbeitbar**: Alle Felder können bearbeitet werden

## Beispiel-Workflow

1. **Dokument hochladen** → Mit Frontmatter
2. **Metadaten extrahieren** → `extractMetadataFromContent()`
3. **Modal öffnen** → Zeigt Standard + Dynamische Felder
4. **Bearbeiten** → User kann alle Felder anpassen
5. **Speichern** → Kombinierte Metadaten werden gespeichert

## TypeScript Interface

```typescript
export interface ProjectMetadata {
  // Standard-Felder (immer vorhanden)
  authorName: string;
  authorEmail: string;
  companyName: string;
  license: string;
  year: string;
  website: string;
  repository: string;
  contributingUrl: string;

  // Dynamische Felder aus Dokument
  [key: string]: string;
}
```

## Best Practices

1. **Merge Strategy**: Immer Standard-Metadaten mit dynamischen Metadaten kombinieren
2. **Validation**: Dynamische Felder vor dem Speichern validieren
3. **User Feedback**: Zeige deutlich, welche Felder aus dem Dokument kommen
4. **Fallback**: Standard-Werte für fehlende Felder bereitstellen
