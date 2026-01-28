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
  value: string; // Markdown input
  onChange: (value: string) => void; // Markdown output
  placeholder?: string;
  height?: string;
  fontSize?: number;
  wrapLines?: boolean;
  showLineNumbers?: boolean;
}

/**
 * ZenBlockEditor - Block-based editor powered by EditorJS
 * Allows users to either type freely or use block-based editing with formatting
 */
export const ZenBlockEditor = ({
  value,
  onChange,
  placeholder = 'Schreibe  was du denkst...',
  height = '400px',
  fontSize,
  wrapLines = true,
  showLineNumbers = true,
}: ZenBlockEditorProps) => {
  const editorRef = useRef<EditorJS | null>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  // Convert Markdown to EditorJS format
  const markdownToEditorJS = (markdown: string): OutputData => {
    if (!markdown.trim()) {
      return {
        time: Date.now(),
        blocks: [],
        version: '2.28.0',
      };
    }

    const blocks: any[] = [];
    const lines = markdown.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Empty line - skip
      if (!line.trim()) {
        i++;
        continue;
      }

      // Headers (# ## ###)
      if (line.match(/^#{1,6}\s/)) {
        const level = line.match(/^#+/)?.[0].length || 1;
        const text = line.replace(/^#+\s/, '');
        blocks.push({
          type: 'header',
          data: {
            text,
            level: Math.min(level, 6),
          },
        });
        i++;
        continue;
      }

      // Code blocks (```)
      if (line.startsWith('```')) {
        const language = line.slice(3).trim() || '';
        const codeLines: string[] = [];
        i++; // Skip opening ```

        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }

        blocks.push({
          type: 'code',
          data: {
            code: codeLines.join('\n'),
            language,
          },
        });
        i++; // Skip closing ```
        continue;
      }

      // Quotes (>)
      if (line.startsWith('>')) {
        const quoteLines: string[] = [line.replace(/^>\s?/, '')];
        i++;

        while (i < lines.length && lines[i].startsWith('>')) {
          quoteLines.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }

        blocks.push({
          type: 'quote',
          data: {
            text: quoteLines.join('\n'),
            caption: '',
            alignment: 'left',
          },
        });
        continue;
      }

      // Lists (- or 1.)
      if (line.match(/^[\-\*]\s/) || line.match(/^\d+\.\s/)) {
        const isOrdered = line.match(/^\d+\.\s/) !== null;
        const items: string[] = [];
        const itemRegex = isOrdered ? /^\d+\.\s/ : /^[\-\*]\s/;

        while (i < lines.length && lines[i].match(itemRegex)) {
          items.push(lines[i].replace(itemRegex, ''));
          i++;
        }

        blocks.push({
          type: 'list',
          data: {
            style: isOrdered ? 'ordered' : 'unordered',
            items,
          },
        });
        continue;
      }

      // Delimiter (---)
      if (line.match(/^---+$/)) {
        blocks.push({
          type: 'delimiter',
          data: {},
        });
        i++;
        continue;
      }

      // Regular paragraph
      const paragraphLines: string[] = [line];
      i++;

      // Collect consecutive non-special lines
      while (
        i < lines.length &&
        lines[i].trim() &&
        !lines[i].match(/^#{1,6}\s/) &&
        !lines[i].startsWith('```') &&
        !lines[i].startsWith('>') &&
        !lines[i].match(/^[\-\*]\s/) &&
        !lines[i].match(/^\d+\.\s/) &&
        !lines[i].match(/^---+$/)
      ) {
        paragraphLines.push(lines[i]);
        i++;
      }

      blocks.push({
        type: 'paragraph',
        data: {
          text: paragraphLines.join(' '),
        },
      });
    }

    return {
      time: Date.now(),
      blocks,
      version: '2.28.0',
    };
  };

  // Convert EditorJS format to Markdown
  const editorJSToMarkdown = (data: OutputData): string => {
    if (!data.blocks || data.blocks.length === 0) {
      return '';
    }

    return data.blocks
      .map((block) => {
        switch (block.type) {
          case 'header':
            const level = '#'.repeat(block.data.level || 1);
            return `${level} ${block.data.text}`;

          case 'paragraph':
            return block.data.text;

          case 'list':
            const style = block.data.style === 'ordered' ? '1.' : '-';
            return block.data.items
              .map((item: string, index: number) => {
                if (block.data.style === 'ordered') {
                  return `${index + 1}. ${item}`;
                }
                return `${style} ${item}`;
              })
              .join('\n');

          case 'code':
            const lang = block.data.language || '';
            return `\`\`\`${lang}\n${block.data.code}\n\`\`\``;

          case 'quote':
            return block.data.text
              .split('\n')
              .map((line: string) => `> ${line}`)
              .join('\n');

          case 'delimiter':
            return '---';

          default:
            return '';
        }
      })
      .join('\n\n');
  };

  // Initialize EditorJS
  useEffect(() => {
    if (!holderRef.current || editorRef.current) return;

    const editor = new EditorJS({
      holder: holderRef.current,
      placeholder,
      tools: {
        header: {
          class: Header as any,
          inlineToolbar: true,
          config: {
            levels: [1, 2, 3, 4, 5, 6],
            defaultLevel: 2,
          },
        },
        list: {
          class: List as any,
          inlineToolbar: true,
        },
        code: {
          class: Code as any,
        },
        quote: {
          class: Quote as any,
          inlineToolbar: true,
        },
        delimiter: Delimiter as any,
      },
      data: markdownToEditorJS(value),
      onChange: async () => {
        if (!editorRef.current) return;

        try {
          const outputData = await editorRef.current.save();
          const markdown = editorJSToMarkdown(outputData);
          onChange(markdown);
        } catch (error) {
          console.error('Error saving EditorJS data:', error);
        }
      },
      onReady: () => {
        setIsReady(true);

        // Enable drag-and-drop
        if (editorRef.current) {
          new DragDrop(editorRef.current);
        }
      },
    });

    editorRef.current = editor;

    return () => {
      if (editorRef.current && editorRef.current.destroy) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  // Update editor when value changes externally
  useEffect(() => {
    if (!isReady || !editorRef.current) return;

    const updateEditor = async () => {
      try {
        const currentData = await editorRef.current!.save();
        const currentMarkdown = editorJSToMarkdown(currentData);

        // Only update if the markdown has actually changed
        if (currentMarkdown !== value) {
          await editorRef.current!.render(markdownToEditorJS(value));
        }
      } catch (error) {
        console.error('Error updating editor:', error);
      }
    };

    updateEditor();
  }, [value, isReady]);

  const className = [
    'zen-block-editor',
    wrapLines ? '' : 'zen-editor-nowrap',
    showLineNumbers ? 'zen-editor-line-numbers' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      style={{
        border: '1px solid #AC8E66',
        borderRadius: 8,
        backgroundColor: '#1E1E1E',
        overflow: 'hidden',
        minHeight: height,
        fontFamily: 'monospace',
        ...(fontSize ? { ['--zen-editor-font-size' as any]: `${fontSize}px` } : {}),
      }}
    >
      <div
        ref={holderRef}
        style={{
          padding: 16,
          color: '#e5e5e5',
        }}
      />
    </div>
  );
};
