export const DEFAULT_ZEN_NOTE_TAG_COLORS: Record<string, string> = {
  js: '#f0db4f',
  ts: '#007acc',
  php: '#787cb5',
  css: '#264de4',
  html: '#e34c26',
  sql: '#cc2927',
  bash: '#4eaa25',
  py: '#3776ab',
  markdown: '#6a9fb5',
  text: '#888',
};

export function parseZenNoteFileName(fileName: string): { title: string; tag: string; folder: string } {
  const base = fileName.replace(/\.zennote$/, '');
  let folder = '';
  let rest = base;

  const atIdx = base.indexOf('@@');
  if (atIdx !== -1) {
    folder = base.slice(0, atIdx);
    rest = base.slice(atIdx + 2);
  } else {
    const slashIdx = base.indexOf('/');
    if (slashIdx !== -1) {
      folder = base.slice(0, slashIdx);
      rest = base.slice(slashIdx + 1);
    }
  }

  const sep = rest.lastIndexOf('__');
  if (sep === -1) return { title: rest, tag: '', folder };
  const maybeTag = rest.slice(sep + 2);
  if (maybeTag && /^[a-zA-Z0-9_-]+$/.test(maybeTag)) {
    return { title: rest.slice(0, sep), tag: maybeTag, folder };
  }
  return { title: rest, tag: '', folder };
}

export function loadSavedZenNoteTagColors(): Record<string, string> {
  try {
    const raw = localStorage.getItem('zenpost_zennote_tag_colors');
    if (raw) return JSON.parse(raw) as Record<string, string>;
  } catch { /* ignore */ }
  return {};
}

export function loadSavedZenNoteFolderColors(): Record<string, string> {
  try {
    const raw = localStorage.getItem('zenpost_zennote_folder_colors');
    if (raw) return JSON.parse(raw) as Record<string, string>;
  } catch { /* ignore */ }
  return {};
}

export function resolveZenNoteTagColor(tag: string, tagColors: Record<string, string>): string {
  return tagColors[tag] ?? DEFAULT_ZEN_NOTE_TAG_COLORS[tag] ?? '#888';
}

export function resolveZenNoteFolderColor(folder: string, folderColors: Record<string, string>, fallback = '#AC8E66'): string {
  return folderColors[folder] ?? fallback;
}
