import { ZenModal } from '../../PatternKit/ZenModalSystem/components/ZenModal';
import { WalkthroughOverlay } from './WalkthroughOverlay';
import { CONTENT_AI_STUDIO_STEPS } from '../config/walkthroughSteps';

interface WalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoStart?: boolean;
}

/**
 * Modal-Wrapper für den Walkthrough
 * Integriert WalkthroughOverlay in das ZenModal-System
 */
export const WalkthroughModal = ({
  isOpen,
  onClose,
  autoStart = true,
}: WalkthroughModalProps) => {
  const handleComplete = () => {
    // Optional: Auto-close nach Completion
    // setTimeout(() => onClose(), 2000);
  };

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      showCloseButton={true}
    >
      <div
        style={{
          minHeight: '600px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <WalkthroughOverlay
          steps={CONTENT_AI_STUDIO_STEPS}
          onComplete={handleComplete}
          autoStart={autoStart}
        />
      </div>
    </ZenModal>
  );
};
