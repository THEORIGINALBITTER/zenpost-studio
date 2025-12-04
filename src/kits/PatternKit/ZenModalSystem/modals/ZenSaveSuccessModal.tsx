import { ZenModal } from '../components/ZenModal';
import { ZenModalHeader } from '../components/ZenModalHeader';
import { ZenModalFooter } from '../components/ZenModalFooter';
import { ZenRoughButton } from '../components/ZenRoughButton';
import { getModalPreset } from '../config/ZenModalConfig';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faFolderOpen } from '@fortawesome/free-solid-svg-icons';
import { Command } from '@tauri-apps/plugin-shell';

interface ZenSaveSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  filePath?: string; // Optional: full path to the file
}

export const ZenSaveSuccessModal = ({ isOpen, onClose, fileName, filePath }: ZenSaveSuccessModalProps) => {
  const preset = getModalPreset('save-success');

  // Debug: Log filePath to see if it's being passed - only when modal is open
  if (isOpen) {
    console.log('[ZenSaveSuccessModal] Modal opened with:');
    console.log('[ZenSaveSuccessModal] filePath:', filePath);
    console.log('[ZenSaveSuccessModal] fileName:', fileName);
  }

  const handleShowInFinder = async () => {
    if (!filePath) return;

    try {
      // Detect platform from navigator
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const isWindows = navigator.platform.toLowerCase().includes('win');

      if (isMac) {
        // macOS: Use 'open -R' to reveal in Finder
        await Command.create('open', ['-R', filePath]).execute();
      } else if (isWindows) {
        // Windows: Use 'explorer /select,' to show in Explorer
        await Command.create('explorer', ['/select,', filePath]).execute();
      } else {
        // Linux: Use xdg-open with the parent directory
        const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));
        await Command.create('xdg-open', [parentDir]).execute();
      }
      console.log('[ZenSaveSuccessModal] Successfully opened file in explorer');
    } catch (error) {
      console.error('Failed to show file in explorer:', error);
      // Fallback: Try to open the parent directory
      try {
        const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));
        await Command.create('open', [parentDir]).execute();
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
  };

  return (
    <ZenModal isOpen={isOpen} onClose={onClose} preset={preset}>
      <ZenModalHeader config={preset} />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          gap: '24px',
        }}
      >
        {/* Success Icon */}
        <FontAwesomeIcon
          icon={faCheckCircle}
          style={{
            fontSize: '64px',
            color: '#AC8E66',
          }}
        />

        {/* File Name */}
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#AC8E66',
            backgroundColor: '#1A1A1A',
            padding: '12px 24px',
            borderRadius: '6px',
            border: '1px solid #3A3A3A',
          }}
        >
          {fileName}
        </div>

        {/* Success Message */}
        <p
          style={{
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#999',
            textAlign: 'center',
            lineHeight: '1.6',
            maxWidth: '400px',
          }}
        >
          Die Datei wurde erfolgreich in deinem Projektordner gespeichert.
        </p>
      </div>

      <ZenModalFooter showFooterText={true}>
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <ZenRoughButton
            label="Im Finder anzeigen"
            icon={<FontAwesomeIcon icon={faFolderOpen} />}
            onClick={handleShowInFinder}
            disabled={!filePath}
            variant="default"
          />
      
        </div>
      </ZenModalFooter>
    </ZenModal>
  );
};
