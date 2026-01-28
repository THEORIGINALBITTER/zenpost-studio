// ./modal/components/ZenHomeModal.tsx

import { ZenModal } from "../components/ZenModal";
import { ZenModalHeader } from "../components/ZenModalHeader";
import { ZenModalFooter } from "../components/ZenModalFooter";
import { ZenRoughButton } from "../components/ZenRoughButton";
import { getModalPreset } from "../config/ZenModalConfig";

interface ZenHomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;    // <-- beim Bestätigen: zum HomeScreen wechseln
}

export const ZenHomeModal = ({ isOpen, onClose, onConfirm }: ZenHomeModalProps) => {
  const modalPreset = getModalPreset('home');

  return (
    <ZenModal isOpen={isOpen} onClose={onClose}>
      <div
        className="relative flex flex-col"
        style={{ minHeight: modalPreset.minHeight }}
      >
        {/* Content */}
        <div className="flex-1 flex flex-col gap-6 p-8 pt-20 overflow-y-auto">
          
          {/* Header */}
          <ZenModalHeader
            title={modalPreset.title}
            subtitle={modalPreset.subtitle}
            titleColor={modalPreset.titleColor}
            subtitleColor={modalPreset.subtitleColor}
            titleSize={modalPreset.titleSize}
            subtitleSize={modalPreset.subtitleSize}
          />

          {/* Message */}
          <p className="font-mono text-[12px] text-[#fef3c7 ] text-center"
            style={{ padding: "20px" }}
          >
            Wenn du zur Startseite zurückkehrst, gehen nicht gespeicherte Änderungen
            möglicherweise verloren. Möchtest du wirklich fortfahren?
          </p>

          {/* Buttons */}
          <div className="flex flex-col items-center gap-2 justify-center mt-4 sm:flex-row sm:gap-4">
            <ZenRoughButton
              label="Abbrechen"
              onClick={onClose}
              size="small"
            />

            <ZenRoughButton
              label="Zur Startseite"
              onClick={onConfirm}
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
