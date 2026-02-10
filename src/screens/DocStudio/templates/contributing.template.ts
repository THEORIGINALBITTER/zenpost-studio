/**
 * Contributing Guidelines Template
 * Anleitung für Projekt-Beiträge
 */

export const contributingTemplate = `# Contributing Guidelines

Vielen Dank für dein Interesse an [Projektname]! 🎉

## Wie du beitragen kannst

### 🐛 Bugs melden

1. Prüfe zuerst, ob der Bug bereits gemeldet wurde
2. Erstelle ein neues Issue mit:
   - Klare Beschreibung des Problems
   - Schritte zur Reproduktion
   - Erwartetes vs. tatsächliches Verhalten
   - Screenshots (falls relevant)
   - Umgebungsdetails (OS, Browser, Version)

### 💡 Features vorschlagen

1. Erstelle ein Issue mit dem Label \`enhancement\`
2. Beschreibe den Use-Case
3. Erkläre, warum dieses Feature nützlich wäre

### 🔧 Code beitragen

#### Setup

\`\`\`bash
# Repository forken und klonen
git clone https://github.com/[dein-username]/[repo].git
cd [repo]

# Dependencies installieren
npm install

# Development Server starten
npm run dev
\`\`\`

#### Workflow

1. **Branch erstellen**
   \`\`\`bash
   git checkout -b feature/mein-feature
   # oder
   git checkout -b fix/mein-bugfix
   \`\`\`

2. **Änderungen machen**
   - Schreibe sauberen, lesbaren Code
   - Füge Tests hinzu wenn möglich
   - Halte dich an den Code-Style

3. **Committen**
   \`\`\`bash
   git add .
   git commit -m "feat: Kurze Beschreibung"
   \`\`\`

   Commit-Message Format:
   - \`feat:\` Neues Feature
   - \`fix:\` Bug-Fix
   - \`docs:\` Dokumentation
   - \`style:\` Formatierung
   - \`refactor:\` Code-Refactoring
   - \`test:\` Tests
   - \`chore:\` Sonstiges

4. **Push & Pull Request**
   \`\`\`bash
   git push origin feature/mein-feature
   \`\`\`
   - Erstelle einen Pull Request
   - Beschreibe deine Änderungen
   - Verlinke relevante Issues

## Code Style

- Wir nutzen [ESLint/Prettier] für Code-Formatierung
- Führe \`npm run lint\` vor dem Commit aus
- TypeScript: Strenge Typisierung bevorzugt

## Tests

\`\`\`bash
# Alle Tests ausführen
npm test

# Tests mit Coverage
npm run test:coverage

# Spezifische Tests
npm test -- --grep "Testname"
\`\`\`

## Review-Prozess

1. Mindestens ein Maintainer muss den PR genehmigen
2. Alle Tests müssen bestanden werden
3. Keine Merge-Konflikte

## Verhaltenskodex

- Sei respektvoll und inklusiv
- Konstruktives Feedback geben
- Hilf anderen Contributor:innen

## Fragen?

- Erstelle ein Issue mit dem Label \`question\`
- Kontaktiere uns unter [E-Mail/Discord/etc.]

---

Danke für deinen Beitrag! 🙏
`;
