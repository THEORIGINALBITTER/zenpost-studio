import { useEffect, useRef, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolderOpen, faPenNib, faFolder } from '@fortawesome/free-solid-svg-icons';
import { ZenModal, ZenModalHeader, ZenModalFooter, ZenRoughButton, createCustomPreset } from '../../kits/PatternKit/ZenModalSystem';

type ProjectPickerModalProps = {
  isOpen: boolean;
  isWebRuntime: boolean;
  onClose: () => void;
  onPathSelected: (path: string) => void;
};

export function ProjectPickerModal({ isOpen, isWebRuntime, onClose, onPathSelected }: ProjectPickerModalProps) {
  const webFolderInputRef = useRef<HTMLInputElement | null>(null);
  const [showManualPathInput, setShowManualPathInput] = useState(false);
  const [manualProjectPath, setManualProjectPath] = useState('');
  const [folderPickerError, setFolderPickerError] = useState<string | null>(null);

  const modalPreset = createCustomPreset('project-change', {
    title: 'Projektordner wählen',
    subtitle: 'Wähle einen Projektordner oder gib einen Pfad manuell ein.',
    titleColor: '#AC8E66',
    subtitleColor: '#777',
    titleSize: '20px',
    subtitleSize: '11px',
    minHeight: '320px',
    maxHeight: '520px',
  });

  useEffect(() => {
    if (!isWebRuntime) return;
    if (!webFolderInputRef.current) return;
    webFolderInputRef.current.setAttribute('webkitdirectory', '');
    webFolderInputRef.current.setAttribute('directory', '');
  }, [isWebRuntime]);

  const openNativeFolderPicker = async () => {
    try {
      if (isWebRuntime) {
        // Web builds can't access arbitrary folders. Mirror Content Studio behavior:
        // guide the user to run the desktop app instead.
        return;
      }
      console.log('[DocStudio] Opening folder picker (directory=true)...');
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Projektordner wählen',
      });
      if (selected && typeof selected === 'string') {
        onPathSelected(selected);
        setFolderPickerError(null);
        setShowManualPathInput(false);
        onClose();
      }
    } catch (error) {
      console.error('Error selecting project:', error);
      setFolderPickerError('Could not open folder picker');
      setShowManualPathInput(true);
    }
  };

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={() => {
        setShowManualPathInput(false);
        onClose();
      }}
      size="md"
      showCloseButton={true}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          minHeight: modalPreset.minHeight,
        }}
      >
        <div
          style={{
            padding: '28px 28px 20px',
            borderBottom: '1px solid #AC8E66',
          }}
        >
          <ZenModalHeader
            {...modalPreset}
            onClose={() => {
              setShowManualPathInput(false);
              onClose();
            }}
          />
        </div>

        <div style={{ flex: 1, padding: '22px 28px' }}>
          {isWebRuntime && (
            <div
              style={{
                border: '1px solid #3A3A3A',
                borderRadius: '10px',
                padding: '12px',
                color: '#fef3c7',
                background: '#0A0A0A',
                fontFamily: 'monospace',
                fontSize: '11px',
                marginBottom: '16px',
              }}
            >
              Hinweis: In der Web-Version ist die Projektordner-Auswahl eingeschränkt. Nutze die Desktop-App (Tauri)
              fuer Projekt-Scanning.
            </div>
          )}
          <div
            style={{
              display: 'flex',
              gap: '14px',
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <ZenRoughButton
              label="Finder öffnen"
              icon={<FontAwesomeIcon icon={faFolderOpen} />}
              onClick={openNativeFolderPicker}
              variant="default"
              size="small"
              width={260}
              height={54}
              disabled={isWebRuntime}
            />
            <ZenRoughButton
              label="Manuellen Pfad nutzen"
              icon={<FontAwesomeIcon icon={faPenNib} />}
              onClick={() => setShowManualPathInput(true)}
              variant="default"
              size="small"
              width={260}
              height={54}
            />
          </div>

          {folderPickerError && (
            <p style={{ fontFamily: 'monospace', fontSize: '10px', color: '#999', marginTop: '12px' }}>
              {folderPickerError}
            </p>
          )}

          {showManualPathInput && (
            <div style={{ marginTop: '18px' }}>
              <p style={{ fontFamily: 'monospace', fontSize: '10px', color: '#777', marginBottom: '6px', textAlign: 'center' }}>
                Projektpfad
              </p>
              <div style={{ maxWidth: '560px', margin: '0 auto' }}>
                <input
                  type="text"
                  placeholder="/Users/..."
                  value={manualProjectPath}
                  onChange={(event) => setManualProjectPath(event.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #3A3A3A',
                    backgroundColor: '#1A1A1A',
                    color: '#e5e5e5',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    marginBottom: '12px',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ZenRoughButton
                    label="Pfad übernehmen"
                    icon={<FontAwesomeIcon icon={faFolder} />}
                    onClick={() => {
                      if (!manualProjectPath.trim()) return;
                      onPathSelected(manualProjectPath.trim());
                      setShowManualPathInput(false);
                      setFolderPickerError(null);
                      onClose();
                    }}
                    variant="default"
                    size="small"
                    width={260}
                    height={54}
                  />
                </div>
              </div>
            </div>
          )}

          <input ref={webFolderInputRef} type="file" multiple style={{ display: 'none' }} />
        </div>

        <ZenModalFooter showFooterText={false} />
      </div>
    </ZenModal>
  );
}
