import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRocket,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';
import { ZenModal } from '../components/ZenModal';
import { ZenModalFooter } from '../components/ZenModalFooter';
import { ZenRoughButton } from '../components/ZenRoughButton';
import { getModalPreset } from '../config/ZenModalConfig';
import type { SocialPlatform } from '../../../../services/socialMediaService';

interface ZenPostMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDirectPost: () => void;
  onAIOptimize: () => void;
  selectedPlatforms: SocialPlatform[];
}

export const ZenPostMethodModal = ({
  isOpen,
  onClose,
  onDirectPost,
  onAIOptimize,
  selectedPlatforms,
}: ZenPostMethodModalProps) => {
  const modalPreset = getModalPreset('posten-method');

  const platformCount = selectedPlatforms.length;
  const platformText = platformCount === 1
    ? '1 Plattform'
    : `${platformCount} Plattformen`;

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalPreset.title}
      subtitle={`${platformText} ausgewählt`}
    >
      <div
        className="relative flex flex-col"
        style={{ minHeight: modalPreset.minHeight, minWidth: modalPreset.minWidth }}
      >
        {/* Content */}
        <div className="flex-1 flex flex-col gap-6 p-8 overflow-y-auto">
          {/* Options */}
          <div className="flex flex-col gap-4 mt-4">

            {/* Option 1: Direkt Posten */}
            <button
              onClick={onDirectPost}
              className="flex items-center gap-4 p-5 rounded-lg border-2 border-[#3a3a3a] bg-[#1F1F1F] hover:border-[#AC8E66] hover:bg-[#2A2A2A] transition-all text-left"
            >
              <div className="w-12 h-12 rounded-full bg-[#2A2A2A] flex items-center justify-center border border-[#3a3a3a]">
                <FontAwesomeIcon icon={faRocket} className="text-[#AC8E66] text-xl" />
              </div>
              <div className="flex-1">
                <h4 className="font-mono text-sm text-[#e5e5e5] font-semibold">
                  Direkt Posten
                </h4>
                <p className="font-mono text-[11px] text-[#777] mt-1">
                  Content sofort auf {platformText} veröffentlichen
                </p>
              </div>
            </button>

            {/* Option 2: KI optimieren */}
            <button
              onClick={onAIOptimize}
              className="flex items-center gap-4 p-5 rounded-lg border-2 border-[#AC8E66] bg-[#2A2A2A] hover:bg-[#333] transition-all text-left"
            >
              <div className="w-12 h-12 rounded-full bg-[#AC8E66]/20 flex items-center justify-center border border-[#AC8E66]">
                <FontAwesomeIcon icon={faWandMagicSparkles} className="text-[#AC8E66] text-xl" />
              </div>
              <div className="flex-1">
                <h4 className="font-mono text-sm text-[#e5e5e5] font-semibold">
                  KI optimieren
                </h4>
                <p className="font-mono text-[11px] text-[#777] mt-1">
                  Content für jede Plattform optimieren, dann posten
                </p>
              </div>
            </button>

          </div>

          {/* Info Box */}
          <div className="mt-2 p-3 bg-[#1A1A1A] rounded-lg border border-[#3A3A3A]">
            <p className="font-mono text-[10px] text-[#777] text-center">
              💡 KI-Optimierung passt Ton, Format und Hashtags für jede Plattform an
            </p>
          </div>

          {/* Cancel Button */}
          <div className="flex justify-center mt-2">
            <ZenRoughButton
              label="Abbrechen"
              onClick={onClose}
              size="small"
            />
          </div>
        </div>

        {/* Footer */}
        <ZenModalFooter />
      </div>
    </ZenModal>
  );
};
