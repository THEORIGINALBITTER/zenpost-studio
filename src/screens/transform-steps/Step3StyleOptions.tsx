import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faWandMagicSparkles, faArrowRight, faCompress, faCode, faBriefcase, faWrench, faBolt, faPenNib, faEdit, faMagnifyingGlass, faSpinner, faCopy } from '@fortawesome/free-solid-svg-icons';
import { ZenDropdown } from '../../kits/PatternKit/ZenModalSystem';
import { ZenSubtitleDark } from '../../kits/PatternKit/ZenSubtitleDark';
import { ZenBackButton } from '../../kits/DesignKit/ZenBackButton';

import { ContentTone, ContentLength, ContentAudience, ContentPlatform, TargetLanguage, type ImprovementStyle, generateSEOData, type SEOData } from '../../services/aiService';

interface Step3StyleOptionsProps {
  selectedPlatform: ContentPlatform;
  platformLabel: string;
  selectedPlatforms?: ContentPlatform[];
  platformLabels?: string[];
  multiPlatformMode?: boolean;
  styleMode?: 'global' | 'platform';
  onStyleModeChange?: (mode: 'global' | 'platform') => void;
  activeStylePlatform?: ContentPlatform;
  stylePlatformOptions?: Array<{ value: ContentPlatform; label: string }>;
  onActiveStylePlatformChange?: (platform: ContentPlatform) => void;
  onApplyCurrentStyleToAll?: () => void;

  tone: ContentTone;
  length: ContentLength;
  audience: ContentAudience;
  targetLanguage?: TargetLanguage;

  onToneChange: (tone: ContentTone) => void;
  onLengthChange: (length: ContentLength) => void;
  onAudienceChange: (audience: ContentAudience) => void;
  onTargetLanguageChange?: (language: TargetLanguage) => void;
  analysisContent?: string;

  onBack: () => void;
  onBackToEditor: () => void;
  onTransform: () => void;
  onPostDirectly: () => void;
  onQuickAction?: (action: 'improve' | 'continue' | 'summarize' | 'markdown', improveStyle?: ImprovementStyle, customInstruction?: string) => void;
  isQuickActionRunning?: boolean;
  allowEmoji?: boolean;
  onAllowEmojiChange?: (allow: boolean) => void;
  seoData?: SEOData | null;
  onSeoDataChange?: (data: SEOData | null) => void;
  onApplySeoDataToPostMeta?: (data: SEOData) => void;

  isTransforming: boolean;
  isPosting: boolean;
  error: string | null;
  sourceContent?: string;
  sourceTitle?: string;
}

const toneOptions = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'technical', label: 'Technical' },
  { value: 'enthusiastic', label: 'Enthusiastic' },
];

const lengthOptions = [
  { value: 'short', label: 'Kurz (1-2 Absätze)' },
  { value: 'medium', label: 'Mittel (3-5 Absätze)' },
  { value: 'long', label: 'Lang (Artikel)' },
];

const audienceOptions = [
  { value: 'beginner', label: 'Anfänger' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'expert', label: 'Experten' },
];

const languageOptions = [
  { value: 'deutsch', label: 'Deutsch' },
  { value: 'english', label: 'English' },
  { value: 'español', label: 'Español' },
  { value: 'français', label: 'Français' },
  { value: 'italiano', label: 'Italiano' },
  { value: 'português', label: 'Português' },
  { value: '中文', label: '中文' },
  { value: '日本語', label: '日本語' },
  { value: '한국어', label: '한국어' },
];

function join(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(' ');
}

