import { useState, useEffect, useRef, useCallback } from 'react';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { readTextFile, writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { save } from '@tauri-apps/plugin-dialog';
import { join } from '@tauri-apps/api/path';
import {
  faLinkedin,
  faDev,
  faTwitter,
  faMedium,
  faReddit,
  faGithub,
  faYoutube,
} from '@fortawesome/free-brands-svg-icons';
import { faNewspaper, faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ZenSettingsModal, ZenMetadataModal, ZenGeneratingModal, ZenSaveSuccessModal, ZenModal, ZenModalHeader, ZenRoughButton, createDefaultProjectMetadata, type ProjectMetadata } from '../kits/PatternKit/ZenModalSystem';
import { Step1SourceInput } from './transform-steps/Step1SourceInput';
import { Step2PlatformSelection } from './transform-steps/Step2PlatformSelection';
import { Step3StyleOptions } from './transform-steps/Step3StyleOptions';
import { Step4TransformResult } from './transform-steps/Step4TransformResult';
import {
  transformContent,
  translateContent,
  type ContentPlatform,
  type ContentTone,
  type ContentLength,
  type ContentAudience,
  type TargetLanguage,
} from '../services/aiService';
import { applySteuerFormatConfig } from '../config/formatConfigTrans';
import { loadArticle } from '../services/publishingService';
import {
  postToSocialMedia,
  loadSocialConfig,
  isPlatformConfigured,
  type SocialPlatform,
  type LinkedInPostOptions,
  type TwitterPostOptions,
  type RedditPostOptions,
  type DevToPostOptions,
  type MediumPostOptions,
} from '../services/socialMediaService';
import {
  defaultEditorSettings,
  loadEditorSettings,
  saveDraftAutosave,
  loadDraftAutosave,
  listDraftAutosaves,
  type EditorSettings,
  type DraftAutosaveRecord,
} from '../services/editorSettingsService';
import { useOpenExternal } from '../hooks/useOpenExternal';
import {
  loadZenStudioSettings,
  type ZenStudioSettings,
} from '../services/zenStudioSettingsService';
import { ftpUpload } from '../services/ftpService';
import { phpBlogUpload } from '../services/phpBlogService';
import ZenEngine from '../services/zenEngineService';

interface PlatformOption {
  value: ContentPlatform;
  label: string;
  icon: any;
  description: string;
}

type PlatformStyleConfig = {
  tone: ContentTone;
  length: ContentLength;
  audience: ContentAudience;
};

const platformOptions: PlatformOption[] = [
  {
    value: 'linkedin',
    label: 'LinkedIn Post',
    icon: faLinkedin,
    description: 'Professional business network post',
  },
  {
    value: 'devto',
    label: 'dev.to Article',
    icon: faDev,
    description: 'Community-focused developer article',
  },
  {
    value: 'twitter',
    label: 'Twitter Thread',
    icon: faTwitter,
    description: 'Concise, engaging thread',
  },
  {
    value: 'medium',
    label: 'Medium Blog',
    icon: faMedium,
    description: 'Long-form storytelling blog',
  },
  {
    value: 'reddit',
    label: 'Reddit Post',
    icon: faReddit,
    description: 'Community discussion post',
  },
  {
    value: 'github-discussion',
    label: 'GitHub Discussion',
    icon: faGithub,
    description: 'Technical collaborative discussion',
  },
  {
    value: 'github-blog',
    label: 'GitHub Blog Post',
    icon: faGithub,
    description: 'Markdown blog post for GitHub Pages',
  },
  {
    value: 'youtube',
    label: 'YouTube Description',
    icon: faYoutube,
    description: 'SEO-optimized video description',
  },
  {
    value: 'blog-post',
    label: 'Blog Post',
    icon: faNewspaper,
    description: 'Comprehensive blog article with SEO',
  },
];

const defaultPlatformStyles: Record<ContentPlatform, PlatformStyleConfig> = {
  linkedin: { tone: 'professional', length: 'medium', audience: 'intermediate' },
  devto: { tone: 'technical', length: 'long', audience: 'intermediate' },
  twitter: { tone: 'enthusiastic', length: 'short', audience: 'intermediate' },
  medium: { tone: 'professional', length: 'long', audience: 'intermediate' },
  reddit: { tone: 'casual', length: 'medium', audience: 'intermediate' },
  'github-discussion': { tone: 'technical', length: 'medium', audience: 'expert' },
  'github-blog': { tone: 'technical', length: 'long', audience: 'intermediate' },
  youtube: { tone: 'enthusiastic', length: 'medium', audience: 'beginner' },
  'blog-post': { tone: 'professional', length: 'long', audience: 'intermediate' },
};

interface ContentTransformScreenProps {
  onBack: () => void;
  onStepChange?: (step: number) => void;
  currentStep?: number;
  initialContent?: string | null;
  initialFileName?: string | null;
  initialPostMeta?: { title?: string; subtitle?: string; imageUrl?: string; date?: string } | null;
  initialPlatform?: ContentPlatform;
  cameFromDocStudio?: boolean;
  cameFromDashboard?: boolean;
  onBackToDocStudio?: (editedContent?: string) => void;
  onBackToDashboard?: (generatedContent?: string) => void;
  onOpenConverter?: () => void;
  projectPath?: string | null;
  requestedArticleId?: string | null;
  onArticleRequestHandled?: () => void;
  requestedFilePath?: string | null;
  onFileRequestHandled?: () => void;
  metadata?: ProjectMetadata;
  onMetadataChange?: (metadata: ProjectMetadata) => void;
  headerAction?: "preview" | "next" | "copy" | "download" | "edit" | "post" | "posten" | "post_direct" | "post_all" | "reset" | "back_doc" | "back_dashboard" | "back_posting" | "save" | "save_as" | "save_server" | "transform" | "format_only" | "goto_platforms" | null;
  onHeaderActionHandled?: () => void;
  onStep1BackToPostingChange?: (visible: boolean) => void;
  onStep2SelectionChange?: (count: number, canProceed: boolean) => void;
  onOpenDocStudioForPosting?: (content: string) => void;
  onContentChange?: (
    content: string,
    meta?: {
      source: 'step1' | 'step4';
      activeTabId?: string | null;
      activeTabKind?: 'draft' | 'file' | 'article' | 'derived';
      activeTabFilePath?: string;
      activeTabTitle?: string;
      activeTabSubtitle?: string;
      activeTabImageUrl?: string;
      tags?: string[];
    }
  ) => void;
  editorType?: "block" | "markdown";
  onEditorTypeChange?: (type: "block" | "markdown") => void;
  multiPlatformMode?: boolean;
  onMultiPlatformModeChange?: (enabled: boolean) => void;
  /** Called when a file is saved successfully with the new path and content */
  onFileSaved?: (filePath: string, content: string, fileName: string) => void;
  onOpenZenThoughtsEditor?: (content: string, filePath?: string) => void;
  /** Original server slug if this content was loaded from server — used to overwrite the correct article */
  serverArticleSlug?: string | null;
  /** When set, Speichern writes to the blog's posts/ folder and updates manifest.json */
  blogSaveTarget?: import('../services/zenStudioSettingsService').BlogConfig | null;
  onBlogPostSaved?: (slug: string) => void;
}

type ContentDocTab = {
  id: string;
  title: string;
  kind: 'draft' | 'file' | 'article' | 'derived';
  filePath?: string;
  articleId?: string;
  platform?: ContentPlatform;
};

type ContentTransformSessionCache = {
  openDocTabs: ContentDocTab[];
  activeDocTabId: string | null;
  docTabContents: Record<string, string>;
  dirtyDocTabs: Record<string, boolean>;
  step1ComparisonBaseByTab: Record<string, string>;
  step1ComparisonSelectionByTab: Record<string, string>;
  sourceContent: string;
  fileName: string;
  postMeta: { title: string; subtitle: string; imageUrl: string; date: string; tags: string[] };
  postMetaByTab: Record<string, { title: string; subtitle: string; imageUrl: string; date: string; tags: string[] }>;
};

let contentTransformSessionCache: ContentTransformSessionCache | null = null;

const isPlaceholderDraftTab = (tab: ContentDocTab) =>
  tab.kind === 'draft' && tab.title === 'Entwurf';

const DERIVED_TAB_ID_PATTERN =
  /^derived:(.+):(linkedin|devto|twitter|medium|reddit|github-discussion|github-blog|youtube|blog-post|single):\d+$/;

const parseDerivedTabId = (tabId: string): { sourceKey: string; platform: string } | null => {
  const match = tabId.match(DERIVED_TAB_ID_PATTERN);
  if (!match) return null;
  return { sourceKey: match[1], platform: match[2] };
};

const EMPTY_POST_META = { title: '', subtitle: '', imageUrl: '', date: '', tags: [] as string[] };
type PostMeta = typeof EMPTY_POST_META;

const normalizeDateForInput = (rawDate?: string): string => {
  const trimmed = (rawDate ?? '').trim();
  if (!trimmed) return '';
  const isoDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

const extractPostMetaFromContent = (
  content: string,
  fallbackTitle?: string
): PostMeta => {
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  const frontmatterDateMatch = content.match(
    /^---[\s\S]*?\n(?:publishDate|date):\s*([0-9]{4}-[0-9]{2}-[0-9]{2}).*?\n[\s\S]*?---/m
  );
  // Parse tags: [a, b, c] or tags: a, b, c
  const tagsRaw = frontmatter.match(/^tags:\s*(.+)$/m)?.[1]?.trim() ?? '';
  const tags = tagsRaw
    ? tagsRaw.replace(/^\[|\]$/g, '').split(',').map(t => t.trim()).filter(Boolean)
    : [];
  const stripHtml = (s: string) => s.replace(/<[^>]+>/g, '').trim();
  const h1Title = stripHtml(content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? '');
  const h2Subtitle = stripHtml(content.match(/^##\s+(.+)$/m)?.[1]?.trim() ?? '');
  const imageUrl = content.match(/!\[[^\]]*\]\(([^)]+)\)/)?.[1]?.trim() ?? '';
  const fallbackClean = (fallbackTitle ?? '').replace(/\.[^.]+$/, '').trim();
  return {
    title: h1Title || fallbackClean,
    subtitle: h2Subtitle,
    imageUrl,
    date: normalizeDateForInput(frontmatterDateMatch?.[1] ?? ''),
    tags,
  };
};

const postMetaEquals = (a: PostMeta, b: PostMeta): boolean =>
  a.title === b.title &&
  a.subtitle === b.subtitle &&
  a.imageUrl === b.imageUrl &&
  a.date === b.date &&
  JSON.stringify(a.tags) === JSON.stringify(b.tags);

/** Adds or updates tags/keywords in YAML frontmatter of content */
const upsertFrontmatterTags = (content: string, tags: string[]): string => {
  const tagsLine = `tags: [${tags.join(', ')}]`;
  const keywordsLine = `keywords: ${tags.join(', ')}`;
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    let fm = fmMatch[1]
      .replace(/^tags:.*$/m, '')
      .replace(/^keywords:.*$/m, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\n+/, '');
    const newFm = tags.length > 0 ? `${tagsLine}\n${keywordsLine}\n${fm ? fm : ''}` : fm;
    return content.replace(/^---\n[\s\S]*?\n---/, `---\n${newFm.trimEnd()}\n---`);
  }
  if (tags.length === 0) return content;
  return `---\n${tagsLine}\n${keywordsLine}\n---\n\n${content}`;
};

type ServerBlock = { type: string; data: Record<string, unknown> };

const isServerUsableImageUrl = (value?: string): boolean => {
  const candidate = (value ?? '').trim();
  if (!candidate) return false;
  if (/^data:image\//i.test(candidate)) return false;
  if (/^blob:/i.test(candidate)) return false;
  return true;
};

const resolveServerImageUrl = (rawValue: string, imageBaseUrl?: string | null): string => {
  const candidate = rawValue.trim();
  if (!candidate) return '';
  if (!isServerUsableImageUrl(candidate)) return '';
  if (/^https?:\/\//i.test(candidate)) return candidate;

  const base = (imageBaseUrl ?? '').trim();
  if (!base) return candidate;

  let normalizedBase = base.replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(normalizedBase)) {
    normalizedBase = `https://${normalizedBase}`;
  }

  let relative = candidate.replace(/^\/+/, '');
  if (/\/images$/i.test(normalizedBase) && /^images\//i.test(relative)) {
    relative = relative.replace(/^images\/+/i, '');
  }
  return `${normalizedBase}/${relative}`;
};

const isInlineOrBlobImageUrl = (value?: string): boolean => {
  const candidate = (value ?? '').trim();
  if (!candidate) return false;
  return /^data:image\//i.test(candidate) || /^blob:/i.test(candidate);
};

const normalizeServerUrlValue = (url: string): string => (
  String(url ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
);

const toAbsoluteEndpointUrl = (apiBaseUrl: string, endpoint: string): string => (
  /^https?:\/\//i.test(endpoint)
    ? endpoint
    : `${apiBaseUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`
);

const normalizeDataImageUrl = (dataUrl: string): string => {
  if (!/^data:image\//i.test(dataUrl)) return dataUrl;
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx < 0) return dataUrl;
  const header = dataUrl.slice(0, commaIdx + 1);
  const payload = dataUrl.slice(commaIdx + 1).replace(/\s+/g, '');
  return `${header}${payload}`;
};

const blobUrlToDataImageUrl = async (blobUrl: string): Promise<string> => {
  const response = await fetch(blobUrl);
  if (!response.ok) throw new Error('Blob-Bild konnte nicht gelesen werden.');
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Blob-Bild konnte nicht konvertiert werden.'));
    reader.readAsDataURL(blob);
  });
};

/** ZenEngine-Optimierung vor dem Server-Upload: JPEG, max 1920px, Qualität 85 */
const optimizeDataUrlForUpload = async (dataUrl: string): Promise<string> => {
  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx < 0) return dataUrl;
    const base64 = dataUrl.slice(commaIdx + 1);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const optimized = await ZenEngine.imageOptimize(bytes, {
      max_width: 1920,
      max_height: 1920,
      output_format: 'jpeg',
      quality: 85,
    });
    return optimized.data_url;
  } catch {
    return dataUrl; // Fallback: Original verwenden
  }
};

const uploadImageDataUrlToServer = async (
  dataUrl: string,
  uploadUrl: string,
  apiKey: string,
  fileNameHint: string
): Promise<string> => {
  // ZenEngine-Optimierung vor dem Upload (kleinere Payload, schnellerer Transfer)
  const optimizedDataUrl = await optimizeDataUrlForUpload(dataUrl);

  const payload = {
    imageData: normalizeDataImageUrl(optimizedDataUrl),
    fileName: fileNameHint.replace(/\.[^.]+$/, '') + '.jpg',
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };

  let responseStatus: number;
  let responseText: string;

  if (isTauri()) {
    const res = await invoke<{ status: number; body: string }>('http_fetch', {
      request: { url: uploadUrl, method: 'POST', headers, body: JSON.stringify(payload) },
    });
    responseStatus = res.status;
    responseText = res.body;
  } else {
    const response = await fetch(uploadUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
    responseStatus = response.status;
    responseText = await response.text().catch(() => '');
  }

  if (responseStatus < 200 || responseStatus >= 300) {
    throw new Error(responseText || `Upload fehlgeschlagen (HTTP ${responseStatus})`);
  }
  const result = JSON.parse(responseText) as {
    success?: boolean;
    url?: string;
    imageUrl?: string;
    path?: string;
    targetDir?: string;
    documentRoot?: string;
    message?: string;
  };
  if (!result?.success) {
    throw new Error(`Upload fehlgeschlagen: ${String(result?.message ?? 'ungueltige Serverantwort')}`);
  }
  const uploadedUrl = String(result.url ?? result.imageUrl ?? '').trim();
  if (!uploadedUrl) {
    const debugPath = String(result.path ?? result.targetDir ?? '').trim();
    throw new Error(`Upload fehlgeschlagen: keine Bild-URL erhalten. ${debugPath ? `Pfad: ${debugPath}` : ''}`.trim());
  }
  console.info('[ZenPost] Bild hochgeladen', {
    fileNameHint,
    uploadedUrl,
    path: result.path ?? null,
    targetDir: result.targetDir ?? null,
    documentRoot: result.documentRoot ?? null,
  });
  return uploadedUrl;
};

const buildServerBlocksFromMarkdown = (
  markdown: string,
  fallbackImageUrl?: string
): ServerBlock[] => {
  const lines = markdown.split('\n');
  const blocks: ServerBlock[] = [];
  const fallbackUrl = isServerUsableImageUrl(fallbackImageUrl) ? String(fallbackImageUrl).trim() : '';
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: 'header',
        data: {
          level: headingMatch[1].length,
          text: headingMatch[2].trim(),
        },
      });
      index += 1;
      continue;
    }

    const delimiterMatch = trimmed.match(/^(-{3,}|\*{3,}|_{3,})$/);
    if (delimiterMatch) {
      blocks.push({
        type: 'delimiter',
        data: {},
      });
      index += 1;
      continue;
    }

    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (index < lines.length) {
        const current = lines[index].trim();
        if (!current.startsWith('>')) break;
        quoteLines.push(current.replace(/^>\s?/, ''));
        index += 1;
      }
      const quoteText = quoteLines.join('\n').trim();
      if (quoteText) {
        blocks.push({
          type: 'quote',
          data: {
            text: quoteText,
            caption: '',
            alignment: 'left',
          },
        });
      }
      continue;
    }

    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length && lines[index].trim().startsWith('```')) {
        index += 1;
      }
      blocks.push({
        type: 'code',
        data: {
          code: codeLines.join('\n'),
          language,
        },
      });
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (unorderedMatch || orderedMatch) {
      const style: 'unordered' | 'ordered' = orderedMatch ? 'ordered' : 'unordered';
      const items: Array<{ content: string; meta: unknown[]; items: unknown[] }> = [];
      while (index < lines.length) {
        const current = lines[index].trim();
        const unordered = current.match(/^[-*+]\s+(.+)$/);
        const ordered = current.match(/^\d+\.\s+(.+)$/);
        if (style === 'unordered' && unordered) {
          items.push({ content: unordered[1].trim(), meta: [], items: [] });
          index += 1;
          continue;
        }
        if (style === 'ordered' && ordered) {
          items.push({ content: ordered[1].trim(), meta: [], items: [] });
          index += 1;
          continue;
        }
        break;
      }
      if (items.length > 0) {
        blocks.push({
          type: 'list',
          data: {
            style,
            meta: [],
            items,
          },
        });
      }
      continue;
    }

    if (trimmed.startsWith('|')) {
      const tableLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        tableLines.push(lines[index].trim());
        index += 1;
      }
      const rows = tableLines
        .map((row) => row.replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim()))
        .filter((row) => row.length > 0);
      if (rows.length > 0) {
        const hasSeparator = rows.length > 1 && rows[1].every((cell) => /^:?-{3,}:?$/.test(cell));
        const contentRows = hasSeparator ? [rows[0], ...rows.slice(2)] : rows;
        blocks.push({
          type: 'table',
          data: {
            withHeadings: hasSeparator,
            content: contentRows,
          },
        });
      }
      continue;
    }

    const markdownImageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (markdownImageMatch) {
      const alt = markdownImageMatch[1]?.trim() ?? '';
      const rawUrl = normalizeServerUrlValue(markdownImageMatch[2] ?? '');
      const url = isServerUsableImageUrl(rawUrl) ? rawUrl : fallbackUrl;
      if (url) {
        blocks.push({
          type: 'image',
          data: {
            url,
            src: url,
            caption: alt,
            alt,
          },
        });
      }
      index += 1;
      continue;
    }

    const ctaMatch = trimmed.match(/^\[CTA:\s*(.+?)\]\((.+?)\)\s*$/i);
    if (ctaMatch) {
      const text = String(ctaMatch[1] ?? '').trim();
      const url = normalizeServerUrlValue(ctaMatch[2] ?? '');
      if (url) {
        blocks.push({
          type: 'cta',
          data: {
            mode: 'url',
            text,
            url,
          },
        });
      }
      index += 1;
      continue;
    }

    const markdownLinkMatch = trimmed.match(/^\[(.+?)\]\((.+?)\)\s*$/);
    if (markdownLinkMatch) {
      const text = String(markdownLinkMatch[1] ?? '').trim();
      const url = normalizeServerUrlValue(markdownLinkMatch[2] ?? '');
      if (url) {
        const lowerText = text.toLowerCase();
        if (lowerText.startsWith('youtube:') || /(?:youtube\.com|youtu\.be)/i.test(url)) {
          blocks.push({
            type: 'youtube',
            data: {
              title: text.replace(/^youtube:\s*/i, '').trim() || text,
              url,
              embed: url,
              src: url,
            },
          });
        } else {
          blocks.push({
            type: 'cta',
            data: {
              mode: 'url',
              text,
              url,
            },
          });
        }
      }
      index += 1;
      continue;
    }

    const bareYoutubeMatch = trimmed.match(/^(?:youtube:\s*)?(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/\S+)\s*$/i);
    if (bareYoutubeMatch) {
      const url = normalizeServerUrlValue(bareYoutubeMatch[1] ?? '');
      if (url) {
        blocks.push({
          type: 'youtube',
          data: {
            title: '',
            url,
            embed: url,
            src: url,
          },
        });
      }
      index += 1;
      continue;
    }

    blocks.push({
      type: 'paragraph',
      data: {
        text: line,
      },
    });
    index += 1;
  }

  return blocks;
};

