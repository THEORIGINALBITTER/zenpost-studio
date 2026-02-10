// ./modal/components/ZenHomeModal.tsx

import { ZenModal } from "../components/ZenModal";
import { ZenModalFooter } from "../components/ZenModalFooter";
import { ZenRoughButton } from "../components/ZenRoughButton";
import { getModalPreset } from "../config/ZenModalConfig";

interface ZenHomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ZenHomeModal = ({ isOpen, onClose, onConfirm }: ZenHomeModalProps) => {
  const modalPreset = getModalPreset('home');

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalPreset.title}
      subtitle={modalPreset.subtitle}
      headerAlign="center"
    >
      <div
        className="relative flex flex-col"
        style={{ minHeight: modalPreset.minHeight }}
      >
        {/* Content */}
        <div className="flex-1 flex flex-col gap-6 p-8 overflow-y-auto">
          {/* Message */}
          <p className="font-mono text-[12px] text-[#555] text-center"
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
