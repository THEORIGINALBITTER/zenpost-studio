/**
 * AI Service für Code-Analyse und README-Generierung
 * Unterstützt mehrere AI-Provider
 */

import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { isTauri } from '@tauri-apps/api/core';

export type AIProvider = 'openai' | 'anthropic' | 'ollama' | 'custom' | 'auto';

export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  temperature?: number;
}

export interface CodeAnalysisResult {
  success: boolean;
  readme?: string;
  error?: string;
}

/**
 * Content Transformation Types
 */
export type ContentPlatform =
  | 'linkedin'
  | 'devto'
  | 'twitter'
  | 'medium'
  | 'reddit'
  | 'github-discussion'
  | 'github-blog'
  | 'youtube'
  | 'blog-post';

export type ContentTone = 'professional' | 'casual' | 'technical' | 'enthusiastic';
export type ContentLength = 'short' | 'medium' | 'long';
export type ContentAudience = 'beginner' | 'intermediate' | 'expert';

export interface TransformConfig {
  platform: ContentPlatform;
  tone?: ContentTone;
  length?: ContentLength;
  audience?: ContentAudience;
  targetLanguage?: TargetLanguage;
}

export interface TransformResult {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * Standardkonfiguration
 */
const defaultConfig: AIConfig = {
  provider: 'ollama',
  model: 'llama3.1:latest',
  baseUrl: 'http://localhost:11434',
  temperature: 0.3,
};

/**
 * AI-Konfiguration aus LocalStorage laden
 */
export function loadAIConfig(): AIConfig {
  try {
    const stored = localStorage.getItem('zenpost_ai_config');
    if (stored) {
      return { ...defaultConfig, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Fehler beim Laden der AI-Konfiguration:', error);
  }
  return defaultConfig;
}

/**
 * AI-Konfiguration in LocalStorage speichern
 */
export function saveAIConfig(config: AIConfig): void {
  try {
    localStorage.setItem('zenpost_ai_config', JSON.stringify(config));
  } catch (error) {
    console.error('Fehler beim Speichern der AI-Konfiguration:', error);
  }
}

/**
 * Programmiersprache aus Code erkennen
 */
export function detectLanguage(code: string): string {
  // TypeScript/JavaScript
  if (
    code.includes('function ') ||
    code.includes('const ') ||
    code.includes('let ') ||
    code.includes('interface ') ||
    code.includes('type ') ||
    code.includes('export ') ||
    code.includes('import ')
  ) {
    if (code.includes('interface ') || code.includes('type ') || code.includes(': ')) {
      return 'typescript';
    }
    return 'javascript';
  }

  // Python
  if (
    code.includes('def ') ||
    code.includes('class ') ||
    code.includes('import ') ||
    code.includes('from ') ||
    code.includes('print(')
  ) {
    return 'python';
  }

  // Rust
  if (code.includes('fn ') || code.includes('let mut ') || code.includes('impl ')) {
    return 'rust';
  }

  // Go
  if (code.includes('func ') || code.includes('package ')) {
    return 'go';
  }

  // Java
  if (code.includes('public class ') || code.includes('private ')) {
    return 'java';
  }

  // C/C++
  if (code.includes('#include') || code.includes('int main(')) {
    return 'cpp';
  }

  return 'unknown';
}

/**
 * Erstelle Prompt für README-Generierung
 */
function createReadmePrompt(code: string, language: string, fileName?: string): string {
  return `Du bist ein Experte für technische Dokumentation. Analysiere den folgenden ${language}-Code und erstelle ein professionelles, strukturiertes README.md auf Deutsch.

${fileName ? `Dateiname: ${fileName}\n` : ''}
Sprache: ${language}

Code:
\`\`\`${language}
${code}
\`\`\`

Erstelle ein README.md mit folgender Struktur:

# [Projekt-/Modul-Name]

## Übersicht
[Kurze Beschreibung was der Code macht]

## Features
- [Hauptfunktionalitäten auflisten]

## Installation
\`\`\`bash
[Installations-Anweisungen falls relevant]
\`\`\`

## Verwendung
\`\`\`${language}
[Beispiel-Code wie man es verwendet]
\`\`\`

## API-Dokumentation

### Funktionen/Klassen
[Dokumentiere die wichtigsten Funktionen/Klassen mit Parametern und Rückgabewerten]

## Technische Details
[Wichtige technische Aspekte, Abhängigkeiten, etc.]

## Lizenz
[Falls erkennbar, sonst MIT vorschlagen]

Wichtig:
- Schreibe auf Deutsch
- Sei präzise und technisch korrekt
- Nutze Code-Beispiele wo sinnvoll
- Formatiere alles als Markdown
- Keine Einleitung wie "Hier ist das README", gib nur das README direkt aus`;
}

/**
 * OpenAI API Aufruf
 */
async function callOpenAI(
  config: AIConfig,
  prompt: string
): Promise<CodeAnalysisResult> {
  if (!config.apiKey) {
    return {
      success: false,
      error: 'OpenAI API-Key fehlt. Bitte in den Einstellungen konfigurieren.',
    };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: config.temperature || 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `OpenAI API Fehler: ${response.status} - ${errorData.error?.message || response.statusText}`,
      };
    }

    const data = await response.json();
    const readme = data.choices?.[0]?.message?.content;

    if (!readme) {
      return {
        success: false,
        error: 'Keine Antwort von OpenAI erhalten',
      };
    }

    return {
      success: true,
      readme: readme.trim(),
    };
  } catch (error) {
    return {
      success: false,
      error: `OpenAI Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
    };
  }
}

/**
 * Anthropic (Claude) API Aufruf
 */
async function callAnthropic(
  config: AIConfig,
  prompt: string
): Promise<CodeAnalysisResult> {
  if (!config.apiKey) {
    return {
      success: false,
      error: 'Anthropic API-Key fehlt. Bitte in den Einstellungen konfigurieren.',
    };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: config.temperature || 0.3,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `Anthropic API Fehler: ${response.status} - ${errorData.error?.message || response.statusText}`,
      };
    }

    const data = await response.json();
    const readme = data.content?.[0]?.text;

    if (!readme) {
      return {
        success: false,
        error: 'Keine Antwort von Claude erhalten',
      };
    }

    return {
      success: true,
      readme: readme.trim(),
    };
  } catch (error) {
    return {
      success: false,
      error: `Anthropic Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
    };
  }
}

/**
 * Ollama (lokale AI) Aufruf
 */
async function callOllama(
  config: AIConfig,
  prompt: string
): Promise<CodeAnalysisResult> {
  const baseUrl = config.baseUrl || 'http://localhost:11434';

  try {
    console.log('[Ollama] Making request to:', `${baseUrl}/api/chat`);
    console.log('[Ollama] Model:', config.model || 'llama3.1:latest');

    let response;
    try {
      // Determine which fetch to use based on environment
      const isRunningInTauri = isTauri();
      console.log('[Ollama] Running in Tauri:', isRunningInTauri);

      const requestBody = JSON.stringify({
        model: config.model || 'llama3.1:latest',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: false,
        options: {
          temperature: config.temperature || 0.3,
        },
      });

      if (isRunningInTauri) {
        // Use Tauri's fetch to avoid CORS issues with localhost
        response = await tauriFetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: requestBody,
        });
      } else {
        // Use standard fetch in browser (requires Ollama CORS to be enabled)
        response = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: requestBody,
        });
      }

      console.log('[Ollama] Response received:', response);
      console.log('[Ollama] Response status:', response.status);
      console.log('[Ollama] Response ok:', response.ok);
    } catch (fetchError) {
      console.error('[Ollama] Fetch error:', fetchError);
      const errorMsg = fetchError instanceof Error ? fetchError.message : JSON.stringify(fetchError);
      // Add helpful hint for CORS issues in browser
      const corsHint = !isTauri() ? ' Im Browser kann es CORS-Probleme geben. Starte Ollama mit: OLLAMA_ORIGINS=* ollama serve' : '';
      return {
        success: false,
        error: `Fetch Fehler: ${errorMsg}${corsHint}`,
      };
    }

    if (!response.ok) {
      console.log('[Ollama] Response not OK, getting error text...');
      const errorText = await response.text().catch(() => response.statusText);
      console.error('[Ollama] Error response:', errorText);
      return {
        success: false,
        error: `Ollama Fehler: ${response.status} - ${errorText}`,
      };
    }

    console.log('[Ollama] Parsing JSON response...');
    let data;
    try {
      data = await response.json();
      console.log('[Ollama] Parsed data:', data);
    } catch (jsonError) {
      console.error('[Ollama] JSON parse error:', jsonError);
      return {
        success: false,
        error: `JSON Parse Fehler: ${jsonError instanceof Error ? jsonError.message : 'Could not parse response'}`,
      };
    }

    const readme = data.message?.content;
    console.log('[Ollama] Content extracted:', readme ? `${readme.substring(0, 100)}...` : 'NO CONTENT');

    if (!readme) {
      return {
        success: false,
        error: 'Keine Antwort von Ollama erhalten',
      };
    }

    return {
      success: true,
      readme: readme.trim(),
    };
  } catch (error) {
    console.error('[Ollama] Unexpected error:', error);
    console.error('[Ollama] Error type:', typeof error);
    console.error('[Ollama] Error details:', JSON.stringify(error, null, 2));
    return {
      success: false,
      error: `Ollama Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}. Stelle sicher, dass Ollama läuft (http://localhost:11434)`,
    };
  }
}

