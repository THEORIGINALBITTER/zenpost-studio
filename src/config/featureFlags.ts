/**
 * ZenStudio Feature Flags Configuration
 * Defines which features are available in FREE vs PRO tiers
 */

export type LicenseTier = 'free' | 'pro';

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  tier: LicenseTier;
  category: 'editor' | 'export' | 'ai' | 'integration' | 'studio';
}

/**
 * All features and their tier requirements
 */
export const FEATURES: Record<string, FeatureFlag> = {
  // === EDITOR FEATURES ===
  CONTENT_AI_STUDIO: {
    id: 'CONTENT_AI_STUDIO',
    name: 'Content AI Studio',
    description: 'Transform content for social media platforms',
    tier: 'free',
    category: 'studio',
  },
  MARKDOWN_EDITOR: {
    id: 'MARKDOWN_EDITOR',
    name: 'Markdown Editor',
    description: 'Basic markdown editing with preview',
    tier: 'free',
    category: 'editor',
  },
  DOC_STUDIO: {
    id: 'DOC_STUDIO',
    name: 'Doc Studio',
    description: 'Advanced document editing and management',
    tier: 'pro',
    category: 'studio',
  },
  BLOCK_EDITOR: {
    id: 'BLOCK_EDITOR',
    name: 'Block Editor',
    description: 'Block-based editing with drag & drop',
    tier: 'pro',
    category: 'editor',
  },

  // === EXPORT FEATURES ===
  EXPORT_TXT: {
    id: 'EXPORT_TXT',
    name: 'Export as TXT',
    description: 'Export content as plain text',
    tier: 'free',
    category: 'export',
  },
  EXPORT_MD: {
    id: 'EXPORT_MD',
    name: 'Export as Markdown',
    description: 'Export content as Markdown file',
    tier: 'free',
    category: 'export',
  },
  EXPORT_PDF: {
    id: 'EXPORT_PDF',
    name: 'Export as PDF',
    description: 'Export content as PDF document',
    tier: 'pro',
    category: 'export',
  },
  EXPORT_HTML: {
    id: 'EXPORT_HTML',
    name: 'Export as HTML',
    description: 'Export content as HTML file',
    tier: 'pro',
    category: 'export',
  },

  // === AI FEATURES ===
  AI_OPENAI: {
    id: 'AI_OPENAI',
    name: 'OpenAI Integration',
    description: 'Use OpenAI models for content generation',
    tier: 'free',
    category: 'ai',
  },
  AI_ANTHROPIC: {
    id: 'AI_ANTHROPIC',
    name: 'Anthropic Claude',
    description: 'Use Claude models for content generation',
    tier: 'pro',
    category: 'ai',
  },
  AI_GROQ: {
    id: 'AI_GROQ',
    name: 'Groq Integration',
    description: 'Use Groq for fast inference',
    tier: 'pro',
    category: 'ai',
  },
  AI_OLLAMA: {
    id: 'AI_OLLAMA',
    name: 'Ollama (Local)',
    description: 'Use local Ollama models',
    tier: 'pro',
    category: 'ai',
  },
  AI_TEXT_PREVIEW: {
    id: 'AI_TEXT_PREVIEW',
    name: 'Preview Text AI',
    description: 'AI-powered text preview and enhancement',
    tier: 'pro',
    category: 'ai',
  },
  AI_AUTO_FORMAT: {
    id: 'AI_AUTO_FORMAT',
    name: 'AI Auto-Format',
    description: 'Automatically format text with AI',
    tier: 'pro',
    category: 'ai',
  },

  // === INTEGRATION FEATURES ===
  SOCIAL_MEDIA_API: {
    id: 'SOCIAL_MEDIA_API',
    name: 'Social Media API',
    description: 'Direct posting to social media platforms',
    tier: 'pro',
    category: 'integration',
  },
  GITHUB_INTEGRATION: {
    id: 'GITHUB_INTEGRATION',
    name: 'GitHub Integration',
    description: 'Sync and publish to GitHub',
    tier: 'pro',
    category: 'integration',
  },
  CONTENT_CALENDAR: {
    id: 'CONTENT_CALENDAR',
    name: 'Content Calendar',
    description: 'Schedule and plan content',
    tier: 'pro',
    category: 'integration',
  },
};

/**
 * Feature IDs grouped by tier for quick lookup
 */
export const FREE_FEATURES = Object.values(FEATURES)
  .filter((f) => f.tier === 'free')
  .map((f) => f.id);

export const PRO_FEATURES = Object.values(FEATURES)
  .filter((f) => f.tier === 'pro')
  .map((f) => f.id);

/**
 * Check if a feature requires PRO tier
 */
export const isProFeature = (featureId: string): boolean => {
  const feature = FEATURES[featureId];
  return feature?.tier === 'pro';
};

/**
 * Get all features in a category
 */
export const getFeaturesByCategory = (category: FeatureFlag['category']): FeatureFlag[] => {
  return Object.values(FEATURES).filter((f) => f.category === category);
};

/**
 * Pricing info
 */
export const PRICING = {
  pro: {
    monthly: 9.99,
    yearly: 79.99,
    lifetime: 149.99,
    currency: 'EUR',
  },
};
