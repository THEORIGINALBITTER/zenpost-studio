import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ZenSubtitle } from '../../kits/PatternKit/ZenSubtitle';
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
}

export const Step2PlatformSelection = ({
  selectedPlatform,
  platformOptions,
  onPlatformChange,
  onNext,
}: Step2PlatformSelectionProps) => {
  const handlePlatformClick = (platform: ContentPlatform) => {
    onPlatformChange(platform);
    // Automatically proceed to next step
    onNext();
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center w-full max-w-4xl">
        {/* Title */}
        <div className="mb-4">
     <h2 className="font-mono text-3xl text-center font-normal">
  <span className="text-[#AC8E66]">Step 02:</span>
  <span className="text-[#e5e5e5]"> Plattform wählen</span>
</h2>
        </div>

        {/* Subtitle */}
        <div className="mb-20">
          <ZenSubtitle>
            Wähle die Zielplattform für deine Content-Transformation
          </ZenSubtitle>
        </div>

        {/* Info Text */}
        <div className="text-center max-w-2xl"
        style={{paddingLeft: "10px", paddingRight: "10px"}}
        >
          <p className="text-[#777] font-mono text-[11px] leading-relaxed"
          
          style={{paddingTop: "50px"}}
          >
            Jede Plattform hat ihre eigenen Best Practices. Die AI wird deinen Content
            entsprechend anpassen - von Tonalität über Formatierung bis hin zur Länge.
          </p>
        </div>

        {/* Platform Grid */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '24px',
            width: '80%',
            marginTop: '40px',
            marginBottom: '80px',
            justifyContent: 'center',
          }}
        >
          {platformOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handlePlatformClick(option.value)}
              className={`
                relative p-6 rounded-lg border-2 transition-all
                ${
                  selectedPlatform === option.value
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
              {/* Icon */}
              <div className="mb-4 flex justify-center">
                <FontAwesomeIcon
                  icon={option.icon}
                  className={`text-4xl ${
                    selectedPlatform === option.value ? 'text-[#AC8E66]' : 'text-[#777]'
                  }`}
                />
              </div>

              {/* Label */}
              <h3
                className={`font-mono text-[12px] mb-2 ${
                  selectedPlatform === option.value ? 'text-[#e5e5e5]' : 'text-[#999]'
                }`}
              >
                {option.label}
              </h3>

              {/* Description */}
              <p className="text-[#777] font-mono text-[10px] leading-relaxed">
                {option.description}
              </p>

              {/* Selected Indicator */}
              {selectedPlatform === option.value && (
                <div className="absolute top-3 right-3">
                  <div className="w-3 h-3 bg-[#AC8E66] rounded-full" />
                </div>
              )}
            </button>
          ))}
        </div>

        
      </div>
    </div>
  );
};
