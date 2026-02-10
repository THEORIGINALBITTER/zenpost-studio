import { useEffect, useRef, useState } from 'react';
import EditorJS, { OutputData } from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Code from '@editorjs/code';
import Quote from '@editorjs/quote';
import Delimiter from '@editorjs/delimiter';
import DragDrop from 'editorjs-drag-drop';
import './ZenBlockEditor.css';

interface ZenBlockEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
}

export const ZenBlockEditor = ({
  value,
  onChange,
  placeholder = 'Schreibe was du denkst …',
  height = '420px',
}: ZenBlockEditorProps) => {
  const editorRef = useRef<EditorJS | null>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [writeMode, setWriteMode] = useState(true);

  /* ---------------- Markdown → EditorJS ---------------- */
  const markdownToEditorJS = (md: string): OutputData => {
    if (!md?.trim()) return { time: Date.now(), blocks: [], version: '2.28.0' };

    const blocks: any[] = [];
    const lines = md.split('\n');
    let i = 0;

    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim()) {
        i++;
        continue;
      }

      if (/^#{1,6}\s/.test(l)) {
        const level = l.match(/^#+/)![0].length;
        blocks.push({
          type: 'header',
          data: { text: l.replace(/^#+\s/, ''), level },
        });
        i++;
        continue;
      }

      if (l.startsWith('```')) {
        const lang = l.slice(3).trim();
        const code: string[] = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          code.push(lines[i++]);
        }
        i++;
        blocks.push({ type: 'code', data: { code: code.join('\n'), language: lang } });
        continue;
      }

      if (l.startsWith('>')) {
        const q: string[] = [];
        while (i < lines.length && lines[i].startsWith('>')) {
          q.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        blocks.push({
          type: 'quote',
          data: { text: q.join('\n'), caption: '', alignment: 'left' },
        });
        continue;
      }

      if (/^[-*]\s/.test(l) || /^\d+\.\s/.test(l)) {
        const ordered = /^\d+\.\s/.test(l);
        const items: string[] = [];
        const rx = ordered ? /^\d+\.\s/ : /^[-*]\s/;
        while (i < lines.length && rx.test(lines[i])) {
          items.push(lines[i].replace(rx, ''));
          i++;
        }
        blocks.push({
          type: 'list',
          data: { style: ordered ? 'ordered' : 'unordered', items },
        });
        continue;
      }

      if (/^---+$/.test(l)) {
        blocks.push({ type: 'delimiter', data: {} });
        i++;
        continue;
      }

      const p: string[] = [l];
      i++;
      while (
        i < lines.length &&
        lines[i].trim() &&
        !/^#{1,6}\s/.test(lines[i]) &&
        !lines[i].startsWith('```') &&
        !lines[i].startsWith('>') &&
        !/^[-*]\s/.test(lines[i]) &&
        !/^\d+\.\s/.test(lines[i])
      ) {
        p.push(lines[i++]);
      }

      blocks.push({ type: 'paragraph', data: { text: p.join(' ') || '' } });
    }

    return { time: Date.now(), blocks, version: '2.28.0' };
  };

  /* ---------------- EditorJS → Markdown ---------------- */
  const editorJSToMarkdown = (data: OutputData) => {
    const normalizeInlineText = (text: string) => {
      const convertOrderedLists = (input: string) =>
        input.replace(/<ol(\s+[^>]*)?>([\s\S]*?)<\/ol>/gi, (_match, _attrs, inner) => {
          const items: string[] = [];
          const liRegex = /<li(\s+[^>]*)?>([\s\S]*?)<\/li>/gi;
          let m: RegExpExecArray | null;
          let idx = 1;
          while ((m = liRegex.exec(inner)) !== null) {
            const raw = m[2] ?? '';
            const cleaned = raw
              .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n')
              .replace(/<br\s*\/?>/gi, '  \n')
              .replace(/<[^>]+>/g, '')
              .trim();
            items.push(`${idx}. ${cleaned}`);
            idx += 1;
          }
          return items.join('\n');
        });

      return convertOrderedLists(text)
        .replace(/&nbsp;/gi, ' ')
        .replace(/<\/li>\s*<li(\s+[^>]*)?>/gi, '\n- ')
        .replace(/<li(\s+[^>]*)?>/gi, '- ')
        .replace(/<\/li>/gi, '\n')
        .replace(/<\/ol>/gi, '\n')
        .replace(/<\/ul>/gi, '\n')
        .replace(/<ol(\s+[^>]*)?>/gi, '')
        .replace(/<ul(\s+[^>]*)?>/gi, '')
        .replace(/<\/(p|div|h[1-6]|li|ul|ol|blockquote|pre|code)>/gi, '\n')
        .replace(/<(p|div|h[1-6]|li|ul|ol|blockquote|pre|code)(\s+[^>]*)?>/gi, '')
        .replace(/<\/?span(\s+[^>]*)?>/gi, '')
        .replace(/<\/?a(\s+[^>]*)?>/gi, '')
        .replace(/<\/?strong(\s+[^>]*)?>/gi, '')
        .replace(/<\/?em(\s+[^>]*)?>/gi, '')
        .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n')
        .replace(/<br\s*\/?>/gi, '  \n');
    };

    return data.blocks
      ?.map((b: any) => {
        switch (b.type) {
          case 'header':
            return `${'#'.repeat(b.data.level)} ${normalizeInlineText(b.data.text || '')}`;
          case 'paragraph':
            return normalizeInlineText(b.data.text || '');
          case 'list':
            return b.data.items
              .map((i: string, idx: number) =>
                b.data.style === 'ordered' ? `${idx + 1}. ${normalizeInlineText(i)}` : `- ${normalizeInlineText(i)}`
              )
              .join('\n');
          case 'code':
            return `\`\`\`${b.data.language || ''}\n${b.data.code}\n\`\`\``;
          case 'quote':
            return normalizeInlineText(b.data.text || '').split('\n').map((l: string) => `> ${l}`).join('\n');
          case 'delimiter':
            return '---';
          default:
            return '';
        }
      })
      .join('\n\n') || '';
  };

  /* ---------------- Floating Popover (Portal) ---------------- */
  const portalPopover = () => {
    const pop = document.querySelector('.ce-popover') as HTMLElement | null;
    if (!pop || pop.dataset.portaled) return;

    const plus = document.querySelector('.ce-toolbar__plus:hover') as HTMLElement | null;
    if (!plus) return;

    const r = plus.getBoundingClientRect();
    pop.style.position = 'fixed';
    pop.style.top = `${r.top}px`;
    pop.style.left = `${r.right + 10}px`;
    pop.style.zIndex = '9999';
    pop.dataset.portaled = 'true';
    document.body.appendChild(pop);
  };

  /* ---------------- Init Editor ---------------- */
  useEffect(() => {
    if (!holderRef.current || editorRef.current) return;

    const editor = new EditorJS({
      holder: holderRef.current,
      autofocus: true,
      placeholder,
      tools: {
        header: { class: Header as any, inlineToolbar: true },
        list: { class: List as any, inlineToolbar: true },
        code: { class: Code as any },
        quote: { class: Quote as any, inlineToolbar: true },
        delimiter: Delimiter as any,
      },
      data: markdownToEditorJS(value),
      onReady: () => {
        new DragDrop(editor);
        setReady(true);
      },
      onChange: async () => {
        const d = await editor.save();
        onChange(editorJSToMarkdown(d));
      },
    });

    editorRef.current = editor;
    return () => editor.destroy();
  }, []);

  /* ---------------- Observe Popover ---------------- */
  useEffect(() => {
    const obs = new MutationObserver(portalPopover);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  /* ---------------- External Sync ---------------- */
  useEffect(() => {
    if (!ready || !editorRef.current || typeof value !== 'string') return;
    (async () => {
      const cur = await editorRef.current!.save();
      if (editorJSToMarkdown(cur) !== value) {
        editorRef.current!.render(markdownToEditorJS(value));
      }
    })();
  }, [value, ready]);

  return (
    <div
      className={writeMode ? 'zen-write-mode' : ''}
      onMouseEnter={() => setWriteMode(false)}
      onMouseLeave={() => setWriteMode(true)}
      style={{
        border: '1px solid #AC8E66',
        borderRadius: 8,
        background: '#1E1E1E',
        minHeight: height,
        overflow: 'visible',
        fontFamily: 'SF Mono, monospace',
      }}
    >
      <div ref={holderRef} style={{ padding: 16 }} />
    </div>
  );
};
