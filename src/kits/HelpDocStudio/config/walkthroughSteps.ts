import type { WalkthroughStep } from '../components/WalkthroughOverlay';

export const GITHUB_STEPS: WalkthroughStep[] = [
  {
    title: 'GitHub Integration',
    description: 'Verbinde ZenPost Studio mit deinem GitHub Repository — für Versionskontrolle, automatische Commits und Branch-Management direkt aus der App.',
    icon: '⚙',
  },
  {
    title: 'Repository verbinden',
    description: 'Gib dein Personal Access Token (PAT) in den Einstellungen ein. Du brauchst mindestens die Scopes: repo und workflow.',
    icon: '🔑',
  },
  {
    title: 'Branch wählen',
    description: 'Wähle den Branch, auf dem deine Dokumente gespeichert werden sollen. Empfehlung: einen eigenen docs-Branch nutzen.',
    icon: '🌿',
  },
  {
    title: 'Docs pushen',
    description: 'Mit "Docs → GitHub" im Doc Studio kannst du alle generierten Markdown-Dateien mit einem Klick in dein Repository pushen.',
    icon: '🚀',
  },
];

export const ABOUT_MODAL_STEPS: WalkthroughStep[] = [
  {
    title: 'Willkommen bei ZenPost Studio',
    description: '1× schreiben. 9× transformieren. Deine Inhalte lokal, deine KI konfigurierbar, dein Workflow.',
    icon: '◆',
  },
  {
    title: 'Content AI Studio',
    description: 'Transformiere einen Text in LinkedIn-Posts, Threads, Newsletter, Dev.to-Artikel und mehr — mit einem Klick, mit vollem Kontrolle über Ton und Länge.',
    icon: '✦',
  },
  {
    title: 'Doc Studio',
    description: 'Generiere README, Changelog, API-Docs und mehr direkt aus deinem Projekt-Code. Scan, Template, Fertig.',
    icon: '📄',
  },
  {
    title: 'ZenEngine',
    description: 'Dein persönliches Regelwerk. Definiere Stilregeln, Suppression-Listen und Autocorrect — alles lokal, kein Cloud-Sync.',
    icon: '⚙',
  },
];
