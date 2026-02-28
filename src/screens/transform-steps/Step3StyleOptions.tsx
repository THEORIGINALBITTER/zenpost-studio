import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {  faCheck } from '@fortawesome/free-solid-svg-icons';
import { ZenDropdown } from '../../kits/PatternKit/ZenModalSystem';
import { ZenSubtitleDark } from '../../kits/PatternKit/ZenSubtitleDark';
import { ZenBackButton } from '../../kits/DesignKit/ZenBackButton';

import { ContentTone, ContentLength, ContentAudience, ContentPlatform, TargetLanguage } from '../../services/aiService';

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

  onBack: () => void;
  onBackToEditor: () => void;
  onTransform: () => void;
  onPostDirectly: () => void;

  isTransforming: boolean;
  isPosting: boolean;
  error: string | null;
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

  onBack: _onBack,
  onBackToEditor,
  onTransform: _onTransform,
  onPostDirectly: _onPostDirectly,

  isTransforming: _isTransforming,
  isPosting: _isPosting,
  error,
}: Step3StyleOptionsProps) => {
  const [changedOptions, setChangedOptions] = useState<Set<string>>(new Set());
  const cardWidth = 220;
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
                ? 'border-[#AC8E66] bg-[#AC8E66]'
                : 'border-[#1a1a1a] bg-transparent'
            )}
          >
            {changed && (
              <FontAwesomeIcon icon={faCheck} className="text-[#1A1A1A] text-xs" />
            )}
          </div>
        </div>

        <p className="font-mono text-[12px] text-[#777] mb-3 text-center">{title}</p>

        <div className="flex items-center justify-center w-full">
          {children}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-[20px] bg-[#d0cbb8]">
      <div style={{ position: 'absolute', top: '120px', left: '150px' }}>
        <ZenBackButton onClick={onBackToEditor} />
      </div>

      <div className="flex flex-col items-center w-full" style={{ maxWidth: '1320px' }}>
        <div className="flex flex-col items-center  mb-6">
          <p className="font-mono text-[12px] text-center">
            <span className="text-[#AC8E66]">AI Einstellungen:</span>
            <span className="text-[#1a1a1a]"> {displayPlatformLabel}</span>
          </p>




          <div className="max-w-4xl 
          p-[20px] 
          border-[0.5px] border-[#AC8E66] rounded-[12px]
          
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
