import { ZenModal } from '../components/ZenModal';
import { ZenModalFooter } from '../components/ZenModalFooter';
import { ZenRoughButton } from '../components/ZenRoughButton';
import { getModalPreset } from '../config/ZenModalConfig';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faFolderOpen, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { Command } from '@tauri-apps/plugin-shell';

interface ZenSaveSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  filePath?: string; // Optional: full path to the file
  filePaths?: string[]; // Optional: list of files (preferred over filePath for multi-save)
  onGoToCalendar?: () => void; // Optional: callback to go to calendar
  showCalendarButton?: boolean; // Optional: show calendar button
}

export const ZenSaveSuccessModal = ({
  isOpen,
  onClose,
  fileName,
  filePath,
  filePaths,
  onGoToCalendar,
  showCalendarButton = false,
}: ZenSaveSuccessModalProps) => {
  const preset = getModalPreset('save-success');
  const aggregatedPaths = filePaths?.filter((path): path is string => Boolean(path)) ?? [];
  const normalizedPaths = aggregatedPaths.length > 0
    ? aggregatedPaths
    : filePath
      ? [filePath]
      : [];
  const primaryPath = normalizedPaths[0];
  const hasMultipleFiles = normalizedPaths.length > 1;

  // Debug: Log filePath to see if it's being passed - only when modal is open
  if (isOpen) {
    console.log('[ZenSaveSuccessModal] Modal opened with:');
    console.log('[ZenSaveSuccessModal] filePaths:', normalizedPaths);
    console.log('[ZenSaveSuccessModal] fileName:', fileName);
  }

  const handleShowInFinder = async (targetPath?: string) => {
    if (!targetPath) return;

    try {
      // Detect platform from navigator
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const isWindows = navigator.platform.toLowerCase().includes('win');

      if (isMac) {
        // macOS: Use 'open -R' to reveal in Finder
        await Command.create('open', ['-R', targetPath]).execute();
      } else if (isWindows) {
        // Windows: Use 'explorer /select,' to show in Explorer
        await Command.create('explorer', ['/select,', targetPath]).execute();
      } else {
        // Linux: Use xdg-open with the parent directory
        const parentDir = targetPath.substring(0, targetPath.lastIndexOf('/'));
        await Command.create('xdg-open', [parentDir]).execute();
      }
      console.log('[ZenSaveSuccessModal] Successfully opened file in explorer');
    } catch (error) {
      console.error('Failed to show file in explorer:', error);
      // Fallback: Try to open the parent directory
      try {
        const parentDir = targetPath.substring(0, targetPath.lastIndexOf('/'));
        await Command.create('open', [parentDir]).execute();
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
  };

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      title={preset.title}
      subtitle={preset.subtitle}
    >
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
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
            textRendering: "optimizeLegibility",
            fontFamily: 'monospace',
            fontSize: '12px',
            fontWeight: 'unset',
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
          {hasMultipleFiles
            ? 'Die Dateien wurden erfolgreich in deinem Projektordner gespeichert.'
            : 'Die Datei wurde erfolgreich in deinem Projektordner gespeichert.'}
        </p>

        {normalizedPaths.length > 0 && (
          <div
            style={{
              width: '100%',
              backgroundColor: '#111',
              borderRadius: '6px',
              border: '1px dotted #3A3A3A',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '10px',
                fontWeight: '400',
                color: '#dbd9d5',
              }}
            >
              Gespeicherte Datei-Pfade:
            </div>
            {normalizedPaths.map((path, index) => (
              <code
                key={`${path}-${index}`}
                style={{
                  fontFamily: 'monospace',
                  fontSize: '10px',
                  color: '#999',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden'
                }}
              >
                {path}
              </code>
            ))}
          </div>
        )}
      </div>

      <ZenModalFooter showFooterText={true}>
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
          }}
        >
          {primaryPath && (
            <ZenRoughButton
              label="Im Finder anzeigen"
              icon={<FontAwesomeIcon icon={faFolderOpen} />}
              onClick={() => handleShowInFinder(primaryPath)}
              variant="default"
            />
          )}
          {showCalendarButton && onGoToCalendar && (
            <ZenRoughButton
              label="Zum Kalender"
              icon={<FontAwesomeIcon icon={faCalendarDays} />}
              onClick={() => {
                onGoToCalendar();
                onClose();
              }}
              variant="default"
            />
          )}
        </div>
      </ZenModalFooter>
    </ZenModal>
  );
};
