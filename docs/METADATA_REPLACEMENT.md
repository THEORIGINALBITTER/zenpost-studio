# Metadata Placeholder Replacement System

## Übersicht

Das System ersetzt automatisch Platzhalter in AI-generierten Dokumenten durch echte Metadaten-Werte.

## Wie es funktioniert

### 1. Metadaten-Erfassung
- **Standard-Felder**: Werden im Projekt-Metadaten Modal eingegeben
- **Dynamische Felder**: Werden aus YAML Frontmatter extrahiert (z.B. aus README.md)

### 2. AI-Generierung
- AI generiert Dokumente basierend auf Prompts
- AI kann trotz Anweisungen manchmal Platzhalter ausgeben (z.B. `[Author Name]`)

### 3. Post-Processing (NEUE FUNKTION)
Nach der AI-Generierung werden automatisch folgende Platzhalter ersetzt:

#### Author Placeholders
- `[Author Name]` → `metadata.authorName`
- `[author name]` → `metadata.authorName`
- `[Your Name]` → `metadata.authorName`
- `[your name]` → `metadata.authorName`

#### Email Placeholders
- `[your@email.com]` → `metadata.authorEmail`
- `[your-email]` → `metadata.authorEmail`
- `[Author Email]` → `metadata.authorEmail`
- `[author email]` → `metadata.authorEmail`

#### GitHub/Repository Placeholders
- `[your-github-username]` → Extrahiert aus `metadata.repository`
- `[github-username]` → Extrahiert aus `metadata.repository`

#### Company Placeholders
- `[Company Name]` → `metadata.companyName`
- `[company name]` → `metadata.companyName`

#### Year Placeholders
- `[Year]` → `metadata.year`
- `[year]` → `metadata.year`
- `[YYYY]` → `metadata.year`

#### Generic Placeholders
- `[Insert example code here]` → Entfernt (leer)
- `[Insert programming language here]` → Ersetzt durch `projectInfo.fileTypes[0]`
- `[Insert X]` → Entfernt (leer)

## Beispiel

### Eingabe (AI-Output):
```markdown
# My Project

Author: [Author Name]
Email: [your@email.com]
Copyright (c) [Year] [Company Name]
```

### Ausgabe (Nach Post-Processing):
```markdown
# My Project

Author: dem
Email: max@example.com
Copyright (c) 2025
```

## Implementierung

Die Replacement-Logik befindet sich in:
- **Datei**: `src/screens/DocStudioScreen.tsx`
- **Funktion**: `generateDocumentation()` (Zeilen 476-518)
- **Zeitpunkt**: Direkt nach AI-Generierung, vor `setGeneratedContent()`

## Vorteile

✅ **Zuverlässig**: Funktioniert auch wenn AI-Prompts ignoriert werden
✅ **Vollständig**: Ersetzt alle gängigen Platzhalter-Varianten
✅ **Automatisch**: Keine manuelle Nachbearbeitung erforderlich
✅ **Erweiterbar**: Neue Platzhalter können einfach hinzugefügt werden

## Erweiterung

Um neue Platzhalter hinzuzufügen, erweitere das `replacements` Object in `DocStudioScreen.tsx:480`:

```typescript
const replacements: Record<string, string> = {
  // ... bestehende Einträge ...
  '\\[New Placeholder\\]': metadata.newField || '',
};
```

**Wichtig**: Verwende `\\[` und `\\]` um eckige Klammern zu escapen (Regex).