export const Step3StyleOptions = ({
  selectedPlatform: _selectedPlatform,
  platformLabel,
  selectedPlatforms,
  platformLabels,
  multiPlatformMode,
  styleMode = 'global',
  onStyleModeChange,
  activeStylePlatform,
  stylePlatformOptions = [],
  onActiveStylePlatformChange,


  tone,
  length,
  audience,
  targetLanguage,

  onToneChange,
  onLengthChange,
  onAudienceChange,
  onTargetLanguageChange,
  analysisContent,

  onBack: _onBack,
  onBackToEditor,
  onTransform,
  onPostDirectly: _onPostDirectly,
  onQuickAction,
  isQuickActionRunning = false,
  allowEmoji = true,
  onAllowEmojiChange,
  seoData,
  onSeoDataChange,
  onApplySeoDataToPostMeta,

  isTransforming,
  isPosting: _isPosting,
  error,
  sourceContent = '',
  sourceTitle = '',
}: Step3StyleOptionsProps) => {
  const [changedOptions, setChangedOptions] = useState<Set<string>>(new Set());
  const [showCustomImproveInput, setShowCustomImproveInput] = useState(false);
  const [customImproveInstruction, setCustomImproveInstruction] = useState('');
  const [showCustomizerMenu, setShowCustomizerMenu] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [seoLoading, setSeoLoading] = useState(false);
  const [seoError, setSeoError] = useState<string | null>(null);
  const [seoCopied, setSeoCopied] = useState<string | null>(null);
  const cardWidth = 220;

  const handleSeoGenerate = async () => {
    const contentToAnalyze = (analysisContent ?? sourceContent).trim();
    if (!contentToAnalyze) {
      setSeoError('Kein Inhalt für die SEO-Analyse vorhanden.');
      return;
    }
    setSeoLoading(true);
    setSeoError(null);
    onSeoDataChange?.(null);
    const result = await generateSEOData(sourceTitle, contentToAnalyze);
    if (result.success && result.data) {
      onSeoDataChange?.(result.data);
    } else {
      setSeoError(result.error || 'Fehler bei der SEO-Generierung.');
    }
    setSeoLoading(false);
  };

  const copySeo = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setSeoCopied(key);
    setTimeout(() => setSeoCopied(null), 1800);
  };
  const cardGap = 32;
  const cardsRowWidth = cardWidth * 4 + cardGap * 3;

  const markAsChanged = (option: string) => {
    setChangedOptions((prev) => new Set([...prev, option]));
  };

  const isChanged = (option: string) => changedOptions.has(option);
  const showModeSwitch = multiPlatformMode && (selectedPlatforms?.length ?? 0) > 1;
  const sharedSectionWidth = '80%';

  const displayPlatformLabel =
    multiPlatformMode && platformLabels && platformLabels.length > 0
      ? platformLabels.join(', ')
      : platformLabel;
  const parsedError = (() => {
    if (!error) return null;
    const start = error.indexOf('(');
    const end = error.lastIndexOf(')');

    if (start === -1 || end === -1 || end <= start) {
      return { headline: error, items: [] as string[] };
    }

    const headline = error.slice(0, start).trim();
    const details = error.slice(start + 1, end);
    const items = details
      .split('|')
      .map((item) => item.trim())
      .filter(Boolean);

    return { headline, items };
  })();

  const Card = ({
    optionKey,
    title,
    children,
  }: {
    optionKey: 'tone' | 'length' | 'audience' | 'language';
    title: string;
    children: React.ReactNode;
  }) => {
    const changed = isChanged(optionKey);

    return (
      <div
        className={join(
          'relative rounded-[12px] border border-dotted bg-transparent transition-all p-6',
          changed
            ? 'border-[#AC8E66] bg-[#ebe8df]'
            : 'border-[#4a4a4a] hover:border-[#AC8E66]/50 hover:border-solid'
        )}
        style={{
          width: `${cardWidth}px`,
          boxSizing: 'border-box',
          minHeight: '100px',
          padding: '20px',
        }}
      >
        <div className="absolute top-3 left-3">
          <div
            className={join(
              'w-4 h-4 aspect-square box-border rounded-full border-2 flex items-center justify-center transition-all',
              changed
                ? 'border-[#1a1a1a] border-[1px] p-[2px] bg-transparent'
                : 'border-[#1a1a1a] bg-transparent'
            )}
          >
            {changed && (
              <FontAwesomeIcon icon={faCheck} className="text-[#1A1A1A] text-[12px]" />
            )}
          </div>
        </div>

        <p className="font-mono text-[10px] text-[#1a1a1a] mb-3 text-center">{title}</p>

        <div className="flex items-center justify-center w-full">
          {children}
        </div>
      </div>
    );
  };

  const improveOptions: Array<{ style: ImprovementStyle; label: string; desc: string; icon: any }> = [
    { style: 'charming', label: 'Mehr Charme', desc: 'Persönlicher & einladender', icon: faWandMagicSparkles },
    { style: 'professional', label: 'Professioneller', desc: 'Formell & business-gerecht', icon: faBriefcase },
    { style: 'technical', label: 'Technischer', desc: 'Präzise & detailliert', icon: faWrench },
    { style: 'concise', label: 'Kürzer & knapper', desc: 'Auf den Punkt gebracht', icon: faBolt },
    { style: 'general', label: 'Allgemein', desc: 'Grammatik & Lesbarkeit', icon: faPenNib },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-[20px] ">
      <div style={{ position: 'absolute', top: '120px', left: '150px' }}>
        <ZenBackButton onClick={onBackToEditor} />
      </div>

      <div className="flex flex-col items-center w-full" style={{ maxWidth: '1320px' }}>
        <div className="flex flex-col items-center  mb-6">
          <p className="font-mono text-[12px] text-center">
            <span className="text-[#1a1a1a]">AI Einstellungen:</span>
            <span className="text-[#1a1a1a]"> {displayPlatformLabel}</span>
          </p>




          <div className="max-w-4xl 
          p-[20px] 
          border-[0.5px] border-[#2525258a] rounded-[12px]
          
          "
          style={{ width: sharedSectionWidth }}
          >
            <ZenSubtitleDark className="text-center">
              Passe die KI-Einstellungen an, um den Stil deines Beitrags zu beeinflussen.
              <br />
              Je nachdem, wie du die Optionen einstellst,
              <br />
              kann die KI deinen Beitrag z.B. kürzer oder länger machen.
            </ZenSubtitleDark>

              {showModeSwitch && (
          <div className="w-full max-w-[740px] mb-[12px] gap-2">
            <div className="flex justify-center mb-3">
              <button
                type="button"
                onClick={() => onStyleModeChange?.('platform')}
                className={join(
                  'rounded-lg border px-[10px] py-[8px] text-[11px] font-mono transition',
                  styleMode === 'platform'
                    ? 'border-[#AC8E66] text-[#1a1a1a] bg-[transparent]'
                    : 'border-[#4a4a4a] text-[#6a6a6a] bg-transparent hover:border-[#AC8E66]/50'
                )}
              >
                Pro Plattform
              </button>
              <button
                type="button"
                onClick={() => onStyleModeChange?.('global')}
                style={{ marginLeft: '16px' }}
                className={join(
                  'rounded-lg border px-3 py-2 text-[11px] font-mono transition',
                  styleMode === 'global'
                    ? 'border-[#AC8E66] text-[#1a1a1a] bg-[transparent]'
                    : 'border-[#4a4a4a] text-[#6a6a6a] bg-transparent hover:border-[#AC8E66]/50'
                )}
              >
                Für alle gleich
              </button>
            </div>
            <div className=' pt-[30px] '>

            {styleMode === 'platform' && (
              <div className="flex items-center gap-2 text-[10px]">
                <div className="flex-1">
                  <ZenDropdown
                    label="Plattform"
                    value={activeStylePlatform || stylePlatformOptions[0]?.value || ''}
                    onChange={(value) => onActiveStylePlatformChange?.(value as ContentPlatform)}
                    options={stylePlatformOptions}
                    fullWidth
                    theme="paper"
                  />
                </div>

             
              </div>
            )}
          </div>
          </div>
        )}
          </div>
        </div>

      

        {showCustomizerMenu && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(4, ${cardWidth}px)`,
              columnGap: `${cardGap}px`,
              rowGap: '28px',
              width: `${cardsRowWidth}px`,
              maxWidth: '100%',
              marginTop: showModeSwitch ? '10px' : '20px',
              marginBottom: '40px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
          <Card optionKey="tone" title="Tonalität">
            <ZenDropdown
              label="" /* Titel kommt aus Card */
              value={tone}
              onChange={(value) => {
                markAsChanged('tone');
                onToneChange(value as ContentTone);
              }}
              options={toneOptions}
              fullWidth
              theme="paper"
             
            />
          </Card>

          <Card optionKey="length" title="Länge">
            <ZenDropdown
              label=""
              value={length}
              onChange={(value) => {
                markAsChanged('length');
                onLengthChange(value as ContentLength);
              }}
              options={lengthOptions}
              fullWidth
              theme="paper"
            />
          </Card>

          <Card optionKey="audience" title="Zielgruppe">
            <ZenDropdown
              label=""
              value={audience}
              onChange={(value) => {
                markAsChanged('audience');
                onAudienceChange(value as ContentAudience);
              }}
              options={audienceOptions}
              fullWidth
              theme="paper"
            />
          </Card>

          <Card optionKey="language" title="Sprache">
            <ZenDropdown
              label=""
              value={targetLanguage || 'deutsch'}
              onChange={(value) => {
                markAsChanged('language');
                onTargetLanguageChange?.(value as TargetLanguage);
              }}
              options={languageOptions}
              fullWidth
              theme="paper"
            />
          </Card>
          </div>
        )}

        <div
          style={{
            width: sharedSectionWidth,
            border: '0.5px dotted #4a4a4a',
            borderRadius: '12px',
            padding: '12px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="font-mono text-[11px] text-[#3a3a3a]">Text-AI</span>
            </div>
            <label className="font-mono text-[10px] text-[#3a3a3a]" style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={!allowEmoji}
                onChange={(e) => onAllowEmojiChange?.(!e.target.checked)}
              />
              Keine Emojis
            </label>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
              gap: '10px',
            }}
          >
            <ZenDropdown
              value=""
              onChange={() => { /* handled via custom menu */ }}
              options={[]}
              disabled={!onQuickAction || isQuickActionRunning}
              fullWidth
              variant="button"
              theme="dark"
              triggerLabel="Text verbessern"
              triggerIcon={<FontAwesomeIcon icon={faWandMagicSparkles} style={{ color: '#AC8E66', fontSize: 18 }} />}
              triggerLayout="column"
              showCaret={false}
              triggerStyle={{
                minHeight: 72,
                borderRadius: 12,
                border: '1px solid #4a4a4a',
                background: 'transparent',
                color: '#2f2f2f',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 12,
              }}
              customMenuContent={(closeMenu) => (
                <div
                  style={{
                    backgroundColor: '#d0cbb8',
                    border: '1px solid rgba(172,142,102,0.35)',
                    borderRadius: '12px',
                    padding: '10px',
                    width: '520px',
                    maxWidth: '92vw',
                    boxShadow: '0 10px 24px rgba(0,0,0,0.32)',
                  }}
                >
                  <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#1a1a1a', margin: '0 0 10px 0', textAlign: 'center' }}>
                    Wie soll verbessert werden?
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                    {improveOptions.map((option) => (
                      <button
                        key={option.style}
                        type="button"
                        onClick={() => {
                          closeMenu();
                          onQuickAction?.('improve', option.style);
                        }}
                        disabled={!onQuickAction || isQuickActionRunning}
                        style={{
                          width: '100%',
                          minHeight: 72,
                          padding: '10px 12px',
                          backgroundColor: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(172,142,102,0.16)',
                          borderRadius: '10px',
                          textAlign: 'left',
                          ...(option.style === 'general' ? { gridColumn: '1 / -1' } : {}),
                        }}
                      >
                        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#252525', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FontAwesomeIcon icon={option.icon} style={{ color: '#AC8E66', fontSize: '12px' }} />
                          <span>{option.label}</span>
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#353535', marginTop: '3px' }}>{option.desc}</div>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCustomImproveInput((prev) => !prev)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      marginTop: '8px',
                      backgroundColor: showCustomImproveInput ? 'rgba(172,142,102,0.14)' : 'rgba(255,255,255,0.02)',
                      border: showCustomImproveInput ? '1px solid rgba(172,142,102,0.55)' : '1px solid rgba(172,142,102,0.18)',
                      borderRadius: '8px',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#252525' }}>
                      <FontAwesomeIcon icon={faEdit} style={{ fontSize: '10px', color: '#AC8E66', marginRight: '8px' }} />
                      Eigene Anweisung
                    </div>
                  </button>

                  {showCustomImproveInput && (
                    <div style={{ marginTop: '8px' }}>
                      <textarea
                        value={customImproveInstruction}
                        onChange={(e) => setCustomImproveInstruction(e.target.value)}
                        placeholder="Wie soll der Text verbessert werden?"
                        style={{
                          width: '100%',
                          minHeight: '72px',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(172,142,102,0.4)',
                          background: '#d8d3c2',
                          color: '#1a1a1a',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '11px',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!customImproveInstruction.trim()) return;
                          closeMenu();
                          onQuickAction?.('improve', 'custom', customImproveInstruction.trim());
                          setCustomImproveInstruction('');
                          setShowCustomImproveInput(false);
                        }}
                        disabled={!customImproveInstruction.trim() || isQuickActionRunning}
                        style={{
                          marginTop: '8px',
                          width: '100%',
                          padding: '8px',
                          borderRadius: '8px',
                          border: '1px solid #AC8E66',
                          backgroundColor: customImproveInstruction.trim() ? '#AC8E66' : 'transparent',
                          color: customImproveInstruction.trim() ? '#1A1A1A' : '#777',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '11px',
                        }}
                      >
                        Anwenden
                      </button>
                    </div>
                  )}
                </div>
              )}
            />
            <button
              type="button"
              onClick={() => onQuickAction?.('continue')}
              disabled={!onQuickAction || isQuickActionRunning}
              style={{
                minHeight: 72,
                borderRadius: 12,
                border: '1px solid #4a4a4a',
                background: 'transparent',
                color: '#2f2f2f',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 12,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
                opacity: !onQuickAction || isQuickActionRunning ? 0.6 : 1,
                cursor: !onQuickAction || isQuickActionRunning ? 'not-allowed' : 'pointer',
              }}
            >
              <FontAwesomeIcon icon={faArrowRight} style={{ color: '#AC8E66', fontSize: 18 }} />
              <span>Text fortsetzen</span>
            </button>
            <button
              type="button"
              onClick={() => onQuickAction?.('summarize')}
              disabled={!onQuickAction || isQuickActionRunning}
              style={{
                minHeight: 72,
                borderRadius: 12,
                border: '1px solid #4a4a4a',
                background: 'transparent',
                color: '#2f2f2f',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 12,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
                opacity: !onQuickAction || isQuickActionRunning ? 0.6 : 1,
                cursor: !onQuickAction || isQuickActionRunning ? 'not-allowed' : 'pointer',
              }}
            >
              <FontAwesomeIcon icon={faCompress} style={{ color: '#AC8E66', fontSize: 18 }} />
              <span>Zusammenfassen</span>
            </button>
            <button
              type="button"
              onClick={() => onQuickAction?.('markdown')}
              disabled={!onQuickAction || isQuickActionRunning}
              style={{
                minHeight: 72,
                borderRadius: 12,
                border: '1px solid #4a4a4a',
                background: 'transparent',
                color: '#2f2f2f',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 12,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
                opacity: !onQuickAction || isQuickActionRunning ? 0.6 : 1,
                cursor: !onQuickAction || isQuickActionRunning ? 'not-allowed' : 'pointer',
              }}
            >
              <FontAwesomeIcon icon={faCode} style={{ color: '#AC8E66', fontSize: 18 }} />
              <span>Markdown-Format</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCustomizerMenu((prev) => !prev)}
              style={{
                minHeight: 72,
                borderRadius: 12,
                border: showCustomizerMenu ? '1px solid #AC8E66' : '1px solid #4a4a4a',
                background: showCustomizerMenu ? '#efe7da' : 'transparent',
                color: '#2f2f2f',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 12,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
            >
              <FontAwesomeIcon icon={faWrench} style={{ color: '#AC8E66', fontSize: 18 }} />
              <span>Customizer-Menü</span>
            </button>
          </div>
        </div>

        <div
          style={{
            width: sharedSectionWidth,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <button
            type="button"
            onClick={onBackToEditor}
            disabled={isTransforming}
            className="rounded-lg border border-[#4a4a4a] bg-transparent px-4 py-2 text-[11px] font-mono text-[#3a3a3a] transition hover:border-[#AC8E66]/70"
            style={{ opacity: isTransforming ? 0.6 : 1, cursor: isTransforming ? 'not-allowed' : 'pointer' }}
          >
            Zurück zum Editor
          </button>
          <button
            type="button"
            onClick={onTransform}
            disabled={isTransforming}
            className="rounded-lg border border-[#AC8E66] bg-[#efe7da] px-4 py-2 text-[11px] font-mono text-[#2f2a22] transition hover:bg-[#e6ddcf]"
            style={{ opacity: isTransforming ? 0.6 : 1, cursor: isTransforming ? 'not-allowed' : 'pointer', fontWeight: 600 }}
          >
            {isTransforming ? 'Transformiere...' : 'Neu transformieren'}
          </button>
        </div>

        {/* ── SEO Assistent ── */}
        <div style={{ width: sharedSectionWidth, marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => setSeoOpen((v) => !v)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              borderRadius: seoOpen ? '12px 12px 0 0' : 12,
              border: '1px solid',
              borderColor: seoOpen ? '#4a9a6a' : '#4a4a4a',
              background: seoOpen ? '#e8f5ee' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FontAwesomeIcon icon={faMagnifyingGlass} style={{ color: '#3a8a5a', fontSize: 13 }} />
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#1a3a2a', fontWeight: 600 }}>SEO Assistent</span>
            </div>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#5a8a6a' }}>
              {seoOpen ? '▲ schließen' : '▼ öffnen'}
            </span>
          </button>

          {seoOpen && (
            <div style={{ border: '1px solid #4a9a6a', borderTop: 'none', borderRadius: '0 0 12px 12px', background: '#f2faf5', padding: 16 }}>
              {/* Generate Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#3a6a4a' }}>
                  Claude analysiert Titel + Inhalt
                </p>
                <button
                  type="button"
                  disabled={seoLoading || !(analysisContent ?? sourceContent).trim()}
                  onClick={() => void handleSeoGenerate()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 8,
                    border: '1px solid #4a9a6a', background: '#e0f2e8',
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600, color: '#1a5a30',
                    cursor: seoLoading || !(analysisContent ?? sourceContent).trim() ? 'not-allowed' : 'pointer',
                    opacity: seoLoading || !(analysisContent ?? sourceContent).trim() ? 0.6 : 1,
                  }}
                >
                  <FontAwesomeIcon icon={seoLoading ? faSpinner : faMagnifyingGlass} className={seoLoading ? 'animate-spin' : ''} />
                  {seoLoading ? 'Analysiere …' : 'Generieren'}
                </button>
              </div>

              {seoError && (
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#a03020', background: '#fdf0ec', border: '1px solid #e0b0a0', borderRadius: 8, padding: '6px 10px', marginBottom: 10 }}>{seoError}</p>
              )}

              {seoData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Google SERP Preview */}
                  <div style={{ background: 'white', border: '1px solid #c8e4d4', borderRadius: 8, padding: '10px 12px' }}>
                    <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4a8060', letterSpacing: '0.1em', marginBottom: 4 }}>GOOGLE VORSCHAU</p>
                    <p style={{ fontSize: 13, color: '#1a0dab', marginBottom: 1 }}>{seoData.seo_title}</p>
                    <p style={{ fontSize: 11, color: '#006621', marginBottom: 2 }}>denisbitter.de</p>
                    <p style={{ fontSize: 11, color: '#545454', lineHeight: 1.5 }}>{seoData.meta_description}</p>
                  </div>

                  {/* SEO Title */}
                  {[
                    { key: 'seo_title', label: 'SEO Titel', value: seoData.seo_title, max: 60 },
                    { key: 'meta_description', label: 'Meta Description', value: seoData.meta_description, max: 155 },
                    { key: 'og_title', label: 'Social Titel (OG)', value: seoData.og_title, max: 70 },
                  ].map(({ key, label, value, max }) => (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, fontWeight: 600, color: '#287848' }}>{label}</span>
                        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: value.length > max ? '#c0392b' : '#5a8a6a' }}>{value.length}/{max}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          value={value}
                          readOnly
                          style={{ flex: 1, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, border: '1px solid #b8dcc8', borderRadius: 6, padding: '5px 8px', background: 'white', color: '#1a2e20', outline: 'none' }}
                        />
                        <button
                          type="button"
                          onClick={() => copySeo(value, key)}
                          style={{ flexShrink: 0, padding: '5px 8px', borderRadius: 6, border: '1px solid #b8dcc8', background: seoCopied === key ? '#d0f0dc' : 'white', cursor: 'pointer' }}
                          title="Kopieren"
                        >
                          <FontAwesomeIcon icon={seoCopied === key ? faCheck : faCopy} style={{ fontSize: 11, color: seoCopied === key ? '#287848' : '#5a8a6a' }} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Keywords */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, fontWeight: 600, color: '#287848' }}>Keywords</span>
                      <button type="button" onClick={() => copySeo(seoData.keywords.join(', '), 'keywords')} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#5a8a6a', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                        {seoCopied === 'keywords' ? 'Kopiert ✓' : 'Alle kopieren'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {seoData.keywords.map((kw) => (
                        <span key={kw} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, padding: '3px 8px', borderRadius: 999, border: '1px solid #b8dcc8', background: '#edf7f0', color: '#287848' }}>{kw}</span>
                      ))}
                    </div>
                  </div>

                  {onApplySeoDataToPostMeta && (
                    <button
                      type="button"
                      onClick={() => onApplySeoDataToPostMeta(seoData)}
                      style={{
                        alignSelf: 'flex-start',
                        padding: '7px 12px',
                        borderRadius: 8,
                        border: '1px solid #4a9a6a',
                        background: '#e0f2e8',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#1a5a30',
                        cursor: 'pointer',
                      }}
                      title="SEO-Daten direkt in die Post-Metadaten übernehmen"
                    >
                      Post-Metadaten befüllen
                    </button>
                  )}
                </div>
              )}

              {!seoData && !seoLoading && !seoError && (
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#7ab898', textAlign: 'center', padding: '8px 0' }}>
                  Auf „Generieren" klicken um SEO-Daten zu erstellen.
                </p>
              )}
            </div>
          )}
        </div>

        {error && (
          <div
            className="w-full mt-2 mb-5 px-4 py-4 text-center"
            style={{
              width: sharedSectionWidth,
              borderRadius: '12px',
              borderWidth: '0.5px',
              borderStyle: 'dotted',
              borderColor: '#d88aa0',
                           backgroundColor: 'rgba(248, 220, 230, 0.15)',

            }}
          >
            <p className="font-mono text-[12px]" style={{ color: '#b04366' }}>
              {parsedError?.headline}
            </p>
            <span className="pt-[5px]"></span>

            {parsedError && parsedError.items.length > 0 && (
              <div style={{ marginTop: '10px', paddingLeft: '20px', paddingRight: '20px' }}>
                <ul
                  className="font-mono text-[11px]"
                  style={{ color: '#1a1a1a', listStyleType: 'number', textAlign: 'center', paddingLeft: '18px', margin: 0 }}
                >
                  {parsedError.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {(error.includes('kurz') ||
              error.includes('leer') ||
              error.includes('empty') ||
              error.includes('short')) && (
              <div className="mt-4 flex justify-center">
                
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
