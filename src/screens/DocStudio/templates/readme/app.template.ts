/**
 * README Template für Apps/Webapps
 * Fokus: Screenshots, Getting Started, Features, Deployment
 */

export const appTemplate = `# [App-Name]

> [Ein Satz, der beschreibt, was die App macht]

![App Screenshot](./docs/screenshot.png)

## Features

- [Feature 1] - [Kurze Beschreibung]
- [Feature 2] - [Kurze Beschreibung]
- [Feature 3] - [Kurze Beschreibung]
- [Feature 4] - [Kurze Beschreibung]

## Demo

[Live Demo](https://example.com) | [Video-Walkthrough](https://youtube.com/...)

## Voraussetzungen

- Node.js 18+
- [Weitere Voraussetzung]

## Installation

\`\`\`bash
# Repository klonen
git clone https://github.com/[user]/[repo].git
cd [repo]

# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev
\`\`\`

Die App ist dann unter \`http://127.0.0.1:3000\` erreichbar.

## Konfiguration

Erstelle eine \`.env\` Datei im Root-Verzeichnis:

\`\`\`env
# Beispiel-Konfiguration
DATABASE_URL=your-database-url
API_KEY=your-api-key
\`\`\`

| Variable | Beschreibung | Erforderlich |
|----------|--------------|--------------|
| \`DATABASE_URL\` | Datenbank-Verbindung | Ja |
| \`API_KEY\` | API-Schlüssel | Ja |

## Projektstruktur

\`\`\`
src/
├── components/     # UI-Komponenten
├── pages/          # Seiten/Routes
├── hooks/          # Custom Hooks
├── services/       # API-Services
├── utils/          # Hilfsfunktionen
└── styles/         # Stylesheets
\`\`\`

## Verfügbare Scripts

| Script | Beschreibung |
|--------|--------------|
| \`npm run dev\` | Startet Entwicklungsserver |
| \`npm run build\` | Erstellt Production-Build |
| \`npm run test\` | Führt Tests aus |
| \`npm run lint\` | Prüft Code-Style |

## Technologie-Stack

- **Frontend:** [React/Vue/Svelte]
- **Styling:** [Tailwind/CSS Modules/Styled Components]
- **State:** [Zustand/Redux/Pinia]
- **Backend:** [Tauri/Electron/Node]

## Deployment

### Vercel/Netlify

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Docker

\`\`\`bash
docker build -t [app-name] .
docker run -p 3000:3000 [app-name]
\`\`\`

## Roadmap

- [ ] [Geplantes Feature 1]
- [ ] [Geplantes Feature 2]
- [ ] [Geplantes Feature 3]

## Contributing

Beiträge sind willkommen! Siehe [CONTRIBUTING.md](CONTRIBUTING.md).

## Lizenz

[MIT](LICENSE) © [Autor/Organisation]

---

Built with [Framework] | [Dein Name/Team]
`;
