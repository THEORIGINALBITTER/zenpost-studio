import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faFileUpload, faEye, faPencil, faUser, faQuestionCircle, faCheckCircle, faExternalLinkAlt, faRocket, faBackspace } from '@fortawesome/free-solid-svg-icons';
import { faApple } from '@fortawesome/free-brands-svg-icons';
import { openUrl } from '@tauri-apps/plugin-opener';
import { ZenSubtitle } from '../../kits/PatternKit/ZenSubtitle';
import { ZenRoughButton, ZenModal } from '../../kits/PatternKit/ZenModalSystem';
import { ZenModalHeader } from '../../kits/PatternKit/ZenModalSystem/components/ZenModalHeader';
import { ZenModalFooter } from '../../kits/PatternKit/ZenModalSystem/components/ZenModalFooter';
import { ZenMarkdownEditor } from '../../kits/PatternKit/ZenMarkdownEditor';
import { convertFile, detectFormatFromFilename } from '../../utils/fileConverter';
import rough from 'roughjs/bin/rough';

interface Step1SourceInputProps {
  sourceContent: string;
  fileName: string;
  error: string | null;
  onSourceContentChange: (content: string) => void;
  onFileNameChange: (name: string) => void;
  onNext: () => void;
  onOpenMetadata?: () => void;
  onError?: (error: string) => void;
  cameFromEdit?: boolean; // Flag to show "Back to Posting" button
  onBackToPosting?: () => void; // Callback to go directly to Step 4
  cameFromDocStudio?: boolean; // Flag to show "Back to Doc Studio" button
  onBackToDocStudio?: (editedContent?: string) => void; // Callback to go back to Doc Studio
}

// Helper component for rough circle
const ZenRoughCircle = ({ number }: { number: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = 40;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rc = rough.canvas(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);

    // Draw rough circle
    rc.circle(size / 2, size / 2, size - 8, {
      roughness: 0.8,
      bowing: 1,
      stroke: '#AC8E66',
      strokeWidth: 2,
      fill: 'rgba(172, 142, 102, 0.1)',
      fillStyle: 'solid',
    });
  }, []);

  return (
    <div className="flex-shrink-0" style={{ position: 'relative', width: size, height: size }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span className="font-mono text-[#AC8E66] font-bold text-sm">
          {number}
        </span>
      </div>
    </div>
  );
};

// Configurable Step Item Component
interface ZenStepItemProps {
  number: number;
  title: string;
  description: string;
  icon: any;
  index: number;
  // Konfigurierbare Optionen
  titleSize?: string;
  descriptionSize?: string;
  iconSize?: string;
  gap?: number; // Abstand zwischen Circle und Content
  titleIconGap?: number; // Abstand zwischen Icon und Titel
  titleDescriptionGap?: number; // Abstand zwischen Titel und Description
}

const ZenStepItem = ({
  number,
  title,
  description,
  icon,
  index,
  titleSize = '16px',
  descriptionSize = '14px',
  iconSize = '14px',
  gap = 16,
  titleIconGap = 8,
  titleDescriptionGap = 8,
}: ZenStepItemProps) => {
  return (
    <div
      className="flex opacity-0 animate-fade-in"
      style={{
        animationDelay: `${index * 100}ms`,
        gap: `${gap}px`,
      }}
    >
      {/* Step Number with Rough Circle */}
      <ZenRoughCircle number={number} />

      {/* Step Content */}
      <div className="flex-1" style={{ paddingTop: 4 }}>
        <h3
          className="font-mono text-[#e5e5e5] flex items-center"
          style={{
            fontSize: titleSize,
            gap: `${titleIconGap}px`,
            marginBottom: `${titleDescriptionGap}px`,
          }}
        >
          <FontAwesomeIcon
            icon={icon}
            className="text-[#AC8E66]"
                style={{
      fontSize: iconSize,
      marginTop: '-15px',   // <— sorgt für perfekte vertikale Mitte
    }}
          />
          {title}
        </h3>
        <p
          className="font-mono text-[#999] leading-relaxed"
          style={{ fontSize: descriptionSize }}
        >
          {description}
        </p>
      </div>
    </div>
  );
};


