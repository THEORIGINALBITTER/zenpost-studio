import { ZenModal } from "../components/ZenModal";
import { ZenModalFooter } from "../components/ZenModalFooter";
import { ZenRoughButton } from "../components/ZenRoughButton";
import { getModalPreset } from "../config/ZenModalConfig";

interface ZenMailSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ZenMailSuccessModal = ({ isOpen, onClose }: ZenMailSuccessModalProps) => {
  const modalPreset = getModalPreset("mail-success");

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
        <div className="flex-1 flex flex-col gap-4 p-8 overflow-y-auto items-center justify-center text-center">
          <div className="font-mono text-[12px] text-[#e6dbca]">
            E-Mail wurde erfolgreich vorbereitet.
          </div>
          <ZenRoughButton label="OK" onClick={onClose} size="small" />
        </div>
        <ZenModalFooter />
      </div>
    </ZenModal>
  );
};
