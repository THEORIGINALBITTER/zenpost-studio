/**
 * ZenEngine Service — TypeScript Interface zur nativen C++ / Rust Engine
 * Alle Calls gehen über Tauri IPC → Rust → C++ zen_engine
 */
import { invoke } from '@tauri-apps/api/core';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MarkdownOptions {
  gfm?: boolean;
  strikethrough?: boolean;
  tables?: boolean;
  autolink?: boolean;
  tasklists?: boolean;
}

export interface MarkdownResult {
  html: string;
  char_count: number;
  word_count: number;
  line_count: number;
}

export interface ImageInfo {
  width: number;
  height: number;
  format: string;
  size_bytes: number;
}

export interface ResizeOptions {
  width: number;
  height: number;
  mode?: 'fit' | 'fill';
  output_format?: 'jpeg' | 'png' | 'webp';
  quality?: number;
}

export interface OptimizeOptions {
  /** Maximale Breite — Bild wird nur verkleinert, nie hochskaliert */
  max_width: number;
  /** Maximale Höhe — Bild wird nur verkleinert, nie hochskaliert */
  max_height: number;
  /** Ausgabeformat (default: "jpeg") */
  output_format?: 'jpeg' | 'png' | 'webp';
  /** Qualität 1-100, nur für JPEG (default: 82) */
  quality?: number;
}

export interface ProcessedImage {
  data_url: string;
  width: number;
  height: number;
  format: string;
  size_bytes: number;
}

export interface RuleMatch {
  rule_id: string;
  matched_text: string;
  start: number;
  end: number;
  confidence: number;
}

export interface RuleSuggestion {
  rule: string;
  matched_text: string;
  suggestion: string;
  confidence: number;
  start: number;
  end: number;
  replacements: string[];
  is_user_rule?: boolean;
}

export interface RuleAnalysisResult {
  matches: RuleMatch[];
  suggestions: RuleSuggestion[];
  match_count: number;
}

export interface AutofixResult {
  text: string;
  fix_count: number;
}

// ─── V2 Types ─────────────────────────────────────────────────────────────────

/** Ein einzelner Match aus der V2-Engine (typisiert, mit snippet + score) */
export interface MatchV2 {
  rule_id:     string;
  snippet:     string;
  start:       number;
  end:         number;
  score:       number;
  replacement: string;
}

/** Eine deduplizierte Suggestion (eine pro unique rule_id) */
export interface SuggestionV2 {
  rule_id: string;
  text:    string;
  score:   number;
}

/** Vollständiges Analyse-Ergebnis der V2-Engine */
export interface AnalysisResultV2 {
  matches:     MatchV2[];
  suggestions: SuggestionV2[];
  warnings:    string[];
  match_count: number;
}

// ─── V2 → V1 Adapter ─────────────────────────────────────────────────────────
//
// Wandelt AnalysisResultV2 in die V1-kompatible RuleAnalysisResult-Form um,
// damit bestehende Caller ohne Type-Änderung auf V2 migriert werden können.
// Je Match im V2-Array wird ein RuleSuggestion-Objekt erzeugt;
// der Message-Text kommt aus dem deduplizierten suggestions[]-Array.

export function adaptV2ToV1(v2: AnalysisResultV2): RuleAnalysisResult {
  const msgMap = new Map(v2.suggestions.map(s => [s.rule_id, s.text]));
  return {
    matches: v2.matches.map(m => ({
      rule_id:      m.rule_id,
      matched_text: m.snippet,
      start:        m.start,
      end:          m.end,
      confidence:   m.score,
    })),
    suggestions: v2.matches.map(m => ({
      rule:         m.rule_id,
      matched_text: m.snippet,
      suggestion:   msgMap.get(m.rule_id) ?? '',
      confidence:   m.score,
      start:        m.start,
      end:          m.end,
      replacements: m.replacement ? [m.replacement] : [],
    })),
    match_count: v2.match_count,
  };
}

// ─── Engine API ───────────────────────────────────────────────────────────────

