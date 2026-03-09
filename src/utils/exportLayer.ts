import { PDFDocument, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import type { PublishingStatus, SocialPlatform } from '../types/scheduling';
import type { ChecklistItem } from './checklistStorage';
import ZenEngine, { type OptimizeOptions } from '../services/zenEngineService';

export type ExportChecklistItem = {
  id: string;
  text: string;
  completed: boolean;
  source: 'default' | 'custom';
  postId?: string;
};

export type ExportPost = {
  id: string;
  platform: SocialPlatform;
  title: string;
  subtitle?: string;
  content: string;
  date?: string;
  time?: string;
  status: PublishingStatus;
  characterCount: number;
  wordCount: number;
  source: 'content' | 'manual' | 'scheduled';
  checklistSummary: { completed: number; total: number };
  checklistItems: ExportChecklistItem[];
};

export type ExportPayload = {
  version: '1.0.0';
  generatedAt: string;
  projectPath?: string | null;
  posts: ExportPost[];
  unassignedChecklist: ExportChecklistItem[];
};

type ScheduleMap = Record<string, { date: string; time: string }>;

type BuildExportPayloadInput = {
  posts: Array<{
    id: string;
    platform: SocialPlatform;
    title: string;
    subtitle?: string;
    content: string;
    characterCount: number;
    wordCount: number;
    source: 'content' | 'manual' | 'scheduled';
  }>;
  schedules: ScheduleMap;
  checklistItems: ChecklistItem[];
  projectPath?: string | null;
};

export const buildExportPayload = ({
  posts,
  schedules,
  checklistItems,
  projectPath,
}: BuildExportPayloadInput): ExportPayload => {
  const unassignedChecklist: ExportChecklistItem[] = [];
  const checklistByPost = new Map<string, ExportChecklistItem[]>();

  checklistItems.forEach(item => {
    const normalized: ExportChecklistItem = {
      id: item.id,
      text: item.text,
      completed: item.completed,
      source: item.source,
      postId: item.postId,
    };
    if (!item.postId) {
      unassignedChecklist.push(normalized);
      return;
    }
    if (!checklistByPost.has(item.postId)) checklistByPost.set(item.postId, []);
    checklistByPost.get(item.postId)?.push(normalized);
  });

  const exportPosts: ExportPost[] = posts.map(post => {
    const schedule = schedules[post.id];
    const date = schedule?.date || undefined;
    const time = schedule?.time || undefined;
    const status: PublishingStatus = date && time ? 'scheduled' : 'draft';
    const items = checklistByPost.get(post.id) ?? [];
    const completed = items.filter(item => item.completed).length;
    return {
      id: post.id,
      platform: post.platform,
      title: post.title,
      subtitle: post.subtitle,
      content: post.content,
      date,
      time,
      status,
      characterCount: post.characterCount,
      wordCount: post.wordCount,
      source: post.source,
      checklistSummary: { completed, total: items.length },
      checklistItems: items,
    };
  });

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    projectPath,
    posts: exportPosts,
    unassignedChecklist,
  };
};

