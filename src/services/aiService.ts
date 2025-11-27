/**
 * AI Service für Code-Analyse und README-Generierung
 * Unterstützt mehrere AI-Provider
 */

import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

export type AIProvider = 'openai' | 'anthropic' | 'ollama' | 'custom';

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
  | 'youtube';

export type ContentTone = 'professional' | 'casual' | 'technical' | 'enthusiastic';
export type ContentLength = 'short' | 'medium' | 'long';
export type ContentAudience = 'beginner' | 'intermediate' | 'expert';

export interface TransformConfig {
  platform: ContentPlatform;
  tone?: ContentTone;
  length?: ContentLength;
  audience?: ContentAudience;
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
  provider: 'openai',
  model: 'gpt-4o-mini',
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
    console.log('[Ollama] Model:', config.model || 'qwen2.5-coder');

    let response;
    try {
      // Use Tauri's fetch to avoid CORS issues with localhost
      response = await tauriFetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model || 'qwen2.5-coder',
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
        }),
      });
      console.log('[Ollama] Response received:', response);
      console.log('[Ollama] Response status:', response.status);
      console.log('[Ollama] Response ok:', response.ok);
    } catch (fetchError) {
      console.error('[Ollama] Fetch error:', fetchError);
      return {
        success: false,
        error: `Fetch Fehler: ${fetchError instanceof Error ? fetchError.message : JSON.stringify(fetchError)}`,
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
 * Content Transformation Prompts
 */
function buildTransformPrompt(markdown: string, config: TransformConfig): string {
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
  };

  return `${platformInstructions[config.platform]}

Original Markdown Content:
${markdown}

Important:
- Write in the same language as the original content
- Maintain technical accuracy
- Adapt formatting for the platform
- Keep the core message and value
- Output ONLY the transformed content, no meta-commentary

Generate the transformed content now:`;
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

  // Build prompt
  const prompt = buildTransformPrompt(content, transformConfig);

  // Call AI
  return await callAIForTransform(aiConfig, prompt);
}

/**
 * Generate content directly from a prompt (for Doc Studio)
 */
export async function generateFromPrompt(
  prompt: string,
  customAIConfig?: Partial<AIConfig>
): Promise<TransformResult> {
  // Validation
  if (!prompt || prompt.trim().length < 10) {
    return {
      success: false,
      error: 'Prompt ist zu kurz oder leer',
    };
  }

  // Load AI configuration
  const aiConfig = { ...loadAIConfig(), ...customAIConfig };

  // Call AI directly with the prompt
  return await callAIForTransform(aiConfig, prompt);
}