export const ZenEngine = {
  /** Engine-Version abfragen (z.B. "ZenEngine/1.0.0-cpp17") */
  version(): Promise<string> {
    return invoke<string>('engine_version');
  },

  // ── Markdown ──────────────────────────────────────────────────────────────

  /** Markdown → HTML rendern (cmark-kompatibel via comrak) */
  renderMarkdown(input: string, options?: MarkdownOptions): Promise<MarkdownResult> {
    return invoke<MarkdownResult>('engine_render_markdown', { input, options });
  },

  /** Markdown → Plain-Text (alle Syntax-Zeichen entfernt) */
  markdownToPlain(input: string): Promise<string> {
    return invoke<string>('engine_markdown_to_plain', { input });
  },

  // ── Image Processing ──────────────────────────────────────────────────────

  /** Bild-Metadaten aus File-Bytes lesen */
  imageInfo(data: Uint8Array): Promise<ImageInfo> {
    return invoke<ImageInfo>('engine_image_info', { data: Array.from(data) });
  },

  /** Bild skalieren → base64 data URL zurück */
  imageResize(data: Uint8Array, options: ResizeOptions): Promise<ProcessedImage> {
    return invoke<ProcessedImage>('engine_image_resize', {
      data: Array.from(data),
      options,
    });
  },

  /** Bild-Format konvertieren (jpeg/png/webp) */
  imageConvert(data: Uint8Array, format: 'jpeg' | 'png' | 'webp', quality?: number): Promise<ProcessedImage> {
    return invoke<ProcessedImage>('engine_image_convert', {
      data: Array.from(data),
      format,
      quality,
    });
  },

  /**
   * Bild optimieren — resize nur wenn größer als max_width/max_height,
   * dann mit Qualitätskontrolle encoden.
   * Ideal für Mobile-Import und Export-Pipeline.
   */
  imageOptimize(data: Uint8Array, options: OptimizeOptions): Promise<ProcessedImage> {
    return invoke<ProcessedImage>('engine_image_optimize', {
      data: Array.from(data),
      options,
    });
  },

  // ── Rule Engine (C++) ─────────────────────────────────────────────────────

  /** Text regelbasiert analysieren (Füllwörter, Passive Voice, etc.) */
  analyzeText(text: string, rulesJson?: string): Promise<RuleAnalysisResult> {
    return invoke<RuleAnalysisResult>('engine_analyze_text', {
      text,
      rules_json: rulesJson,
    });
  },

  /**
   * Auto-Korrektur: wendet alle sicheren regelbasierten Fixes an
   * (Leerzeichen, Doppelwörter, Zeichensetzung, etc.)
   * Gibt korrigierten Text + Anzahl angewendeter Fixes zurück.
   */
  autofixText(text: string, rulesJson?: string): Promise<AutofixResult> {
    return invoke<AutofixResult>('engine_autofix_text', {
      text,
      rules_json: rulesJson,
    });
  },

  // ── Rule Engine V2 ────────────────────────────────────────────────────────

  /**
   * Text mit der V2-Engine analysieren.
   *
   * `rulesJson` akzeptiert beide Formate:
   *   - V1: `[{"pattern":"...","suggestion":"...","confidence":0.8}]`
   *   - V2: `{"version":"2","rules":[{"id":"...","pattern":"...","message":"..."}]}`
   *
   * Gibt typisierte `AnalysisResultV2` zurück (matches + suggestions + warnings).
   */
  analyzeTextV2(text: string, rulesJson?: string): Promise<AnalysisResultV2> {
    return invoke<AnalysisResultV2>('engine_analyze_text_v2', {
      text,
      rules_json: rulesJson,
    });
  },

  /**
   * Auto-Korrektur V2: wendet alle Matches mit replacement-Feld an.
   * Gibt korrigierten Text + fix_count zurück.
   */
  autofixTextV2(text: string, rulesJson?: string): Promise<{ text: string; fix_count: number }> {
    return invoke<{ text: string; fix_count: number }>('engine_autofix_text_v2', {
      text,
      rules_json: rulesJson,
    });
  },
};

export default ZenEngine;

// ─── Platform Thumbnail Generator ────────────────────────────────────────────