/**
 * Custom API Aufruf
 */
async function callCustomAPI(
  config: AIConfig,
  prompt: string
): Promise<CodeAnalysisResult> {
  if (!config.baseUrl) {
    return {
      success: false,
      error: 'Custom API URL fehlt. Bitte in den Einstellungen konfigurieren.',
    };
  }

  try {
    const response = await fetch(config.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        prompt: prompt,
        model: config.model,
        temperature: config.temperature,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Custom API Fehler: ${response.status} - ${response.statusText}`,
      };
    }

    const data = await response.json();
    // Versuche verschiedene Response-Formate
    const readme = data.readme || data.response || data.text || data.content;

    if (!readme) {
      return {
        success: false,
        error: 'Keine gültige Antwort von Custom API erhalten',
      };
    }

    return {
      success: true,
      readme: readme.trim(),
    };
  } catch (error) {
    return {
      success: false,
      error: `Custom API Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
    };
  }
}

/**
 * Hauptfunktion: Code zu README konvertieren
 */
export async function codeToReadme(
  code: string,
  fileName?: string,
  customConfig?: Partial<AIConfig>
): Promise<CodeAnalysisResult> {
  // Validierung
  if (!code || code.trim().length < 10) {
    return {
      success: false,
      error: 'Code ist zu kurz oder leer',
    };
  }

  // Konfiguration laden
  const config = { ...loadAIConfig(), ...customConfig };

  // Sprache erkennen
  const language = detectLanguage(code);

  // Prompt erstellen
  const prompt = createReadmePrompt(code, language, fileName);

  // AI-Provider aufrufen
  switch (config.provider) {
    case 'openai':
      return await callOpenAI(config, prompt);
    case 'anthropic':
      return await callAnthropic(config, prompt);
    case 'ollama':
      return await callOllama(config, prompt);
    case 'custom':
      return await callCustomAPI(config, prompt);
    default:
      return {
        success: false,
        error: `Unbekannter AI-Provider: ${config.provider}`,
      };
  }
}

