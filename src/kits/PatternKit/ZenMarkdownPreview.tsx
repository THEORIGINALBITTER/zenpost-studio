import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMinus, faLanguage } from '@fortawesome/free-solid-svg-icons';
import { translateContent, type TargetLanguage } from '../../services/aiService';

interface ZenMarkdownPreviewProps {
  content: string;
  height?: string;
  onContentChange?: (content: string) => void; // Allow updating content after translation
}

export const ZenMarkdownPreview = ({
  content,
  height = '400px',
  onContentChange,
}: ZenMarkdownPreviewProps) => {
  const [zoom, setZoom] = useState(70);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));
  const handleZoomReset = () => setZoom(70);

  const languages: Array<{ value: TargetLanguage; label: string }> = [
    { value: 'deutsch', label: '🇩🇪 Deutsch' },
    { value: 'english', label: '🇬🇧 English' },
    { value: 'español', label: '🇪🇸 Español' },
    { value: 'français', label: '🇫🇷 Français' },
    { value: 'italiano', label: '🇮🇹 Italiano' },
    { value: 'português', label: '🇵🇹 Português' },
    { value: 'russisch', label: '🇷🇺 Russisch'  },
    { value: '中文', label: '🇨🇳 中文' },
    { value: '日本語', label: '🇯🇵 日本語' },
    { value: '한국어', label: '🇰🇷 한국어' },
  ];

  const handleTranslate = async (targetLanguage: TargetLanguage) => {
    setShowLanguageMenu(false);
    setIsTranslating(true);
    setTranslateError(null);

    try {
      const result = await translateContent(content, targetLanguage);
      if (result.success && result.data) {
        onContentChange?.(result.data);
      } else {
        setTranslateError(result.error || 'Übersetzung fehlgeschlagen');
        setTimeout(() => setTranslateError(null), 5000);
      }
    } catch (error) {
      console.error('Translation error:', error);
      setTranslateError('Übersetzung fehlgeschlagen');
      setTimeout(() => setTranslateError(null), 5000);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="w-full relative">
      {/* Controls: Translate + Zoom */}
      <div
        className="absolute z-10 flex items-center gap-2"
        style={{ top: -0, right: -8, scale: 0.75, transformOrigin: 'top right', padding: '8px'  }}
      >
        {/* Translate Button with Dropdown */}
        {onContentChange && (
          <div className="relative">
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              disabled={isTranslating}
              className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-[#AC8E66] hover:bg-[#2A2A2A] bg-[#1A1A1A] border border-[#3a3a3a] rounded-lg transition-colors disabled:opacity-50"
              title="Übersetzen"
            >
              <FontAwesomeIcon icon={faLanguage} className="text-xs" />
            </button>

            {/* Language Dropdown Menu */}
            {showLanguageMenu && (
              <div className="absolute top-10 right-0 bg-[#1A1A1A] border border-[#3a3a3a] rounded-lg shadow-lg overflow-hidden min-w-[180px] z-20">
                {languages.map((lang) => (
                  <button
                    key={lang.value}
                    onClick={() => handleTranslate(lang.value)}
                    className="w-full px-4 py-2 text-left text-[#e5e5e5] hover:bg-[#2A2A2A] hover:text-[#AC8E66] transition-colors text-sm font-mono"
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Zoom Controls */}
        <div className="flex items-center gap-2 bg-[#1A1A1A] border border-[#3a3a3a] rounded-lg p-1">
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-[#AC8E66] hover:bg-[#2A2A2A] rounded transition-colors"
            title="Verkleinern"
          >
            <FontAwesomeIcon icon={faMinus} className="text-xs" />
          </button>
          <button
            onClick={handleZoomReset}
            className="px-2 h-8 flex items-center justify-center text-[#888] hover:text-[#AC8E66] hover:bg-[#2A2A2A] rounded transition-colors font-mono text-xs"
            title="Zurücksetzen"
          >
            {zoom}%
          </button>
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-[#AC8E66] hover:bg-[#2A2A2A] rounded transition-colors"
            title="Vergrößern"
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
          </button>
        </div>
      </div>

      {/* Translation Status */}
      {isTranslating && (
        <div
          className="absolute z-10 bg-[#1A1A1A] border border-[#AC8E66] rounded rounded-[12px] px-[12px] py-[2px]"
          style={{ top: 16, left: 10, scale: 0.75, transformOrigin: 'top left' }}
        >
          <p className="text-[#AC8E66] text-[9px] font-mono">Übersetze...</p>
        </div>
      )}

      {/* Translation Error */}
      {translateError && (
        <div
          className="absolute z-10 bg-[#1A1A1A] border border-red-500 rounded-lg px-3 py-1"
          style={{ top: 16, right: 16 }}
        >
          <p className="text-red-400 text-xs font-mono">{translateError}</p>
        </div>
      )}

      {/* Preview Content Innenbox  */}
      <div
        className="w-full bg-[#2A2A2A] text-[#e5e5e5] border border-[#fef3c7] shadow-[10px] shadow-[#fff]
          rounded-[12px] p-[5px] overflow-y-auto zen-scrollbar prose prose-invert max-w-none"
        style={{ height, paddingTop: 56 }}
      >
        <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left', width: `${100 / (zoom / 100)}%` }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              // Custom styling for markdown elements
              h1: ({ node, ...props }) => (
                <h1 className="text-[#AC8E66] text-3xl font-bold mb-4 pb-2 border-b border-[#3a3a3a]" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-[#D4AF78] text-2xl font-bold mb-3 mt-6 pb-2 border-b border-[#3a3a3a]" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-[#C4A578] text-xl font-bold mb-2 mt-4" {...props} />
              ),
              h4: ({ node, ...props }) => (
                <h4 className="text-[#C4A578] text-lg font-bold mb-2 mt-3" {...props} />
              ),
              h5: ({ node, ...props }) => (
                <h5 className="text-[#C4A578] text-base font-bold mb-2 mt-3" {...props} />
              ),
              h6: ({ node, ...props }) => (
                <h6 className="text-[#C4A578] text-sm font-bold mb-2 mt-3" {...props} />
              ),
              p: ({ node, ...props }) => (
                <p className="mb-4 leading-relaxed text-[#e5e5e5]" {...props} />
              ),
              a: ({ node, ...props }) => (
                <a
                  className="text-[#AC8E66] hover:text-[#D4AF78] underline transition-colors"
                  {...props}
                />
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc list-inside mb-4 space-y-2 text-[#e5e5e5]" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal list-inside mb-4 space-y-2 text-[#e5e5e5]" {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className="ml-4" {...props} />
              ),
              blockquote: ({ node, ...props }) => (
                <blockquote
                  className="border-l-4 border-[#AC8E66] bg-[#2A2A2A]/50 pl-4 py-2 my-4 italic text-[#ccc]"
                  {...props}
                />
              ),
              code: ({ node, className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !match;

                if (isInline) {
                  return (
                    <code
                      className="bg-[#1A1A1A] text-[#AC8E66] px-1.5 py-0.5 rounded font-mono text-sm"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }

                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              pre: ({ node, ...props }) => (
                <pre
                  className="bg-[#1A1A1A] border border-[#3a3a3a] rounded-lg p-4 mb-4
                    overflow-x-auto text-sm"
                  {...props}
                />
              ),
              table: ({ node, ...props }) => (
                <div className="overflow-x-auto mb-4">
                  <table
                    className="min-w-full border-collapse border border-[#3a3a3a]"
                    {...props}
                  />
                </div>
              ),
              thead: ({ node, ...props }) => (
                <thead className="bg-[#1A1A1A]" {...props} />
              ),
              th: ({ node, ...props }) => (
                <th
                  className="border border-[#3a3a3a] px-4 py-2 text-left text-[#AC8E66] font-bold"
                  {...props}
                />
              ),
              td: ({ node, ...props }) => (
                <td
                  className="border border-[#3a3a3a] px-4 py-2 text-[#e5e5e5]"
                  {...props}
                />
              ),
              hr: ({ node, ...props }) => (
                <hr className="border-[#3a3a3a] my-6" {...props} />
              ),
              strong: ({ node, ...props }) => (
                <strong className="font-bold text-[#AC8E66]" {...props} />
              ),
              em: ({ node, ...props }) => (
                <em className="italic text-[#D4AF78] text-[12px]" {...props} />
              ),
            }}
          >
            {content || '*Keine Vorschau verfügbar. Beginne mit dem Schreiben...*'}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
