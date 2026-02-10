import { ReactNode } from 'react';
import packageJson from '../../../../../package.json';

export interface ModalHeaderConfig {
  title: string;
  subtitle?: string | ReactNode;

  // NEU: Zweite Subtitle-Zeile
  subtitle2?: string | ReactNode;
  subtitleColor2?: string;
  subtitleSize2?: string;

  titleColor?: string;
  subtitleColor?: string;
  titleSize?: string;
  subtitleSize?: string;
}

export interface InfoBoxLink {
  label: string;
  url: string;
}

export interface InfoBoxConfig {
  title: string;
  description: string;
  links?: InfoBoxLink[];
  type?: 'info' | 'warning' | 'success' | 'error';
}

export interface SliderConfig {
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  minLabel?: string;
  maxLabel?: string;
  valueFormatter?: (value: number) => string;
}

export interface ModalPreset extends ModalHeaderConfig {
  id: string;
  minHeight?: string;
  maxHeight?: string;
  minWidth?: string;
  maxWidth?: string;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODAL CONTENT - Zentrale Bedeutung/Inhalt der Modals
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Trennung von Layout (ZenModal) und Inhalt (MODAL_CONTENT):
 * - ZenModal = Form / Hülle
 * - MODAL_CONTENT = Bedeutung / Kontext
 * - PlannerModal etc. = Handlung / Aktion
 */
export type ModalContentConfig = {
  title: string;
  subtitle?: string;
  headerBg?: string;
  accentColor?: string;
};

export const MODAL_CONTENT = {
  planner: {
    title: 'Planen & Organisieren',
    subtitle: 'Plane deine Posts, verwalte deinen Kalender und tracke deinen Fortschritt',
  },
  contentStudio: {
    title: 'Doc Studio',
    subtitle: 'Projekt verwalten, Dokumente öffnen und Metadaten bearbeiten',
  },
  docStudio: {
    title: 'Doc Studio',
    subtitle: 'Erstellen, strukturieren und weiterverarbeiten von Inhalten',
  },
  converter: {
    title: 'Converter Studio',
    subtitle: 'Dateien in Markdown umwandeln',
  },
  settings: {
    title: 'System Einstellungen',
    subtitle: 'AI Provider & Social Media APIs konfigurieren',
  },
  about: {
    title: 'ZenPost Studio',
    subtitle: `Version ${packageJson.version}`,
  },
} satisfies Record<string, ModalContentConfig>;

export const AI_TEMPERATURE_INFO: InfoBoxConfig = {
  title: 'Stil-Regler',
  description:
    'Niedrige Werte (z.B. 0.1) liefern schneller, aber ungenauer Ergebnisse. Höhere Werte (1.0) sind genauer, brauchen jedoch länger. Ich empfehle dir,beginne mit 0.1 und erhöhe bei Bedarf.',
  links: [
    {
      label: 'Stil-Regler erklärt',
      url: 'https://theoriginalbitter.github.io/zenpost-studio/#/ai-setup?id=temperature',
    },
  ],
  type: 'info',
};


/**
 * Hilfsfunktion zum Abrufen eines Modal-Contents
 * @param contentId - Die ID des gewünschten Contents
 * @returns Der Modal-Content oder undefined
 */
export const getModalContent = (contentId: keyof typeof MODAL_CONTENT): ModalContentConfig => {
  return MODAL_CONTENT[contentId];
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODAL PRESETS - Styling-Definitionen
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Zentrale Konfiguration für alle Modal-Presets
 * Ermöglicht konsistente Styling-Definitionen und einfache Wartung
 */
export const MODAL_PRESETS: Record<string, ModalPreset> = {
  'ai-settings': {
    id: 'ai-settings',
    title: 'AI-Einstellungen',
    subtitle: 'Konfiguriere deinen AI-Provider für Content-Transformation',
    titleColor: '#AC8E66',
    subtitleColor: '#ccc',
    titleSize: '15px',
    subtitleSize: '11px',
    minHeight: '520px',
    maxHeight: '720px',
    minWidth: '520px',
  },
  'about': {
    id: 'about',
    title: 'ZenStudio Publisher',
    subtitle: `Version ${packageJson.version}`,
    titleColor: '#AC8E66',
    subtitleColor: '#dbd9d5',
    titleSize: '24px',
    subtitleSize: '9px',
    minHeight: '480px',
  },
 'metadata': {
  id: 'metadata',
  title: 'Projekt-Metadaten',
  subtitle: 'Gib deine Projekt-Informationen ein. Diese werden in die generierten Dokumente eingefügt.',
  titleColor: '#AC8E66',
  subtitleColor: '#dbd9d5',
  titleSize: '24px',
  subtitleSize: '11px',
  minHeight: '700px',   // vorher 600
  maxHeight: '90vh',
  minWidth: '800px',
  maxWidth: "900px"    // vorher undefined
   // optional
},

//. modal Home

'home': {
  id: 'home',
  title: 'Zur Startseite wechseln',
  subtitle: 'Bestätige den Wechsel',
  titleColor: '#AC8E66',
  subtitleColor: '#dbd9d5',
  titleSize: '18px',
  subtitleSize: '11px',
  minHeight: '300px',
  minWidth: '480px',
},

// Save Success Modal
'save-success': {
  id: 'save-success',
  title: 'Erfolgreich gespeichert',
  subtitle: 'Deine Datei wurde im Projekt gespeichert',
  titleColor: '#AC8E66',
  subtitleColor: '#dbd9d5',
  titleSize: '18px',
  subtitleSize: '11px',
  minHeight: '240px',
  minWidth: '480px',
},

// Bug Report Modal
'bug-report': {
  id: 'bug-report',
  title: 'Bugs melden',
  subtitle: 'So hilfst du mir beim Debugging',
  titleColor: '#AC8E66',
  subtitleColor: '#dbd9d5',
  titleSize: '18px',
  subtitleSize: '11px',
  minHeight: '320px',
  minWidth: '520px',
},

// Mail Success Modal
'mail-success': {
  id: 'mail-success',
  title: 'E-Mail gesendet',
  subtitle: 'Danke für dein Feedback',
  titleColor: '#AC8E66',
  subtitleColor: '#dbd9d5',
  titleSize: '18px',
  subtitleSize: '11px',
  minHeight: '220px',
  minWidth: '420px',
},

// Project Change Confirmation Modal
'project-change': {
  id: 'project-change',
  title: 'Projektordner wechseln?',
  subtitle: 'Wähle einen neuen Projektordner für deine Dokumentation',
  titleColor: '#AC8E66',
  subtitleColor: '#dbd9d5',
  titleSize: '18px',
  subtitleSize: '11px',
  minHeight: '300px',
  minWidth: '480px',
  maxWidth: '600px',
},

// Posten Platform Selection Modal
'posten-select': {
  id: 'posten-select',
  title: 'Plattformen wählen',
  subtitle: 'Wähle eine oder mehrere Plattformen für dein Posting',
  titleColor: '#AC8E66',
  subtitleColor: '#dbd9d5',
  titleSize: '18px',
  subtitleSize: '11px',
  minHeight: '480px',
  minWidth: '620px',
  maxWidth: '600px',
},

// Posten Method Choice Modal
'posten-method': {
  id: 'posten-method',
  title: 'Posting-Methode wählen',
  subtitle: 'Wie möchtest du deinen Content veröffentlichen?',
  titleColor: '#AC8E66',
  subtitleColor: '#dbd9d5',
  titleSize: '18px',
  subtitleSize: '11px',
  minHeight: '320px',
  minWidth: '480px',
},

  // Weitere Modal-Presets können hier hinzugefügt werden
  'default': {
    id: 'default',
    title: 'Modal',
    titleColor: '#AC8E66',
    subtitleColor: '#dbd9d5',
    titleSize: '24px',
    subtitleSize: '11px',
    minHeight: '400px',
  },
};

/**
 * Hilfsfunktion zum Abrufen eines Modal-Presets
 * @param presetId - Die ID des gewünschten Presets
 * @returns Das Modal-Preset oder das Default-Preset
 */
export const getModalPreset = (presetId: string): ModalPreset => {
  return MODAL_PRESETS[presetId] || MODAL_PRESETS['default'];
};

/**
 * Hilfsfunktion zum Erstellen eines Custom-Presets basierend auf einem existierenden
 * @param basePresetId - Die ID des Basis-Presets
 * @param overrides - Optionen zum Überschreiben
 * @returns Ein neues Preset mit überschriebenen Werten
 */
export const createCustomPreset = (
  basePresetId: string,
  overrides: Partial<ModalPreset>
): ModalPreset => {
  const basePreset = getModalPreset(basePresetId);
  return {
    ...basePreset,
    ...overrides,
  };
};

/**
 * Info-Box Konfigurationen für verschiedene AI-Provider
 */
export const AI_PROVIDER_INFO: Record<string, InfoBoxConfig> = {
  openai: {
    title: 'OpenAI',
    description: 'Benötigt API-Key von platform.openai.com',
    links: [
      {
        label: 'API-Key erstellen',
        url: 'https://platform.openai.com/api-keys',
      },
      {
        label: 'Setup-Anleitung',
        url: 'https://theoriginalbitter.github.io/zenpost-studio/#/ai-setup?id=openai',
      },
    ],
    type: 'info',
  },
  anthropic: {
    title: 'Anthropic',
    description: 'Benötigt API-Key von console.anthropic.com',
    links: [
      {
        label: 'API-Key erstellen',
        url: 'https://console.anthropic.com/settings/keys',
      },
      {
        label: 'Setup-Anleitung',
        url: 'https://theoriginalbitter.github.io/zenpost-studio/#/ai-providers/anthropic-setup?id=%F0%9F%94%91-step-3-generate-api-key',
      },
    ],
    type: 'info',
  },
  ollama: {
    title: 'Ollama',
    description: 'Lokale AI, keine API-Key benötigt. Stelle sicher, dass Ollama läuft (ollama serve).',
    links: [
      {
        label: 'Setup-Anleitung',
        url: 'https://theoriginalbitter.github.io/zenpost-studio/#/ai-setup?id=ollama',
      },
    ],
    type: 'success',
  },
  custom: {
    title: 'Custom API',
    description: 'Nutze deine eigene AI-API-Implementierung.',
    links: [
      {
        label: 'Setup-Anleitung',
        url: 'https://theoriginalbitter.github.io/zenpost-studio/#/ai-setup?id=custom',
      },
    ],
    type: 'info',
  },
};

/**
 * Hilfsfunktion zum Abrufen der Provider-Info
 * @param provider - Der AI-Provider Name
 * @returns Die InfoBox-Konfiguration
 */
export const getProviderInfo = (provider: string): InfoBoxConfig | undefined => {
  return AI_PROVIDER_INFO[provider];
};

/**
 * Slider-Konfigurationen für verschiedene Zwecke
 */
export const SLIDER_CONFIGS: Record<string, SliderConfig> = {
  temperature: {
    label: 'Stil wählen',
    min: 0,
    max: 1,
    step: 0.1,
    defaultValue: 0.3,
    minLabel: 'Präzise (0.0)',
    maxLabel: 'Kreativ (1.0)',
    valueFormatter: (v) => v.toFixed(1),
  },
  topP: {
    label: 'Top P',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.9,
    minLabel: 'Konservativ',
    maxLabel: 'Explorativ',
    valueFormatter: (v) => v.toFixed(2),
  },
  maxTokens: {
    label: 'Max Tokens',
    min: 100,
    max: 4000,
    step: 100,
    defaultValue: 1000,
    minLabel: '100',
    maxLabel: '4000',
    valueFormatter: (v) => v.toString(),
  },
};

/**
 * Hilfsfunktion zum Abrufen einer Slider-Config
 * @param sliderName - Der Name des Sliders
 * @returns Die Slider-Konfiguration
 */
export const getSliderConfig = (sliderName: string): SliderConfig | undefined => {
  return SLIDER_CONFIGS[sliderName];
};
