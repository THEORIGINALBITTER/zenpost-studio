import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagicWandSparkles, faArrowLeft, faRocket, faRedo } from '@fortawesome/free-solid-svg-icons';
import { ZenSubtitle } from '../../kits/PatternKit/ZenSubtitle';
import { ZenRoughButton, ZenDropdown } from '../../kits/PatternKit/ZenModalSystem';

import { ContentTone, ContentLength, ContentAudience, ContentPlatform, TargetLanguage } from '../../services/aiService';

interface Step3StyleOptionsProps {
  selectedPlatform: ContentPlatform;
  platformLabel: string;
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
  { value: 'deutsch', label: 'Deutsch 🇩🇪' },
  { value: 'english', label: 'English 🇬🇧' },
  { value: 'español', label: 'Español 🇪🇸' },
  { value: 'français', label: 'Français 🇫🇷' },
  { value: 'italiano', label: 'Italiano 🇮🇹' },
  { value: 'português', label: 'Português 🇵🇹' },
  { value: '中文', label: '中文 🇨🇳' },
  { value: '日本語', label: '日本語 🇯🇵' },
  { value: '한국어', label: '한국어 🇰🇷' },
];

export const Step3StyleOptions = ({
  platformLabel,
  tone,
  length,
  audience,
  targetLanguage,
  onToneChange,
  onLengthChange,
  onAudienceChange,
  onTargetLanguageChange,
  onBack,
  onBackToEditor,
  onTransform,
  onPostDirectly,
  isTransforming,
  isPosting,
  error,
}: Step3StyleOptionsProps) => {
  // Plus Menu Items for quick actions
  [] = [
    {
      id: 'transform',
      label: 'KI Transformieren',
      icon: faMagicWandSparkles,
      description: 'Content mit AI transformieren',
      action: onTransform,
    },
    {
      id: 'post',
      label: 'Direkt Posten',
      icon: faRocket,
      description: 'Direkt auf Plattform posten',
      action: onPostDirectly,
    },
    {
      id: 'back-editor',
      label: 'Zurück zum Editor',
      icon: faArrowLeft,
      description: 'Content weiter bearbeiten',
      action: onBackToEditor,
    },
    {
      id: 'back-platform',
      label: 'Plattform ändern',
      icon: faRedo,
      description: 'Andere Plattform wählen',
      action: onBack,
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div className="flex flex-col items-center w-full max-w-2xl text-[#fef3c7 ]">
        {/* Title */}
        <div className="mb-4"
          style={{ padding: "20px" }}>
        
          <h2 className="font-mono text-3xl text-[#e5e5e5] text-center">
            {platformLabel}
          </h2>
        </div>

        {/* Subtitle */}
        <div className="mb-20 text-[#fef3c7]">
          <ZenSubtitle>
            Verfeinere die Transformation mit deinen Präferenzen
          </ZenSubtitle>
        </div>

        {/* Tone Selection */}
        <div className="text-[12px]" style={{ paddingTop: "20px" }}>
          <ZenDropdown
            label="Tonalität:"
            value={tone}
            onChange={(value) => onToneChange(value as ContentTone)}
            options={toneOptions}
          />
        </div>

        {/* Length Selection */}
        <div className="text-[12px]" style={{ padding: "5px" }}>
          <ZenDropdown
            label="Länge:"
            value={length}
            onChange={(value) => onLengthChange(value as ContentLength)}
            options={lengthOptions}
          />
        </div>

        {/* Audience Selection */}
         <div className="text-[12px]" style={{ padding: "5px" }}>
          <ZenDropdown
            label="Zielgruppe:"
            value={audience}
            onChange={(value) => onAudienceChange(value as ContentAudience)}
            options={audienceOptions}
          />
        </div>

        {/* Language Selection */}
        <div className="text-[12px]" style={{ padding: "5px" }}>
          <ZenDropdown
            label="Sprache:"
            value={targetLanguage || 'deutsch'}
            onChange={(value) => onTargetLanguageChange?.(value as TargetLanguage)}
            options={languageOptions}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 text-center">
            <p className="zen-error">{error}</p>
            {/* Show "Back to Edit" button if content is too short or empty */}
            {(error.includes('kurz') || error.includes('leer') || error.includes('empty') || error.includes('short')) && (
              <div style={{ marginTop: '16px' }}>
                <ZenRoughButton
                  label="Zurück weiter verfassen"
                  icon={
                    <FontAwesomeIcon
                      icon={faArrowLeft}
                      className="text-[#AC8E66]"
                    />
                  }
                  onClick={onBackToEditor}
                />
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="text-center max-w-xl"
        style={{paddingLeft: "40px" , paddingRight: "40px", paddingTop: "20px"}}
        >
          <p className="text-[#777] font-mono text-[11px]" style={{ lineHeight: '1.6' }}>
            Transformiere den Content mit AI oder poste ihn direkt auf die gewählte Plattform.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 32, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <ZenRoughButton
            label={isTransforming ? 'Transformiere...' : 'Transformieren'}
            icon={
              <FontAwesomeIcon
                icon={faMagicWandSparkles}
                className="text-[#AC8E66]"
              />
            }
            onClick={onTransform}
            disabled={isTransforming || isPosting}
          />

          <ZenRoughButton
            label={isPosting ? 'Poste...' : 'Direkt Posten'}
            icon={
              <FontAwesomeIcon
                icon={faRocket}
                className="text-[#AC8E66]"
              />
            }
            onClick={onPostDirectly}
            disabled={isTransforming || isPosting}
            variant="active"
          />
        </div>

      </div>
    </div>
  );
};