const normalizeMarkdownForServer = (markdown: string, fallbackImageUrl?: string): string => {
  const fallbackUrl = isServerUsableImageUrl(fallbackImageUrl) ? String(fallbackImageUrl).trim() : '';
  if (!fallbackUrl) return markdown;
  return markdown
    .replace(
      /!\[([^\]]*)\]\((data:image\/[a-zA-Z0-9.+-]+;base64,[^)]+)\)/gi,
      (_match, alt) => `![${String(alt ?? '')}](${fallbackUrl})`
    )
    .replace(
      /<img\b([^>]*?)\bsrc=["'](data:image\/[^"']+)["']([^>]*)\/?>/gi,
      (_match, beforeSrc, _dataSrc, afterSrc) => `<img${String(beforeSrc ?? '')}src="${fallbackUrl}"${String(afterSrc ?? '')}>`
    );
};

const replaceInlineImagesByUploadedUrls = async (
  markdown: string,
  uploadUrl: string,
  apiKey: string,
  fileNameSeed: string
): Promise<{ markdown: string; expectedCount: number; uploadedCount: number }> => {
  let next = markdown;

  const markdownMatches = Array.from(
    markdown.matchAll(/!\[([^\]]*)\]\((data:image\/[a-zA-Z0-9.+-]+;base64,[^)]+)\)/gi)
  );
  const expectedCount = markdownMatches.length;
  let uploadedCount = 0;
  for (let idx = 0; idx < markdownMatches.length; idx += 1) {
    const match = markdownMatches[idx];
    const alt = String(match[1] ?? '');
    const dataUrl = String(match[2] ?? '');
    const uploaded = await uploadImageDataUrlToServer(
      dataUrl,
      uploadUrl,
      apiKey,
      `${fileNameSeed}-md-${idx + 1}.png`
    );
    next = next.replace(`![${alt}](${dataUrl})`, `![${alt}](${uploaded})`);
    uploadedCount += 1;
  }

  const htmlMatches = Array.from(
    next.matchAll(/<img\b([^>]*?)\bsrc=["'](data:image\/[^"']+)["']([^>]*)\/?>/gi)
  );
  for (let idx = 0; idx < htmlMatches.length; idx += 1) {
    const match = htmlMatches[idx];
    const beforeSrc = String(match[1] ?? '');
    const dataUrl = String(match[2] ?? '');
    const afterSrc = String(match[3] ?? '');
    const uploaded = await uploadImageDataUrlToServer(
      dataUrl,
      uploadUrl,
      apiKey,
      `${fileNameSeed}-html-${idx + 1}.png`
    );
    const original = `<img${beforeSrc}src="${dataUrl}"${afterSrc}>`;
    const replaced = `<img${beforeSrc}src="${uploaded}"${afterSrc}>`;
    next = next.replace(original, replaced);
    uploadedCount += 1;
  }

  return { markdown: next, expectedCount: expectedCount + htmlMatches.length, uploadedCount };
};

const normalizeIncomingPostMeta = (
  meta?: { title?: string; subtitle?: string; imageUrl?: string; date?: string } | null
): { title: string; subtitle: string; imageUrl: string; date: string } => ({
  title: (meta?.title ?? '').trim(),
  subtitle: (meta?.subtitle ?? '').trim(),
  imageUrl: (meta?.imageUrl ?? '').trim(),
  date: normalizeDateForInput(meta?.date),
});

const toUserFacingError = (rawError: string, context: 'transform' | 'post'): string => {
  const raw = (rawError || '').trim();
  const lower = raw.toLowerCase();
  const prefix = context === 'post' ? 'Direkt-Posting fehlgeschlagen' : 'Transformation fehlgeschlagen';

  if (!raw) {
    return `${prefix}. Bitte prüfe API-Konfiguration und Verbindung.`;
  }
  if (
    lower.includes('load failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('fetch error')
  ) {
    return `${prefix}: Verbindung zur API fehlgeschlagen. Bitte API-URL, Internet und Firewall/CORS prüfen.`;
  }
  if (lower.includes('api-key fehlt') || lower.includes('api key fehlt') || lower.includes('configuration not found') || lower.includes('not configured')) {
    return `${prefix}: API-Daten nicht korrekt. Bitte API-Key und Zugangsdaten in den Einstellungen prüfen.`;
  }
  if (lower.includes('unauthorized') || lower.includes('401')) {
    return `${prefix}: Zugriff abgelehnt (401). Bitte API-Key prüfen.`;
  }
  if (lower.includes('403') || lower.includes('forbidden')) {
    return `${prefix}: Zugriff verweigert (403). Bitte Rechte/Scopes der API prüfen.`;
  }
  if (lower.includes('404') || lower.includes('not found')) {
    return `${prefix}: API-Endpunkt nicht gefunden (404). Bitte URL/Route prüfen.`;
  }
  if (lower.includes('429') || lower.includes('rate limit')) {
    return `${prefix}: API-Limit erreicht (429). Bitte später erneut versuchen.`;
  }
  if (lower.includes('500') || lower.includes('502') || lower.includes('503')) {
    return `${prefix}: Serverfehler. Bitte später erneut versuchen.`;
  }
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('aborted')) {
    return `${prefix}: Zeitüberschreitung. Bitte Verbindung und API-Responsezeit prüfen.`;
  }
  if (lower.includes('cors')) {
    return `${prefix}: CORS-Problem. Bitte Server-CORS für diese App freigeben.`;
  }
  return `${prefix}: ${raw}`;
};