/** Optimale Thumbnail-Dimensionen pro Plattform (px) */
export const PLATFORM_THUMBNAIL_SIZES: Record<string, { width: number; height: number; mode: 'fill' | 'fit' }> = {
  linkedin:           { width: 1200, height: 627,  mode: 'fill' },
  twitter:            { width: 1200, height: 675,  mode: 'fill' },
  youtube:            { width: 1280, height: 720,  mode: 'fill' },
  devto:              { width: 1000, height: 420,  mode: 'fill' },
  medium:             { width: 1400, height: 936,  mode: 'fit'  },
  reddit:             { width: 1200, height: 628,  mode: 'fill' },
  'github-blog':      { width: 1200, height: 630,  mode: 'fit'  },
  'blog-post':        { width: 1200, height: 630,  mode: 'fit'  },
  'github-discussion':{ width: 1200, height: 630,  mode: 'fit'  },
};

export interface PlatformThumbnailResult {
  dataUrl: string;
  width: number;
  height: number;
  platform: string;
}

/**
 * Extrahiert das erste Bild aus Markdown-Content und erzeugt ein
 * plattform-optimiertes Thumbnail via ZenEngine.imageResize.
 * Gibt null zurück wenn kein Bild vorhanden oder Plattform kein Thumbnail braucht.
 */
export async function generatePlatformThumbnail(
  markdownContent: string,
  platform: string,
): Promise<PlatformThumbnailResult | null> {
  const sizes = PLATFORM_THUMBNAIL_SIZES[platform];
  if (!sizes) return null;

  // Erstes eingebettetes base64-Bild aus Markdown extrahieren
  const match = markdownContent.match(
    /!\[[^\]]*\]\((data:image\/[a-zA-Z0-9.+-]+;base64,([A-Za-z0-9+/=\n]+))\)/
  );
  if (!match) return null;

  const base64 = match[2].replace(/\n/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const result = await ZenEngine.imageResize(bytes, {
    width: sizes.width,
    height: sizes.height,
    mode: sizes.mode,
    output_format: 'jpeg',
    quality: 85,
  });

  return { dataUrl: result.data_url, width: result.width, height: result.height, platform };
}

// ─── Batch Image Optimizer ────────────────────────────────────────────────────

export interface BatchOptimizeOptions {
  max_width?: number;
  max_height?: number;
  output_format?: 'jpeg' | 'png' | 'webp';
  quality?: number;
}

export interface BatchOptimizeResult {
  /** Markdown with all base64 images replaced by optimized versions */
  content: string;
  /** Number of images processed */
  processed: number;
  /** Total bytes saved */
  bytesSaved: number;
}

/**
 * Finds all base64 images in a Markdown document and optimizes them in parallel.
 * Replaces each image's data URL with the optimized version.
 */
export async function batchOptimizeImages(
  markdownContent: string,
  options: BatchOptimizeOptions = {},
): Promise<BatchOptimizeResult> {
  const {
    max_width = 1400,
    max_height = 1400,
    output_format = 'jpeg',
    quality = 82,
  } = options;

  const IMAGE_RE = /(!)\[([^\]]*)\]\((data:image\/[a-zA-Z0-9.+-]+;base64,([A-Za-z0-9+/=\n]+))\)/g;
  const matches = [...markdownContent.matchAll(IMAGE_RE)];
  if (matches.length === 0) return { content: markdownContent, processed: 0, bytesSaved: 0 };

  let content = markdownContent;
  let bytesSaved = 0;

  const results = await Promise.allSettled(
    matches.map(async m => {
      const [fullMatch, , altText, , base64Raw] = m;
      const base64 = base64Raw.replace(/\n/g, '');
      const originalBytes = Math.round(base64.length * 0.75);

      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const result = await ZenEngine.imageOptimize(bytes, { max_width, max_height, output_format, quality });
      const optimizedBytes = Math.round(result.data_url.length * 0.75);

      return { fullMatch, altText, newDataUrl: result.data_url, saved: originalBytes - optimizedBytes };
    }),
  );

  for (const r of results) {
    if (r.status === 'fulfilled') {
      const { fullMatch, altText, newDataUrl, saved } = r.value;
      content = content.replace(fullMatch, `![${altText}](${newDataUrl})`);
      bytesSaved += saved;
    }
  }

  return { content, processed: results.filter(r => r.status === 'fulfilled').length, bytesSaved };
}
