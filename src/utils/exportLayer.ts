import { PDFDocument, StandardFonts } from 'pdf-lib';
import type { PublishingStatus, SocialPlatform } from '../types/scheduling';
import type { ChecklistItem } from './checklistStorage';

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
