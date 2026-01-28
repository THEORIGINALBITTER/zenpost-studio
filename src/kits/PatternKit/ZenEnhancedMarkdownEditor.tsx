import { useState } from 'react';
import { ZenMarkdownEditor } from './ZenMarkdownEditor';
import { ZenBlockEditor } from './ZenCodeBlockEditor';

interface CodeBlock {
  id: string;
  language: string;
  code: string;
  startIndex: number;
  endIndex: number;
}

interface ZenEnhancedMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  showCharCount?: boolean;
  showPreview?: boolean;
}

/**
 * Enhanced Markdown Editor with visual Code Block editing
 * This wrapper around ZenMarkdownEditor detects code blocks and renders them
 * as interactive ZenCodeBlockEditor components
 */
export const ZenEnhancedMarkdownEditor = ({
  value,
  onChange,
  placeholder,
  height,
  showCharCount,
  showPreview,
}: ZenEnhancedMarkdownEditorProps) => {
  const [editingCodeBlockId, setEditingCodeBlockId] = useState<string | null>(null);

  // Parse markdown to extract code blocks
  const parseCodeBlocks = (markdown: string): CodeBlock[] => {
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    const blocks: CodeBlock[] = [];
    let match;
    let index = 0;

    while ((match = codeBlockRegex.exec(markdown)) !== null) {
      blocks.push({
        id: `code-block-${index}`,
        language: match[1] || '',
        code: match[2],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
      index++;
    }

    return blocks;
  };

  // Update code block in markdown
  const updateCodeBlock = (blockId: string, newCode: string, newLanguage: string) => {
    const blocks = parseCodeBlocks(value);
    const block = blocks.find((b) => b.id === blockId);

    if (!block) return;

    const before = value.substring(0, block.startIndex);
    const after = value.substring(block.endIndex);
    const newBlock = `\`\`\`${newLanguage}\n${newCode}\n\`\`\``;

    onChange(before + newBlock + after);
  };

  const codeBlocks = parseCodeBlocks(value);

  // If we're editing a code block, show the enhanced editor
  if (editingCodeBlockId) {
    const block = codeBlocks.find((b) => b.id === editingCodeBlockId);

    if (block) {
      return (
        <div style={{ position: 'relative' }}>
          <div style={{ marginBottom: 16 }}>
            <ZenBlockEditor
              value={block.code}
              onChange={(newCode: string) => updateCodeBlock(editingCodeBlockId, newCode, block.language)}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setEditingCodeBlockId(null)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#AC8E66',
                color: '#1E1E1E',
                border: 'none',
                borderRadius: 4,
                fontSize: 11,
                fontFamily: 'monospace',
                cursor: 'pointer',
                fontWeight: 500,
              }}
              className="hover:bg-[#D4AF78]"
            >
              Fertig
            </button>
          </div>
        </div>
      );
    }
  }

  // Otherwise show the standard markdown editor with code block overlays
  return (
    <div style={{ position: 'relative' }}>
      <ZenMarkdownEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        height={height}
        showCharCount={showCharCount}
        showPreview={showPreview}
      />

      {/* Code Block Buttons (shown when there are code blocks) */}
      {codeBlocks.length > 0 && !showPreview && (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            right: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            zIndex: 10,
          }}
        >
          {codeBlocks.map((block) => (
            <button
              key={block.id}
              onClick={() => setEditingCodeBlockId(block.id)}
              style={{
                padding: '8px 12px',
                backgroundColor: '#2A2A2A',
                border: '1px solid #AC8E66',
                borderRadius: 6,
                color: '#e5e5e5',
                fontSize: 10,
                fontFamily: 'monospace',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s',
              }}
              className="hover:bg-[#AC8E66] hover:text-[#1E1E1E]"
              title={`Code-Block bearbeiten (${block.language || 'Plain Text'})`}
            >
              <span>📝</span>
              <span>{block.language || 'Code'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
