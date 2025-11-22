import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagicWandSparkles, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { ZenSubtitle } from '../../kits/PatternKit/ZenSubtitle';
import { ZenRoughButton, ZenDropdown } from '../../kits/PatternKit/ZenModalSystem';
import { ContentTone, ContentLength, ContentAudience, ContentPlatform } from '../../services/aiService';

interface Step3StyleOptionsProps {
  selectedPlatform: ContentPlatform;
  platformLabel: string;
  tone: ContentTone;
  length: ContentLength;
  audience: ContentAudience;
  onToneChange: (tone: ContentTone) => void;
  onLengthChange: (length: ContentLength) => void;
  onAudienceChange: (audience: ContentAudience) => void;
  onBack: () => void;
  onBackToEditor: () => void;
  onTransform: () => void;
  isTransforming: boolean;
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

export const Step3StyleOptions = ({
  selectedPlatform,
  platformLabel,
  tone,
  length,
  audience,
  onToneChange,
  onLengthChange,
  onAudienceChange,
  onBack,
  onBackToEditor,
  onTransform,
  isTransforming,
  error,
}: Step3StyleOptionsProps) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center w-full max-w-2xl">
        {/* Title */}
        <div className="mb-4"
          style={{ padding: "20px" }}>
        
          <h2 className="font-mono text-3xl text-[#e5e5e5] text-center">
            {platformLabel}
          </h2>
        </div>

        {/* Subtitle */}
        <div className="mb-20">
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

        {/* Error Message */}
        {error && (
          <div className="mb-8 text-center">
            <p className="text-[#E89B5A] font-mono text-sm">{error}</p>
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

        {/* Transform Button */}

        {/* Info Text */}
        <div className="text-center max-w-xl"
        style={{paddingLeft: "40px" , paddingRight: "40px", paddingTop: "20px"}}
        >
          <p className="text-[#777] font-mono text-[11px]" style={{ lineHeight: '1.6' }}>
            Die AI berücksichtigt deine gewählten Optionen und passt den Content entsprechend an. <br />Dies kann einige Sekunden dauern.
          </p>
        </div>
        <div className="mb-8">
          <ZenRoughButton
            label={isTransforming ? 'Transformiere...' : 'Transformieren'}
            icon={
              <FontAwesomeIcon
                icon={faMagicWandSparkles}
                className="text-[#AC8E66]"
              />
            }
            onClick={onTransform}
          />
        </div>

        
      </div>
    </div>
  );
};