/**
 * Verfügbare Provider abfragen
 */
export function getAvailableProviders(): Array<{
  value: AIProvider;
  label: string;
  requiresApiKey: boolean;
}> {
  return [
    {
      value: 'auto',
      label: '✨ Auto (KI wählt)',
      requiresApiKey: false,
    },
    {
      value: 'openai',
      label: 'OpenAI (GPT-4, GPT-4o-mini)',
      requiresApiKey: true,
    },
    {
      value: 'anthropic',
      label: 'Anthropic (Claude)',
      requiresApiKey: true,
    },
    {
      value: 'ollama',
      label: 'Ollama (lokal)',
      requiresApiKey: false,
    },
    {
      value: 'custom',
      label: 'Custom API',
      requiresApiKey: false,
    },
  ];
}

/**
 * Verfügbare Modelle pro Provider
 */
export function getModelsForProvider(provider: AIProvider): string[] {
  switch (provider) {
    case 'auto':
      return []; // Auto-select doesn't need manual model selection
    case 'openai':
      return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
    case 'anthropic':
      return [
        'claude-3-5-sonnet-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
      ];
    case 'ollama':
      return [
        'llama3.2',
        'llama3.1',
        'llama2',
        'codellama',
        'mistral',
        'mixtral',
        'qwen2.5-coder',
      ];
    case 'custom':
      return [];
    default:
      return [];
  }
}

/**
 * Auto-Select: Analyze content and determine best AI provider
 */
export interface AutoSelectResult {
  provider: 'openai' | 'anthropic' | 'ollama';
  model: string;
  reason: string;
}