export const ContentTransformScreen = ({
  onBack: _onBack,
  onStepChange,
  currentStep: externalStep,
  initialContent,
  initialFileName,
  initialPostMeta,
  initialPlatform,
  cameFromDocStudio,
  cameFromDashboard,
  onBackToDocStudio,
  onBackToDashboard,
  onOpenConverter,
  projectPath,
  requestedArticleId,
  onArticleRequestHandled,
  requestedFilePath,
  onFileRequestHandled,
  metadata: externalMetadata,
  onMetadataChange,
  headerAction,
  onHeaderActionHandled,
  onStep1BackToPostingChange,
  onStep2SelectionChange,
  onOpenDocStudioForPosting,
  onContentChange: onExternalContentChange,
  editorType = "block",
  onEditorTypeChange,
  multiPlatformMode = false,
  onMultiPlatformModeChange,
  onFileSaved,
  onOpenZenThoughtsEditor,
  serverArticleSlug,
  blogSaveTarget,
  onBlogPostSaved,
}: ContentTransformScreenProps) => {
  // Step Management
  const [currentStep, setCurrentStep] = useState<number>(externalStep ?? 1);
  const effectiveStep = externalStep ?? currentStep;
  const setStep = (step: number) => {
    if (externalStep !== undefined) {
      onStepChange?.(step);
      return;
    }
    setCurrentStep(step);
    onStepChange?.(step);
  };

  // Step 1: Source Input
  const STEP1_SAVED_COMPARISON_ID = '__saved__';
  const STEP1_TAB_COMPARISON_PREFIX = 'tab:';
  const [sourceContent, setSourceContent] = useState<string>(() => contentTransformSessionCache?.sourceContent ?? '');
  const sourceContentRef = useRef<string>('');
  const liveContentGetterRef = useRef<(() => Promise<string>) | null>(null);
  const [fileName, setFileName] = useState<string>(() => contentTransformSessionCache?.fileName ?? '');
  const [postMeta, setPostMeta] = useState<PostMeta>(
    () => contentTransformSessionCache?.postMeta ?? EMPTY_POST_META
  );
  const [postMetaByTab, setPostMetaByTab] = useState<Record<string, PostMeta>>(
    () => contentTransformSessionCache?.postMetaByTab ?? {}
  );
  const [analysisKeywords, setAnalysisKeywords] = useState<string[]>([]);

  const handleMetaChange = useCallback((newMeta: PostMeta) => {
    setPostMeta(prev => {
      if (JSON.stringify(prev.tags) !== JSON.stringify(newMeta.tags)) {
        setSourceContent(sc => upsertFrontmatterTags(sc, newMeta.tags));
      }
      return newMeta;
    });
    const tabId = activeDocTabIdRef.current;
    if (tabId) {
      setPostMetaByTab(prev => {
        const existing = prev[tabId];
        if (existing && postMetaEquals(existing, newMeta)) return prev;
        return { ...prev, [tabId]: newMeta };
      });
    }
  }, []);
  const [openDocTabs, setOpenDocTabs] = useState<ContentDocTab[]>(() => contentTransformSessionCache?.openDocTabs ?? []);
  const [activeDocTabId, setActiveDocTabId] = useState<string | null>(
    () => contentTransformSessionCache?.activeDocTabId ?? null
  );
  const activeDocTabIdRef = useRef<string | null>(null);
  const [docTabContents, setDocTabContents] = useState<Record<string, string>>(
    () => contentTransformSessionCache?.docTabContents ?? {}
  );
  const [dirtyDocTabs, setDirtyDocTabs] = useState<Record<string, boolean>>(
    () => contentTransformSessionCache?.dirtyDocTabs ?? {}
  );
  const [step1ComparisonBaseByTab, setStep1ComparisonBaseByTab] = useState<Record<string, string>>(
    () => contentTransformSessionCache?.step1ComparisonBaseByTab ?? {}
  );
  const [step1ComparisonSelectionByTab, setStep1ComparisonSelectionByTab] = useState<Record<string, string>>(
    () => contentTransformSessionCache?.step1ComparisonSelectionByTab ?? {}
  );
  const [editorSettings, setEditorSettings] = useState<EditorSettings>({
    ...defaultEditorSettings,
  });
  const lastAutosaveRef = useRef<Record<string, string>>({});
  const [step1AutosaveStatus, setStep1AutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [step1AutosaveAt, setStep1AutosaveAt] = useState<string | null>(null);
  const restoredAutosaveKeysRef = useRef<Record<string, boolean>>({});
  const [autosaveRestoreBanner, setAutosaveRestoreBanner] = useState<DraftAutosaveRecord | null>(null);
  const [autosaveHistory, setAutosaveHistory] = useState<DraftAutosaveRecord[]>([]);
  const [pendingCloseTabId, setPendingCloseTabId] = useState<string | null>(null);

  const emitExternalContentChange = (
    content: string,
    source: 'step1' | 'step4',
    tabId?: string | null
  ) => {
    const resolvedTabId = tabId ?? activeDocTabIdRef.current ?? null;
    const resolvedTab = resolvedTabId ? openDocTabs.find((tab) => tab.id === resolvedTabId) : null;
    onExternalContentChange?.(content, {
      source,
      activeTabId: resolvedTabId,
      activeTabKind: resolvedTab?.kind,
      activeTabFilePath: resolvedTab?.filePath,
      activeTabTitle: resolvedTab?.title,
      activeTabSubtitle: postMeta.subtitle || undefined,
      activeTabImageUrl: postMeta.imageUrl || undefined,
      tags: postMeta.tags,
    });
  };

  useEffect(() => {
    activeDocTabIdRef.current = activeDocTabId;
  }, [activeDocTabId]);

  useEffect(() => {
    if (!activeDocTabId) return;
    const stored = postMetaByTab[activeDocTabId];
    if (stored) {
      if (!postMetaEquals(stored, postMeta)) {
        setPostMeta(stored);
      }
      return;
    }
    const content = docTabContents[activeDocTabId] ?? '';
    const tabTitle = openDocTabs.find((tab) => tab.id === activeDocTabId)?.title ?? '';
    const inferred = extractPostMetaFromContent(content, tabTitle);
    setPostMeta(inferred);
    setPostMetaByTab(prev => ({ ...prev, [activeDocTabId]: inferred }));
  }, [activeDocTabId, docTabContents, openDocTabs, postMeta, postMetaByTab]);

  useEffect(() => {
    sourceContentRef.current = sourceContent;
  }, [sourceContent]);

  useEffect(() => {
    contentTransformSessionCache = {
      openDocTabs,
      activeDocTabId,
      docTabContents,
      dirtyDocTabs,
      step1ComparisonBaseByTab,
      step1ComparisonSelectionByTab,
      sourceContent,
      fileName,
      postMeta,
      postMetaByTab,
    };
  }, [
    openDocTabs,
    activeDocTabId,
    docTabContents,
    dirtyDocTabs,
    step1ComparisonBaseByTab,
    step1ComparisonSelectionByTab,
    sourceContent,
    fileName,
    postMeta,
    postMetaByTab,
  ]);

  useEffect(() => {
    if (!activeDocTabId) return;
    if (!openDocTabs.find((tab) => tab.id === activeDocTabId)) {
      setActiveDocTabId(null);
    }
  }, [openDocTabs, activeDocTabId]);

  useEffect(() => {
    if (activeDocTabId || openDocTabs.length === 0) return;
    const nextTab = openDocTabs[0];
    activeDocTabIdRef.current = nextTab.id;
    setActiveDocTabId(nextTab.id);
    const nextContent = docTabContents[nextTab.id] ?? '';
    setSourceContent(nextContent);
    emitExternalContentChange(nextContent, 'step1', nextTab.id);
    setFileName(nextTab.title ?? '');
  }, [openDocTabs, activeDocTabId, docTabContents]);

  useEffect(() => {
    const placeholderDrafts = openDocTabs.filter(isPlaceholderDraftTab);
    const nonPlaceholderTabs = openDocTabs.filter((tab) => !isPlaceholderDraftTab(tab));

    // Regel 1: Sobald "echte" Dokumente offen sind, darf kein "Entwurf"-Placeholder sichtbar sein.
    if (nonPlaceholderTabs.length > 0 && placeholderDrafts.length > 0) {
      const removeIds = new Set(placeholderDrafts.map((tab) => tab.id));
      setOpenDocTabs(nonPlaceholderTabs);
      setDocTabContents((prev) => {
        const next = { ...prev };
        removeIds.forEach((id) => delete next[id]);
        return next;
      });
      setDirtyDocTabs((prev) => {
        const next = { ...prev };
        removeIds.forEach((id) => delete next[id]);
        return next;
      });
      setStep1ComparisonBaseByTab((prev) => {
        const next = { ...prev };
        removeIds.forEach((id) => delete next[id]);
        return next;
      });
      setStep1ComparisonSelectionByTab((prev) => {
        const next = { ...prev };
        removeIds.forEach((id) => delete next[id]);
        return next;
      });
      if (activeDocTabId && removeIds.has(activeDocTabId)) {
        const nextTab = nonPlaceholderTabs[0];
        activeDocTabIdRef.current = nextTab.id;
        setActiveDocTabId(nextTab.id);
        const nextContent = docTabContents[nextTab.id] ?? '';
        setSourceContent(nextContent);
        setFileName(nextTab.title ?? '');
        emitExternalContentChange(nextContent, 'step1', nextTab.id);
      }
      return;
    }

    // Regel 2: Placeholder nur ohne Initialdaten anlegen.
    // Sonst kann der Initialtitel (z.B. aus Mobile Inbox) versehentlich durch "Entwurf" ueberschrieben werden.
    const hasInitialPayload =
      initialContent !== null &&
      initialContent !== undefined &&
      (String(initialContent).trim().length > 0 || !!initialFileName);
    if (openDocTabs.length === 0 && !hasInitialPayload) {
      const draftTabId = `draft-${Date.now()}`;
      const currentContent = sourceContentRef.current ?? '';
      setOpenDocTabs([{ id: draftTabId, title: 'Entwurf', kind: 'draft' }]);
      setDocTabContents((prev) => ({ ...prev, [draftTabId]: currentContent }));
      setDirtyDocTabs((prev) => ({ ...prev, [draftTabId]: false }));
      activeDocTabIdRef.current = draftTabId;
      setActiveDocTabId(draftTabId);
      setFileName('Entwurf');
      setPostMeta(EMPTY_POST_META);
      setPostMetaByTab((prev) => ({ ...prev, [draftTabId]: EMPTY_POST_META }));
      emitExternalContentChange(currentContent, 'step1', draftTabId);
      return;
    }

    // Regel 3: Falls mehrere Placeholder-Entwürfe entstehen, auf einen reduzieren.
    if (nonPlaceholderTabs.length === 0 && placeholderDrafts.length > 1) {
      const keep = placeholderDrafts[0];
      const removeIds = new Set(placeholderDrafts.slice(1).map((tab) => tab.id));
      setOpenDocTabs([keep]);
      setDocTabContents((prev) => {
        const next = { ...prev };
        removeIds.forEach((id) => delete next[id]);
        return next;
      });
      setDirtyDocTabs((prev) => {
        const next = { ...prev };
        removeIds.forEach((id) => delete next[id]);
        return next;
      });
      setStep1ComparisonBaseByTab((prev) => {
        const next = { ...prev };
        removeIds.forEach((id) => delete next[id]);
        return next;
      });
      setStep1ComparisonSelectionByTab((prev) => {
        const next = { ...prev };
        removeIds.forEach((id) => delete next[id]);
        return next;
      });
      if (activeDocTabId && removeIds.has(activeDocTabId)) {
        activeDocTabIdRef.current = keep.id;
        setActiveDocTabId(keep.id);
        const nextContent = docTabContents[keep.id] ?? '';
        setSourceContent(nextContent);
        setFileName(keep.title);
        emitExternalContentChange(nextContent, 'step1', keep.id);
      }
    }
  }, [openDocTabs, activeDocTabId, docTabContents, initialContent, initialFileName]);

  useEffect(() => {
    setStep1ComparisonBaseByTab((prev) => {
      let changed = false;
      const next = { ...prev };
      openDocTabs.forEach((tab) => {
        if (next[tab.id] === undefined) {
          next[tab.id] = docTabContents[tab.id] ?? '';
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [openDocTabs, docTabContents]);

  useEffect(() => {
    setStep1ComparisonSelectionByTab((prev) => {
      let changed = false;
      const next = { ...prev };
      openDocTabs.forEach((tab) => {
        if (!next[tab.id]) {
          next[tab.id] = STEP1_SAVED_COMPARISON_ID;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [openDocTabs]);

  const getActiveSavePlatform = (): ContentPlatform => {
    if (multiPlatformMode && activeEditTab) return activeEditTab;
    return selectedPlatform;
  };

  const buildDefaultSaveName = (baseName: string, version: number) => {
    const date = new Date().toISOString().slice(0, 10);
    return `${baseName}_${date}_v${version}.md`;
  };

  // Strip existing version pattern from filename: "Name_2026-02-03_v1.md" → "Name"
  // Also handles multiple nested patterns: "Name_2026-02-03_v1_2026-02-03_v1" → "Name"
  const stripVersionPattern = (name: string): string => {
    // First remove .md extension
    let base = name.replace(/\.md$/i, '');
    // Remove ALL occurrences of _YYYY-MM-DD_vN pattern (no $ anchor, removes all)
    // Pattern: underscore, 4 digits, dash, 2 digits, dash, 2 digits, underscore, v, digits
    base = base.replace(/_\d{4}-\d{2}-\d{2}_v\d+/g, '');
    return base;
  };

  const resolveNextAvailableName = async (baseName: string, baseDir: string) => {
    // First strip any existing version pattern from the base name
    const cleanBase = stripVersionPattern(baseName);
    let version = 1;
    let candidate = buildDefaultSaveName(cleanBase, version);
    while (await exists(`${baseDir}/${candidate}`)) {
      version += 1;
      candidate = buildDefaultSaveName(cleanBase, version);
    }
    return candidate;
  };

  // Get the base name for saving - use original filename if available, otherwise use platform
  const getSaveBaseName = (): string => {
    // Check if there's an active tab with a file
    if (activeDocTabId) {
      const activeTab = openDocTabs.find((tab) => tab.id === activeDocTabId);
      if (activeTab?.title) {
        // Remove .md extension and version pattern to get clean base name
        return stripVersionPattern(activeTab.title);
      }
    }
    // Fallback to fileName state
    if (fileName) {
      return stripVersionPattern(fileName);
    }
    // Final fallback to platform
    return getActiveSavePlatform();
  };

  const getLatestSourceContent = (override?: string) =>
    override ?? sourceContentRef.current ?? sourceContent;

  const getStep1AutosaveKey = () => {
    const activeTab = activeDocTabId ? openDocTabs.find((tab) => tab.id === activeDocTabId) : null;
    if (!activeTab) return 'content-step1:global';
    if (activeTab.kind === 'file' && activeTab.filePath) return `content-step1:file:${activeTab.filePath}`;
    if (activeTab.kind === 'article' && activeTab.articleId) return `content-step1:article:${activeTab.articleId}`;
    return `content-step1:tab:${activeTab.id}`;
  };

  const resolveLatestSourceContent = async (override?: string) => {
    if (typeof override === 'string') return override;
    const getter = liveContentGetterRef.current;
    if (getter) {
      try {
        const snapshot = await getter();
        if (typeof snapshot === 'string') {
          sourceContentRef.current = snapshot;
          if (snapshot !== sourceContent) {
            setSourceContent(snapshot);
          }
          return snapshot;
        }
      } catch {
        // fallback to state/ref
      }
    }
    return getLatestSourceContent();
  };

  const finalizeSavedSource = (
    filePath: string | undefined,
    savedName: string,
    content: string,
    options?: { markAsFile?: boolean }
  ) => {
    if (activeDocTabId) {
      setDirtyDocTabs((prev) => ({ ...prev, [activeDocTabId]: false }));
      setDocTabContents((prev) => ({ ...prev, [activeDocTabId]: content }));
      setStep1ComparisonBaseByTab((prev) => ({ ...prev, [activeDocTabId]: content }));
      if (options?.markAsFile && filePath) {
        setOpenDocTabs((prev) =>
          prev.map((tab) =>
            tab.id === activeDocTabId
              ? { ...tab, kind: 'file' as const, filePath, title: savedName }
              : tab
          )
        );
        setFileName(savedName);
      }
    }
    setSavedFileName(savedName);
    setSavedFilePath(filePath);
    setSavedFilePaths(filePath ? [filePath] : undefined);
    setSaveSuccessMessage(undefined);
    setSaveSuccessPathsLabel(undefined);
    setSaveSuccessPrimaryActionLabel(undefined);
    setSaveSuccessPrimaryActionUrl(null);
    setShowSaveSuccess(true);
    if (filePath) {
      onFileSaved?.(filePath, content, savedName);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('zenpost-project-files-updated'));
    }
  };

  const handleSaveAsSourceToProject = async (contentOverride?: string) => {
    const contentToSave = await resolveLatestSourceContent(contentOverride);
    if (!contentToSave.trim()) {
      alert('Kein Inhalt zum Speichern.');
      return;
    }

    const saveBaseName = getSaveBaseName();
    const defaultName = buildDefaultSaveName(saveBaseName, 1);

    if (isTauri()) {
      if (!projectPath) {
        alert('Kein Projektordner gesetzt.');
        return;
      }
      const suggestedName = await resolveNextAvailableName(saveBaseName, projectPath);
      const filePath = await save({
        defaultPath: `${projectPath}/${suggestedName}`,
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      });
      if (!filePath) return;
      if (!filePath.startsWith(projectPath)) {
        alert('Bitte speichere innerhalb des Projektordners.');
        return;
      }
      await writeTextFile(filePath, contentToSave);
      const savedName = filePath.split(/[\\/]/).pop() || suggestedName;
      finalizeSavedSource(filePath, savedName, contentToSave, { markAsFile: true });
      return;
    }

    const blob = new Blob([contentToSave], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const userName = window.prompt('Dateiname anpassen?', defaultName);
    const finalName = (userName && userName.trim()) ? userName.trim() : defaultName;
    const finalFileName = finalName.endsWith('.md') ? finalName : `${finalName}.md`;
    link.download = finalFileName;
    link.click();
    URL.revokeObjectURL(url);
    finalizeSavedSource(undefined, finalFileName, contentToSave);
  };

  const handleSaveSourceToProject = async (contentOverride?: string, triggerFtp = false) => {
    const contentToSave = await resolveLatestSourceContent(contentOverride);
    if (!contentToSave.trim()) {
      alert('Kein Inhalt zum Speichern.');
      return;
    }

    const activeTab = activeDocTabId ? openDocTabs.find((tab) => tab.id === activeDocTabId) : null;

    // Blog-aware save: write to posts/ + update manifest.json
    if (isTauri() && blogSaveTarget && (!activeTab || activeTab.kind !== 'file')) {
      // Check if post meta is sparse — title can come from heading, but tags + subtitle missing is worth a nudge
      const metaSparse = !postMeta.subtitle.trim() && postMeta.tags.length === 0;
      if (metaSparse && !contentOverride) {
        // contentOverride = "force save" signal from the hint banner
        pendingBlogSaveRef.current = () => handleSaveSourceToProject('__force__');
        setShowBlogMetaHint(true);
        return;
      }
      const actualContent = contentOverride === '__force__' ? await resolveLatestSourceContent() : contentToSave;
      try {
        const date = new Date().toISOString().split('T')[0];
        const titleFromMeta = postMeta.title.trim();
        const firstHeading = actualContent.match(/^#+\s+(.+)/m)?.[1] ?? (fileName || 'Blog Post');
        const titleText = (titleFromMeta || firstHeading).trim().slice(0, 80);
        const slug = `${date}-${titleText.toLowerCase()
          .replace(/[äöüß]/g, (c: string) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c] ?? c))
          .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
        const wordCount = actualContent.trim().split(/\s+/).length;
        const readingTime = Math.max(1, Math.round(wordCount / 220));
        const fmLines = [
          '---',
          `title: "${titleText.replace(/"/g, '\\"')}"`,
          postMeta.subtitle.trim() ? `subtitle: "${postMeta.subtitle.trim().replace(/"/g, '\\"')}"` : null,
          `date: "${date}"`,
          postMeta.tags.length > 0 ? `tags: [${postMeta.tags.join(', ')}]` : null,
          `readingTime: ${readingTime}`,
          postMeta.imageUrl.trim() ? `coverImage: "${postMeta.imageUrl.trim()}"` : null,
          '---', '', '',
        ].filter((l): l is string => l !== null).join('\n');
        const postsDir = await join(blogSaveTarget.path, 'posts');
        if (!(await exists(postsDir))) await mkdir(postsDir, { recursive: true });
        const filePath = await join(postsDir, `${slug}.md`);
        await writeTextFile(filePath, fmLines + actualContent);
        // Update manifest.json
        const manifestPath = await join(blogSaveTarget.path, 'manifest.json');
        let manifest: { site: Record<string, string>; posts: Array<Record<string, unknown>> } = {
          site: { title: blogSaveTarget.name, tagline: blogSaveTarget.tagline ?? '', author: blogSaveTarget.author ?? '', url: blogSaveTarget.siteUrl ?? '' },
          posts: [],
        };
        try { manifest = JSON.parse(await readTextFile(manifestPath)); } catch { /* new */ }
        // Fetch server manifest as authoritative source to avoid losing posts
        if (blogSaveTarget.siteUrl) {
          try {
            const siteBase = (blogSaveTarget.siteUrl.startsWith('http') ? blogSaveTarget.siteUrl : 'https://' + blogSaveTarget.siteUrl).replace(/\/$/, '');
            const res = await fetch(`${siteBase}/manifest.json`);
            if (res.ok) {
              const serverManifest = await res.json() as typeof manifest;
              if (Array.isArray(serverManifest?.posts) && serverManifest.posts.length >= manifest.posts.length) {
                manifest = serverManifest;
              }
            }
          } catch { /* server fetch non-fatal */ }
        }
        const entry: Record<string, unknown> = { slug, title: titleText, date, readingTime };
        if (postMeta.subtitle.trim()) entry.subtitle = postMeta.subtitle.trim();
        if (postMeta.tags.length > 0) entry.tags = postMeta.tags;
        if (postMeta.imageUrl.trim()) entry.coverImage = postMeta.imageUrl.trim();
        const idx = manifest.posts.findIndex((p) => p.slug === slug);
        if (idx >= 0) manifest.posts[idx] = entry; else manifest.posts.unshift(entry);
        await writeTextFile(manifestPath, JSON.stringify(manifest, null, 2));

        // FTP/SFTP Upload wenn konfiguriert
        if (blogSaveTarget.deployType === 'ftp' && blogSaveTarget.ftpHost && blogSaveTarget.ftpUser && blogSaveTarget.ftpPassword) {
          const blogRoot = (blogSaveTarget.ftpRemotePath ?? '/public_html/blog').replace(/\/$/, '');
          const ftpConfig = {
            host: blogSaveTarget.ftpHost,
            user: blogSaveTarget.ftpUser,
            password: blogSaveTarget.ftpPassword,
            remotePath: blogRoot + '/posts/',
            protocol: blogSaveTarget.ftpProtocol ?? 'ftp',
          };
          const ftpErr = await ftpUpload(filePath, `${slug}.md`, ftpConfig);
          // Also upload manifest.json so server stays in sync
          if (!ftpErr) {
            await ftpUpload(manifestPath, 'manifest.json', {
              ...ftpConfig,
              remotePath: blogRoot + '/',
            }).catch(() => {}); // non-fatal
          }
          if (ftpErr) {
            setSavedFileName(`${slug}.md`);
            setSavedFilePath(filePath);
            setSavedFilePaths([filePath]);
            setSaveSuccessMessage(`Lokal gespeichert. FTP-Upload fehlgeschlagen: ${ftpErr}`);
            setSaveSuccessPathsLabel(undefined);
            setSaveSuccessPrimaryActionLabel(undefined);
            setSaveSuccessPrimaryActionUrl(null);
            setShowSaveSuccess(true);
          } else {
            const viewUrl = blogSaveTarget.siteUrl ? `${(blogSaveTarget.siteUrl.startsWith('http') ? blogSaveTarget.siteUrl : 'https://' + blogSaveTarget.siteUrl).replace(/\/$/, '')}/#/post/${slug}` : undefined;
            setSavedFileName(`${slug}.md`);
            setSavedFilePath(filePath);
            setSavedFilePaths([
              `Blog: ${blogSaveTarget.name}`,
              `FTP: ${blogSaveTarget.ftpHost}${blogRoot}/posts/${slug}.md`,
              ...(viewUrl ? [`Ansicht: ${viewUrl}`] : []),
            ]);
            setSaveSuccessMessage('Artikel lokal gespeichert und per FTP hochgeladen.');
            setSaveSuccessPathsLabel('Details:');
            setSaveSuccessPrimaryActionLabel(viewUrl ? 'Im Blog anschauen' : undefined);
            setSaveSuccessPrimaryActionUrl(viewUrl ?? null);
            setShowSaveSuccess(true);
          }
          onBlogPostSaved?.(slug);
          return;
        }

        // PHP Upload (Web + Desktop)
        if (blogSaveTarget.deployType === 'php-api' && blogSaveTarget.phpApiUrl && blogSaveTarget.phpApiKey) {
          const phpErr = await phpBlogUpload(
            { filename: `${slug}.md`, content: fmLines + actualContent, manifest },
            { apiUrl: blogSaveTarget.phpApiUrl, apiKey: blogSaveTarget.phpApiKey },
          );
          const viewUrl = blogSaveTarget.siteUrl ? `${(blogSaveTarget.siteUrl.startsWith('http') ? blogSaveTarget.siteUrl : 'https://' + blogSaveTarget.siteUrl).replace(/\/$/, '')}/#/post/${slug}` : undefined;
          setSavedFileName(`${slug}.md`);
          setSavedFilePath(filePath);
          setSavedFilePaths(phpErr
            ? [`Lokal: ${filePath}`, `PHP Upload fehlgeschlagen: ${phpErr}`]
            : [`Blog: ${blogSaveTarget.name}`, blogSaveTarget.phpApiUrl, ...(viewUrl ? [`Ansicht: ${viewUrl}`] : [])]);
          setSaveSuccessMessage(phpErr ? `Lokal gespeichert. PHP Upload fehlgeschlagen: ${phpErr}` : 'Artikel lokal gespeichert und per PHP hochgeladen.');
          setSaveSuccessPathsLabel('Details:');
          setSaveSuccessPrimaryActionLabel(!phpErr && viewUrl ? 'Im Blog anschauen' : undefined);
          setSaveSuccessPrimaryActionUrl(!phpErr ? (viewUrl ?? null) : null);
          setShowSaveSuccess(true);
          onBlogPostSaved?.(slug);
          return;
        }

        finalizeSavedSource(filePath, `${slug}.md`, actualContent, { markAsFile: true });
        onBlogPostSaved?.(slug);
        return;
      } catch { /* fall through to normal save */ }
    }

    if (isTauri() && activeTab?.kind === 'file' && activeTab.filePath) {
      await writeTextFile(activeTab.filePath, contentToSave);
      const savedName = activeTab.filePath.split(/[\\/]/).pop() || activeTab.title || 'Dokument.md';

      // FTP Upload für bestehende Blog-Post-Dateien
      if (triggerFtp && blogSaveTarget?.deployType === 'ftp' && blogSaveTarget.ftpHost && blogSaveTarget.ftpUser && blogSaveTarget.ftpPassword) {
        const blogRoot2 = (blogSaveTarget.ftpRemotePath ?? '/public_html/blog').replace(/\/$/, '');
        const ftpErr = await ftpUpload(activeTab.filePath, savedName, {
          host: blogSaveTarget.ftpHost,
          user: blogSaveTarget.ftpUser,
          password: blogSaveTarget.ftpPassword,
          remotePath: blogRoot2 + '/posts/',
          protocol: blogSaveTarget.ftpProtocol ?? 'ftp',
        });
        if (ftpErr) {
          setSavedFileName(savedName);
          setSavedFilePath(activeTab.filePath);
          setSavedFilePaths([activeTab.filePath]);
          setSaveSuccessMessage(`Lokal gespeichert. FTP-Upload fehlgeschlagen: ${ftpErr}`);
          setSaveSuccessPathsLabel(undefined);
          setSaveSuccessPrimaryActionLabel(undefined);
          setSaveSuccessPrimaryActionUrl(null);
          setShowSaveSuccess(true);
        } else {
          const slug = savedName.replace(/\.md$/, '');
          // Update manifest.json locally and re-upload to server
          try {
            const manifestPath = await join(blogSaveTarget.path, 'manifest.json');
            let manifest: { site: Record<string, string>; posts: Array<Record<string, unknown>> } = {
              site: { title: blogSaveTarget.name, tagline: blogSaveTarget.tagline ?? '', author: blogSaveTarget.author ?? '', url: blogSaveTarget.siteUrl ?? '' },
              posts: [],
            };
            // 1. Try local manifest
            try { manifest = JSON.parse(await readTextFile(manifestPath)); } catch { /* new manifest */ }
            // 2. Try server manifest (authoritative — has all posts). Merge: keep server posts as base
            if (blogSaveTarget.siteUrl) {
              try {
                const siteBase = (blogSaveTarget.siteUrl.startsWith('http') ? blogSaveTarget.siteUrl : 'https://' + blogSaveTarget.siteUrl).replace(/\/$/, '');
                const res = await fetch(`${siteBase}/manifest.json`);
                if (res.ok) {
                  const serverManifest = await res.json() as typeof manifest;
                  if (Array.isArray(serverManifest?.posts) && serverManifest.posts.length >= manifest.posts.length) {
                    manifest = serverManifest;
                  }
                }
              } catch { /* server fetch non-fatal */ }
            }
            const fmMatch = contentToSave.match(/^---\n([\s\S]*?)\n---/);
            const fmStr = fmMatch?.[1] ?? '';
            const getFmField = (k: string) => fmStr.match(new RegExp(`^${k}:\\s*"?([^"\\n]+)"?`, 'm'))?.[1]?.trim() ?? '';
            const entry: Record<string, unknown> = {
              slug,
              title: getFmField('title') || slug,
              date: getFmField('date') || new Date().toISOString().split('T')[0],
              readingTime: parseInt(getFmField('readingTime') || '1', 10) || 1,
            };
            if (getFmField('subtitle')) entry.subtitle = getFmField('subtitle');
            if (getFmField('coverImage')) entry.coverImage = getFmField('coverImage');
            const tagsMatch = fmStr.match(/^tags:\s*\[([^\]]*)\]/m);
            if (tagsMatch) entry.tags = tagsMatch[1].split(',').map((t: string) => t.trim()).filter(Boolean);
            const idx = manifest.posts.findIndex((p) => p.slug === slug);
            if (idx >= 0) manifest.posts[idx] = entry; else manifest.posts.unshift(entry);
            await writeTextFile(manifestPath, JSON.stringify(manifest, null, 2));
            await ftpUpload(manifestPath, 'manifest.json', {
              host: blogSaveTarget.ftpHost!,
              user: blogSaveTarget.ftpUser!,
              password: blogSaveTarget.ftpPassword!,
              remotePath: blogRoot2 + '/',
              protocol: blogSaveTarget.ftpProtocol ?? 'ftp',
            }).catch(() => {});
          } catch { /* manifest update non-fatal */ }
          const viewUrl = blogSaveTarget.siteUrl ? `${(blogSaveTarget.siteUrl.startsWith('http') ? blogSaveTarget.siteUrl : 'https://' + blogSaveTarget.siteUrl).replace(/\/$/, '')}/#/post/${slug}` : undefined;
          setSavedFileName(savedName);
          setSavedFilePath(activeTab.filePath);
          setSavedFilePaths([
            `Blog: ${blogSaveTarget.name}`,
            `FTP: ${blogSaveTarget.ftpHost}${blogRoot2}/posts/${savedName}`,
            ...(viewUrl ? [`Ansicht: ${viewUrl}`] : []),
          ]);
          setSaveSuccessMessage('Artikel lokal gespeichert und per FTP hochgeladen.');
          setSaveSuccessPathsLabel('Details:');
          setSaveSuccessPrimaryActionLabel(viewUrl ? 'Im Blog anschauen' : undefined);
          setSaveSuccessPrimaryActionUrl(viewUrl ?? null);
          setShowSaveSuccess(true);
        }
        onFileSaved?.(activeTab.filePath, contentToSave, savedName);
        return;
      }

      // PHP Upload für bestehende File-Tabs
      if (triggerFtp && blogSaveTarget?.deployType === 'php-api' && blogSaveTarget.phpApiUrl && blogSaveTarget.phpApiKey) {
        // Build updated manifest to send alongside the post
        let phpManifest: { site: Record<string, string>; posts: Array<Record<string, unknown>> } | undefined;
        try {
          const manifestPath = await join(blogSaveTarget.path, 'manifest.json');
          let manifest: { site: Record<string, string>; posts: Array<Record<string, unknown>> } = {
            site: { title: blogSaveTarget.name, tagline: blogSaveTarget.tagline ?? '', author: blogSaveTarget.author ?? '', url: blogSaveTarget.siteUrl ?? '' },
            posts: [],
          };
          try { manifest = JSON.parse(await readTextFile(manifestPath)); } catch { /* new manifest */ }
          // Fetch from PHP API (GET returns current server manifest with all posts)
          try {
            const res = await fetch(blogSaveTarget.phpApiUrl!, { method: 'GET' });
            if (res.ok) {
              const serverManifest = await res.json() as typeof manifest;
              if (Array.isArray(serverManifest?.posts) && serverManifest.posts.length >= manifest.posts.length) {
                manifest = serverManifest;
              }
            }
          } catch { /* server fetch non-fatal */ }
          const slug2 = savedName.replace(/\.md$/, '');
          const fmMatch2 = contentToSave.match(/^---\n([\s\S]*?)\n---/);
          const fmStr2 = fmMatch2?.[1] ?? '';
          const getFmField2 = (k: string) => fmStr2.match(new RegExp(`^${k}:\\s*"?([^"\\n]+)"?`, 'm'))?.[1]?.trim() ?? '';
          const entry2: Record<string, unknown> = {
            slug: slug2,
            title: getFmField2('title') || slug2,
            date: getFmField2('date') || new Date().toISOString().split('T')[0],
            readingTime: parseInt(getFmField2('readingTime') || '1', 10) || 1,
          };
          if (getFmField2('subtitle')) entry2.subtitle = getFmField2('subtitle');
          if (getFmField2('coverImage')) entry2.coverImage = getFmField2('coverImage');
          const tagsMatch2 = fmStr2.match(/^tags:\s*\[([^\]]*)\]/m);
          if (tagsMatch2) entry2.tags = tagsMatch2[1].split(',').map((t: string) => t.trim()).filter(Boolean);
          const idx2 = manifest.posts.findIndex((p) => p.slug === slug2);
          if (idx2 >= 0) manifest.posts[idx2] = entry2; else manifest.posts.unshift(entry2);
          await writeTextFile(manifestPath, JSON.stringify(manifest, null, 2));
          phpManifest = manifest;
        } catch { /* manifest update non-fatal */ }
        const phpErr = await phpBlogUpload(
          { filename: savedName, content: contentToSave, manifest: phpManifest },
          { apiUrl: blogSaveTarget.phpApiUrl, apiKey: blogSaveTarget.phpApiKey },
        );
        const slug = savedName.replace(/\.md$/, '');
        const viewUrl = blogSaveTarget.siteUrl ? `${blogSaveTarget.siteUrl.replace(/\/$/, '')}/post/${slug}` : undefined;
        setSavedFileName(savedName);
        setSavedFilePath(activeTab.filePath);
        setSavedFilePaths(phpErr
          ? [activeTab.filePath, `PHP Upload fehlgeschlagen: ${phpErr}`]
          : [`Blog: ${blogSaveTarget.name}`, blogSaveTarget.phpApiUrl, ...(viewUrl ? [`Ansicht: ${viewUrl}`] : [])]);
        setSaveSuccessMessage(phpErr ? `Lokal gespeichert. PHP Upload fehlgeschlagen: ${phpErr}` : 'Artikel lokal gespeichert und per PHP hochgeladen.');
        setSaveSuccessPathsLabel('Details:');
        setSaveSuccessPrimaryActionLabel(!phpErr && viewUrl ? 'Im Blog anschauen' : undefined);
        setSaveSuccessPrimaryActionUrl(!phpErr ? (viewUrl ?? null) : null);
        setShowSaveSuccess(true);
        onFileSaved?.(activeTab.filePath, contentToSave, savedName);
        return;
      }

      finalizeSavedSource(activeTab.filePath, savedName, contentToSave);
      return;
    }

    await handleSaveAsSourceToProject(contentToSave);
  };

  const handleSaveSourceToServer = async (contentOverride?: string) => {
    try {
      const contentToSave = await resolveLatestSourceContent(contentOverride);
      if (!contentToSave.trim()) {
        alert('Kein Inhalt zum Export auf den Server.');
        return;
      }

      // Always resolve latest settings from storage to avoid stale in-memory state.
      const currentZenSettings = loadZenStudioSettings();
      setZenStudioSettings(currentZenSettings);

      let apiBaseUrl = (currentZenSettings.contentServerApiUrl ?? '').trim();
      // Ensure absolute URL – add https:// if user forgot the protocol
      if (apiBaseUrl && !/^https?:\/\//i.test(apiBaseUrl)) {
        apiBaseUrl = `https://${apiBaseUrl}`;
      }
      const endpoint = (currentZenSettings.contentServerApiEndpoint ?? '').trim() || '/save_articles.php';
      const uploadEndpoint = (currentZenSettings.contentServerImageUploadEndpoint ?? '').trim() || '/upload_images.php';
      const apiKey = (currentZenSettings.contentServerApiKey ?? '').trim();

      if (!apiBaseUrl && !/^https?:\/\//i.test(endpoint)) {
        setSettingsDefaultTab('api');
        setShowSettings(true);
        alert('Bitte API URL in Einstellungen -> API setzen.');
        return;
      }

      const targetUrl = toAbsoluteEndpointUrl(apiBaseUrl, endpoint);
      const uploadUrl = uploadEndpoint
        ? (
          /^https?:\/\//i.test(uploadEndpoint)
            ? uploadEndpoint
            : (apiBaseUrl ? toAbsoluteEndpointUrl(apiBaseUrl, uploadEndpoint) : '')
        )
        : '';

      const currentTab = activeDocTabIdRef.current
        ? openDocTabs.find((tab) => tab.id === activeDocTabIdRef.current)
        : null;
      const title = (currentTab?.title || fileName || 'Entwurf').trim() || 'Entwurf';
      // If article was loaded from server, use original slug to ensure correct overwrite
      const fallbackSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        || `entwurf-${Date.now()}`;

      const markdownHasInlineImages = /!\[[^\]]*\]\(data:image\/[a-zA-Z0-9.+-]+;base64,[^)]+\)/i.test(contentToSave)
        || /<img\b[^>]*\bsrc=["']data:image\/[^"']+["'][^>]*\/?>/i.test(contentToSave);
      let markdownPrepared = contentToSave;
      let inlineUploadExpected = 0;
      let inlineUploadCompleted = 0;
      let metaUploadCompleted = 0;
      if (markdownHasInlineImages) {
        if (!uploadUrl) {
          alert('Inline-Bilder erkannt, aber kein Upload-Endpunkt konfiguriert (API -> Upload Endpoint).');
          return;
        }
        const inlineResult = await replaceInlineImagesByUploadedUrls(
          markdownPrepared,
          uploadUrl,
          apiKey,
          fallbackSlug
        );
        markdownPrepared = inlineResult.markdown;
        inlineUploadExpected = inlineResult.expectedCount;
        inlineUploadCompleted = inlineResult.uploadedCount;
        if (inlineUploadCompleted !== inlineUploadExpected) {
          throw new Error(`Inline-Bild-Upload unvollstaendig (${inlineUploadCompleted}/${inlineUploadExpected}).`);
        }
      }

      // Meta-Felder: nutze explizit gesetzte Werte, sonst auto-extraktion
      const metaTitle = postMeta.title.trim() || title;
      const metaSubtitle = postMeta.subtitle.trim() || (markdownPrepared.match(/^##\s+(.+)/m)?.[1] ?? '');
      const extractedImage = (markdownPrepared.match(/!\[[^\]]*\]\(([^)]+)\)/)?.[1] ?? '').trim();
      const preferredImage = postMeta.imageUrl.trim() || extractedImage;
      let normalizedPreferredImage = preferredImage;
      if (preferredImage && isInlineOrBlobImageUrl(preferredImage)) {
        if (!uploadUrl) {
          alert('Bild-URL in Post-Metadaten ist data/blob, aber Upload-Endpunkt fehlt.');
          return;
        }
        const dataUrl = preferredImage.startsWith('blob:')
          ? await blobUrlToDataImageUrl(preferredImage)
          : preferredImage;
        normalizedPreferredImage = await uploadImageDataUrlToServer(
          dataUrl,
          uploadUrl,
          apiKey,
          `${fallbackSlug}-meta.png`
        );
        metaUploadCompleted = 1;
      }
      if (/!\[[^\]]*\]\(data:image\/[a-zA-Z0-9.+-]+;base64,[^)]+\)/i.test(markdownPrepared)
        || /<img\b[^>]*\bsrc=["']data:image\/[^"']+["'][^>]*\/?>/i.test(markdownPrepared)) {
        throw new Error('Es sind noch nicht ersetzte data:image Inhalte im Markdown vorhanden.');
      }
      const metaImage = resolveServerImageUrl(normalizedPreferredImage, currentZenSettings.contentServerImageBaseUrl);
      if (metaImage && /^https?:\/\//i.test(metaImage)) {
        const filePart = metaImage.split('?')[0].split('#')[0].split('/').pop() ?? '';
        if (filePart && !/\.(png|jpe?g|webp|gif|svg)$/i.test(filePart)) {
          alert('Bild-URL wirkt unvollstaendig (keine Dateiendung). Bitte Bild erneut hochladen oder gueltige URL setzen.');
          return;
        }
      }
      const metaDate = postMeta.date.trim() || new Date().toISOString().slice(0, 10);
      const metaSlug = serverArticleSlug?.trim()
        || (postMeta.title.trim()
        ? postMeta.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        : fallbackSlug);
      const markdownForServer = normalizeMarkdownForServer(markdownPrepared, metaImage);
      const serverBlocks = buildServerBlocksFromMarkdown(markdownForServer, metaImage);
      const serverContent = {
        blocks: serverBlocks,
        markdown: markdownForServer,
      };

      const payload = {
        slug: metaSlug,
        title: metaTitle,
        subtitle: metaSubtitle,
        date: metaDate,
        image: metaImage,
        imageUrl: metaImage,
        blocks: serverBlocks,
        content: serverContent,
        markdown: markdownForServer,
      };

      let localCacheFilePath: string | null = null;
      let localSyncIndexPath: string | null = null;
      const upsertLocalSyncIndex = async (status: 'pending' | 'synced', remoteUrl?: string) => {
        if (!localSyncIndexPath) return;
        type SyncEntry = {
          slug: string;
          localPath: string;
          serverApiUrl: string;
          status: 'pending' | 'synced';
          updatedAt: string;
          remoteUrl?: string;
        };
        let entries: SyncEntry[] = [];
        try {
          if (await exists(localSyncIndexPath)) {
            const raw = await readTextFile(localSyncIndexPath);
            const parsed = JSON.parse(raw) as SyncEntry[];
            if (Array.isArray(parsed)) entries = parsed;
          }
        } catch {
          entries = [];
        }

        const nextEntry: SyncEntry = {
          slug: metaSlug,
          localPath: localCacheFilePath ?? '',
          serverApiUrl: apiBaseUrl,
          status,
          updatedAt: new Date().toISOString(),
          ...(remoteUrl ? { remoteUrl } : {}),
        };
        const withoutCurrent = entries.filter((entry) => entry.slug !== metaSlug);
        await writeTextFile(localSyncIndexPath, JSON.stringify([...withoutCurrent, nextEntry], null, 2));
      };

      if (isTauri()) {
        const activeServerIdx = Math.max(0, Math.min(currentZenSettings.activeServerIndex ?? 0, (currentZenSettings.servers ?? []).length - 1));
        const activeServer = (currentZenSettings.servers ?? [])[activeServerIdx];
        const localCacheBasePath = (
          activeServer?.contentServerLocalCachePath
          ?? currentZenSettings.contentServerLocalCachePath
          ?? ''
        ).trim();

        if (!localCacheBasePath) {
          setSettingsDefaultTab('api');
          setShowSettings(true);
          alert('Bitte in Einstellungen > API pro Server einen lokalen Cache-Pfad setzen.');
          return;
        }

        await mkdir(localCacheBasePath, { recursive: true });
        localCacheFilePath = await join(localCacheBasePath, `${metaSlug}.md`);
        localSyncIndexPath = await join(localCacheBasePath, 'server-sync-index.json');
        await writeTextFile(localCacheFilePath, markdownForServer);
        await upsertLocalSyncIndex('pending');
      }

      const articleHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      };

      let articleResponseStatus: number;
      let responseText: string;

      if (isTauri()) {
        const res = await invoke<{ status: number; body: string }>('http_fetch', {
          request: { url: targetUrl, method: 'POST', headers: articleHeaders, body: JSON.stringify(payload) },
        });
        articleResponseStatus = res.status;
        responseText = res.body;
      } else {
        const response = await fetch(targetUrl, { method: 'POST', headers: articleHeaders, body: JSON.stringify(payload) });
        articleResponseStatus = response.status;
        responseText = await response.text().catch(() => '');
      }

      if (articleResponseStatus < 200 || articleResponseStatus >= 300) {
        throw new Error(responseText || `HTTP ${articleResponseStatus}`);
      }
      const responseJson = (() => {
        if (!responseText) return null;
        try {
          return JSON.parse(responseText) as Record<string, unknown>;
        } catch {
          return null;
        }
      })();
      const responseUrl = typeof responseJson?.url === 'string' ? responseJson.url.trim() : '';
      const responsePath = typeof responseJson?.path === 'string' ? responseJson.path.trim() : '';
      const apiOrigin = (() => {
        if (!apiBaseUrl) return '';
        try {
          return new URL(apiBaseUrl).origin;
        } catch {
          return '';
        }
      })();
      const slugViewUrl = apiOrigin ? `${apiOrigin}/post/${encodeURIComponent(metaSlug)}` : '';
      const serverViewUrl = slugViewUrl || responseUrl;

      if (localCacheFilePath) {
        await upsertLocalSyncIndex('synced', serverViewUrl || undefined);
      }

      const uploadInfo = (inlineUploadCompleted > 0 || metaUploadCompleted > 0)
        ? ` (Bilder hochgeladen: ${inlineUploadCompleted + metaUploadCompleted})`
        : '';
      const serverDetails = [
        `Slug: ${metaSlug}`,
        localCacheFilePath ? `Local Cache: ${localCacheFilePath}` : '',
        `API Endpoint: ${targetUrl}`,
        serverViewUrl ? `Ansicht: ${serverViewUrl}` : '',
        responsePath ? `Server-Pfad: ${responsePath}` : '',
        (inlineUploadCompleted > 0 || metaUploadCompleted > 0)
          ? `Uploads: ${inlineUploadCompleted + metaUploadCompleted}`
          : '',
      ].filter(Boolean);

      setSavedFileName(`${metaSlug}.md`);
      setSavedFilePath(serverViewUrl || targetUrl);
      setSavedFilePaths(serverDetails);
      setSaveSuccessMessage(`Artikel erfolgreich auf Server exportiert${uploadInfo}.`);
      setSaveSuccessPathsLabel('Server-Details:');
      setSaveSuccessPrimaryActionLabel(serverViewUrl ? 'Auf Server anschauen' : undefined);
      setSaveSuccessPrimaryActionUrl(serverViewUrl || null);
      setShowSaveSuccess(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler beim Server-Export.';
      alert(`Server-Export fehlgeschlagen: ${message}`);
    }
  };

  // Track initial content load to prevent re-loading
  const loadedInitialKeyRef = useRef<string | null>(null);
  const lastRequestedArticleIdRef = useRef<string | null>(null);
  const lastRequestedFilePathRef = useRef<string | null>(null);

  // Load initial content if provided (from Doc Studio or Planner) - when content changes
  useEffect(() => {
    if (initialContent === null || initialContent === undefined) return;
    const initialMetaKey = JSON.stringify(initialPostMeta ?? null);
    const initialKey = `${initialFileName ?? ''}::${initialMetaKey}::${initialContent}`;
    if (initialKey !== loadedInitialKeyRef.current) {
      // Extract title from content if it starts with a markdown heading
      const extractTitleFromContent = (content: string): string | null => {
        const match = content.match(/^#\s+(.+)$/m);
        return match ? match[1].trim() : null;
      };

      const contentTitle = extractTitleFromContent(initialContent);
      const tabTitle = initialFileName || contentTitle || 'Geplanter Post';
      const existingTabByTitle = openDocTabs.find((tab) => tab.title === tabTitle);
      const placeholderDraftTab = openDocTabs.find(isPlaceholderDraftTab);
      const targetTabId = existingTabByTitle?.id ?? placeholderDraftTab?.id ?? `initial-${Date.now()}`;

      setOpenDocTabs((prev) => {
        if (existingTabByTitle) return prev;
        if (placeholderDraftTab) {
          return prev.map((tab) =>
            tab.id === placeholderDraftTab.id
              ? { ...tab, title: tabTitle, kind: 'draft' as const }
              : tab
          );
        }
        return [...prev, { id: targetTabId, title: tabTitle, kind: 'draft' }];
      });

      setDocTabContents((prev) => ({ ...prev, [targetTabId]: initialContent }));
      setActiveDocTabId(targetTabId);
      setSourceContent(initialContent);
      setFileName(tabTitle);
      const extractedMeta = extractPostMetaFromContent(initialContent, tabTitle);
      const incomingMeta = normalizeIncomingPostMeta(initialPostMeta);
      const nextMeta = {
        title: incomingMeta.title || extractedMeta.title,
        subtitle: incomingMeta.subtitle || extractedMeta.subtitle,
        imageUrl: incomingMeta.imageUrl || extractedMeta.imageUrl,
        date: incomingMeta.date || extractedMeta.date,
        tags: extractedMeta.tags,
      };
      setPostMeta(nextMeta);
      setPostMetaByTab((prev) => ({ ...prev, [targetTabId]: nextMeta }));
      loadedInitialKeyRef.current = initialKey;
    }
  }, [initialContent, initialFileName, initialPostMeta, openDocTabs]);

  useEffect(() => {
    if (!projectPath) return;
    let isMounted = true;
    const loadSettings = async () => {
      const loaded = await loadEditorSettings(projectPath);
      if (isMounted) {
        setEditorSettings(loaded);
      }
    };
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, [projectPath]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<EditorSettings>).detail;
      if (detail) {
        setEditorSettings(detail);
      }
    };
    window.addEventListener('zen-editor-settings-updated', handler);
    return () => window.removeEventListener('zen-editor-settings-updated', handler);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ZenStudioSettings>).detail;
      if (detail) {
        setZenStudioSettings(detail);
      } else {
        setZenStudioSettings(loadZenStudioSettings());
      }
    };
    window.addEventListener('zen-studio-settings-updated', handler);
    return () => window.removeEventListener('zen-studio-settings-updated', handler);
  }, []);

  useEffect(() => {
    if (!projectPath || !editorSettings.autoSaveEnabled) return;
    const autosaveKey = getStep1AutosaveKey();
    if (!autosaveKey || restoredAutosaveKeysRef.current[autosaveKey]) return;
    restoredAutosaveKeysRef.current[autosaveKey] = true;
    loadDraftAutosave(projectPath, autosaveKey)
      .then((draft) => {
        if (!draft?.content) return;
        if (draft.content === sourceContent) return;
        setAutosaveRestoreBanner(draft);
      })
      .catch((error) => {
        console.error('[ContentTransform] Restore Autosave fehlgeschlagen:', error);
      });
  }, [projectPath, editorSettings.autoSaveEnabled, activeDocTabId, sourceContent, openDocTabs]);

  useEffect(() => {
    if (!projectPath || !editorSettings.autoSaveEnabled) return;
    if (!sourceContent.trim()) return;
    const autosaveKey = getStep1AutosaveKey();
    const debounceMs = Math.max(5, editorSettings.autoSaveIntervalSec) * 1000;
    const timeout = setTimeout(() => {
      const trimmed = sourceContent.trim();
      if (lastAutosaveRef.current[autosaveKey] === trimmed) return;
      setStep1AutosaveStatus('saving');
      saveDraftAutosave(projectPath, autosaveKey, sourceContent, editorSettings.autoSaveCustomPath)
        .then(() => {
          lastAutosaveRef.current[autosaveKey] = trimmed;
          setStep1AutosaveStatus('saved');
          setStep1AutosaveAt(new Date().toISOString());
        })
        .catch((error) => {
          console.error('[ContentTransform] Autosave fehlgeschlagen:', error);
          setStep1AutosaveStatus('error');
        });
    }, debounceMs);
    return () => clearTimeout(timeout);
  }, [projectPath, editorSettings.autoSaveEnabled, editorSettings.autoSaveIntervalSec, sourceContent, activeDocTabId, openDocTabs]);

  // Autosave-History laden (nach jedem Save + Tab-Wechsel)
  useEffect(() => {
    if (!projectPath || !editorSettings.autoSaveEnabled) { setAutosaveHistory([]); return; }
    const autosaveKey = getStep1AutosaveKey();
    listDraftAutosaves(projectPath, autosaveKey, editorSettings.autoSaveCustomPath)
      .then((records) => setAutosaveHistory(records))
      .catch(() => setAutosaveHistory([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectPath, editorSettings.autoSaveEnabled, activeDocTabId, openDocTabs, step1AutosaveAt]);

  const handleAutosaveBannerRestore = () => {
    if (!autosaveRestoreBanner) return;
    const restored = autosaveRestoreBanner.content;
    sourceContentRef.current = restored;
    setSourceContent(restored);
    emitExternalContentChange(restored, 'step1');
    if (activeDocTabId) {
      setDocTabContents((prev) => ({ ...prev, [activeDocTabId]: restored }));
      setDirtyDocTabs((prev) => ({ ...prev, [activeDocTabId]: true }));
    }
    setAutosaveRestoreBanner(null);
  };

  const handleAutosaveBannerDismiss = () => setAutosaveRestoreBanner(null);

  const handleAutosaveHistoryRestore = (record: DraftAutosaveRecord) => {
    const restored = record.content;
    sourceContentRef.current = restored;
    setSourceContent(restored);
    emitExternalContentChange(restored, 'step1');
    if (activeDocTabId) {
      setDocTabContents((prev) => ({ ...prev, [activeDocTabId]: restored }));
      setDirtyDocTabs((prev) => ({ ...prev, [activeDocTabId]: true }));
    }
  };

  const handleAutosaveHistoryCompare = (record: DraftAutosaveRecord) => {
    if (!activeDocTabId) return;
    setStep1ComparisonBaseByTab((prev) => ({ ...prev, [activeDocTabId]: record.content }));
    setStep1ComparisonSelectionByTab((prev) => ({ ...prev, [activeDocTabId]: STEP1_SAVED_COMPARISON_ID }));
  };

  useEffect(() => {
    if (!requestedArticleId || !projectPath) return;
    if (requestedArticleId === lastRequestedArticleIdRef.current) return;
    let isMounted = true;
    const loadRequestedArticle = async () => {
      const article = await loadArticle(projectPath, requestedArticleId);
      if (!article || !isMounted) return;
      const tabId = `article:${requestedArticleId}`;
      const title = article.title || 'Artikel';
      const content = article.content || '';
      const inferredMeta = extractPostMetaFromContent(content, title);
      setOpenDocTabs((prev) =>
        prev.some((tab) => tab.id === tabId)
          ? prev
          : [...prev, { id: tabId, title, kind: 'article', articleId: requestedArticleId }]
      );
      setDocTabContents((prev) => ({ ...prev, [tabId]: content }));
      setDirtyDocTabs((prev) => ({ ...prev, [tabId]: false }));
      setActiveDocTabId(tabId);
      setSourceContent(content);
      setFileName(title);
      const nextMeta = {
        title: (article.title ?? '').trim() || inferredMeta.title,
        subtitle: (article.subtitle ?? '').trim() || inferredMeta.subtitle,
        imageUrl: (article.coverImageUrl ?? '').trim() || inferredMeta.imageUrl,
        date: normalizeDateForInput(article.publishDate) || inferredMeta.date,
        tags: inferredMeta.tags,
      };
      setPostMeta(nextMeta);
      setPostMetaByTab((prev) => ({ ...prev, [tabId]: nextMeta }));
      setError(null);
      setStep(1);
      lastRequestedArticleIdRef.current = requestedArticleId;
      onArticleRequestHandled?.();
    };
    loadRequestedArticle();
    return () => {
      isMounted = false;
    };
  }, [projectPath, requestedArticleId, onArticleRequestHandled]);

  useEffect(() => {
    if (!requestedFilePath) return;
    const tabId = `file:${requestedFilePath}`;
    const existingFileTab =
      openDocTabs.find((tab) => tab.kind === 'file' && tab.filePath === requestedFilePath) ??
      openDocTabs.find((tab) => tab.id === tabId);
    const targetTabId = existingFileTab?.id ?? tabId;
    if (requestedFilePath === lastRequestedFilePathRef.current && existingFileTab) {
      const content = docTabContents[targetTabId] ?? '';
      setActiveDocTabId(targetTabId);
      setSourceContent(content);
      const fileNameFromPath = requestedFilePath.split(/[\\/]/).pop() || 'Datei';
      setFileName(fileNameFromPath);
      const nextMeta = extractPostMetaFromContent(content, fileNameFromPath);
      setPostMeta(nextMeta);
      setPostMetaByTab((prev) => ({ ...prev, [targetTabId]: nextMeta }));
      setError(null);
      setStep(1);
      onFileRequestHandled?.();
      return;
    }
    let isMounted = true;
    const loadRequestedFile = async () => {
      try {
        const content = await readTextFile(requestedFilePath);
        if (!isMounted) return;
        const fileNameFromPath = requestedFilePath.split(/[\\/]/).pop() || 'Datei';
        const resolvedTabId =
          existingFileTab?.id ||
          openDocTabs.find((tab) => tab.kind === 'file' && tab.filePath === requestedFilePath)?.id ||
          tabId;
        setOpenDocTabs((prev) => {
          const match =
            prev.find((tab) => tab.kind === 'file' && tab.filePath === requestedFilePath) ??
            prev.find((tab) => tab.id === tabId);
          if (!match) {
            return [...prev, { id: tabId, title: fileNameFromPath, kind: 'file', filePath: requestedFilePath }];
          }
          if (match.title === fileNameFromPath && match.kind === 'file' && match.filePath === requestedFilePath) {
            return prev;
          }
          return prev.map((tab) =>
            tab.id === match.id
              ? { ...tab, title: fileNameFromPath, kind: 'file', filePath: requestedFilePath }
              : tab
          );
        });
        setDocTabContents((prev) => ({ ...prev, [resolvedTabId]: content }));
        setDirtyDocTabs((prev) => ({ ...prev, [resolvedTabId]: false }));
        setActiveDocTabId(resolvedTabId);
        setSourceContent(content);
        setFileName(fileNameFromPath);
        const nextMeta = extractPostMetaFromContent(content, fileNameFromPath);
        setPostMeta(nextMeta);
        setPostMetaByTab((prev) => ({ ...prev, [resolvedTabId]: nextMeta }));
        setError(null);
        setStep(1);
        lastRequestedFilePathRef.current = requestedFilePath;
        onFileRequestHandled?.();
      } catch (error) {
        console.error('[ContentTransform] Datei konnte nicht geladen werden:', error);
      }
    };
    loadRequestedFile();
    return () => {
      isMounted = false;
    };
  }, [requestedFilePath, openDocTabs, docTabContents, onFileRequestHandled]);

  // Step 2: Platform Selection
  const [selectedPlatform, setSelectedPlatform] = useState<ContentPlatform>(initialPlatform || 'linkedin');

  // Multi-platform selection (for multi-select mode)
  const [selectedPlatforms, setSelectedPlatforms] = useState<ContentPlatform[]>([]);
  const [activeEditTab, setActiveEditTab] = useState<ContentPlatform | null>(null);

  // Step 3: Style Options
  const [tone, setTone] = useState<ContentTone>('professional');
  const [length, setLength] = useState<ContentLength>('medium');
  const [audience, setAudience] = useState<ContentAudience>('intermediate');
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>('deutsch');
  const [styleMode, setStyleMode] = useState<'global' | 'platform'>('platform');
  const [stylePlatformOverrides, setStylePlatformOverrides] = useState<Partial<Record<ContentPlatform, PlatformStyleConfig>>>({});
  const [activeStylePlatform, setActiveStylePlatform] = useState<ContentPlatform | null>(null);

  // Step 4: Result
  const [transformedContent, setTransformedContent] = useState<string>('');
  const [isTransforming, setIsTransforming] = useState<boolean>(false);
  const transformInFlightRef = useRef(false);

  // Multi-platform results (for multi-select mode)
  const [transformedContents, setTransformedContents] = useState<Record<ContentPlatform, string>>({} as Record<ContentPlatform, string>);
  const [activeResultTab, setActiveResultTab] = useState<ContentPlatform | null>(null);
  const [step4OriginalContent, setStep4OriginalContent] = useState<string>('');
  const [step4SourceTabId, setStep4SourceTabId] = useState<string | null>(null);
  const [resultTabBySource, setResultTabBySource] = useState<Record<string, string>>({});
  const [step4LastChangeSource, setStep4LastChangeSource] = useState<'ai' | 'translator' | 'manual'>('manual');

  // Propagate content changes to parent (for Export Modal)
  useEffect(() => {
    if (transformedContent) {
      emitExternalContentChange(transformedContent, 'step4');
    }
  }, [transformedContent, openDocTabs]);

  useEffect(() => {
    if (effectiveStep !== 1) return;
    if (!multiPlatformMode) return;
    const tabs = Object.keys(transformedContents).length
      ? (Object.keys(transformedContents) as ContentPlatform[])
      : selectedPlatforms;
    if (!activeEditTab && tabs.length > 0) {
      setActiveEditTab(tabs[0]);
      return;
    }
    if (activeEditTab && Object.prototype.hasOwnProperty.call(transformedContents, activeEditTab)) {
      setSourceContent(transformedContents[activeEditTab] || '');
    }
  }, [effectiveStep, multiPlatformMode, transformedContents, selectedPlatforms, activeEditTab]);
  const [isPosting, setIsPosting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSelectedModel, setAutoSelectedModel] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Track if user came from "Nachbearbeiten" flow
  const [cameFromEdit, setCameFromEdit] = useState<boolean>(false);

  // Settings Modal
  const [showSettings, setShowSettings] = useState(false);
  const [settingsDefaultTab, setSettingsDefaultTab] = useState<'ai' | 'social' | 'editor' | 'api' | 'zenstudio'>('ai');
  const [settingsSocialTab, setSettingsSocialTab] = useState<
    'twitter' | 'reddit' | 'linkedin' | 'devto' | 'medium' | 'github' | undefined
  >(undefined);
  const [settingsMissingSocialHint, setSettingsMissingSocialHint] = useState(false);
  const [settingsMissingSocialLabel, setSettingsMissingSocialLabel] = useState<string | undefined>(undefined);
  const [zenStudioSettings, setZenStudioSettings] = useState<ZenStudioSettings>(() =>
    loadZenStudioSettings()
  );

  // Metadata Modal
  const [showMetadata, setShowMetadata] = useState(false);
  const [showBlogMetaHint, setShowBlogMetaHint] = useState(false);
  const pendingBlogSaveRef = useRef<(() => Promise<void>) | null>(null);

  // Save Success Modal
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [savedFileName, setSavedFileName] = useState('');
  const [savedFilePath, setSavedFilePath] = useState<string | undefined>(undefined);
  const [savedFilePaths, setSavedFilePaths] = useState<string[] | undefined>(undefined);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | undefined>(undefined);
  const [saveSuccessPathsLabel, setSaveSuccessPathsLabel] = useState<string | undefined>(undefined);
  const [saveSuccessPrimaryActionLabel, setSaveSuccessPrimaryActionLabel] = useState<string | undefined>(undefined);
  const [saveSuccessPrimaryActionUrl, setSaveSuccessPrimaryActionUrl] = useState<string | null>(null);
  const { openExternal } = useOpenExternal();
  const [localMetadata, setLocalMetadata] = useState<ProjectMetadata>(createDefaultProjectMetadata());
  const metadata = externalMetadata ?? localMetadata;
  const handleMetadataSave = (newMetadata: ProjectMetadata) => {
    if (onMetadataChange) {
      onMetadataChange(newMetadata);
    } else {
      setLocalMetadata(newMetadata);
    }
  };

  // Extract metadata from content (auto-detect from document)
  // TODO: Implement auto-extraction feature
  // const extractMetadataFromContent = (content: string): Partial<ProjectMetadata> => {
  //   const extracted: Partial<ProjectMetadata> = {};
  //   // Extract GitHub repository URL
  //   const repoMatch = content.match(/https?:\/\/github\.com\/[\w-]+\/[\w-]+/i);
  //   if (repoMatch) extracted.repository = repoMatch[0];
  //   // ... weitere Extractions
  //   return extracted;
  // };

  // Replace placeholders in content with metadata
  const replacePlaceholders = (content: string): string => {
    let result = content;

    // Replace common placeholders
    const replacements: Record<string, string> = {
      '[yourName]': metadata.authorName || '[yourName]',
      '[Your Name]': metadata.authorName || '[Your Name]',
      '[authorName]': metadata.authorName || '[authorName]',
      '[yourEmail]': metadata.authorEmail || '[yourEmail]',
      '[Your Email]': metadata.authorEmail || '[Your Email]',
      '[authorEmail]': metadata.authorEmail || '[authorEmail]',
      '[companyName]': metadata.companyName || '[companyName]',
      '[Company Name]': metadata.companyName || '[Company Name]',
      '[website]': metadata.website || '[website]',
      '[Website]': metadata.website || '[Website]',
      '[repository]': metadata.repository || '[repository]',
      '[Repository]': metadata.repository || '[Repository]',
      '[year]': metadata.year || '[year]',
      '[Year]': metadata.year || '[Year]',
      '[description]': metadata.description || '[description]',
      '[Description]': metadata.description || '[Description]',
      '[keywords]': metadata.keywords || '[keywords]',
      '[Keywords]': metadata.keywords || '[Keywords]',
      '[lang]': metadata.lang || '[lang]',
      '[Lang]': metadata.lang || '[Lang]',
    };

    Object.entries(replacements).forEach(([placeholder, value]) => {
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });

    return result;
  };

  const getPlatformLabel = (platform: ContentPlatform) => {
    const match = platformOptions.find((option) => option.value === platform);
    return match?.label || platform;
  };

  const getPlatformStyleConfig = (platform: ContentPlatform): PlatformStyleConfig => {
    return stylePlatformOverrides[platform] ?? defaultPlatformStyles[platform];
  };

  const getEffectivePlatformStyle = (platform: ContentPlatform): PlatformStyleConfig => {
    if (multiPlatformMode && styleMode === 'global') {
      return { tone, length, audience };
    }
    if (multiPlatformMode && styleMode === 'platform') {
      return getPlatformStyleConfig(platform);
    }
    return { tone, length, audience };
  };

  const getSocialTabForPlatform = (platform: ContentPlatform) => {
    switch (platform) {
      case 'linkedin':
        return 'linkedin';
      case 'twitter':
        return 'twitter';
      case 'reddit':
        return 'reddit';
      case 'devto':
        return 'devto';
      case 'medium':
        return 'medium';
      case 'github-discussion':
      case 'github-blog':
        return 'github';
      default:
        return undefined;
    }
  };

  const getSocialTabForSocialPlatform = (platform?: SocialPlatform) => {
    if (!platform) return undefined;
    switch (platform) {
      case 'twitter':
      case 'reddit':
      case 'linkedin':
      case 'devto':
      case 'medium':
      case 'github':
        return platform;
      default:
        return undefined;
    }
  };

  const openPlatformSelectionFromStep4 = () => {
    setPreviewMode(false);
    setError(null);
    if (!multiPlatformMode) {
      onMultiPlatformModeChange?.(true);
    }
    setSelectedPlatforms([]);
    setActiveResultTab(null);
    setStep(2);
  };

  const captureStep4Original = (contentSnapshot?: string) => {
    setStep4OriginalContent(getLatestSourceContent(contentSnapshot));
    setStep4SourceTabId(activeDocTabIdRef.current);
    setStep4LastChangeSource('manual');
  };

  const openStep4FromSource = async (contentOverride?: string, mode: 'preview' | 'posting' = 'preview') => {
    const snapshot = await resolveLatestSourceContent(contentOverride);
    setPreviewMode(mode === 'preview');
    setTransformedContent(snapshot);
    captureStep4Original(snapshot);
    setCameFromEdit(false);
    setStep(4);
  };

  const upsertResultVersionTab = (
    nextContent: string,
    source: 'ai' | 'translator' | 'manual',
    platformHint?: ContentPlatform,
    options: { activate?: boolean } = {}
  ) => {
    const { activate = true } = options;
    const rawSourceKey = step4SourceTabId ?? '__draft__';
    const normalizedSourceKey = parseDerivedTabId(rawSourceKey)?.sourceKey ?? rawSourceKey;
    const sourceTab = openDocTabs.find((tab) => tab.id === normalizedSourceKey)
      ?? (step4SourceTabId ? openDocTabs.find((tab) => tab.id === step4SourceTabId) : null);
    const baseTitleRaw = sourceTab?.title || fileName || 'Entwurf';
    const baseTitle = baseTitleRaw.replace(/\s·\s(Neu|AI|AI Überarbeitung|Übersetzt|LinkedIn Post|dev\.to Article|Twitter Thread|Medium Blog|Reddit Post|GitHub Discussion|GitHub Blog Post|YouTube Description|Blog Post)$/i, '');
    const tabPlatformSuffix = platformHint
      ? ({
          linkedin: 'LinkedIn',
          devto: 'dev.to',
          twitter: 'Twitter',
          medium: 'Medium',
          reddit: 'Reddit',
          'github-discussion': 'GitHub',
          'github-blog': 'GitHub Blog',
          youtube: 'YouTube',
          'blog-post': 'Blog',
        } as Record<ContentPlatform, string>)[platformHint]
      : null;
    const compactBaseTitle = baseTitle.length > 12 ? `${baseTitle.slice(0, 8)}...` : baseTitle;
    const suffix = platformHint
      ? tabPlatformSuffix
      : source === 'translator'
        ? 'Übersetzt'
        : source === 'ai'
          ? 'AI Überarbeitung'
          : 'Neu';
    const nextTitle = `${platformHint ? compactBaseTitle : baseTitle} · ${suffix}`;

    const mappingKey = `${normalizedSourceKey}:${platformHint ?? 'single'}`;
    const existingDerivedForSourceAndPlatform = openDocTabs.find((tab) => {
      if (tab.kind !== 'derived') return false;
      if ((platformHint ?? undefined) !== (tab.platform ?? undefined)) return false;
      const parsed = parseDerivedTabId(tab.id);
      return parsed?.sourceKey === normalizedSourceKey;
    });
    const mappedId = resultTabBySource[mappingKey] ?? existingDerivedForSourceAndPlatform?.id;
    const mappedTabExists = mappedId ? openDocTabs.some((tab) => tab.id === mappedId) : false;
    const resultTabId = mappedTabExists ? mappedId : `derived:${normalizedSourceKey}:${platformHint ?? 'single'}:${Date.now()}`;

    if (!mappedTabExists) {
      setOpenDocTabs((prev) => [
        ...prev,
        {
          id: resultTabId,
          title: nextTitle,
          kind: 'derived',
          platform: platformHint,
        },
      ]);
      setResultTabBySource((prev) => ({ ...prev, [mappingKey]: resultTabId }));
    } else {
      setOpenDocTabs((prev) =>
        prev.map((tab) => (tab.id === resultTabId ? { ...tab, title: nextTitle, platform: platformHint } : tab))
      );
    }

    setDocTabContents((prev) => ({ ...prev, [resultTabId]: nextContent }));
    setDirtyDocTabs((prev) => ({ ...prev, [resultTabId]: true }));
    if (activate) {
      activeDocTabIdRef.current = resultTabId;
      setActiveDocTabId(resultTabId);
      setSourceContent(nextContent);
      setFileName(nextTitle);
      if (platformHint) {
        setActiveResultTab(platformHint);
      }
    }
    return { tabId: resultTabId, title: nextTitle };
  };

  const handleNextFromStep1 = () => {
    if (!sourceContent.trim()) {
      setError('Bitte gib Inhalt ein oder lade eine Datei hoch');
    
      return;
    }
    setError(null);
    setStep(2);
  };

  useEffect(() => {
    onStep1BackToPostingChange?.(effectiveStep === 1 && cameFromEdit);
  }, [cameFromEdit, effectiveStep, onStep1BackToPostingChange]);

  useEffect(() => {
    if (headerAction !== "post") return;
    if (effectiveStep !== 4) return;
    setPreviewMode(false);
    onOpenDocStudioForPosting?.(transformedContent);
    onHeaderActionHandled?.();
  }, [effectiveStep, headerAction, onHeaderActionHandled, onOpenDocStudioForPosting, transformedContent]);

  const step2SelectionCount = multiPlatformMode ? selectedPlatforms.length : selectedPlatform ? 1 : 0;
  const step2CanProceed = step2SelectionCount > 0;

  useEffect(() => {
    if (effectiveStep !== 2) {
      onStep2SelectionChange?.(0, false);
      return;
    }
    onStep2SelectionChange?.(step2SelectionCount, step2CanProceed);
  }, [effectiveStep, onStep2SelectionChange, step2SelectionCount, step2CanProceed]);

  useEffect(() => {
    if (!multiPlatformMode) {
      setActiveStylePlatform(null);
      return;
    }
    if (selectedPlatforms.length === 0) {
      setActiveStylePlatform(null);
      return;
    }
    if (!activeStylePlatform || !selectedPlatforms.includes(activeStylePlatform)) {
      setActiveStylePlatform(selectedPlatforms[0]);
    }
  }, [activeStylePlatform, multiPlatformMode, selectedPlatforms]);

  const handleNextFromStep2 = () => {
    if (!step2CanProceed) {
      return;
    }
    setError(null);
    if (multiPlatformMode && selectedPlatforms.length > 0 && !activeStylePlatform) {
      setActiveStylePlatform(selectedPlatforms[0]);
    }
    setStep(3);
  };

  const handleDocTabChange = (tabId: string) => {
    activeDocTabIdRef.current = tabId;
    setActiveDocTabId(tabId);
    const nextContent = docTabContents[tabId] ?? '';
    setSourceContent(nextContent);
    emitExternalContentChange(nextContent, 'step1', tabId);
    const selectedTab = openDocTabs.find((tab) => tab.id === tabId);
    if (selectedTab?.platform) {
      setActiveResultTab(selectedTab.platform);
    }
    const nextTitle = selectedTab?.title ?? '';
    setFileName(nextTitle);
  };

  const ensureFallbackDraftTab = () => {
    const draftTabId = `draft-${Date.now()}`;
    setOpenDocTabs([{ id: draftTabId, title: 'Entwurf', kind: 'draft' }]);
    setDocTabContents((prev) => ({ ...prev, [draftTabId]: '' }));
    setDirtyDocTabs((prev) => ({ ...prev, [draftTabId]: false }));
    activeDocTabIdRef.current = draftTabId;
    setActiveDocTabId(draftTabId);
    setSourceContent('');
    emitExternalContentChange('', 'step1', draftTabId);
    setFileName('Entwurf');
    setPostMeta(EMPTY_POST_META);
    setPostMetaByTab((prev) => ({ ...prev, [draftTabId]: EMPTY_POST_META }));
  };

  const closeDocTab = (tabId: string, force = false) => {
    // Only check dirty state if not forcing close (e.g., from "Nicht speichern" dialog)
    if (!force && dirtyDocTabs[tabId]) {
      return;
    }
    const remainingTabs = openDocTabs.filter((tab) => tab.id !== tabId);
    setOpenDocTabs(remainingTabs);
    setDocTabContents((prev) => {
      const next = { ...prev };
      delete next[tabId];
      return next;
    });
    setDirtyDocTabs((prev) => {
      const next = { ...prev };
      delete next[tabId];
      return next;
    });
    setStep1ComparisonBaseByTab((prev) => {
      const next = { ...prev };
      delete next[tabId];
      return next;
    });
    setStep1ComparisonSelectionByTab((prev) => {
      const next = { ...prev };
      delete next[tabId];
      Object.keys(next).forEach((key) => {
        if (next[key] === `${STEP1_TAB_COMPARISON_PREFIX}${tabId}`) {
          next[key] = STEP1_SAVED_COMPARISON_ID;
        }
      });
      return next;
    });
    setPostMetaByTab((prev) => {
      const next = { ...prev };
      delete next[tabId];
      return next;
    });
    if (activeDocTabId === tabId || remainingTabs.length === 0) {
      const nextTab = remainingTabs[0] ?? null;
      if (nextTab) {
        setActiveDocTabId(nextTab.id);
        const nextContent = docTabContents[nextTab.id] ?? '';
        setSourceContent(nextContent);
        emitExternalContentChange(nextContent, 'step1', nextTab.id);
        setFileName(nextTab.title ?? '');
      } else {
        ensureFallbackDraftTab();
      }
    }
  };

  const handleCloseDocTab = (tabId: string) => {
    if (dirtyDocTabs[tabId]) {
      setPendingCloseTabId(tabId);
      return;
    }
    closeDocTab(tabId);
  };

  const saveTabContent = async (tabId: string) => {
    const tab = openDocTabs.find((item) => item.id === tabId);
    const content = docTabContents[tabId] ?? '';
    if (!tab) return false;

    if (isTauri() && tab.kind === 'file' && tab.filePath) {
      await writeTextFile(tab.filePath, content);
      setDirtyDocTabs((prev) => ({ ...prev, [tabId]: false }));
      setSavedFileName(tab.title);
      setSavedFilePath(tab.filePath);
      setSavedFilePaths([tab.filePath]);
      setSaveSuccessMessage(undefined);
      setSaveSuccessPathsLabel(undefined);
      setSaveSuccessPrimaryActionLabel(undefined);
      setSaveSuccessPrimaryActionUrl(null);
      setShowSaveSuccess(true);
      return true;
    }

    if (isTauri()) {
      if (!projectPath) {
        alert('Kein Projektordner gesetzt.');
        return false;
      }
      const fallbackName = tab.title || buildDefaultSaveName(getActiveSavePlatform(), 1);
      const filePath = await save({
        defaultPath: `${projectPath}/${fallbackName}`,
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      });
      if (!filePath) return false;
      if (!filePath.startsWith(projectPath)) {
        alert('Bitte speichere innerhalb des Projektordners.');
        return false;
      }
      await writeTextFile(filePath, content);
      setDirtyDocTabs((prev) => ({ ...prev, [tabId]: false }));
      setSavedFileName(filePath.split(/[\\/]/).pop() || fallbackName);
      setSavedFilePath(filePath);
      setSavedFilePaths([filePath]);
      setSaveSuccessMessage(undefined);
      setSaveSuccessPathsLabel(undefined);
      setSaveSuccessPrimaryActionLabel(undefined);
      setSaveSuccessPrimaryActionUrl(null);
      setShowSaveSuccess(true);
      return true;
    }

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const fallbackName = tab.title || buildDefaultSaveName(getActiveSavePlatform(), 1);
    const userName = window.prompt('Dateiname anpassen?', fallbackName);
    const finalName = (userName && userName.trim()) ? userName.trim() : fallbackName;
    const finalFileName = finalName.endsWith('.md') ? finalName : `${finalName}.md`;
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFileName;
    link.click();
    URL.revokeObjectURL(url);
    setDirtyDocTabs((prev) => ({ ...prev, [tabId]: false }));
    setSavedFileName(finalFileName);
    setSavedFilePath(undefined);
    setSavedFilePaths(undefined);
    setSaveSuccessMessage(undefined);
    setSaveSuccessPathsLabel(undefined);
    setSaveSuccessPrimaryActionLabel(undefined);
    setSaveSuccessPrimaryActionUrl(null);
    setShowSaveSuccess(true);
    return true;
  };

  const handleSourceContentChange = (content: string) => {
    sourceContentRef.current = content;
    setSourceContent(content);

    // Determine which tab to mark as dirty
    // Priority: activeDocTabId > tab matching fileName > first tab
    let targetTabId: string | null = null;
    const activeTabIdNow = activeDocTabIdRef.current;

    if (openDocTabs.length > 0) {
      // First try: use activeDocTabId if it's valid
      if (activeTabIdNow) {
        const activeTab = openDocTabs.find((tab) => tab.id === activeTabIdNow);
        if (activeTab) {
          targetTabId = activeTabIdNow;
        }
      }

      // Second try: find tab by filename
      if (!targetTabId && fileName) {
        const matchingTab = openDocTabs.find((tab) => tab.title === fileName);
        if (matchingTab) {
          targetTabId = matchingTab.id;
          activeDocTabIdRef.current = targetTabId;
          setActiveDocTabId(targetTabId);
        }
      }

      // Third try: use first tab
      if (!targetTabId) {
        targetTabId = openDocTabs[0].id;
        activeDocTabIdRef.current = targetTabId;
        setActiveDocTabId(targetTabId);
        setFileName(openDocTabs[0].title);
      }

      // Mark the tab as dirty and update content
      setDocTabContents((prev) => ({ ...prev, [targetTabId as string]: content }));
      setDirtyDocTabs((prev) => ({ ...prev, [targetTabId as string]: true }));
    }

    emitExternalContentChange(content, 'step1', targetTabId);
    if (multiPlatformMode && activeEditTab) {
      setTransformedContents((prev) => ({ ...prev, [activeEditTab]: content }));
      if (activeResultTab === activeEditTab) {
        setTransformedContent(content);
      }
    }
  };

  const handleStep1FileNameChange = (nextName: string) => {
    const normalizedName = (nextName || '').trim();
    if (!normalizedName) return;

    setFileName(normalizedName);

    const activeId = activeDocTabIdRef.current;
    const hasActiveTab = !!activeId && openDocTabs.some((tab) => tab.id === activeId);
    if (hasActiveTab && activeId) {
      setOpenDocTabs((prev) =>
        prev.map((tab) => (tab.id === activeId ? { ...tab, title: normalizedName } : tab))
      );
      return;
    }

    if (openDocTabs.length > 0) {
      const firstTabId = openDocTabs[0].id;
      activeDocTabIdRef.current = firstTabId;
      setActiveDocTabId(firstTabId);
      setOpenDocTabs((prev) =>
        prev.map((tab, index) => (index === 0 ? { ...tab, title: normalizedName } : tab))
      );
      return;
    }

    const draftTabId = `draft-${Date.now()}`;
    activeDocTabIdRef.current = draftTabId;
    setActiveDocTabId(draftTabId);
    setOpenDocTabs([{ id: draftTabId, title: normalizedName, kind: 'draft' }]);
    setDocTabContents((prev) => ({ ...prev, [draftTabId]: sourceContentRef.current ?? '' }));
    setDirtyDocTabs((prev) => ({ ...prev, [draftTabId]: false }));
  };

  const handleTransform = async () => {
    if (transformInFlightRef.current) return;
    transformInFlightRef.current = true;
    setPreviewMode(false);
    setIsTransforming(true);
    setError(null);
    setAutoSelectedModel(null);

    try {
      // Replace placeholders in source content before transforming
      const processedContent = replacePlaceholders(sourceContent);

      // Multi-platform mode: transform for all selected platforms
      if (multiPlatformMode && selectedPlatforms.length > 0) {
        const results: Record<ContentPlatform, string> = {} as Record<ContentPlatform, string>;
        const failedPlatforms: Array<{ platform: ContentPlatform; error: string }> = [];
        let firstAutoModel: string | null = null;

        console.log('[Multi-Platform] Starting transformation for platforms:', selectedPlatforms);
        console.log('[Multi-Platform] Source content length:', processedContent.length);

        let platformIndex = 0;
        for (const platform of selectedPlatforms) {
          const styleConfig = getEffectivePlatformStyle(platform);
          // Add small delay between API calls to avoid potential caching issues
          if (platformIndex > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          platformIndex++;

          console.log(`[Multi-Platform] Transforming for: ${platform}`);

          const result = await transformContent(processedContent, {
            platform,
            tone: styleConfig.tone,
            length: styleConfig.length,
            audience: styleConfig.audience,
            targetLanguage,
          });

          console.log(`[Multi-Platform] Result for ${platform}:`, {
            success: result.success,
            dataLength: result.data?.length,
            dataPreview: result.data?.substring(0, 100),
            error: result.error
          });

          if (result.success && result.data) {
            let finalContent = result.data;

            // Save first auto-selected model info
            if (!firstAutoModel && result.autoSelectedModel) {
              firstAutoModel = result.autoSelectedModel;
            }

            // Translate if target language is not deutsch
            if (targetLanguage && targetLanguage !== 'deutsch') {
              const translateResult = await translateContent(finalContent, targetLanguage);
              if (translateResult.success && translateResult.data) {
                finalContent = translateResult.data;
              }
            }
            results[platform] = applySteuerFormatConfig(finalContent, platform);
          } else {
            failedPlatforms.push({
              platform,
              error: toUserFacingError(result.error || 'Unbekannter Fehler', 'transform'),
            });
          }
        }

        if (Object.keys(results).length > 0) {
          setTransformedContents(results);
          // Set the first platform as active tab
          const firstPlatform = selectedPlatforms[0];
          setActiveResultTab(firstPlatform);
          setTransformedContent(results[firstPlatform] || '');
          captureStep4Original();
          setStep4LastChangeSource('ai');
          if (firstAutoModel) {
            setAutoSelectedModel(firstAutoModel);
          }
          setStep(4);
        } else {
          const detail = failedPlatforms
            .slice(0, 2)
            .map(({ platform, error }) => `${getPlatformLabel(platform)}: ${error}`)
            .join(' | ');
          setError(`Transformation für alle Plattformen fehlgeschlagen${detail ? ` (${detail})` : ''}`);
        }
      } else {
        // Single platform mode (original behavior)
        const result = await transformContent(processedContent, {
          platform: selectedPlatform,
          tone,
          length,
          audience,
          targetLanguage,
        });

        if (result.success && result.data) {
          let finalContent = result.data;

          // Save auto-selected model info if available
          if (result.autoSelectedModel) {
            setAutoSelectedModel(result.autoSelectedModel);
          }

          // Step 2: Translate if target language is not deutsch (assuming source is deutsch)
          if (targetLanguage && targetLanguage !== 'deutsch') {
            const translateResult = await translateContent(finalContent, targetLanguage);
            if (translateResult.success && translateResult.data) {
              finalContent = translateResult.data;
            } else {
              // Translation failed, but we still have the transformed content
              console.warn('Translation failed:', translateResult.error);
              setError(`Transformation erfolgreich, aber Übersetzung fehlgeschlagen: ${translateResult.error}`);
            }
          }

          setTransformedContent(applySteuerFormatConfig(finalContent, selectedPlatform));
          captureStep4Original();
          setStep4LastChangeSource('ai');
          setStep(4);
        } else {
          const errorMsg = toUserFacingError(result.error || 'Transformation fehlgeschlagen', 'transform');
          setError(errorMsg);
          // Show notification if error is related to AI configuration
          if (
            errorMsg.includes('API') ||
            errorMsg.includes('konfiguriert') ||
            errorMsg.includes('Konfiguration') ||
            errorMsg.includes('fehlt') ||
            errorMsg.includes('Einstellungen') ||
            errorMsg.includes('Key')
          ) {
            // Settings notification handled by modal
          }
        }
      }
    } catch (err) {
      const errorMsg = toUserFacingError(
        err instanceof Error ? err.message : 'Unbekannter Fehler',
        'transform'
      );
      setError(errorMsg);
      // Show notification if error is related to AI configuration
      if (
        errorMsg.includes('API') ||
        errorMsg.includes('konfiguriert') ||
        errorMsg.includes('Konfiguration') ||
        errorMsg.includes('fehlt') ||
        errorMsg.includes('Einstellungen') ||
        errorMsg.includes('Key')
      ) {
        // Settings notification handled by modal
      }
    } finally {
      setIsTransforming(false);
      transformInFlightRef.current = false;
    }
  };

  const handleFormatOnly = () => {
    setPreviewMode(false);
    setError(null);
    setAutoSelectedModel(null);

    const processedContent = replacePlaceholders(sourceContent);

    if (multiPlatformMode && selectedPlatforms.length > 0) {
      const results: Record<ContentPlatform, string> = {} as Record<ContentPlatform, string>;

      for (const platform of selectedPlatforms) {
        results[platform] = applySteuerFormatConfig(processedContent, platform);
      }

      setTransformedContents(results);
      const firstPlatform = selectedPlatforms[0];
      setActiveResultTab(firstPlatform);
      setTransformedContent(results[firstPlatform] || '');
      captureStep4Original();
      setStep4LastChangeSource('manual');
      setStep(4);
      return;
    }

    setTransformedContent(applySteuerFormatConfig(processedContent, selectedPlatform));
    captureStep4Original();
    setStep4LastChangeSource('manual');
    setStep(4);
  };

  const handleReset = () => {
    setStep(1);
    setSourceContent('');
    setFileName('');
    setPostMeta(EMPTY_POST_META);
    setPostMetaByTab({});
    setTransformedContent('');
    setError(null);
    setPreviewMode(false);
  };

  const handlePostDirectly = async () => {
    setIsPosting(true);
    setError(null);
    setSettingsMissingSocialHint(false);

    try {
      // Check if content exists
      if (!sourceContent.trim()) {
        setError('Kein Content zum Posten vorhanden');
        setIsPosting(false);
        return;
      }

      // Load social media config
      const config = loadSocialConfig();

      // Map ContentPlatform to SocialPlatform
      const platformMap: Record<ContentPlatform, SocialPlatform | null> = {
        'linkedin': 'linkedin',
        'twitter': 'twitter',
        'reddit': 'reddit',
        'devto': 'devto',
        'medium': 'medium',
        'github-discussion': 'github',
        'github-blog': 'github',
        'youtube': null, // YouTube is not supported for direct posting
        'blog-post': null, // Generic blog post is not supported for direct posting
      };

      const socialPlatform = platformMap[selectedPlatform];

      if (!socialPlatform) {
        setError('Export verwenden — kein API-Posting für dieses Format verfügbar.');
        setIsPosting(false);
        return;
      }

      // Check if platform is configured
      if (!isPlatformConfigured(socialPlatform, config)) {
        setSettingsDefaultTab('social');
        setSettingsSocialTab(getSocialTabForPlatform(selectedPlatform));
        setSettingsMissingSocialHint(true);
        setSettingsMissingSocialLabel(getPlatformLabel(selectedPlatform));
        setShowSettings(true);
        setIsPosting(false);
        return;
      }

      // Prepare content based on platform
      let postContent: any;

      switch (socialPlatform) {
        case 'linkedin':
          postContent = {
            text: sourceContent,
            visibility: 'PUBLIC',
          } as LinkedInPostOptions;
          break;

        case 'twitter':
          // Split content into thread if too long
          const maxTweetLength = 280;
          if (sourceContent.length > maxTweetLength) {
            const sentences = sourceContent.split(/[.!?]+/).filter(s => s.trim());
            const thread: string[] = [];
            let currentTweet = '';

            for (const sentence of sentences) {
              if ((currentTweet + sentence).length > maxTweetLength) {
                if (currentTweet) thread.push(currentTweet.trim());
                currentTweet = sentence;
              } else {
                currentTweet += sentence + '.';
              }
            }
            if (currentTweet) thread.push(currentTweet.trim());

            postContent = {
              text: thread[0],
              thread: thread.slice(1),
            } as TwitterPostOptions;
          } else {
            postContent = {
              text: sourceContent,
            } as TwitterPostOptions;
          }
          break;

        case 'reddit':
          // Extract title (first line or first 100 chars)
          const lines = sourceContent.split('\n');
          const title = lines[0] || sourceContent.substring(0, 100);
          const body = lines.length > 1 ? lines.slice(1).join('\n') : sourceContent;

          postContent = {
            subreddit: 'test',
            title: title,
            text: body,
          } as RedditPostOptions;

          // Reddit needs subreddit — redirect to settings to configure
          setSettingsDefaultTab('social');
          setSettingsSocialTab('reddit');
          setSettingsMissingSocialHint(true);
          setSettingsMissingSocialLabel('Reddit');
          setShowSettings(true);
          setIsPosting(false);
          return;

        case 'devto':
          // Extract title
          const devtoLines = sourceContent.split('\n');
          const devtoTitle = devtoLines[0] || 'Untitled';
          const devtoBody = devtoLines.length > 1 ? devtoLines.slice(1).join('\n') : sourceContent;

          postContent = {
            title: devtoTitle,
            body_markdown: devtoBody,
            published: false, // Save as draft by default
            tags: [],
          } as DevToPostOptions;
          break;

        case 'medium':
          const mediumLines = sourceContent.split('\n');
          const mediumTitle = mediumLines[0] || 'Untitled';
          const mediumContent = mediumLines.length > 1 ? mediumLines.slice(1).join('\n') : sourceContent;

          postContent = {
            title: mediumTitle,
            content: mediumContent,
            contentFormat: 'markdown',
            publishStatus: 'draft', // Save as draft by default
            tags: [],
          } as MediumPostOptions;
          break;

        case 'github':
          // GitHub needs repo/category config — redirect to settings
          setSettingsDefaultTab('social');
          setSettingsSocialTab('github');
          setSettingsMissingSocialHint(true);
          setSettingsMissingSocialLabel('GitHub');
          setShowSettings(true);
          setIsPosting(false);
          return;

        default:
          setError('Plattform nicht unterstützt');
          setIsPosting(false);
          return;
      }

      // Post to social media
      const result = await postToSocialMedia(socialPlatform, postContent, config);

      if (result.success) {
        // Show success message
        alert(`✓ Erfolgreich auf ${selectedPlatform} gepostet!\n${result.url || ''}`);
        handleReset();
      } else {
        setError(toUserFacingError(result.error || 'Posting fehlgeschlagen', 'post'));
        if (result.error?.includes('configuration') || result.error?.includes('not found')) {
          // Settings notification handled by modal
        }
      }
    } catch (err) {
      const errorMsg = toUserFacingError(
        err instanceof Error ? err.message : 'Unbekannter Fehler beim Posten',
        'post'
      );
      setError(errorMsg);
    } finally {
      setIsPosting(false);
    }
  };

  useEffect(() => {
    if (!headerAction) return;
    if (headerAction === "preview") {
      void (async () => {
        await openStep4FromSource();
        onHeaderActionHandled?.();
      })();
      return;
    }
    if (headerAction === "transform" && effectiveStep === 3) {
      if (!isTransforming) {
        void handleTransform();
      }
      onHeaderActionHandled?.();
      return;
    }
    if (headerAction === "format_only" && effectiveStep === 3) {
      handleFormatOnly();
      onHeaderActionHandled?.();
      return;
    }
    if (headerAction === "post_direct" && effectiveStep === 3) {
      handleFormatOnly();
      onHeaderActionHandled?.();
      return;
    }
    if (headerAction === "goto_platforms" && effectiveStep === 4) {
      openPlatformSelectionFromStep4();
      onHeaderActionHandled?.();
      return;
    }
    if (headerAction === "next") {
      if (effectiveStep === 1) {
        handleNextFromStep1();
      }
      if (effectiveStep === 2) {
        handleNextFromStep2();
      }
    }
    if (headerAction === "back_posting" && effectiveStep === 1) {
      void openStep4FromSource(undefined, 'posting');
    }
    if (headerAction === "save" && effectiveStep === 1) {
      void handleSaveSourceToProject();
    }
    if (headerAction === "save_as" && effectiveStep === 1) {
      void handleSaveAsSourceToProject();
    }
    if (headerAction === "save_server" && effectiveStep === 1) {
      void (blogSaveTarget ? handleSaveSourceToProject(undefined, true) : handleSaveSourceToServer());
    }
    onHeaderActionHandled?.();
  }, [
    effectiveStep,
    headerAction,
    handleNextFromStep1,
    handleFormatOnly,
    handlePostDirectly,
    handleTransform,
    isPosting,
    isTransforming,
    onHeaderActionHandled,
    sourceContent,
    setCameFromEdit,
  ]);

  // Render Step Content
  const renderStepContent = () => {
    switch (effectiveStep) {
      case 1:
        const editTabs =
          multiPlatformMode && Object.keys(transformedContents).length > 0
            ? (Object.keys(transformedContents) as ContentPlatform[])
            : [];
        const step1ComparisonSelection = activeDocTabId
          ? step1ComparisonSelectionByTab[activeDocTabId] ?? STEP1_SAVED_COMPARISON_ID
          : STEP1_SAVED_COMPARISON_ID;
        const step1SelectedComparisonTabId = step1ComparisonSelection.startsWith(STEP1_TAB_COMPARISON_PREFIX)
          ? step1ComparisonSelection.slice(STEP1_TAB_COMPARISON_PREFIX.length)
          : null;
        const step1SelectedComparisonTab = step1SelectedComparisonTabId
          ? openDocTabs.find((tab) => tab.id === step1SelectedComparisonTabId) ?? null
          : null;
        const step1ComparisonBaseOptions = activeDocTabId
          ? [
              { id: STEP1_SAVED_COMPARISON_ID, label: 'Letzte gespeicherte Version' },
              ...openDocTabs
                .filter((tab) => tab.id !== activeDocTabId)
                .map((tab) => ({ id: `${STEP1_TAB_COMPARISON_PREFIX}${tab.id}`, label: `Tab: ${tab.title}` })),
            ]
          : [];
        const step1ComparisonBaseContent = activeDocTabId
          ? step1ComparisonSelection === STEP1_SAVED_COMPARISON_ID
            ? step1ComparisonBaseByTab[activeDocTabId] ?? ''
            : docTabContents[step1SelectedComparisonTabId ?? ''] ?? ''
          : '';
        const activeStep1TabTitle = openDocTabs.find((tab) => tab.id === activeDocTabId)?.title;
        const step1ComparisonBaseLabel = step1ComparisonSelection === STEP1_SAVED_COMPARISON_ID
          ? `${activeStep1TabTitle ?? fileName ?? 'Dokument'} · gespeicherte Basis`
          : step1SelectedComparisonTab
            ? `Tab: ${step1SelectedComparisonTab.title}`
            : 'Vergleichsbasis';
        return (
          <>
            <Step1SourceInput
              sourceContent={sourceContent}
              fileName={fileName}
              error={error}
              editorSettings={editorSettings}
              onSourceContentChange={handleSourceContentChange}
              onFileNameChange={handleStep1FileNameChange}
              onNext={handleNextFromStep1}
              onOpenMetadata={() => setShowMetadata(true)}
              onError={setError}
              onPreview={(latestContent) => {
                void openStep4FromSource(latestContent, 'preview');
              }}
              onSaveToProject={(latestContent) => {
                void handleSaveSourceToProject(latestContent);
              }}
              onSaveAsToProject={(latestContent) => {
                void handleSaveAsSourceToProject(latestContent);
              }}
              onSaveToServer={(latestContent) => {
                void (blogSaveTarget ? handleSaveSourceToProject(latestContent, true) : handleSaveSourceToServer(latestContent));
              }}
              canSaveToProject={!!sourceContent.trim() && (!isTauri() || !!projectPath)}
              canSaveToServer={!!sourceContent.trim() && (blogSaveTarget ? true : !!zenStudioSettings.contentServerApiUrl)}
              saveToServerLabel={blogSaveTarget ? `Im Blog speichern` : undefined}
              editTabs={editTabs}
              activeEditTab={activeEditTab}
              onEditTabChange={(platform) => {
                setActiveEditTab(platform);
                if (Object.prototype.hasOwnProperty.call(transformedContents, platform)) {
                  const nextContent = transformedContents[platform] || '';
                  setSourceContent(nextContent);
                  setTransformedContent(nextContent);
                } else {
                  setSourceContent('');
                  setTransformedContent('');
                }
              }}
              cameFromEdit={cameFromEdit}
              onBackToPosting={(latestContent) => {
                // User edited content, go directly to Step 4 for posting
                void openStep4FromSource(latestContent, 'posting');
              }}
              onRegisterLiveContentGetter={(getter) => {
                liveContentGetterRef.current = getter;
              }}
              cameFromDocStudio={cameFromDocStudio}
              onBackToDocStudio={() => onBackToDocStudio?.(sourceContent)}
              editorType={editorType}
              onEditorTypeChange={onEditorTypeChange}
              showInlineActions={false}
              showDockedEditorToggle={true}
              onOpenConverter={() => {
                onOpenConverter?.();
              }}
              docTabs={openDocTabs}
              activeDocTabId={activeDocTabId}
              dirtyDocTabs={dirtyDocTabs}
              onDocTabChange={handleDocTabChange}
              onCloseDocTab={handleCloseDocTab}
              projectPath={projectPath}
              comparisonBaseContent={step1ComparisonBaseContent}
              comparisonBaseLabel={step1ComparisonBaseLabel}
              comparisonBaseOptions={step1ComparisonBaseOptions}
              comparisonBaseSelection={step1ComparisonSelection}
              onComparisonBaseChange={(value) => {
                if (!activeDocTabId) return;
                setStep1ComparisonSelectionByTab((prev) => ({ ...prev, [activeDocTabId]: value }));
              }}
              onAdoptCurrentAsComparisonBase={() => {
                if (!activeDocTabId) return;
                setStep1ComparisonBaseByTab((prev) => ({
                  ...prev,
                  [activeDocTabId]: sourceContent,
                }));
                setStep1ComparisonSelectionByTab((prev) => ({
                  ...prev,
                  [activeDocTabId]: STEP1_SAVED_COMPARISON_ID,
                }));
              }}
              autosaveStatusText={
                !editorSettings.autoSaveEnabled
                  ? 'Autosave · off'
                  : step1AutosaveStatus === 'saving'
                    ? 'Autosave · speichert...'
                    : step1AutosaveStatus === 'error'
                      ? 'Autosave · fehler'
                      : step1AutosaveStatus === 'saved'
                        ? `Autosave · ${step1AutosaveAt ? new Date(step1AutosaveAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'ok'}`
                        : 'Autosave · on'
              }
              onOpenEditorSettings={() => {
                setSettingsDefaultTab('editor');
                setShowSettings(true);
              }}
              autosaveRestoreBanner={autosaveRestoreBanner}
              onAutosaveBannerRestore={handleAutosaveBannerRestore}
              onAutosaveBannerDismiss={handleAutosaveBannerDismiss}
              autosaveHistory={autosaveHistory}
              onAutosaveHistoryRestore={handleAutosaveHistoryRestore}
              onAutosaveHistoryCompare={handleAutosaveHistoryCompare}
              zenThoughts={zenStudioSettings.thoughts}
              showZenThoughtInHeader={zenStudioSettings.showInContentAIStudio}
              postMeta={postMeta}
              onMetaChange={handleMetaChange}
              analysisKeywords={analysisKeywords}
              onAnalysisKeywordsChange={setAnalysisKeywords}
            />
          </>
        );
      case 2:
        return (
          <Step2PlatformSelection
            selectedPlatform={selectedPlatform}
            platformOptions={platformOptions}
            onPlatformChange={setSelectedPlatform}
            onBack={() => setStep(1)}
            onNext={handleNextFromStep2}
            multiSelectMode={multiPlatformMode}
            selectedPlatforms={selectedPlatforms}
            onSelectedPlatformsChange={setSelectedPlatforms}
          />
        );
      case 3:
        const selectedPlatformOption = platformOptions.find(
          (option) => option.value === selectedPlatform
        );
        const selectedPlatformLabels = multiPlatformMode
          ? selectedPlatforms.map(p => platformOptions.find(o => o.value === p)?.label || p)
          : [];
        const activeStyleTarget = activeStylePlatform ?? selectedPlatforms[0] ?? selectedPlatform;
        const activeStyleConfig = getEffectivePlatformStyle(activeStyleTarget);
        const selectedPlatformOptions = selectedPlatforms.map((platform) => ({
          value: platform,
          label: getPlatformLabel(platform),
        }));
        return (
          <Step3StyleOptions
            selectedPlatform={selectedPlatform}
            platformLabel={selectedPlatformOption?.label || 'Plattform'}
            selectedPlatforms={selectedPlatforms}
            platformLabels={selectedPlatformLabels}
            multiPlatformMode={multiPlatformMode}
            tone={activeStyleConfig.tone}
            length={activeStyleConfig.length}
            audience={activeStyleConfig.audience}
            targetLanguage={targetLanguage}
            styleMode={styleMode}
            onStyleModeChange={setStyleMode}
            activeStylePlatform={activeStyleTarget}
            stylePlatformOptions={selectedPlatformOptions}
            onActiveStylePlatformChange={setActiveStylePlatform}
            onApplyCurrentStyleToAll={
              multiPlatformMode && styleMode === 'platform'
                ? () => {
                    const sourcePlatform = activeStylePlatform ?? selectedPlatforms[0];
                    if (!sourcePlatform) return;
                    const sourceConfig = getPlatformStyleConfig(sourcePlatform);
                    const nextOverrides = { ...stylePlatformOverrides };
                    selectedPlatforms.forEach((platform) => {
                      nextOverrides[platform] = sourceConfig;
                    });
                    setStylePlatformOverrides(nextOverrides);
                  }
                : undefined
            }
            onToneChange={(nextTone) => {
              if (multiPlatformMode && styleMode === 'platform' && activeStyleTarget) {
                const base = getPlatformStyleConfig(activeStyleTarget);
                setStylePlatformOverrides((prev) => ({
                  ...prev,
                  [activeStyleTarget]: { ...base, tone: nextTone },
                }));
                return;
              }
              setTone(nextTone);
            }}
            onLengthChange={(nextLength) => {
              if (multiPlatformMode && styleMode === 'platform' && activeStyleTarget) {
                const base = getPlatformStyleConfig(activeStyleTarget);
                setStylePlatformOverrides((prev) => ({
                  ...prev,
                  [activeStyleTarget]: { ...base, length: nextLength },
                }));
                return;
              }
              setLength(nextLength);
            }}
            onAudienceChange={(nextAudience) => {
              if (multiPlatformMode && styleMode === 'platform' && activeStyleTarget) {
                const base = getPlatformStyleConfig(activeStyleTarget);
                setStylePlatformOverrides((prev) => ({
                  ...prev,
                  [activeStyleTarget]: { ...base, audience: nextAudience },
                }));
                return;
              }
              setAudience(nextAudience);
            }}
            onTargetLanguageChange={setTargetLanguage}
            onBack={() => setStep(2)}
            onBackToEditor={() => setStep(1)}
            onTransform={handleTransform}
            onPostDirectly={handlePostDirectly}
            isTransforming={isTransforming}
            isPosting={isPosting}
            error={error}
          />
        );
      case 4:
        const step4HeaderAction =
          headerAction === "copy" ||
          headerAction === "download" ||
          headerAction === "edit" ||
          headerAction === "reset" ||
          headerAction === "post" ||
          headerAction === "posten" ||
          headerAction === "post_all" ||
          headerAction === "back_doc" ||
          headerAction === "back_dashboard"
            ? headerAction
            : null;

        return (
          <>
            <Step4TransformResult
              transformedContent={transformedContent}
              platform={multiPlatformMode && activeResultTab ? activeResultTab : selectedPlatform}
              autoSelectedModel={autoSelectedModel}
              onReset={() => {
                handleReset();
                // Reset multi-platform state
                if (multiPlatformMode) {
                  setSelectedPlatforms([]);
                  setTransformedContents({} as Record<ContentPlatform, string>);
                  setActiveResultTab(null);
                  onMultiPlatformModeChange?.(false);
                }
              }}
              onBack={() => {
                // Nachbearbeiten: Zum Editor mit transformiertem Content
                setPreviewMode(false);
                if (multiPlatformMode) {
                  const preferredPlatform = activeResultTab ?? selectedPlatforms[0] ?? null;
                  let preferredTabId: string | null = null;
                  let preferredTabTitle = '';
                  selectedPlatforms.forEach((platform) => {
                    const platformContent = transformedContents[platform] ?? '';
                    const upserted = upsertResultVersionTab(
                      platformContent,
                      step4LastChangeSource,
                      platform,
                      { activate: false }
                    );
                    if (platform === preferredPlatform || (!preferredTabId && platformContent)) {
                      preferredTabId = upserted.tabId;
                      preferredTabTitle = upserted.title;
                    }
                  });

                  if (preferredPlatform) {
                    setActiveEditTab(preferredPlatform);
                    setActiveResultTab(preferredPlatform);
                  }
                  if (preferredTabId) {
                    activeDocTabIdRef.current = preferredTabId;
                    setActiveDocTabId(preferredTabId);
                    setFileName(preferredTabTitle);
                    if (preferredPlatform && Object.prototype.hasOwnProperty.call(transformedContents, preferredPlatform)) {
                      setSourceContent(transformedContents[preferredPlatform] || '');
                    }
                  }
                } else {
                  const nextContent = transformedContent;
                  if (nextContent !== step4OriginalContent) {
                    upsertResultVersionTab(nextContent, step4LastChangeSource, selectedPlatform);
                  } else {
                    setSourceContent(nextContent);
                  }
                }
                setCameFromEdit(true); // Mark that user came from edit
                setStep(1);
              }}
              onOpenSettings={(targetSocialPlatform?: SocialPlatform) => {
                const socialTab = getSocialTabForSocialPlatform(targetSocialPlatform);
                if (socialTab) {
                  setSettingsDefaultTab('social');
                  setSettingsSocialTab(socialTab);
                } else {
                  setSettingsDefaultTab('ai');
                  setSettingsSocialTab(undefined);
                }
                setSettingsMissingSocialHint(false);
                setSettingsMissingSocialLabel(undefined);
                setShowSettings(true);
              }}
              onContentChange={(content, meta) => {
                setTransformedContent(content);
                setStep4LastChangeSource(meta?.source ?? 'manual');
                if (multiPlatformMode && activeResultTab) {
                  setTransformedContents((prev) => ({ ...prev, [activeResultTab]: content }));
                }
              }}
              cameFromDocStudio={cameFromDocStudio}
              cameFromDashboard={cameFromDashboard}
              isPreview={previewMode}
              useHeaderActions
              headerAction={step4HeaderAction}
              onHeaderActionHandled={onHeaderActionHandled}
              onBackToDocStudio={() => onBackToDocStudio?.(transformedContent)}
              onBackToDashboard={() => onBackToDashboard?.(transformedContent)}
              onOpenPlatformSelection={openPlatformSelectionFromStep4}
              onGoToTransform={(targetPlatform) => {
                // Navigate to Step 2 with the selected platform, then to Step 3
                setSelectedPlatform(targetPlatform);
                setStep(3); // Go directly to Step 3 (Style Options)
              }}
              multiPlatformMode={multiPlatformMode}
              transformedContents={transformedContents}
              activeResultTab={activeResultTab}
            onActiveResultTabChange={(platform) => {
              setActiveResultTab(platform);
              // Update the displayed content to match the selected tab
              if (Object.prototype.hasOwnProperty.call(transformedContents, platform)) {
                setTransformedContent(transformedContents[platform] || '');
              }
            }}
              docTabs={openDocTabs}
              activeDocTabId={activeDocTabId}
              dirtyDocTabs={dirtyDocTabs}
              onDocTabChange={handleDocTabChange}
              onCloseDocTab={handleCloseDocTab}
              activeDocTabContent={activeDocTabId ? docTabContents[activeDocTabId] ?? '' : ''}
              docTabContents={docTabContents}
              originalContent={step4OriginalContent}
              originalLabel={
                step4SourceTabId
                  ? openDocTabs.find((tab) => tab.id === step4SourceTabId)?.title || 'Original'
                  : fileName || 'Original'
              }
              projectPath={projectPath}
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="flex flex-col h-screen text-[#e5e5e5] overflow-hidden"
      style={{ backgroundColor: effectiveStep === 2 || effectiveStep === 3 ? '#d0cbb8' : 'transparent' }}
    >
      {/* Main Content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingTop: effectiveStep === 2 || effectiveStep === 3 ? '70px' : '22px' }}
      >
        {renderStepContent()}
      </div>

      {/* Blog Meta Hint Banner */}
      {showBlogMetaHint && (
        <div style={{
          position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 500, display: 'flex', alignItems: 'center', gap: '12px',
          background: '#1e1a14', border: '1px solid rgba(172,142,102,0.5)',
          borderRadius: '10px', padding: '12px 16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px',
          maxWidth: '480px', width: 'calc(100vw - 48px)',
        }}>
          <FontAwesomeIcon icon={faCircleExclamation} style={{ color: '#AC8E66', fontSize: '14px', flexShrink: 0 }} />
          <div style={{ flex: 1, color: '#c8b99a', lineHeight: 1.5 }}>
            Kein Untertitel oder Tags gesetzt. Soll der Post-Kopf erst ausgefüllt werden?
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={() => {
                setShowBlogMetaHint(false);
                setShowMetadata(true);
              }}
              style={{
                padding: '6px 12px', border: '1px solid rgba(172,142,102,0.6)',
                borderRadius: '6px', background: 'transparent',
                color: '#AC8E66', cursor: 'pointer',
                fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', whiteSpace: 'nowrap',
              }}
            >
              Jetzt ausfüllen
            </button>
            <button
              onClick={async () => {
                setShowBlogMetaHint(false);
                if (pendingBlogSaveRef.current) {
                  await pendingBlogSaveRef.current();
                  pendingBlogSaveRef.current = null;
                }
              }}
              style={{
                padding: '6px 12px', border: 'none',
                borderRadius: '6px', background: '#AC8E66',
                color: '#fff', cursor: 'pointer',
                fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', whiteSpace: 'nowrap',
              }}
            >
              Trotzdem speichern
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <ZenSettingsModal
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false);
          setSettingsMissingSocialHint(false);
          setSettingsMissingSocialLabel(undefined);
        }}
        onSave={() => setError(null)}
        defaultTab={settingsDefaultTab}
        defaultSocialTab={settingsSocialTab}
        showMissingSocialHint={settingsMissingSocialHint}
        missingSocialLabel={settingsMissingSocialLabel}
        onOpenZenThoughtsEditor={onOpenZenThoughtsEditor}
      />

      {/* Metadata Modal */}
      <ZenMetadataModal
        isOpen={showMetadata}
        onClose={() => setShowMetadata(false)}
        metadata={metadata}
        onSave={(newMetadata) => {
          handleMetadataSave(newMetadata);
          setShowMetadata(false);
        }}
      />

      {/* Generating Modal */}
      <ZenGeneratingModal
        isOpen={isTransforming}
        templateName={`${getPlatformLabel(selectedPlatform)} Content`}
        onClose={() => setIsTransforming(false)}
      />

      {/* Save Success Modal */}
      <ZenSaveSuccessModal
        isOpen={showSaveSuccess}
        onClose={() => {
          setShowSaveSuccess(false);
          setSaveSuccessMessage(undefined);
          setSaveSuccessPathsLabel(undefined);
          setSaveSuccessPrimaryActionLabel(undefined);
          setSaveSuccessPrimaryActionUrl(null);
        }}
        fileName={savedFileName}
        filePath={savedFilePath}
        filePaths={savedFilePaths}
        message={saveSuccessMessage}
        pathsLabel={saveSuccessPathsLabel}
        primaryActionLabel={saveSuccessPrimaryActionLabel}
        onPrimaryAction={saveSuccessPrimaryActionUrl ? () => void openExternal(saveSuccessPrimaryActionUrl) : undefined}
        showFileExplorerButton={!saveSuccessPrimaryActionUrl}
      />

      <ZenModal
        isOpen={!!pendingCloseTabId}
        onClose={() => setPendingCloseTabId(null)}
        size="md"
      >
        <ZenModalHeader
          title="Ungespeicherte Änderungen"
     
        />
        <div style={{ 
          padding: '24px', 
          display: 'flex', 
          flexDirection: 'column', gap: '16px' }}>
          <p style={{ 
            fontFamily: 'IBM Plex Mono, monospace', 
            fontSize: '12px', color: '#555', textAlign: 'center'  }}>
            Möchtest du vor dem Schließen speichern?
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <ZenRoughButton
              label="Abbrechen"
              size="small"
              width={120}
              height={38}
              onClick={() => setPendingCloseTabId(null)}
            />
            <ZenRoughButton
              label="Nicht speichern"
              size="small"
              width={160}
              height={38}
              onClick={() => {
                if (!pendingCloseTabId) return;
                closeDocTab(pendingCloseTabId, true); // force close without saving
                setPendingCloseTabId(null);
              }}
            />
            <ZenRoughButton
              label="Speichern"
              size="small"
              width={140}
              height={38}
              onClick={async () => {
                if (!pendingCloseTabId) return;
                const saved = await saveTabContent(pendingCloseTabId);
                if (saved) {
                  closeDocTab(pendingCloseTabId);
                  setPendingCloseTabId(null);
                }
              }}
            />
          </div>
        </div>
      </ZenModal>
    </div>
  );
};
