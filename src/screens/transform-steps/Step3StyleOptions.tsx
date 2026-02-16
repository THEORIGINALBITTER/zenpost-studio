import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCheck } from '@fortawesome/free-solid-svg-icons';
import { ZenRoughButton, ZenDropdown } from '../../kits/PatternKit/ZenModalSystem';
import { ZenSubtitle } from '../../kits/PatternKit/ZenSubtitle';
import { ZenCloseButton } from '../../kits/DesignKit/ZenCloseButton';

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
  platformLabel,
  selectedPlatforms,
  platformLabels,
  multiPlatformMode,
  styleMode = 'global',
  onStyleModeChange,
  activeStylePlatform,
  stylePlatformOptions = [],
  onActiveStylePlatformChange,
  onApplyCurrentStyleToAll,

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

  const markAsChanged = (option: string) => {
    setChangedOptions((prev) => new Set([...prev, option]));
  };

  const isChanged = (option: string) => changedOptions.has(option);
  const showModeSwitch = multiPlatformMode && (selectedPlatforms?.length ?? 0) > 1;

  const displayPlatformLabel =
    multiPlatformMode && platformLabels && platformLabels.length > 0
      ? platformLabels.join(', ')
      : platformLabel;

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
      <div className={join('zen-step-card', changed && 'zen-step-card--changed')}>
        <div className="zen-step-indicator">
          {changed ? (
            <div className="zen-step-check">
              <FontAwesomeIcon icon={faCheck} style={{ fontSize: 10, color: '#141414' }} />
            </div>
          ) : (
            <div className="zen-step-dot" />
          )}
        </div>

        <p className="zen-step-card-title">{title}</p>

        <div className="zen-step-card-body">
          {children}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 24,
        paddingRight: 24,
      }}
    >
      {/* Close Button */}
      <div style={{ position: 'absolute', top: 120, right: 40 }}>
        <ZenCloseButton onClick={onBackToEditor} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 1100 }}>
        {/* Title */}
        <div style={{ marginBottom: 14 }}>
          <p className="zen-step-headline">
            <span style={{ color: '#AC8E66' }}>KI Einstellungen:</span>
            <span style={{ color: '#dbd9d5' }}> {displayPlatformLabel}</span>
             <div style={{ textAlign: 'center', maxWidth: 720, marginTop: 18 }}>
          <p
            style={{
              color: '#9a9a9a',
              fontFamily:
                'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: 11,
              lineHeight: 1.7,
            }}
          >
            Transformiere den Content mit AI oder poste ihn direkt auf die gewählte Plattform.
          </p>
        </div>
          </p>
         
        </div>

        {/* Subtitle */}
        <div style={{ marginBottom: 36 }}>
          <ZenSubtitle>Tonaliät und Zielegruppe der Transformation mit deinen Präferenzen</ZenSubtitle>
        </div>

        {showModeSwitch && (
          <div style={{ width: '100%', maxWidth: 740, marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => onStyleModeChange?.('platform')}
                style={{
                  border: styleMode === 'platform' ? '1px solid #AC8E66' : '1px solid #4a4a4a',
                  color: styleMode === 'platform' ? '#e5e5e5' : '#9a9a9a',
                  background: 'transparent',
                  borderRadius: 10,
                  padding: '8px 12px',
                  fontSize: 11,
                  fontFamily:
                    'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  cursor: 'pointer',
                }}
              >
                Pro Plattform
              </button>
              <button
                type="button"
                onClick={() => onStyleModeChange?.('global')}
                style={{
                  border: styleMode === 'global' ? '1px solid #AC8E66' : '1px solid #4a4a4a',
                  color: styleMode === 'global' ? '#e5e5e5' : '#9a9a9a',
                  background: 'transparent',
                  borderRadius: 10,
                  padding: '8px 12px',
                  fontSize: 11,
                  fontFamily:
                    'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  cursor: 'pointer',
                }}
              >
                Für alle gleich
              </button>
            </div>

            {styleMode === 'platform' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <ZenDropdown
                    label="Plattform-Profil bearbeiten"
                    value={activeStylePlatform || stylePlatformOptions[0]?.value || ''}
                    onChange={(value) => onActiveStylePlatformChange?.(value as ContentPlatform)}
                    options={stylePlatformOptions}
                  />
                </div>
                <ZenRoughButton
                  label="Aktuelles Profil auf alle"
                  onClick={() => onApplyCurrentStyleToAll?.()}
                  size="small"
                />
              </div>
            )}
          </div>
        )}

        {/* Step2-like 2x2 card layout */}
        <div className="zen-step-grid">
          <Card optionKey="tone" title="Tonalität">
            <ZenDropdown
              label="" /* Titel kommt aus Card */
              value={tone}
              onChange={(value) => {
                markAsChanged('tone');
                onToneChange(value as ContentTone);
              }}
              options={toneOptions}
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
            />
          </Card>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              width: '100%',
              maxWidth: 740,
              marginTop: 24,
              marginBottom: 18,
              padding: 18,
              borderRadius: 18,
              border: '1px solid rgba(239,68,68,0.6)',
              background: 'rgba(239,68,68,0.10)',
              textAlign: 'center',
              boxShadow: '0 12px 28px rgba(0,0,0,0.35)',
            }}
          >
            <p
              style={{
                fontFamily:
                  'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: 12,
                color: '#ff6b6b',
              }}
            >
              {error}
            </p>

            {(error.includes('kurz') ||
              error.includes('leer') ||
              error.includes('empty') ||
              error.includes('short')) && (
              <div style={{ marginTop: 12 }}>
                <ZenRoughButton
                  label="Zurück weiter verfassen"
                  icon={<FontAwesomeIcon icon={faArrowLeft} style={{ color: '#AC8E66' }} />}
                  onClick={onBackToEditor}
                  size="small"
                />
              </div>
            )}
          </div>
        )}

        {/* Info */}
       
      </div>
    </div>
  );
};
