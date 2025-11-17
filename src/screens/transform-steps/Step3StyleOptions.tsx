import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagicWandSparkles } from '@fortawesome/free-solid-svg-icons';
import { ZenSubtitle } from '../../kits/PatternKit/ZenSubtitle';
import { ZenRoughButton } from '../../kits/PatternKit/ZenRoughButton';
import { ZenDropdown } from '../../kits/PatternKit/ZenDropdown';
import { ContentTone, ContentLength, ContentAudience } from '../../services/aiService';

interface Step3StyleOptionsProps {
  tone: ContentTone;
  length: ContentLength;
  audience: ContentAudience;
  onToneChange: (tone: ContentTone) => void;
  onLengthChange: (length: ContentLength) => void;
  onAudienceChange: (audience: ContentAudience) => void;
  onBack: () => void;
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
  tone,
  length,
  audience,
  onToneChange,
  onLengthChange,
  onAudienceChange,
  onBack,
  onTransform,
  isTransforming,
  error,
}: Step3StyleOptionsProps) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center w-full max-w-2xl">
        {/* Title */}
        <div className="mb-4">
          <h2 className="font-mono text-3xl text-[#e5e5e5] text-center">
            Schritt 3: Stil anpassen
          </h2>
        </div>

        {/* Subtitle */}
        <div className="mb-20">
          <ZenSubtitle>
            Verfeinere die Transformation mit deinen Präferenzen
          </ZenSubtitle>
        </div>

        {/* Tone Selection */}
        <div className="mb-32">
          <ZenDropdown
            label="Tonalität:"
            value={tone}
            onChange={(value) => onToneChange(value as ContentTone)}
            options={toneOptions}
          />
        </div>

        {/* Length Selection */}
        <div className="mb-32">
          <ZenDropdown
            label="Länge:"
            value={length}
            onChange={(value) => onLengthChange(value as ContentLength)}
            options={lengthOptions}
          />
        </div>

        {/* Audience Selection */}
        <div className="mb-32">
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
            <p className="text-red-400 font-mono text-sm">{error}</p>
          </div>
        )}

        {/* Transform Button */}
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

        {/* Info Text */}
        <div className="text-center max-w-xl">
          <p className="text-[#777] font-mono text-xs leading-relaxed">
            Die AI berücksichtigt deine gewählten Optionen und passt den Content
            entsprechend an. Dies kann einige Sekunden dauern.
          </p>
        </div>
      </div>
    </div>
  );
};