export const Step1SourceInput = ({
  sourceContent,
  fileName,
  error,
  onSourceContentChange,
  onFileNameChange,
  onNext,
  onOpenMetadata,
  onError,
  cameFromEdit = false,
  onBackToPosting,
  cameFromDocStudio = false,
  onBackToDocStudio,
}: Step1SourceInputProps) => {
  const [showPreview, setShowPreview] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [showPagesHelp, setShowPagesHelp] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    onFileNameChange(file.name);

    // Detect file format
    const detectedFormat = detectFormatFromFilename(file.name);

    // DOCX/DOC/Pages files need to be read as ArrayBuffer
    if (detectedFormat === 'docx' || detectedFormat === 'doc' || detectedFormat === 'pages') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;

        setIsConverting(true);
        try {
          const result = await convertFile(arrayBuffer, detectedFormat, 'md', file.name);

          if (result.success && result.data) {
            onSourceContentChange(result.data);
            if (onError) onError(''); // Clear any previous errors
          } else {
            console.error('Document conversion error:', result.error);
            if (onError) onError(result.error || 'Konvertierung fehlgeschlagen');
          }
        } catch (err) {
          console.error('Document conversion failed:', err);
          const errorMsg = err instanceof Error ? err.message : 'Unbekannter Fehler';
          if (onError) onError(`Konvertierung fehlgeschlagen: ${errorMsg}`);
        } finally {
          setIsConverting(false);
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    // All other formats as text
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;

      // If it's already markdown or text, use directly
      if (detectedFormat === 'md' || detectedFormat === 'txt' || detectedFormat === 'gfm') {
        onSourceContentChange(content);
        return;
      }

      // Convert to Markdown if it's another format
      if (detectedFormat) {
        setIsConverting(true);
        try {
          const result = await convertFile(content, detectedFormat, 'md', file.name);

          if (result.success && result.data) {
            onSourceContentChange(result.data);
          } else {
            console.error('Conversion error:', result.error);
            // Fall back to raw content
            onSourceContentChange(content);
          }
        } catch (err) {
          console.error('File conversion failed:', err);
          // Fall back to raw content
          onSourceContentChange(content);
        } finally {
          setIsConverting(false);
        }
      } else {
        // Unknown format, try to use as-is
        onSourceContentChange(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center w-3/4 max-w-3xl">
        {/* Title */}
        <div className="mb-4">
          <h2 className="font-mono text-3xl text-[#e5e5e5] text-center">
           <span className='text-[#AC8E66]'> Step 01:</span> Quelle eingeben
          </h2>
        </div>

        {/* Subtitle */}
        <div className="mb-8">
          <ZenSubtitle>
            {isConverting ? 'Konvertiere Datei zu Markdown...' : 'Füge deinen Markdown-Inhalt ein oder lade eine Datei hoch'}
          </ZenSubtitle>
        </div>

    {/* Info Text */}
<div className="text-center max-w-[50%] mb-8 px-4">
  <p className="text-[#777] font-mono text-[11px] leading-relaxed whitespace-normal">
    <span className='text-[#AC8E66]'>Tipp:  </span>Du kannst Markdown, Word (DOCX/DOC), HTML, JSON oder Text-Dateien hochladen.
    Die Datei wird automatisch zu Markdown konvertiert und die AI optimiert den Inhalt für deine Zielplattform.
  </p>

  <div className="mt-4 flex justify-center">
    <div style={{ transform: 'scale(1)', transformOrigin: 'center' }}>
      <ZenRoughButton
        label="Pages-Dokument? Wie exportieren?"
        icon={<FontAwesomeIcon icon={faQuestionCircle} className="text-[#AC8E66]" />}
        onClick={() => setShowPagesHelp(true)}
      />
    </div>
  </div>
</div>

        {/* File Upload and Metadata Buttons */}
        <div className="mb-8 flex gap-4 items-center justify-center">
          <label htmlFor="file-upload">
            <div className="cursor-pointer">
              <ZenRoughButton
                label={fileName || 'Datei hochladen'}
                icon={<FontAwesomeIcon icon={faFileUpload} className="text-[#AC8E66]" />}
                onClick={() => document.getElementById('file-upload')?.click()}
              />
            </div>
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".md,.markdown,.txt,.html,.htm,.json,.docx,.doc"
            onChange={handleFileUpload}
            className="hidden"
          />

          {onOpenMetadata && (
            <ZenRoughButton
              label="Metadaten"
              icon={<FontAwesomeIcon icon={faUser} className="text-[#AC8E66]" />}
              onClick={onOpenMetadata}
              title="Deine Daten für [yourName] usw."
            />
          )}
        </div>

        {/* Markdown Editor */}
        <div className="w-full mb-8"
         style={{ paddingTop: 10, marginTop: 20 }}
        >
          <ZenMarkdownEditor
            value={sourceContent}
            onChange={onSourceContentChange}
            placeholder="# Dein Markdown Inhalt hier einfügen... mit shift+/ Menu öffnen"
            height="400px"
            showCharCount={false}
            showPreview={showPreview}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 text-center">
            <p className="text-[#E89B5A] font-mono text-[10px]">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-8 flex gap-4 items-center"

         style={{ paddingTop: 10, marginTop: 20 }}
        >
          {showPreview ? (
            // When in preview mode, show both "Weiter verfassen" and "Weiter" buttons
            <>
              <ZenRoughButton
                label="Weiter verfassen"
                icon={<FontAwesomeIcon icon={faPencil} className="text-[#AC8E66]" />}
                onClick={() => setShowPreview(false)}
              />
              {cameFromEdit && onBackToPosting ? (
                <ZenRoughButton
                  label="Zurück zum Posten"
                  icon={<FontAwesomeIcon icon={faRocket} className="text-[#AC8E66]" />}
                  onClick={onBackToPosting}
                  variant="active"
                />
              ) : (
                <ZenRoughButton
                  label="Weiter"
                  icon={<FontAwesomeIcon icon={faArrowRight} className="text-[#AC8E66]" />}
                  onClick={onNext}
                />
              )}
            </>
          ) : (
            // When in editor mode, show "Preview" button
            <>
              <ZenRoughButton
                label="Preview"
                icon={<FontAwesomeIcon icon={faEye} className="text-[#AC8E66]" />}
                onClick={() => setShowPreview(true)}
              />
              {cameFromEdit && onBackToPosting && (
                <ZenRoughButton
                  label="Zurück zum Posten"
                  icon={<FontAwesomeIcon icon={faRocket} className="text-[#AC8E66]" />}
                  onClick={onBackToPosting}
                  variant="active"
                />
              )}
              {cameFromDocStudio && onBackToDocStudio && (
                <ZenRoughButton
                  label="Zurück zu Doc Studio"
                                 icon={<FontAwesomeIcon icon={faBackspace} className="text-[#AC8E66]" />}
                  onClick={() => onBackToDocStudio(sourceContent)}
                  variant="default"
                />
              )}
            </>
          )}
        </div>

        <div className='mt-[50px]'></div>
      </div>

      {/* Pages Export Help Modal */}
      <ZenModal
        isOpen={showPagesHelp}
        onClose={() => setShowPagesHelp(false)}
        size="lg"
        showCloseButton={false}
      >
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            minHeight: '500px',
            maxHeight: '80vh',
          }}
        >
          {/* Header */}
          <div
            style={{
              paddingBottom: 16,
              borderBottom: '1px solid #AC8E66',
              position: 'relative',
              zIndex: 10,
            }}
          >
            <ZenModalHeader
              title="Pages-Dokument als DOCX exportieren"
              subtitle="Folge diesen Schritten um dein Pages-Dokument zu konvertieren"
                 subtitle2="DOCX-Export behält Formatierungen, Bilder und Tabellen bei!"
              titleColor="#AC8E66"
              subtitleColor="#999"
              titleSize="14px"
              subtitleSize="11px"
              onClose={() => setShowPagesHelp(false)}
            />

             {/* Success Tip */}
      
          </div>

          {/* Scrollable Content */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '20px ',
              paddingLeft: "16",
            }}
          >
            <div className="space-y-5">
              {[
                {
                  number: 1,
                  title: 'Pages-Dokument öffnen',
                  description: 'Öffne dein Dokument in Apple Pages',
                  icon: faApple,
                },
                {
                  number: 2,
                  title: 'Export-Menü öffnen',
                  description: 'Gehe zu: Ablage → Exportieren → Word...',
                  icon: faFileUpload,
                },
                {
                  number: 3,
                  title: 'Format wählen',
                  description: 'Wähle "Word" (.docx) als Exportformat',
                  icon: faCheckCircle,
                },
                {
                  number: 4,
                  title: 'Datei speichern',
                  description: 'Speichere die DOCX-Datei an einem Ort deiner Wahl',
                  icon: faCheckCircle,
                },
                {
                  number: 5,
                  title: 'Hier hochladen',
                  description: 'Lade die DOCX-Datei in ZenPost Studio hoch',
                  icon: faArrowRight,
                },
              ].map((step, index) => (
                <ZenStepItem
                  key={step.number}
                  number={step.number}
                  title={step.title}
                  description={step.description}
                  icon={step.icon}
                  index={index}
                  titleSize="14px"
                  descriptionSize="12px"
                  iconSize="30px"
                  gap={14}
                  titleIconGap={8}
                  titleDescriptionGap={6}
                />
              ))}
            </div>

           
          </div>

          {/* Footer */}
          <ZenModalFooter showFooterText={false}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: 12,
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                flexWrap: 'wrap',
              }}
            >
              <ZenRoughButton
                label="Wiki / Docs"
                icon={
                  <FontAwesomeIcon
                    icon={faExternalLinkAlt}
                    className="text-[#AC8E66]"
                  />
                }
                onClick={async () => {
                  try {
                    await openUrl('https://theoriginalbitter.github.io/zenpost-studio/#/pages-export');
                  } catch (error) {
                    console.error('Failed to open URL:', error);
                  }
                }}
              />
              <ZenRoughButton
                label="Verstanden"
                icon={
                  <FontAwesomeIcon
                    icon={faCheckCircle}
                    className="text-[#AC8E66]"
                  />
                }
                onClick={() => setShowPagesHelp(false)}
                variant="active"
              />
            </div>
          </ZenModalFooter>
        </div>

        <style>{`
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .animate-fade-in {
            animation: fade-in 0.3s ease-out forwards;
          }
        `}</style>
      </ZenModal>
    </div>
  );
};