export const exportPayloadToMarkdown = (payload: ExportPayload) => {
  const lines: string[] = [];
  lines.push('# ZenPost Export');
  lines.push('');
  lines.push(`Erstellt: ${payload.generatedAt}`);
  lines.push(`Posts: ${payload.posts.length}`);
  lines.push('');

  payload.posts.forEach(post => {
    lines.push(`## ${post.platform} · ${post.title || 'Post'}`);
    if (post.subtitle) lines.push(`**Subtitle:** ${post.subtitle}`);
    lines.push(`**Status:** ${post.status}`);
    lines.push(`**Datum:** ${post.date ?? '—'}  **Uhrzeit:** ${post.time ?? '—'}`);
    lines.push(`**Zeichen:** ${post.characterCount}  **Wörter:** ${post.wordCount}`);
    lines.push(`**Checklist:** ${post.checklistSummary.completed}/${post.checklistSummary.total}`);
    lines.push('');
    lines.push('### Inhalt');
    lines.push('');
    lines.push(post.content || '—');
    lines.push('');
    lines.push('### Checklist');
    lines.push('');
    if (post.checklistItems.length === 0) {
      lines.push('- (keine Aufgaben)');
    } else {
      post.checklistItems.forEach(item => {
        lines.push(`- [${item.completed ? 'x' : ' '}] ${item.text}`);
      });
    }
    lines.push('');
  });

  if (payload.unassignedChecklist.length > 0) {
    lines.push('## Unzugeordnete Aufgaben');
    lines.push('');
    payload.unassignedChecklist.forEach(item => {
      lines.push(`- [${item.completed ? 'x' : ' '}] ${item.text}`);
    });
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
};

export const exportPayloadToCsv = (payload: ExportPayload) => {
  const headers = [
    'post_id',
    'platform',
    'title',
    'subtitle',
    'content',
    'date',
    'time',
    'status',
    'character_count',
    'word_count',
    'source',
    'checklist_item_id',
    'checklist_item_text',
    'checklist_item_completed',
    'checklist_item_source',
    'checklist_summary_completed',
    'checklist_summary_total',
  ];

  const rows: string[] = [headers.join(',')];

  const escape = (value: string | number | boolean | null | undefined) => {
    if (value === null || value === undefined) return '""';
    const text = String(value).replace(/\"/g, '\"\"');
    return `"${text}"`;
  };

  payload.posts.forEach(post => {
    const summaryCompleted = post.checklistSummary.completed;
    const summaryTotal = post.checklistSummary.total;
    if (post.checklistItems.length === 0) {
      rows.push([
        escape(post.id),
        escape(post.platform),
        escape(post.title),
        escape(post.subtitle ?? ''),
        escape(post.content),
        escape(post.date ?? ''),
        escape(post.time ?? ''),
        escape(post.status),
        escape(post.characterCount),
        escape(post.wordCount),
        escape(post.source),
        escape(''),
        escape(''),
        escape(''),
        escape(''),
        escape(summaryCompleted),
        escape(summaryTotal),
      ].join(','));
      return;
    }

    post.checklistItems.forEach(item => {
      rows.push([
        escape(post.id),
        escape(post.platform),
        escape(post.title),
        escape(post.subtitle ?? ''),
        escape(post.content),
        escape(post.date ?? ''),
        escape(post.time ?? ''),
        escape(post.status),
        escape(post.characterCount),
        escape(post.wordCount),
        escape(post.source),
        escape(item.id),
        escape(item.text),
        escape(item.completed),
        escape(item.source),
        escape(summaryCompleted),
        escape(summaryTotal),
      ].join(','));
    });
  });

  if (payload.unassignedChecklist.length > 0) {
    payload.unassignedChecklist.forEach(item => {
      rows.push([
        escape(''),
        escape(''),
        escape(''),
        escape(''),
        escape(''),
        escape(''),
        escape(''),
        escape(''),
        escape(''),
        escape(''),
        escape(''),
        escape(item.id),
        escape(item.text),
        escape(item.completed),
        escape(item.source),
        escape(''),
        escape(''),
      ].join(','));
    });
  }

  return `${rows.join('\n')}\n`;
};

const wrapText = (text: string, maxWidth: number, font: any, fontSize: number) => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  words.forEach(word => {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
};

export const exportPayloadToPdf = async (payload: ExportPayload): Promise<Uint8Array> => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageMargin = 40;
  const fontSize = 10;
  const lineHeight = 14;

  let page = pdf.addPage();
  let { width, height } = page.getSize();
  let cursorY = height - pageMargin;

  const ensureSpace = (lines = 1) => {
    if (cursorY - lines * lineHeight < pageMargin) {
      page = pdf.addPage();
      ({ width, height } = page.getSize());
      cursorY = height - pageMargin;
    }
  };

  const drawLine = (text: string, bold = false) => {
    ensureSpace(1);
    page.drawText(text, {
      x: pageMargin,
      y: cursorY,
      size: fontSize,
      font: bold ? fontBold : font,
    });
    cursorY -= lineHeight;
  };

  drawLine('ZenPost Export', true);
  drawLine(`Erstellt: ${payload.generatedAt}`);
  drawLine(`Posts: ${payload.posts.length}`);
  cursorY -= lineHeight / 2;

  payload.posts.forEach(post => {
    drawLine(`${post.platform} · ${post.title || 'Post'}`, true);
    drawLine(`Status: ${post.status}`);
    drawLine(`Datum: ${post.date ?? '—'}  Uhrzeit: ${post.time ?? '—'}`);
    drawLine(`Zeichen: ${post.characterCount}  Wörter: ${post.wordCount}`);
    drawLine(`Checklist: ${post.checklistSummary.completed}/${post.checklistSummary.total}`);
    cursorY -= lineHeight / 2;

    drawLine('Inhalt:', true);
    const contentLines = wrapText(post.content || '—', width - pageMargin * 2, font, fontSize);
    contentLines.forEach(line => drawLine(line));
    cursorY -= lineHeight / 2;

    drawLine('Checklist:', true);
    if (post.checklistItems.length === 0) {
      drawLine('- (keine Aufgaben)');
    } else {
      post.checklistItems.forEach(item => {
        drawLine(`- [${item.completed ? 'x' : ' '}] ${item.text}`);
      });
    }
    cursorY -= lineHeight;
  });

  if (payload.unassignedChecklist.length > 0) {
    drawLine('Unzugeordnete Aufgaben', true);
    payload.unassignedChecklist.forEach(item => {
      drawLine(`- [${item.completed ? 'x' : ' '}] ${item.text}`);
    });
  }

  const buffer = await pdf.save();
  return new Uint8Array(buffer);
};

// ─── Image Optimization für Export ───────────────────────────────────────────

const DEFAULT_EXPORT_IMAGE_OPTIONS: OptimizeOptions = {
  max_width: 1200,
  max_height: 1200,
  output_format: 'jpeg',
  quality: 82,
};

/**
 * Findet alle eingebetteten base64-Bilder in Markdown-Content und optimiert
 * sie via ZenEngine (resize + compression). Gibt den optimierten Content zurück.
 * Schlägt eine Optimierung fehl, bleibt das Original-Bild erhalten.
 */
/**
 * Exportiert alle Posts als ZIP-Bundle:
 * - zenpost-export/manifest.json
 * - zenpost-export/posts/<platform>-post.md  (Bilder als Pfad-Referenz)
 * - zenpost-export/images/img-XXXX.jpg       (optimierte Bilder)
 *
 * Inline base64-Bilder werden via ZenEngine optimiert und als separate
 * Dateien gespeichert — keine riesigen base64-Strings im Markdown.
 */
export async function exportPayloadToZip(payload: ExportPayload): Promise<Uint8Array> {
  const zip = new JSZip();
  const root = zip.folder('zenpost-export')!;
  const postsFolder = root.folder('posts')!;
  const imagesFolder = root.folder('images')!;

  root.file('manifest.json', JSON.stringify({
    version: payload.version,
    generatedAt: payload.generatedAt,
    projectPath: payload.projectPath ?? null,
    postCount: payload.posts.length,
  }, null, 2));

  const IMAGE_PATTERN = /!\[([^\]]*)\]\((data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)\)/g;
  let imgCounter = 0;

  for (const post of payload.posts) {
    let content = post.content;
    const imageMatches = [...content.matchAll(IMAGE_PATTERN)];

    for (const match of imageMatches) {
      const [fullMatch, alt, dataUrl] = match;
      try {
        const base64 = dataUrl.split(',')[1];
        if (!base64) continue;
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const optimized = await ZenEngine.imageOptimize(bytes, {
          max_width: 1200,
          max_height: 1200,
          output_format: 'jpeg',
          quality: 82,
        });
        imgCounter++;
        const imgName = `img-${String(imgCounter).padStart(4, '0')}.jpg`;
        const imgBase64 = optimized.data_url.split(',')[1];
        imagesFolder.file(imgName, imgBase64, { base64: true });
        content = content.replace(fullMatch, `![${alt}](../images/${imgName})`);
      } catch {
        // Inline-Bild behalten wenn Optimierung fehlschlägt
      }
    }

    // YAML-Frontmatter + Post-Inhalt
    const frontmatterLines = [
      '---',
      `platform: ${post.platform}`,
      `title: ${post.title || ''}`,
      `status: ${post.status}`,
      `character_count: ${post.characterCount}`,
      `word_count: ${post.wordCount}`,
      `source: ${post.source}`,
      post.date ? `date: ${post.date}` : null,
      post.time ? `time: ${post.time}` : null,
      '---',
      '',
    ].filter(Boolean).join('\n');

    const stem = `${post.platform}-${post.id.slice(0, 8)}`;
    postsFolder.file(`${stem}.md`, frontmatterLines + content);
  }

  if (payload.unassignedChecklist.length > 0) {
    const checklistMd = payload.unassignedChecklist
      .map(item => `- [${item.completed ? 'x' : ' '}] ${item.text}`)
      .join('\n');
    root.file('checklist.md', `# Unzugeordnete Aufgaben\n\n${checklistMd}\n`);
  }

  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

export async function optimizeImagesInMarkdown(
  content: string,
  options: OptimizeOptions = DEFAULT_EXPORT_IMAGE_OPTIONS,
): Promise<string> {
  // Pattern: ![alt](data:image/TYPE;base64,DATA)
  const IMAGE_PATTERN = /!\[([^\]]*)\]\((data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)\)/g;
  const matches = [...content.matchAll(IMAGE_PATTERN)];
  if (matches.length === 0) return content;

  let result = content;
  for (const match of matches) {
    const [fullMatch, alt, dataUrl] = match;
    try {
      const base64 = dataUrl.split(',')[1];
      if (!base64) continue;
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const optimized = await ZenEngine.imageOptimize(bytes, options);
      result = result.replace(fullMatch, `![${alt}](${optimized.data_url})`);
    } catch {
      // Original behalten wenn Optimierung fehlschlägt
    }
  }
  return result;
}