export function analyzeContentForAutoSelect(
  content: string,
  config: TransformConfig
): AutoSelectResult {
  const wordCount = content.split(/\s+/).length;
  const hasCode = /```|`[^`]+`/.test(content);
  const hasTechnicalTerms = /API|function|class|interface|typescript|javascript|react|vue|angular/i.test(content);
  const isCreative = config.tone === 'enthusiastic' || config.tone === 'casual';
  const isLong = config.length === 'long' || wordCount > 500;
  const isProfessional = config.tone === 'professional';

  // Check which providers are configured
  const aiConfig = loadAIConfig();
  const hasOpenAI = aiConfig.provider === 'openai' && aiConfig.apiKey;
  const hasAnthropic = aiConfig.provider === 'anthropic' && aiConfig.apiKey;

  // Decision tree for best AI selection

  // 1. Long, creative content -> Claude Opus (best for creative long-form)
  if (isLong && isCreative) {
    if (hasAnthropic) {
      return {
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
        reason: 'Claude Opus: Beste für lange, kreative Inhalte'
      };
    }
  }

  // 2. Technical content with code -> Claude Sonnet (excellent code understanding)
  if (hasTechnicalTerms || hasCode) {
    if (hasAnthropic) {
      return {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        reason: 'Claude Sonnet: Beste für technische Inhalte mit Code'
      };
    }
    if (hasOpenAI) {
      return {
        provider: 'openai',
        model: 'gpt-4o',
        reason: 'GPT-4o: Gut für technische Inhalte'
      };
    }
  }

  // 3. Professional business content -> GPT-4o (excellent for professional tone)
  if (isProfessional && config.platform === 'linkedin') {
    if (hasOpenAI) {
      return {
        provider: 'openai',
        model: 'gpt-4o',
        reason: 'GPT-4o: Optimal für professionelle Business-Posts'
      };
    }
  }

  // 4. Short, casual posts -> GPT-4o-mini or Claude Haiku (fast and cost-effective)
  if (!isLong && wordCount < 200) {
    if (hasOpenAI) {
      return {
        provider: 'openai',
        model: 'gpt-4o-mini',
        reason: 'GPT-4o-mini: Schnell und effizient für kurze Posts'
      };
    }
    if (hasAnthropic) {
      return {
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        reason: 'Claude Haiku: Schnell für kurze Inhalte'
      };
    }
  }

  // 5. Default fallback to Ollama (local, always available)
  return {
    provider: 'ollama',
    model: 'llama3.2',
    reason: 'Llama 3.2: Lokales Modell (keine API-Keys benötigt)'
  };
}

/**
 * Map target language code to full language name for clearer AI instructions
 */
function getLanguageDisplayName(language?: TargetLanguage): string {
  const languageMap: Record<TargetLanguage, string> = {
    'deutsch': 'German (Deutsch)',
    'english': 'English',
    'español': 'Spanish (Español)',
    'français': 'French (Français)',
    'italiano': 'Italian (Italiano)',
    'português': 'Portuguese (Português)',
    'russisch': 'Russian (Русский)',
    '中文': 'Chinese (中文)',
    '日本語': 'Japanese (日本語)',
    '한국어': 'Korean (한국어)',
  };
  return language ? languageMap[language] : 'the same language as the original content';
}

/**
 * Content Transformation Prompts
 */
function buildTransformPrompt(markdown: string, config: TransformConfig): string {
  const targetLang = getLanguageDisplayName(config.targetLanguage);
  const platformInstructions = {
    linkedin: `
Transform this markdown content into a LinkedIn post:

Guidelines:
- Professional, business-focused tone
- Start with an attention-grabbing hook in the first line
- Use 1-2 relevant emojis maximum (professional context)
- Break into short, scannable paragraphs
- Include key insights and business value
- Maximum 3000 characters
- End with 3-5 relevant hashtags
- Encourage engagement with a question or call-to-action

Style: ${config.tone || 'professional'}
Length: ${config.length || 'medium'}
Target Audience: ${config.audience || 'intermediate'}
`,
    devto: `
Transform this markdown content into a dev.to article:

Guidelines:
- Friendly, community-focused tone
- Start with "What you'll learn" section
- Use clear ## headers for sections
- Include code examples with proper syntax highlighting
- Add practical tips and best practices
- Tutorial-style progression
- End with discussion question to encourage comments
- Add 3-5 relevant tags at the end (format: #tag1 #tag2)

Style: ${config.tone || 'casual'}
Length: ${config.length || 'long'}
Target Audience: ${config.audience || 'intermediate'}
`,
    twitter: `
Transform this markdown content into a Twitter thread:

Guidelines:
- Each tweet maximum 280 characters
- Number tweets: 1/, 2/, 3/, etc.
- First tweet MUST hook attention
- Use emojis for visual breaks (2-3 per tweet)
- One main idea per tweet
- Short, punchy sentences
- End with call-to-action or question
- Keep thread ${config.length === 'short' ? '3-5' : config.length === 'medium' ? '5-8' : '8-12'} tweets

Style: ${config.tone || 'enthusiastic'}
Target Audience: ${config.audience || 'intermediate'}
`,
    medium: `
Transform this markdown content into a Medium blog post:

Guidelines:
- Storytelling approach with personal narrative
- Compelling title and subtitle
- Strong opening paragraph that hooks readers
- Use headers (##) for clear structure
- Include relevant images/diagrams suggestions [IMAGE: description]
- Personal insights and experiences
- Detailed explanations with examples
- Conversational but authoritative tone
- End with clear conclusion and takeaways

Style: ${config.tone || 'professional'}
Length: ${config.length || 'long'}
Target Audience: ${config.audience || 'intermediate'}
`,
    reddit: `
Transform this markdown content into a Reddit post:

Guidelines:
- Community-focused, authentic tone
- Catchy title that sparks curiosity
- Conversational writing style
- Use markdown formatting (bold, italic, code blocks)
- Break into readable paragraphs
- Include TL;DR at top if content is long
- Share personal experience or ask for community input
- Avoid self-promotion tone
- End with discussion question

Style: ${config.tone || 'casual'}
Length: ${config.length || 'medium'}
Target Audience: ${config.audience || 'intermediate'}
`,
    'github-discussion': `
Transform this markdown content into a GitHub Discussion post:

Guidelines:
- Technical, collaborative tone
- Clear problem statement or topic
- Use proper markdown formatting
- Include code examples with syntax highlighting
- Link to relevant docs/issues if applicable
- Use bullet points for clarity
- Add context about environment/versions if relevant
- Encourage community contributions
- Add appropriate labels suggestion

Style: ${config.tone || 'technical'}
Length: ${config.length || 'medium'}
Target Audience: ${config.audience || 'intermediate'}
`,
    'github-blog': `
Transform this markdown content into a GitHub Blog Post (for GitHub Pages):

Guidelines:
- Professional, technical blog post format
- Add YAML frontmatter with title, date, tags, description
- Use proper markdown headers (##, ###)
- Include syntax-highlighted code blocks
- Add relevant images/diagrams as markdown links
- Create table of contents for long posts
- Use callouts/blockquotes for important info
- Link to related GitHub repos or docs
- SEO-friendly meta description
- End with "Further Reading" section

Style: ${config.tone || 'professional'}
Length: ${config.length || 'long'}
Target Audience: ${config.audience || 'intermediate'}
`,
    youtube: `
Transform this markdown content into a YouTube video description:

Guidelines:
- SEO-optimized title suggestion
- Hook in first 2 lines (shows in preview)
- Timestamps for key sections (00:00 format)
- Clear breakdown of video content
- Links to resources mentioned
- Call-to-action (subscribe, like, comment)
- Relevant keywords naturally integrated
- Social media links section
- Hashtags at the end (max 15)

Style: ${config.tone || 'enthusiastic'}
Length: ${config.length || 'long'}
Target Audience: ${config.audience || 'intermediate'}
`,
    'blog-post': `
Transform this markdown content into a comprehensive blog post:

Guidelines:
- Engaging title and optional subtitle
- Add YAML frontmatter with title, date, description, tags
- Strong opening hook that captures attention
- Use clear headers (##, ###) for structure
- Include code examples with syntax highlighting where relevant
- Add images/diagrams suggestions [IMAGE: description]
- Personal insights and real-world examples
- Step-by-step explanations for complex topics
- Use callouts/blockquotes for important information
- SEO-optimized meta description
- Conclusion with key takeaways
- Optional "Further Reading" or "Resources" section
- Professional but accessible tone

Style: ${config.tone || 'professional'}
Length: ${config.length || 'long'}
Target Audience: ${config.audience || 'intermediate'}
`,
  };

  return `${platformInstructions[config.platform]}

Original Markdown Content:
${markdown}

Important:
- CRITICAL: You MUST write the entire output in ${targetLang}. This is mandatory!
- Maintain technical accuracy
- Adapt formatting for the platform
- Keep the core message and value
- Output ONLY the transformed content, no meta-commentary

Generate the transformed content in ${targetLang} now:`;
}

/**
 * Generic AI Call for Content Transformation
 */
async function callAIForTransform(
  config: AIConfig,
  prompt: string
): Promise<TransformResult> {
  let result: CodeAnalysisResult;

  switch (config.provider) {
    case 'openai':
      result = await callOpenAI(config, prompt);
      break;
    case 'anthropic':
      result = await callAnthropic(config, prompt);
      break;
    case 'ollama':
      result = await callOllama(config, prompt);
      break;
    case 'custom':
      result = await callCustomAPI(config, prompt);
      break;
    default:
      return {
        success: false,
        error: `Unbekannter AI-Provider: ${config.provider}`,
      };
  }

  // Convert CodeAnalysisResult to TransformResult
  return {
    success: result.success,
    data: result.readme, // readme field contains the transformed content
    error: result.error,
  };
}

/**
 * Main Content Transformation Function
 */
export async function transformContent(
  content: string,
  transformConfig: TransformConfig,
  customAIConfig?: Partial<AIConfig>
): Promise<TransformResult & { autoSelectedModel?: string }> {
  // Validation
  if (!content || content.trim().length < 10) {
    return {
      success: false,
      error: 'Content ist zu kurz oder leer',
    };
  }

  // Load AI configuration
  let aiConfig = { ...loadAIConfig(), ...customAIConfig };
  let autoSelectedModel: string | undefined;

  // Auto-select AI provider if set to 'auto'
  if (aiConfig.provider === 'auto') {
    const autoSelectResult = analyzeContentForAutoSelect(content, transformConfig);
    console.log('🤖 Auto-Select:', autoSelectResult);

    // Override config with auto-selected provider and model
    aiConfig = {
      ...aiConfig,
      provider: autoSelectResult.provider,
      model: autoSelectResult.model,
    };

    autoSelectedModel = `${autoSelectResult.reason}`;
  }

  // Build prompt
  const prompt = buildTransformPrompt(content, transformConfig);

  console.log(`[transformContent] Platform: ${transformConfig.platform}`);
  console.log(`[transformContent] Prompt preview (first 300 chars):`, prompt.substring(0, 300));

  // Call AI
  const result = await callAIForTransform(aiConfig, prompt);

  console.log(`[transformContent] Result for ${transformConfig.platform}:`, {
    success: result.success,
    dataLength: result.data?.length,
    error: result.error
  });

  // Add auto-selected model info to result
  return {
    ...result,
    autoSelectedModel,
  };
}

/**
 * Generate content directly from a prompt (for Doc Studio)
 */
export async function generateFromPrompt(
  prompt: string,
  customAIConfig?: Partial<AIConfig>
): Promise<TransformResult & { autoSelectedModel?: string }> {
  // Validation
  if (!prompt || prompt.trim().length < 10) {
    return {
      success: false,
      error: 'Prompt ist zu kurz oder leer',
    };
  }

  // Load AI configuration
  let aiConfig = { ...loadAIConfig(), ...customAIConfig };
  let autoSelectedModel: string | undefined;

  // Auto-select AI provider if set to 'auto'
  if (aiConfig.provider === 'auto') {
    // For Doc Studio, we assume it's documentation (technical, long-form)
    const autoSelectResult = analyzeContentForAutoSelect(prompt, {
      platform: 'github-blog',
      tone: 'technical',
      length: 'long',
      audience: 'intermediate',
    });
    console.log('🤖 Auto-Select (Doc Studio):', autoSelectResult);

    // Override config with auto-selected provider and model
    aiConfig = {
      ...aiConfig,
      provider: autoSelectResult.provider,
      model: autoSelectResult.model,
    };

    autoSelectedModel = `${autoSelectResult.reason}`;
  }

  // Call AI directly with the prompt
  const result = await callAIForTransform(aiConfig, prompt);

  // Add auto-selected model info to result
  return {
    ...result,
    autoSelectedModel,
  };
}

/**
 * Convert plain text to formatted Markdown
 */
export async function textToMarkdown(
  plainText: string,
  customAIConfig?: Partial<AIConfig>
): Promise<TransformResult> {
  // Validation
  if (!plainText || plainText.trim().length < 10) {
    return {
      success: false,
      error: 'Text ist zu kurz oder leer',
    };
  }

  // Load AI configuration
  const aiConfig = { ...loadAIConfig(), ...customAIConfig };

  // Build prompt for text-to-markdown conversion
  const prompt = `Du bist ein Experte für Markdown-Formatierung. Konvertiere den folgenden Plain-Text in gut strukturiertes Markdown.

Regeln:
- Erkenne Überschriften und formatiere sie mit # (H1), ## (H2), ### (H3)
- Erkenne Listen und formatiere sie mit - oder 1. 2. 3.
- Erkenne wichtige Wörter und mache sie **fett**
- Erkenne Code-Snippets und formatiere sie korrekt:
  * Einzeilige Code-Snippets (Variablen, Funktionsnamen, Befehle) mit \`code\`
  * Mehrzeilige Code-Blöcke mit \`\`\`sprache (z.B. \`\`\`javascript, \`\`\`python, \`\`\`bash)
  * Erkenne die Programmiersprache automatisch (JavaScript, Python, TypeScript, Rust, etc.)
- Erkenne Links und formatiere sie als [Text](URL)
- Erkenne Zitate und formatiere sie mit >
- Füge sinnvolle Absätze und Zeilenumbrüche hinzu
- Behalte die ursprüngliche Bedeutung und Reihenfolge bei
- Verbessere die Lesbarkeit durch Struktur

Code-Erkennung (wichtig):
- Code mit function, class, const, let, var, def, fn, pub, impl → Code-Block
- Pfade wie /src/main.rs, package.json → \`inline code\`
- Terminal-Befehle wie npm install, cargo build → \`\`\`bash
- JSON, XML, YAML Strukturen → entsprechender Code-Block

Wichtig:
- Gib NUR das formatierte Markdown aus, keine Erklärungen
- Keine Meta-Kommentare wie "Hier ist das Markdown"
- Behalte die Sprache des Originaltexts bei

Original Text:
${plainText}

Formatiertes Markdown:`;

  // Call AI
  return await callAIForTransform(aiConfig, prompt);
}

/**
 * Supported languages for translation
 */
export type TargetLanguage =
  | 'deutsch'
  | 'english'
  | 'español'
  | 'français'
  | 'italiano'
  | 'português'
  | 'russisch'
  | '中文'
  | '日本語'
  | '한국어';

/**
 * Translate content to target language while preserving Markdown formatting
 */
export async function translateContent(
  content: string,
  targetLanguage: TargetLanguage,
  customAIConfig?: Partial<AIConfig>
): Promise<TransformResult> {
  // Validation
  if (!content || content.trim().length < 10) {
    return {
      success: false,
      error: 'Content ist zu kurz oder leer',
    };
  }

  // Load AI configuration
  const aiConfig = { ...loadAIConfig(), ...customAIConfig };

  // Build translation prompt
  const prompt = `Du bist ein professioneller Übersetzer mit Expertise in technischer Dokumentation und Marketing-Texten.

Übersetze den folgenden Markdown-Content in ${targetLanguage}.

Wichtige Regeln:
- Behalte ALLE Markdown-Formatierungen bei (Überschriften #, Listen -, Fett **, Code \`, etc.)
- Übersetze den Inhalt präzise und natürlich
- Behalte technische Begriffe bei, wenn sie im Zielkontext üblich sind
- Übersetze Code-Kommentare, aber NICHT den Code selbst
- Bewahre die Struktur, Absätze und Zeilenumbrüche
- Übersetze URLs und Links NICHT
- Bei Fachbegriffen: Verwende die etablierte Terminologie der Zielsprache
- Achte auf kulturelle Angemessenheit und natürlichen Sprachgebrauch

Wichtig:
- Gib NUR den übersetzten Content aus, keine Erklärungen
- Keine Meta-Kommentare wie "Hier ist die Übersetzung"
- Die Ausgabe muss direkt verwendbar sein

Original Content:
${content}

Übersetzung in ${targetLanguage}:`;

  // Call AI
  return await callAIForTransform(aiConfig, prompt);
}

/**
 * Improvement style options for text enhancement
 */
export type ImprovementStyle =
  | 'general'           // Standard improvement (grammar, clarity)
  | 'charming'          // More personality and charm
  | 'professional'      // More formal and business-like
  | 'technical'         // More precise and technical
  | 'concise'           // Shorter and more to the point
  | 'custom';           // User-defined instruction

export interface ImproveTextOptions {
  style?: ImprovementStyle;
  customInstruction?: string;  // For 'custom' style
}

/**
 * Get improvement instructions based on style
 */
function getImprovementInstructions(style: ImprovementStyle, customInstruction?: string): string {
  switch (style) {
    case 'charming':
      return `
Verbessere den Text mit mehr Charme und Persönlichkeit:
- Füge persönliche, ansprechende Formulierungen hinzu
- Mache den Text lebendiger und einladender
- Nutze eine warmherzige, freundliche Sprache
- Füge passende Metaphern oder Vergleiche hinzu
- Halte den Text interessant und unterhaltsam
- Behalte die Kernaussage, aber mache sie ansprechender`;

    case 'professional':
      return `
Verbessere den Text für einen professionelleren, formelleren Ton:
- Verwende formelle Business-Sprache
- Entferne umgangssprachliche Ausdrücke
- Mache den Text objektiver und sachlicher
- Nutze aktive, klare Formulierungen
- Achte auf professionelle Höflichkeit
- Strukturiere für maximale Klarheit`;

    case 'technical':
      return `
Verbessere den Text für technische Präzision:
- Verwende exakte, technische Terminologie
- Sei präzise bei Beschreibungen und Erklärungen
- Strukturiere logisch mit klaren Abschnitten
- Füge Details hinzu wo nötig für Klarheit
- Vermeide vage oder mehrdeutige Formulierungen
- Halte einen sachlichen, informativen Ton`;

    case 'concise':
      return `
Mache den Text kürzer und prägnanter:
- Kürze auf das Wesentliche
- Entferne alle Füllwörter und Redundanzen
- Ein Gedanke pro Satz
- Verwende kurze, kraftvolle Sätze
- Halte nur die wichtigsten Informationen
- Streiche unnötige Erklärungen`;

    case 'custom':
      return customInstruction
        ? `\nBenutzerdefinierte Anweisung:\n${customInstruction}`
        : '';

    case 'general':
    default:
      return `
Allgemeine Verbesserungen:
- Verbessere Grammatik und Rechtschreibung
- Mache Sätze klarer und prägnanter
- Verbessere den Lesefluss und die Struktur
- Entferne Redundanzen
- Behalte den ursprünglichen Ton und Stil bei`;
  }
}

/**
 * Improve text quality - make it clearer, more engaging, and better structured
 */
export async function improveText(
  content: string,
  options?: ImproveTextOptions,
  customAIConfig?: Partial<AIConfig>
): Promise<TransformResult> {
  if (!content || content.trim().length < 10) {
    return {
      success: false,
      error: 'Text ist zu kurz oder leer',
    };
  }

  const aiConfig = { ...loadAIConfig(), ...customAIConfig };
  const style = options?.style || 'general';
  const improvementInstructions = getImprovementInstructions(style, options?.customInstruction);

  const prompt = `Du bist ein professioneller Lektor und Content-Experte. Verbessere den folgenden Text.
${improvementInstructions}

Wichtige Regeln:
- Behalte alle Markdown-Formatierungen bei
- Behalte die Kernaussage und Bedeutung bei
- Behalte die Sprache des Originals bei

Wichtig:
- Gib NUR den verbesserten Text aus, keine Erklärungen
- Keine Meta-Kommentare wie "Hier ist der verbesserte Text"

Original Text:
${content}

Verbesserter Text:`;

  return await callAIForTransform(aiConfig, prompt);
}

/**
 * Continue/extend the text naturally
 */
export async function continueText(
  content: string,
  customAIConfig?: Partial<AIConfig>
): Promise<TransformResult> {
  if (!content || content.trim().length < 10) {
    return {
      success: false,
      error: 'Text ist zu kurz oder leer',
    };
  }

  const aiConfig = { ...loadAIConfig(), ...customAIConfig };

  const prompt = `Du bist ein kreativer Autor. Setze den folgenden Text natürlich fort.

Regeln:
- Führe den Text logisch und natürlich weiter
- Behalte den Stil, Ton und die Sprache bei
- Füge ca. 2-4 sinnvolle Absätze hinzu
- Behalte das Thema und den Kontext bei
- Nutze die gleiche Markdown-Formatierung
- Der Übergang soll nahtlos sein

Wichtig:
- Gib den VOLLSTÄNDIGEN Text aus (Original + Fortsetzung)
- Keine Meta-Kommentare wie "Hier ist die Fortsetzung"
- Markiere NICHT wo die Fortsetzung beginnt

Original Text:
${content}

Vollständiger Text mit Fortsetzung:`;

  return await callAIForTransform(aiConfig, prompt);
}

/**
 * Summarize text to key points
 */
export async function summarizeText(
  content: string,
  customAIConfig?: Partial<AIConfig>
): Promise<TransformResult> {
  if (!content || content.trim().length < 50) {
    return {
      success: false,
      error: 'Text ist zu kurz zum Zusammenfassen (mind. 50 Zeichen)',
    };
  }

  const aiConfig = { ...loadAIConfig(), ...customAIConfig };

  const prompt = `Du bist ein Experte für Zusammenfassungen. Erstelle eine prägnante Zusammenfassung des folgenden Texts.

Regeln:
- Extrahiere die wichtigsten Kernaussagen
- Behalte die Sprache des Originals bei
- Strukturiere mit Bullet Points (- oder •)
- Maximal 5-7 Hauptpunkte
- Beginne mit einer kurzen Einleitung (1-2 Sätze)
- Nutze Markdown-Formatierung

Format:
## Zusammenfassung

[1-2 Sätze Einleitung]

**Kernpunkte:**
- Punkt 1
- Punkt 2
- ...

Wichtig:
- Gib NUR die Zusammenfassung aus
- Keine Meta-Kommentare

Original Text:
${content}

Zusammenfassung:`;

  return await callAIForTransform(aiConfig, prompt);
}
