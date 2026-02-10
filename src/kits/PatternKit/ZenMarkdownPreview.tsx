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
  onContentChange?: (content: string) => void;
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
    { value: 'deutsch', label: '🇩Deutsch' },
    { value: 'english', label: '🇬English' },
    { value: 'español', label: '🇪Español' },
    { value: 'français', label: '🇫Français' },
    { value: 'italiano', label: '🇮Italiano' },
    { value: 'português', label: '🇵Português' },
    { value: 'russisch', label: '🇷Russisch'  },
    { value: '中文', label: '🇨中文' },
    { value: '日本語', label: '🇯日本語' },
    { value: '한국어', label: '🇰한국어' },
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
      {/* Controls: Translate + Zoom */}
<div
  className="absolute z-10 flex items-center"
  style={{ top: 50, right: 14, transformOrigin: "top right" }}
>
  {/* GROUP WRAP */}
  <div
    className="
      flex items-center gap-1
      px-[3px] py-[3px]
      rounded-[6px]
      bg-[#121212]/50 backdrop-blur
      border border-[#121212]
      shadow-[0_10px_30px_rgba(0,0,0,0.35)]
    "
  >
    {/* Translate Button with Dropdown */}
    {onContentChange && (
      <div className="relative">
        <button
          onClick={() => setShowLanguageMenu(!showLanguageMenu)}
          disabled={isTranslating}
          className="
            h-10 w-10
            inline-flex items-center justify-center
            rounded-lg
            bg-[#171717]
            border border-[#2E2E2E]
            text-[#A0A0A0]
            text-[10px]
            hover:text-[#AC8E66]
            hover:border-[#3A3328]
            hover:bg-[#1D1D1D]
            active:translate-y-[1px]
            transition
            disabled:opacity-50 disabled:cursor-not-allowed
          "
          title="Übersetzen"
        >
          <FontAwesomeIcon icon={faLanguage} className="text-[11px]" />
        </button>

        {/* Language Dropdown Menu */}
        {showLanguageMenu && (
          <div
            className="
              absolute top-11 right-0
              min-w-[200px]
              overflow-hidden
              rounded-xl
              bg-[#121212]
              border border-[#2E2E2E]
              shadow-[0_16px_40px_rgba(0,0,0,0.55)]
              z-20
            "
          >
            <div className="px-3 py-2 
            text-[10px] 
            font-mono 
            tracking-wide 
            text-[#666] border-b border-[#1F1F1F]">
              Sprache wählen
            </div>

            {languages.map((lang) => (
              <button
                key={lang.value}
                onClick={() => handleTranslate(lang.value)}
                className="
                  w-full px-4 py-2.5 text-left
                  text-[#dbd9d5]
                  hover:bg-[#1A1A1A]
                  hover:text-[#AC8E66]
                  transition-colors
                  text-[10px] font-mono
                "
              >
                {lang.label}
              </button>
            ))}
          </div>
        )}
      </div>
    )}

    {/* Divider */}
    <div className="w-px h-7 bg-[#232323] mx-1" />

    {/* Zoom Controls */}
    <button
      onClick={handleZoomOut}
      className="
        h-9 w-9
        inline-flex items-center justify-center
        rounded-lg
        bg-[#171717]
        border border-[#2E2E2E]
        text-[#A0A0A0]
        text-[10px]
        hover:text-[#AC8E66]
        hover:border-[#3A3328]
        hover:bg-[#1D1D1D]
        active:translate-y-[1px]
        transition
      "
      title="Verkleinern"
    >
      <FontAwesomeIcon icon={faMinus} className="text-[8px]" />
    </button>

    <button
      onClick={handleZoomReset}
      className="
        h-9 px-4
        inline-flex items-center justify-center
        rounded-lg
        bg-[#141414]
        border border-[#2E2E2E]
        text-[#7A7A7A]
        font-mono text-[10px]
        hover:text-[#AC8E66]
        hover:border-[#3A3328]
        hover:bg-[#1A1A1A]
        active:translate-y-[1px]
        transition
        min-w-[96px]
      "
      title="Zurücksetzen"
    >
      {zoom}%
    </button>

    <button
      onClick={handleZoomIn}
      className="
        h-9 w-9
        inline-flex items-center justify-center
        rounded-lg
        bg-[#171717]
        border border-[#2E2E2E]
        text-[#A0A0A0]
        text-[10px]
        hover:text-[#AC8E66]
        hover:border-[#3A3328]
        hover:bg-[#1D1D1D]
        active:translate-y-[1px]
        transition
      "
      title="Vergrößern"
    >
      <FontAwesomeIcon icon={faPlus} className="text-[9px]" />
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

      {/* Preview Content Innenbox Content AI Studio Preview Step4/4 Inhalt - Paper Style */}
      <div
        className="
        text-[#3a3a3a]
        border-[2px]
        border-[#555]
        borderTop-[none]
        box-shadow:
          inset 0 0 60px rgba(0,0,0,0.04),
          0 20px 60px rgba(0,0,0,0.15);
        rounded-[8px_8px_12px_12px]
        shadow-[-10px_-10px_-6px_-1px_rgba(5,5,5,0.9)]
        p-[5px]
        overflow-y-auto zen-scrollbar rose
        max-w-none"
        style={{
          height,
          paddingTop: 0,
          borderWidth: '2.5px',
          background: 'rgb(217, 212, 197)',
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.03)',
          position: 'relative',
        }}
      >
        <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left', width: `${100 / (zoom / 100)}%` }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              // Custom styling for markdown elements
              h1: ({ node, ...props }) => (
                <h1 className="text-[#AC8E66] text-3xl font-bold mb-4" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-[#D4AF78] text-2xl font-bold mb-3 mt-6" {...props} />
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
                <p
                  className="leading-relaxed text-[#3a3a3a]"
                  style={{ marginTop: 0, marginBottom: '3.15em' }}
                  {...props}
                />
              ),
              br: ({ node, ...props }) => (
                <br {...props} style={{ display: 'block', marginBottom: '0.45em' }} />
              ),
              a: ({ node, ...props }) => (
                <a
                  className="text-[#AC8E66] hover:text-[#D4AF78] underline transition-colors"
                  {...props}
                />
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc list-inside mb-6 space-y-2 text-[#3a3a3a]" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal list-inside mb-6 space-y-2 text-[#3a3a3a]" {...props} />
              ),
              li: ({ node, children, ...props }) => (
                <li className="ml-4 text-[#3a3a3a]" {...props}>
                  {typeof children === 'object' && children !== null && !Array.isArray(children)
                    ? JSON.stringify(children)
                    : children}
                </li>
              ),
              blockquote: ({ node, ...props }) => (
                <blockquote
                  className="border-l-4 border-[#AC8E66] bg-[#e8e4dc] pl-4 py-2 my-4 italic text-[#5a5a5a]"
                  {...props}
                />
              ),
              code: ({ node, className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !match;

                if (isInline) {
                  return (
                    <code
                      className="bg-[#e0dcd4] text-[#8b6914] px-1.5 py-0.5 rounded font-mono text-sm"
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
                  className="bg-[#2a2a2a] border border-[#AC8E66] rounded-lg p-4 mb-4
                    overflow-x-auto text-sm text-[#e5e5e5]"
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
                <em className="italic text-[#D4AF78] text-[20px]" {...props} />
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
