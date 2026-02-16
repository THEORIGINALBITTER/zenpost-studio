import { Children, isValidElement, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'highlight.js/styles/atom-one-dark.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMinus, faLanguage, faWandMagicSparkles, faBarsProgress, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { translateContent, type TargetLanguage } from '../../services/aiService';
interface ZenMarkdownPreviewProps {
  content: string;
  height?: string;
  onContentChange?: (content: string) => void;
  showTextAI?: boolean;
  onToggleTextAI?: () => void;
  isTextAIDisabled?: boolean;
  onPreviewStyleChange?: (style: 'color' | 'mono') => void;
  previewTheme?: PreviewThemeId;
  onPreviewThemeChange?: (theme: PreviewThemeId) => void;
  autoHideReadingCursor?: boolean;
  collapseControlsByDefault?: boolean;
  translationStatusStyle?: 'compact' | 'ai';
  previewToolbarMode?: 'overlay' | 'sticky';
  showInternalTranslationStatus?: boolean;
  onTranslationStateChange?: (isTranslating: boolean) => void;
}

export type PreviewThemeId = 'color-classic' | 'color-soft' | 'mono-clean' | 'mono-ink';
export const PREVIEW_THEME_LABELS: Record<PreviewThemeId, string> = {
  'color-classic': 'Color Classic',
  'color-soft': 'Color Soft',
  'mono-clean': 'Mono Clean',
  'mono-ink': 'Mono Ink',
};

export const ZenMarkdownPreview = ({
  content,
  height = '400px',
  onContentChange,
  showTextAI = false,
  onToggleTextAI,
  isTextAIDisabled = false,
  onPreviewStyleChange,
  previewTheme: externalPreviewTheme,
  onPreviewThemeChange,
  autoHideReadingCursor = false,
  collapseControlsByDefault = false,
  translationStatusStyle = 'compact',
  previewToolbarMode = 'overlay',
  showInternalTranslationStatus = true,
  onTranslationStateChange,
}: ZenMarkdownPreviewProps) => {
  const [zoom, setZoom] = useState(70);
  const [previewTheme, setPreviewTheme] = useState<PreviewThemeId>(externalPreviewTheme ?? 'mono-clean');
  const previewStyle: 'color' | 'mono' = previewTheme.startsWith('mono') ? 'mono' : 'color';
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [isReadingCursorHidden, setIsReadingCursorHidden] = useState(false);
  const [areControlsExpanded, setAreControlsExpanded] = useState(!collapseControlsByDefault);
  const readingCursorTimerRef = useRef<number | null>(null);

  const clearReadingCursorTimer = useCallback(() => {
    if (readingCursorTimerRef.current !== null) {
      window.clearTimeout(readingCursorTimerRef.current);
      readingCursorTimerRef.current = null;
    }
  }, []);

  const scheduleReadingCursorHide = useCallback(() => {
    if (!autoHideReadingCursor) return;
    clearReadingCursorTimer();
    readingCursorTimerRef.current = window.setTimeout(() => {
      setIsReadingCursorHidden(true);
    }, 1200);
  }, [autoHideReadingCursor, clearReadingCursorTimer]);

  const handleReadingActivity = useCallback(() => {
    if (!autoHideReadingCursor) return;
    setIsReadingCursorHidden(false);
    scheduleReadingCursorHide();
  }, [autoHideReadingCursor, scheduleReadingCursorHide]);

  useEffect(() => {
    if (!externalPreviewTheme) return;
    setPreviewTheme(externalPreviewTheme);
  }, [externalPreviewTheme]);

  useEffect(() => {
    setAreControlsExpanded(!collapseControlsByDefault);
  }, [collapseControlsByDefault]);

  useEffect(() => {
    if (areControlsExpanded) return;
    setShowLanguageMenu(false);
    setShowThemeMenu(false);
  }, [areControlsExpanded]);

  useEffect(() => {
    if (!autoHideReadingCursor) {
      setIsReadingCursorHidden(false);
      clearReadingCursorTimer();
      return;
    }

    scheduleReadingCursorHide();
    return clearReadingCursorTimer;
  }, [autoHideReadingCursor, content, scheduleReadingCursorHide, clearReadingCursorTimer]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const shouldHideZenCursor = autoHideReadingCursor && isReadingCursorHidden;
    document.body.classList.toggle('zen-cursor-force-hidden', shouldHideZenCursor);
    return () => {
      document.body.classList.remove('zen-cursor-force-hidden');
    };
  }, [autoHideReadingCursor, isReadingCursorHidden]);

  useEffect(() => {
    onTranslationStateChange?.(isTranslating);
  }, [isTranslating, onTranslationStateChange]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));
  const handleZoomReset = () => setZoom(70);
  const palettes = {
    'color-classic': {
      text: '#3a3a3a',
      heading: '#AC8E66',
      accent: '#D4AF78',
      subtle: '#C4A578',
      link: '#AC8E66',
      codeBg: '#e0dcd4',
      codeText: '#8b6914',
      codeBlockBg: '#2a2a2a',
      codeBlockText: '#e5e5e5',
      quoteBg: '#e8e4dc',
      quoteText: '#5a5a5a',
      tableHeadBg: '#1A1A1A',
      tableHeadText: '#AC8E66',
      tableCellBg: '#151515',
      tableCellText: '#e5e5e5',
      hr: '#3a3a3a',
    },
    'color-soft': {
      text: '#383838',
      heading: '#9C7A50',
      accent: '#B28E5F',
      subtle: '#8B7A63',
      link: '#9C7A50',
      codeBg: '#ece6db',
      codeText: '#7a5a20',
      codeBlockBg: '#22252d',
      codeBlockText: '#f1f1f1',
      quoteBg: '#eee8de',
      quoteText: '#505050',
      tableHeadBg: '#1A1A1A',
      tableHeadText: '#B28E5F',
      tableCellBg: '#151515',
      tableCellText: '#e8e8e8',
      hr: '#4a4a4a',
    },
    'mono-clean': {
      text: '#2b2b2b',
      heading: '#1f1f1f',
      accent: '#2b2b2b',
      subtle: '#4a4a4a',
      link: '#2b2b2b',
      codeBg: 'transparent',
      codeText: '#151515',
      codeBlockBg: 'transparent',
      codeBlockText: '#151515',
      quoteBg: '#e8e4dc',
      quoteText: '#4a4a4a',
      tableHeadBg: '#1A1A1A',
      tableHeadText: '#d9d4c5',
      tableCellBg: 'transparent',
      tableCellText: '#151515',
      hr: '#3a3a3a',
    },
    'mono-ink': {
      text: '#222222',
      heading: '#111111',
      accent: '#111111',
      subtle: '#3d3d3d',
      link: '#222222',
      codeBg: '#f1ece2',
      codeText: '#111111',
      codeBlockBg: '#151515',
      codeBlockText: '#e5e5e5',
      quoteBg: '#ebe6dc',
      quoteText: '#3f3f3f',
      tableHeadBg: '#151515',
      tableHeadText: '#dfd7c8',
      tableCellBg: '#f0ebdf',
      tableCellText: '#1f1f1f',
      hr: '#444',
    },
  } as const;

  const palette = palettes[previewTheme];
  const previewThemeOptions: Array<{ id: PreviewThemeId; label: string; baseStyle: 'color' | 'mono' }> = [
    { id: 'color-classic', label: PREVIEW_THEME_LABELS['color-classic'], baseStyle: 'color' },
    { id: 'color-soft', label: PREVIEW_THEME_LABELS['color-soft'], baseStyle: 'color' },
    { id: 'mono-clean', label: PREVIEW_THEME_LABELS['mono-clean'], baseStyle: 'mono' },
    { id: 'mono-ink', label: PREVIEW_THEME_LABELS['mono-ink'], baseStyle: 'mono' },
  ];

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

  const handleSelectTheme = (themeId: PreviewThemeId) => {
    setPreviewTheme(themeId);
    onPreviewThemeChange?.(themeId);
    const baseStyle = themeId.startsWith('mono') ? 'mono' : 'color';
    onPreviewStyleChange?.(baseStyle);
    setShowThemeMenu(false);
  };

  const getChildrenText = (children: ReactNode): string =>
    Children.toArray(children)
      .map((child) => {
        if (typeof child === 'string' || typeof child === 'number') return String(child);
        if (isValidElement(child)) {
          const nested = (child.props as { children?: ReactNode })?.children;
          return nested ? getChildrenText(nested) : '';
        }
        return '';
      })
      .join('')
      .trim();

  const handlePreviewScrollInteraction = useCallback(() => {
    if (areControlsExpanded) {
      setAreControlsExpanded(false);
    }
    setShowLanguageMenu(false);
    setShowThemeMenu(false);
  }, [areControlsExpanded]);

  const controlsPanel = (
    <div
      className="
        pointer-events-auto
        flex items-center gap-1
        px-[3px] py-[3px]
        rounded-[6px]
        bg-[#121212]/50 backdrop-blur
        border border-[#121212]
        shadow-[0_10px_30px_rgba(0,0,0,0.35)]
      "
    >
      <button
        onClick={() => setAreControlsExpanded((prev) => !prev)}
        className={`
           px-3 py-2 text-[10px] 
           h-[26.5px]
            font-mono tracking-wide text-[#666] border-b border-[#1F1F1F]
            active:translate-x-[-5px]
            disabled:opacity-50 disabled:cursor-not-allowed
          transition
          ${areControlsExpanded
            ? 'bg-[#1D1D1D] text-[#AC8E66] border-[#AC8E66]'
            : 'bg-[#171717] text-[#A0A0A0] border-[#2E2E2E] hover:text-[#AC8E66] hover:border-[#3A3328] hover:bg-[#1D1D1D]'
          }
        `}
        title={areControlsExpanded ? 'Leiste einklappen' : 'Leiste einblenden'}
        aria-label={areControlsExpanded ? 'Leiste einklappen' : 'Leiste einblenden'}
      >
        <FontAwesomeIcon icon={faBarsProgress} className="text-[10px]" />
      </button>

      {areControlsExpanded && (
        <>
          {onToggleTextAI && (
            <button
              onClick={onToggleTextAI}
              disabled={isTextAIDisabled}
              className={`
                h-10 px-3
                inline-flex items-center justify-center gap-1.5
                rounded-lg
                border
                font-mono text-[10px]
                transition
                active:translate-y-[1px]
                disabled:opacity-50 disabled:cursor-not-allowed
                ${showTextAI
                  ? 'bg-[#1D1D1D] text-[#AC8E66] border-[#AC8E66]'
                  : 'bg-[#171717] text-[#A0A0A0] border-[#2E2E2E] hover:text-[#AC8E66] hover:border-[#3A3328] hover:bg-[#1D1D1D]'
                }
              `}
              title="Text-AI"
            >
              <FontAwesomeIcon icon={faWandMagicSparkles} className="text-[10px]" />
              <span>Text-AI</span>
            </button>
          )}

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
                  <div className="px-3 py-2 text-[10px] font-mono tracking-wide text-[#666] border-b border-[#1F1F1F]">
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

          <div className="w-px h-7 bg-[#232323] mx-1" />

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

          <div className="w-px h-7 bg-[#232323] mx-1" />

          <div className="relative">
            <button
              onClick={() => setShowThemeMenu((prev) => !prev)}
              className={`
                h-9 min-w-[52px] px-2
                inline-flex items-center justify-center gap-1
                rounded-lg
                border
                font-mono text-[10px]
                active:translate-y-[1px]
                transition
                ${previewStyle === 'mono'
                  ? 'bg-[#1D1D1D] text-[#AC8E66] border-[#AC8E66]'
                  : 'bg-[#171717] text-[#A0A0A0] border-[#2E2E2E] hover:text-[#AC8E66] hover:border-[#3A3328] hover:bg-[#1D1D1D]'
                }
              `}
              title={`Preview-Theme: ${previewTheme}`}
            >
              <span>{previewStyle === 'color' ? 'C' : 'M'}</span>
            </button>

            {showThemeMenu && (
              <div
                className="
                  absolute top-11 right-0
                  min-w-[170px]
                  overflow-hidden
                  rounded-xl
                  bg-[#121212]
                  border border-[#2E2E2E]
                  shadow-[0_16px_40px_rgba(0,0,0,0.55)]
                  z-20
                "
              >
                <div className="px-3 py-2 text-[10px] font-mono tracking-wide text-[#666] border-b border-[#1F1F1F]">
                  Theme wählen
                </div>
                {previewThemeOptions.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => handleSelectTheme(theme.id)}
                    className={`
                      w-full px-4 py-2.5 text-left text-[10px] font-mono transition-colors
                      ${previewTheme === theme.id
                        ? 'bg-[#1A1A1A] text-[#AC8E66]'
                        : 'text-[#dbd9d5] hover:bg-[#1A1A1A] hover:text-[#AC8E66]'
                      }
                    `}
                  >
                    {theme.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="w-full relative">
      {previewToolbarMode === 'overlay' && (
        <div
          className="absolute z-[45] flex items-center"
          style={{ top: 50, right: 14, transformOrigin: 'top right' }}
        >
          {controlsPanel}
        </div>
      )}


      {/* Translation Status */}
      {showInternalTranslationStatus && isTranslating && (
        translationStatusStyle === 'ai' ? (
          <div
            className="absolute z-[46] flex items-center justify-center"
            style={{ top: 108, left: '50%', transform: 'translateX(-50%)' }}
          >
            <div className="flex items-center gap-1 px-[10px] py-[8px] 
            rounded-[10px] border border-[#3A3328] 
            bg-[#151515]/95 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
              <FontAwesomeIcon icon={faSpinner} 
              className="text-[#AC8E66] text-[13px] animate-spin items-center" />
              <p className="
              text-[#AC8E66] 
              text-[12px] 
              font-mono 
              tracking-wide">AI verarbeitet... Translator</p>
            </div>
          </div>
        ) : (
          <div
            className="absolute z-[46] bg-[#1A1A1A] border border-[#AC8E66] rounded rounded-[12px] px-[12px] py-[2px]"
            style={{ top: 16, left: 10, scale: 0.75, transformOrigin: 'top left' }}
          >
            <p className="text-[#AC8E66] text-[9px] font-mono">Übersetze...</p>
          </div>
        )
      )}

      {/* Translation Error */}
      {translateError && (
        <div
          className="absolute z-[46] bg-[#1A1A1A] border border-red-500 rounded-lg px-3 py-1"
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
          cursor: autoHideReadingCursor && isReadingCursorHidden ? 'none' : 'auto',
        }}
        onMouseMove={handleReadingActivity}
        onMouseDown={handleReadingActivity}
        onWheel={() => {
          handleReadingActivity();
          handlePreviewScrollInteraction();
        }}
        onScroll={handlePreviewScrollInteraction}
        onTouchMove={handlePreviewScrollInteraction}
        onTouchStart={handleReadingActivity}
        onMouseLeave={() => setIsReadingCursorHidden(false)}
      >
        {previewToolbarMode === 'sticky' && (
          <div className="sticky top-[10px] z-[45] mb-[8px] flex justify-end pr-[8px]">
            {controlsPanel}
          </div>
        )}

        <div
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top left',
            width: `${100 / (zoom / 100)}%`,
            fontFamily: 'IBM Plex Mono, monospace',
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeHighlight]}
            components={{
              // Custom styling for markdown elements
              h1: ({ node, ...props }) => (
                <h1 className="text-3xl font-bold mb-4" style={{ color: palette.heading }} {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-2xl font-bold mb-3 mt-6" style={{ color: palette.accent }} {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-xl font-bold mb-2 mt-4" style={{ color: palette.subtle }} {...props} />
              ),
              h4: ({ node, ...props }) => (
                <h4 className="text-lg font-bold mb-2 mt-3" style={{ color: palette.subtle }} {...props} />
              ),
              h5: ({ node, ...props }) => (
                <h5 className="text-base font-bold mb-2 mt-3" style={{ color: palette.subtle }} {...props} />
              ),
              h6: ({ node, ...props }) => (
                <h6 className="text-sm font-bold mb-2 mt-3" style={{ color: palette.subtle }} {...props} />
              ),
              p: ({ node, ...props }) => (
                <p
                  className="leading-relaxed"
                  style={{ color: palette.text, marginTop: 0, marginBottom: '3.15em' }}
                  {...props}
                />
              ),
              br: ({ node, ...props }) => (
                <br {...props} style={{ display: 'block', marginBottom: '0.45em' }} />
              ),
              a: ({ node, ...props }) => (
                (() => {
                  const href = props.href || '#';
                  const rawText = getChildrenText(props.children as ReactNode);
                  const isCta = /^CTA:\s*/i.test(rawText);
                  const label = rawText.replace(/^CTA:\s*/i, '').trim() || 'Mehr erfahren';

                  if (isCta) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-lg px-4 py-2 font-bold no-underline transition"
                        style={{
                          marginTop: '0.4rem',
                          marginBottom: '1rem',
                          background: previewStyle === 'mono' ? '#2b2b2b' : '#AC8E66',
                          color: '#f5f1e8',
                          border: `1px solid ${previewStyle === 'mono' ? '#444' : '#8f7452'}`,
                        }}
                      >
                        {label}
                      </a>
                    );
                  }

                  return (
                    <a
                      className="underline transition-colors"
                      style={{ color: palette.link }}
                      {...props}
                    />
                  );
                })()
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc list-inside mb-6 space-y-2" style={{ color: palette.text }} {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal list-inside mb-6 space-y-2" style={{ color: palette.text }} {...props} />
              ),
              li: ({ node, children, ...props }) => (
                <li className="ml-4" style={{ color: palette.text }} {...props}>
                  {typeof children === 'object' && children !== null && !Array.isArray(children)
                    ? JSON.stringify(children)
                    : children}
                </li>
              ),
              blockquote: ({ node, ...props }) => (
                <blockquote
                  className="border-l-4 pl-4 py-2 my-4 italic"
                  style={{ borderColor: palette.heading, background: palette.quoteBg, color: palette.quoteText }}
                  {...props}
                />
              ),
              code: ({ node, className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !match;

                if (isInline) {
                  return (
                    <code
                      className="px-1.5 py-0.5 rounded font-mono text-sm"
                      style={{ background: palette.codeBg, color: palette.codeText }}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }

                return (
                  <code
                    className={className}
                    style={{
                      background: 'transparent',
                      color: palette.codeBlockText,
                      padding: 0,
                      display: 'block',
                    }}
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              u: ({ node, ...props }) => (
                <u style={{ textDecorationThickness: '1.5px', textUnderlineOffset: '2px' }} {...props} />
              ),
              ins: ({ node, ...props }) => (
                <ins style={{ textDecorationThickness: '1.5px', textUnderlineOffset: '2px' }} {...props} />
              ),
              pre: ({ node, ...props }) => (
                <pre
                  className="rounded-lg p-4 mb-4 overflow-x-auto text-sm"
                  style={{
                    background: palette.codeBlockBg,
                    border: `1px solid ${palette.heading}`,
                    color: palette.codeBlockText,
                  }}
                  {...props}
                />
              ),
              table: ({ node, ...props }) => (
                <div className="overflow-x-auto mb-4">
                  <table
                    className="min-w-full border-collapse"
                    style={{ border: `1px solid ${palette.hr}` }}
                    {...props}
                  />
                </div>
              ),
              thead: ({ node, ...props }) => (
                <thead style={{ background: palette.tableHeadBg }} {...props} />
              ),
              th: ({ node, ...props }) => (
                <th
                  className="px-4 py-2 text-left font-bold"
                  style={{ border: `1px solid ${palette.hr}`, color: palette.tableHeadText }}
                  {...props}
                />
              ),
              td: ({ node, ...props }) => (
                <td
                  className="px-4 py-2"
                  style={{
                    border: `1px solid ${palette.hr}`,
                    color: palette.tableCellText,
                    background: palette.tableCellBg,
                  }}
                  {...props}
                />
              ),
              hr: ({ node, ...props }) => (
                <hr className="my-6" style={{ borderColor: palette.hr }} {...props} />
              ),
              strong: ({ node, ...props }) => (
                <strong className="font-bold" style={{ color: palette.heading }} {...props} />
              ),
              em: ({ node, ...props }) => (
                <em className="italic text-[20px]" style={{ color: palette.accent }} {...props} />
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
