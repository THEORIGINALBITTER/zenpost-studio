import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagicWandSparkles, faArrowLeft, faRocket, faCheck } from '@fortawesome/free-solid-svg-icons';
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

export const Step3StyleOptions = ({
  platformLabel,
  platformLabels,
  multiPlatformMode,
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
  onTransform,
  onPostDirectly,
  isTransforming,
  isPosting,
  error,
}: Step3StyleOptionsProps) => {
  // Track which options have been changed by the user
  const [changedOptions, setChangedOptions] = useState<Set<string>>(new Set());

  const markAsChanged = (option: string) => {
    setChangedOptions((prev) => new Set([...prev, option]));
  };

  const isChanged = (option: string) => changedOptions.has(option);

  // Build the display label for platforms
  const displayPlatformLabel = multiPlatformMode && platformLabels && platformLabels.length > 0
    ? platformLabels.join(', ')
    : platformLabel;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      {/* Close Button */}
      <div style={{ position: 'absolute', top: '120px', right: '40px' }}>
        <ZenCloseButton onClick={onBackToEditor} />
      </div>

      <div className="flex flex-col items-center w-full max-w-4xl">
        {/* Title */}
        <div className="mb-4">
          <h2 className="font-mono text-3xl text-center font-normal">
            <span className="text-[#AC8E66]">Step 03:</span>
            <span className="text-[#fef3c7]"> {displayPlatformLabel}</span>
          </h2>
        </div>

        {/* Subtitle */}
        <div className="mb-12">
          <ZenSubtitle>
            Verfeinere die Transformation mit deinen Präferenzen
          </ZenSubtitle>
        </div>

        {/* Options Grid - Same layout as Step 2 */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '24px',
            width: '90%',
            marginTop: '20px',
            marginBottom: '40px',
            justifyContent: 'center',
          }}
        >
          {/* Tonalität Card */}
          <div
            className={`relative rounded-[20px] border-2 transition-all ${
              isChanged('tone')
                ? 'border-[#AC8E66] bg-[#2A2A2A]'
                : 'border-[#3a3a3a] bg-[#1F1F1F]'
            }`}
            style={{
              flex: '1 1 240px',
              minWidth: '240px',
              maxWidth: '280px',
              padding: '32px 24px',
            }}
          >
            {/* Indicator - small dot or checkmark */}
            <div className="absolute top-4 left-4">
              {isChanged('tone') ? (
                <div className="w-5 h-5 rounded border-2 border-[#AC8E66] bg-[#AC8E66] flex items-center justify-center">
                  <FontAwesomeIcon icon={faCheck} className="text-[#1A1A1A] text-xs" />
                </div>
              ) : (
                <div className="w-3 h-3 rounded-full bg-[#3a3a3a]" />
              )}
            </div>

            {/* Content - Centered */}
            <div className="flex flex-col items-center justify-center mt-4">
              <ZenDropdown
                label="Tonalität"
                value={tone}
                onChange={(value) => {
                  markAsChanged('tone');
                  onToneChange(value as ContentTone);
                }}
                options={toneOptions}
              />
            </div>
          </div>

          {/* Länge Card */}
          <div
            className={`relative rounded-[20px] border-2 transition-all ${
              isChanged('length')
                ? 'border-[#AC8E66] bg-[#2A2A2A]'
                : 'border-[#3a3a3a] bg-[#1F1F1F]'
            }`}
            style={{
              flex: '1 1 240px',
              minWidth: '240px',
              maxWidth: '280px',
              padding: '32px 24px',
            }}
          >
            {/* Indicator */}
            <div className="absolute top-4 left-4">
              {isChanged('length') ? (
                <div className="w-5 h-5 rounded border-2 border-[#AC8E66] bg-[#AC8E66] flex items-center justify-center">
                  <FontAwesomeIcon icon={faCheck} className="text-[#1A1A1A] text-xs" />
                </div>
              ) : (
                <div className="w-3 h-3 rounded-full bg-[#3a3a3a]" />
              )}
            </div>

            {/* Content - Centered */}
            <div className="flex flex-col items-center justify-center mt-4">
              <ZenDropdown
                label="Länge"
                value={length}
                onChange={(value) => {
                  markAsChanged('length');
                  onLengthChange(value as ContentLength);
                }}
                options={lengthOptions}
              />
            </div>
          </div>

          {/* Zielgruppe Card */}
          <div
            className={`relative rounded-[20px] border-2 transition-all ${
              isChanged('audience')
                ? 'border-[#AC8E66] bg-[#2A2A2A]'
                : 'border-[#3a3a3a] bg-[#1F1F1F]'
            }`}
            style={{
              flex: '1 1 240px',
              minWidth: '240px',
              maxWidth: '280px',
              padding: '32px 24px',
            }}
          >
            {/* Indicator */}
            <div className="absolute top-4 left-4">
              {isChanged('audience') ? (
                <div className="w-5 h-5 rounded border-2 border-[#AC8E66] bg-[#AC8E66] flex items-center justify-center">
                  <FontAwesomeIcon icon={faCheck} className="text-[#1A1A1A] text-xs" />
                </div>
              ) : (
                <div className="w-3 h-3 rounded-full bg-[#3a3a3a]" />
              )}
            </div>

            {/* Content - Centered */}
            <div className="flex flex-col items-center justify-center mt-4">
              <ZenDropdown
                label="Zielgruppe"
                value={audience}
                onChange={(value) => {
                  markAsChanged('audience');
                  onAudienceChange(value as ContentAudience);
                }}
                options={audienceOptions}
              />
            </div>
          </div>

          {/* Sprache Card Rounded Card  */}
          <div
            className={`relative rounded-[20px] border-2 transition-all ${
              isChanged('language')
                ? 'border-[#AC8E66] bg-[#2A2A2A]'
                : 'border-[#3a3a3a] bg-[#1F1F1F]'
            }`}
            style={{
              flex: '1 1 240px',
              minWidth: '240px',
              maxWidth: '280px',
              padding: '32px 24px',
            }}
          >
            {/* Indicator */}
            <div className="absolute top-4 left-4">
              {isChanged('language') ? (
                <div className="w-5 h-5 rounded border-2 border-[#AC8E66] bg-[#AC8E66] flex items-center justify-center">
                  <FontAwesomeIcon icon={faCheck} className="text-[#1A1A1A] text-xs" />
                </div>
              ) : (
                <div className="w-3 h-3 rounded-full bg-[#3a3a3a]" />
              )}
            </div>

            {/* Content - Centered */}
            <div className="flex flex-col items-center justify-center margin-top-[10px]">
              <ZenDropdown
                label="Sprache"
                value={targetLanguage || 'deutsch'}
                onChange={(value) => {
                  markAsChanged('language');
                  onTargetLanguageChange?.(value as TargetLanguage);
                }}
                options={languageOptions}
              />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="w-full max-w-2xl mb-6 p-4 rounded-lg border border-red-500 bg-red-500/10 text-center">
            <p className="font-mono text-[12px] text-red-500">{error}</p>
            {(error.includes('kurz') ||
              error.includes('leer') ||
              error.includes('empty') ||
              error.includes('short')) && (
              <div className="mt-[10px]">
                <ZenRoughButton
                  label="Zurück weiter verfassen"
                  icon={<FontAwesomeIcon icon={faArrowLeft} className="text-[#AC8E66]" />}
                  onClick={onBackToEditor}
                  size="small"
                />
              </div>
            )}
          </div>
        )}

        {/* Info Text */}
        <div className="text-center max-w-2xl mb-8" style={{ paddingLeft: '10px', paddingRight: '10px' }}>
          <p className="text-[#777] font-mono text-[11px] max-w-2xl leading-relaxed">
            Transformiere den Content mit AI oder poste ihn direkt auf die gewählte Plattform.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 mb-8">
          <ZenRoughButton
            label={isTransforming ? 'Transformiere...' : 'Transformieren'}
            icon={<FontAwesomeIcon icon={faMagicWandSparkles} className="text-[#AC8E66]" />}
            onClick={onTransform}
            disabled={isTransforming || isPosting}
          />

          <ZenRoughButton
            label={isPosting ? 'Poste...' : 'Direkt Posten'}
            icon={<FontAwesomeIcon icon={faRocket} className="text-[#AC8E66]" />}
            onClick={onPostDirectly}
            disabled={isTransforming || isPosting}
            variant="active"
          />
        </div>
      </div>
    </div>
  );
};
