export interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  animationUrl?: string; // LottieFiles URL oder lokaler Pfad
  animationData?: object; // Direkt eingebettete Lottie JSON
  duration?: number; // Wie lange der Step angezeigt wird (in ms)
  tip?: string; // Zusätzlicher Tipp für den User
}

/**
 * Zentrale Konfiguration für alle Walkthrough-Steps
 * Definiert den kompletten Flow für das Content AI Studio Tutorial
 */
export const CONTENT_AI_STUDIO_STEPS: WalkthroughStep[] = [
  {
    id: 'step-1-welcome',
    title: 'Willkommen im Content AI Studio',
    description: 'Transformiere deinen Content mit KI-Power. Klicke auf den Button, um zu starten.',
    tip: 'Das Content AI Studio hilft dir, Inhalte in verschiedene Formate umzuwandeln.',
    // Animation wird später hinzugefügt
    animationData: undefined,
    duration: 3000,
  },
  {
    id: 'step-2-upload',
    title: 'Content eingeben',
    description: 'Füge deinen Text ein oder lade eine Datei hoch. Die KI verarbeitet verschiedene Formate.',
    tip: 'Du kannst auch Markdown, Plain Text oder strukturierte Daten verwenden.',
    animationData: undefined,
    duration: 3000,
  },
  {
    id: 'step-3-transform',
    title: 'KI-Transformation',
    description: 'Die KI analysiert deinen Content und transformiert ihn nach deinen Vorgaben.',
    tip: 'Die Transformation dauert nur wenige Sekunden.',
    animationData: undefined,
    duration: 4000,
  },
  {
    id: 'step-4-result',
    title: 'Ergebnis prüfen',
    description: 'Dein transformierter Content ist fertig! Du kannst ihn jetzt bearbeiten oder direkt verwenden.',
    tip: 'Die KI optimiert Format, Struktur und Stil deines Contents.',
    animationData: undefined,
    duration: 3000,
  },
  {
    id: 'step-5-export',
    title: 'Speichern & Exportieren',
    description: 'Speichere dein Ergebnis oder exportiere es in verschiedene Formate.',
    tip: 'Du kannst jederzeit zurückgehen und Änderungen vornehmen.',
    animationData: undefined,
    duration: 3000,
  },
];

/**
 * Hilfsfunktion zum Abrufen eines Steps
 */
export const getStep = (stepId: string): WalkthroughStep | undefined => {
  return CONTENT_AI_STUDIO_STEPS.find((step) => step.id === stepId);
};

/**
 * Hilfsfunktion zum Abrufen aller Step-IDs
 */
export const getAllStepIds = (): string[] => {
  return CONTENT_AI_STUDIO_STEPS.map((step) => step.id);
};

/**
 * Gesamtdauer des Walkthroughs (in ms)
 */
export const getTotalDuration = (): number => {
  return CONTENT_AI_STUDIO_STEPS.reduce((total, step) => total + (step.duration || 0), 0);
};

/**
 * Walkthrough Steps für das About Modal
 */
export const ABOUT_MODAL_STEPS: WalkthroughStep[] = [
  {
    id: 'about-1-overview',
    title: 'Über ZenPost Studio',
    description: 'ZenPost Studio ist dein Tool für Content-Konvertierung, KI-Transformation und Dokumentation.',
    tip: 'Nutze die verschiedenen Studios für unterschiedliche Workflows.',
    animationData: undefined,
    duration: 3000,
  },
  {
    id: 'about-2-wiki',
    title: 'Wiki & Dokumentation',
    description: 'Im Wiki findest du ausführliche Anleitungen und Dokumentation zu allen Features.',
    tip: 'Die Dokumentation wird regelmäßig aktualisiert.',
    animationData: undefined,
    duration: 3000,
  },
  {
    id: 'about-3-github',
    title: 'Open Source auf GitHub',
    description: 'ZenPost Studio ist Open Source. Schaue dir den Code an oder trage selbst bei!',
    tip: 'Issues und Feature-Requests sind willkommen.',
    animationData: undefined,
    duration: 3000,
  },
  {
    id: 'about-4-support',
    title: 'Support & Hilfe',
    description: 'Bei Fragen oder Problemen erreichst du den Support per E-Mail.',
    tip: 'Beschreibe dein Problem möglichst detailliert für schnelle Hilfe.',
    animationData: undefined,
    duration: 3000,
  },
];

/**
 * Walkthrough Steps für GitHub-bezogene Features
 */
export const GITHUB_STEPS: WalkthroughStep[] = [
  {
    id: 'github-1-repository',
    title: 'GitHub Repository',
    description: 'Verbinde dein GitHub Repository für Versionskontrolle und Zusammenarbeit.',
    tip: 'Du brauchst ein GitHub Personal Access Token für die Authentifizierung.',
    animationData: undefined,
    duration: 3000,
  },
  {
    id: 'github-2-sync',
    title: 'Synchronisation',
    description: 'Synchronisiere deine Content-Änderungen automatisch mit GitHub.',
    tip: 'Commits werden automatisch erstellt und können mit Commit-Messages versehen werden.',
    animationData: undefined,
    duration: 3000,
  },
  {
    id: 'github-3-branches',
    title: 'Branches & Pull Requests',
    description: 'Arbeite mit Branches und erstelle Pull Requests direkt aus dem Studio.',
    tip: 'Feature-Branches helfen dir, Änderungen sauber zu organisieren.',
    animationData: undefined,
    duration: 3000,
  },
  {
    id: 'github-4-history',
    title: 'Versions-Historie',
    description: 'Verfolge alle Änderungen und stelle frühere Versionen bei Bedarf wieder her.',
    tip: 'Die komplette Git-Historie bleibt erhalten.',
    animationData: undefined,
    duration: 3000,
  },
];
