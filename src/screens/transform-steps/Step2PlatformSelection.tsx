import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { ZenSubtitle } from '../../kits/PatternKit/ZenSubtitle';
import { ZenRoughButton } from '../../kits/PatternKit/ZenModalSystem';
import { ContentPlatform } from '../../services/aiService';

interface PlatformOption {
  value: ContentPlatform;
  label: string;
  icon: any;
  description: string;
}

interface Step2PlatformSelectionProps {
  selectedPlatform: ContentPlatform;
  platformOptions: PlatformOption[];
  onPlatformChange: (platform: ContentPlatform) => void;
  onBack: () => void;
  onNext: () => void;
  // Multi-select mode props
  multiSelectMode?: boolean;
  selectedPlatforms?: ContentPlatform[];
  onSelectedPlatformsChange?: (platforms: ContentPlatform[]) => void;
}

export const Step2PlatformSelection = ({
  selectedPlatform,
  platformOptions,
  onPlatformChange,
  onBack,
  onNext,
  multiSelectMode = false,
  selectedPlatforms = [],
  onSelectedPlatformsChange,
}: Step2PlatformSelectionProps) => {

  // Single-select: click platform and proceed
  const handlePlatformClick = (platform: ContentPlatform) => {
    if (multiSelectMode) {
      // Multi-select: toggle platform in selection
      const isSelected = selectedPlatforms.includes(platform);
      if (isSelected) {
        onSelectedPlatformsChange?.(selectedPlatforms.filter(p => p !== platform));
      } else {
        onSelectedPlatformsChange?.([...selectedPlatforms, platform]);
      }
    } else {
      // Single-select: select and proceed
      onPlatformChange(platform);
      onNext();
    }
  };

  const isSelected = (platform: ContentPlatform) => {
    if (multiSelectMode) {
      return selectedPlatforms.includes(platform);
    }
    return selectedPlatform === platform;
  };

  const canProceed = multiSelectMode ? selectedPlatforms.length > 0 : true;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center w-full max-w-4xl">
        {/* Title */}
        <div className="mb-4">
          <h2 className="font-mono text-3xl text-center font-normal">
            <span className="text-[#AC8E66]">Step 02:</span>
            <span className="text-[#fef3c7]"> {multiSelectMode ? 'Plattformen wählen' : 'Plattform wählen'}</span>
          </h2>
        </div>

        {/* Subtitle */}
        <div className="mb-20">
          <ZenSubtitle>
            {multiSelectMode
              ? 'Wähle eine oder mehrere Zielplattformen für deine Content-Transformation'
              : 'Wähle die Zielplattform für deine Content-Transformation'
            }
          </ZenSubtitle>
        </div>

        {/* Info Text */}
        <div className="text-center max-w-2xl" style={{paddingLeft: "10px", paddingRight: "10px"}}>
          <p className="text-[#777] font-mono text-[11px] max-w-2xl leading-relaxed" style={{paddingTop: "10px"}}>
            {multiSelectMode
              ? 'Jede Plattform hat ihre eigenen Best Practices. Die AI wird deinen Content für jede gewählte Plattform optimieren.'
              : 'Jede Plattform hat ihre eigenen Best Practices. Die AI wird deinen Content entsprechend anpassen - von Tonalität über Formatierung bis hin zur Länge.'
            }
          </p>
        </div>

        {/* Selection Info for Multi-Select */}
        {multiSelectMode && (
          <div className="mt-4 mb-2">
            <p className="font-mono text-[12px] text-[#AC8E66]">
              {selectedPlatforms.length === 0
                ? 'Keine Plattform ausgewählt'
                : `${selectedPlatforms.length} Plattform${selectedPlatforms.length > 1 ? 'en' : ''} ausgewählt`
              }
            </p>
          </div>
        )}

        {/* Platform Grid */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '24px',
            width: '80%',
            marginTop: multiSelectMode ? '20px' : '40px',
            marginBottom: multiSelectMode ? '40px' : '80px',
            justifyContent: 'center',
          }}
        >
          {platformOptions.map((option) => {
            const selected = isSelected(option.value);
            return (
              <button
                key={option.value}
                onClick={() => handlePlatformClick(option.value)}
                className={`
                  relative p-6 rounded-lg border-2 transition-all
                  ${selected
                    ? 'border-[#AC8E66] bg-[#2A2A2A]'
                    : 'border-[#3a3a3a] bg-[#1F1F1F] hover:border-[#AC8E66]/50'
                  }
                `}
                style={{
                  flex: '1 1 200px',
                  minWidth: '200px',
                  maxWidth: '250px',
                }}
              >
                {/* Checkbox for Multi-Select */}
                {multiSelectMode && (
                  <div className="absolute top-3 left-3">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                        ${selected
                          ? 'border-[#AC8E66] bg-[#AC8E66]'
                          : 'border-[#555] bg-transparent'
                        }
                      `}
                    >
                      {selected && (
                        <FontAwesomeIcon icon={faCheck} className="text-[#1A1A1A] text-xs" />
                      )}
                    </div>
                  </div>
                )}

                {/* Icon */}
                <div className="mb-4 flex justify-center">
                  <FontAwesomeIcon
                    icon={option.icon}
                    className={`text-4xl ${selected ? 'text-[#AC8E66]' : 'text-[#777]'}`}
                  />
                </div>

                {/* Label */}
                <h3 className={`font-mono text-[12px] mb-2 ${selected ? 'text-[#e5e5e5]' : 'text-[#999]'}`}>
                  {option.label}
                </h3>

                {/* Description */}
                <p className="text-[#777] font-mono text-[10px] leading-relaxed">
                  {option.description}
                </p>

                {/* Selected Indicator (single-select only) */}
                {!multiSelectMode && selected && (
                  <div className="absolute top-3 right-3">
                    <div className="w-3 h-3 bg-[#AC8E66] rounded-full" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Action Buttons for Multi-Select */}
        {multiSelectMode && (
          <div className="flex items-center gap-4 mb-8">
            <ZenRoughButton
              label="Zurück"
              onClick={onBack}
              size="small"
            />
            <ZenRoughButton
              label={`Weiter (${selectedPlatforms.length})`}
              onClick={onNext}
              size="small"
              variant={canProceed ? 'active' : 'default'}
              disabled={!canProceed}
            />
          </div>
        )}
      </div>
    </div>
  );
};
