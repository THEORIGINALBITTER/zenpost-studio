import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faFileUpload, faCheckCircle, faExternalLinkAlt, faInfoCircle, faCode, faAlignLeft, faFileLines, faSave } from '@fortawesome/free-solid-svg-icons';
import { faApple, faLinkedin, faTwitter, faDev, faMedium, faReddit, faGithub, faHashnode } from '@fortawesome/free-brands-svg-icons';
import { useOpenExternal } from '../../hooks/useOpenExternal';

import { ZenRoughButton, ZenModal } from '../../kits/PatternKit/ZenModalSystem';
import { ZenModalHeader } from '../../kits/PatternKit/ZenModalSystem/components/ZenModalHeader';
import { ZenModalFooter } from '../../kits/PatternKit/ZenModalSystem/components/ZenModalFooter';
import { ZenBlockEditor } from '../../kits/PatternKit/ZenBlockEditor';
import { ZenMarkdownEditor } from '../../kits/PatternKit/ZenMarkdownEditor';
import { convertFile, detectFormatFromFilename } from '../../utils/fileConverter';
import rough from 'roughjs/bin/rough';
import type { EditorSettings } from '../../services/editorSettingsService';
import type { ContentPlatform } from '../../services/aiService';

// Platform display info for tabs
const PLATFORM_TAB_INFO: Record<ContentPlatform, { label: string; icon: any }> = {
  linkedin: { label: 'LinkedIn', icon: faLinkedin },
  twitter: { label: 'Twitter', icon: faTwitter },
  devto: { label: 'Dev.to', icon: faDev },
  medium: { label: 'Medium', icon: faMedium },
  reddit: { label: 'Reddit', icon: faReddit },
  'github-discussion': { label: 'GitHub', icon: faGithub },
  'github-blog': { label: 'GitHub Blog', icon: faGithub },
  youtube: { label: 'YouTube', icon: faGithub }, // No YouTube icon, use placeholder
  'blog-post': { label: 'Blog', icon: faHashnode },
};

interface Step1SourceInputProps {
  sourceContent: string;
  fileName: string;
  error: string | null;
  editorSettings?: EditorSettings;
  onSourceContentChange: (content: string) => void;
  onFileNameChange: (name: string) => void;
  onNext: () => void;
  onOpenMetadata?: () => void;
  onError?: (error: string) => void;
  onPreview?: () => void;
  onSaveToProject?: () => void;
  canSaveToProject?: boolean;
  editTabs?: ContentPlatform[];
  activeEditTab?: ContentPlatform | null;
  onEditTabChange?: (platform: ContentPlatform) => void;
  cameFromEdit?: boolean; // Flag to show "Back to Posting" button
  onBackToPosting?: () => void; // Callback to go directly to Step 4
  cameFromDocStudio?: boolean; // Flag to show "Back to Doc Studio" button
  onBackToDocStudio?: (editedContent?: string) => void; // Callback to go back to Doc Studio
  editorType?: "block" | "markdown"; // Editor type to use
  onEditorTypeChange?: (type: "block" | "markdown") => void; // Callback to change editor type
  showInlineActions?: boolean;
  onOpenConverter?: () => void;
  showDockedEditorToggle?: boolean;
  docTabs?: Array<{ id: string; title: string; kind: 'draft' | 'file' | 'article' }>;
  activeDocTabId?: string | null;
  dirtyDocTabs?: Record<string, boolean>;
  onDocTabChange?: (tabId: string) => void;
  onCloseDocTab?: (tabId: string) => void;
}

const EXTERNAL_DOCS_URL =
  "https://theoriginalbitter.github.io/zenpost-studio/#/pages-export";

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
  fileName: _fileName,
  error,
  editorSettings,
  onSourceContentChange,
  onFileNameChange,
  onNext,
  onOpenMetadata: _onOpenMetadata,
  onError,
  onPreview,
  onSaveToProject,
  canSaveToProject = false,
  editTabs = [],
  activeEditTab = null,
  onEditTabChange,
  cameFromEdit: _cameFromEdit = false,
  onBackToPosting: _onBackToPosting,
  cameFromDocStudio: _cameFromDocStudio = false,
  onBackToDocStudio: _onBackToDocStudio,
  editorType = "block",
  onEditorTypeChange,
  showInlineActions = true,
  onOpenConverter,
  showDockedEditorToggle = false,
  docTabs = [],
  activeDocTabId = null,
  dirtyDocTabs = {},
  onDocTabChange,
  onCloseDocTab,
}: Step1SourceInputProps) => {
  const { openExternal } = useOpenExternal();
  const [_isConverting, setIsConverting] = useState(false);
  const [showPagesHelp, setShowPagesHelp] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);

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

  // Get active doc tab info
  const activeDocTab = docTabs.find((tab) => tab.id === activeDocTabId);

  // Extract title from content if it starts with a markdown heading
  const extractTitleFromContent = (content: string): string | null => {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
  };

  const contentTitle = extractTitleFromContent(sourceContent);
  const displayFileName = activeDocTab?.title || contentTitle || (sourceContent ? 'Dokument' : 'Neues Dokument');
  const showTitleHeader = docTabs.length > 0 || (sourceContent && sourceContent.trim().length > 0);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center w-3/4 max-w-3xl">
        {/* Document Title Header - like Doc Studio */}
        {showTitleHeader && (
          <div className="w-full mb-4">
            <h2 className="font-mono text-[16px] text-[#e5e5e5] mb-1">
              {displayFileName}
            </h2>
            <p className="font-mono text-[11px] text-[#777]">Bearbeiten und speichern</p>
          </div>
        )}

        {/* Doc Tabs - like Doc Studio */}
        {docTabs.length > 0 && (
          <div className="w-full" style={{ marginBottom: '-1px' }}>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                padding: '8px',
                backgroundColor: '#1F1F1F',
                borderRadius: '12px 12px 0 0',
                border: '1px solid #AC8E66',
                borderBottom: 'none',
                flexWrap: 'wrap',
              }}
            >
              {docTabs.map((tab) => {
                const isActive = tab.id === activeDocTabId;
                const isDirty = !!dirtyDocTabs[tab.id];
                return (
                  <button
                    key={tab.id}
                    onClick={() => onDocTabChange?.(tab.id)}
                    style={{
                      flex: '1 1 140px',
                      padding: '10px 16px',
                      backgroundColor: isActive ? '#AC8E66' : 'transparent',
                      border: isActive ? 'none' : '1px solid #3A3A3A',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '12px',
                      fontWeight: isActive ? '600' : '400',
                      color: isActive ? '#1A1A1A' : '#999',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {isDirty ? <span style={{ color: isActive ? '#1A1A1A' : '#AC8E66' }}>•</span> : null}
                    <span>{tab.title}</span>
                    <span
                      onClick={(event) => {
                        event.stopPropagation();
                        onCloseDocTab?.(tab.id);
                      }}
                      style={{
                        marginLeft: '6px',
                        fontSize: '12px',
                        color: isActive ? '#1A1A1A' : '#777',
                        opacity: 0.8,
                      }}
                    >
                      ×
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <input
          id="file-upload"
          type="file"
          accept=".md,.markdown,.txt,.html,.htm,.json,.docx,.doc"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Editor - Block oder Markdown */}
        <div className="w-full mb-4"
         style={{ paddingTop: docTabs.length > 0 ? 0 : 10, marginTop: docTabs.length > 0 ? 0 : 20 }}
        >
          {editTabs.length > 1 && (
            <div className="mb-4 w-full max-w-4xl">
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '8px',
                  backgroundColor: '#1F1F1F',
                  borderRadius: '12px',
                  border: '1px solid #3A3A3A',
                }}
              >
                {editTabs.map((platform) => {
                  const isActive = activeEditTab === platform;
                  const tabInfo = PLATFORM_TAB_INFO[platform];
                  return (
                    <button
                      key={platform}
                      onClick={() => onEditTabChange?.(platform)}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        backgroundColor: isActive ? '#AC8E66' : 'transparent',
                        border: isActive ? 'none' : '1px solid #3A3A3A',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '12px',
                        fontWeight: isActive ? '600' : '400',
                        color: isActive ? '#1A1A1A' : '#999',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      <FontAwesomeIcon icon={tabInfo.icon} />
                      {tabInfo.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ position: 'relative', overflow: 'visible' }}>
            {editorType === "block" ? (
              <ZenBlockEditor
                value={sourceContent}
                onChange={onSourceContentChange}
                placeholder="Schreibe was du denkst oder nutze + für Formatierung... oder einfach eine Datei hochladen über Projekte Ordner"
                height="calc(100vh - 340px)"
                fontSize={editorSettings?.fontSize}
                wrapLines={editorSettings?.wrapLines}
                showLineNumbers={editorSettings?.showLineNumbers}
              />
            ) : (
              <ZenMarkdownEditor
                value={sourceContent}
                onChange={onSourceContentChange}
                placeholder="Schreibe deinen Markdown-Inhalt hier... oder lade Inhalt über Projekte Ordner ein"
                height="calc(100vh - 340px)"
                showLineNumbers={editorSettings?.showLineNumbers}
              />
            )}
           {showDockedEditorToggle && (
  <button
    onClick={() => onEditorTypeChange?.(editorType === "block" ? "markdown" : "block")}
    style={{
      position: "absolute",

      // ✅ immer an der rechten Kante des Editors
      left: "100%",
      top: "0%",

      // ✅ Abstand nach außen + perfekte Zentrierung + Rotation
      transform: "translatex(10%) rotate(90deg)",
      transformOrigin: "left center",

      padding: "8px 12px",
      backgroundColor: "#1A1A1A",
      border: "1px solid #AC8E66",
      borderRadius: "8px",
      cursor: "pointer",
      fontFamily: "IBM Plex Mono, monospace",
      fontSize: "11px",
      color: "#e5e5e5",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
      zIndex: 50,
      whiteSpace: "nowrap",
    }}
  >
    <FontAwesomeIcon icon={editorType === "block" ? faAlignLeft : faCode} style={{ color: "#AC8E66" }} />
    {editorType === "block" ? "Markdown Editor" : "Block Editor"}
  </button>
)}

          </div>

          {/* Editor Tab Bar */}
          {showInlineActions && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: '#1A1A1A',
                borderRadius: '0 0 12px 12px',
                borderTop: '1px solid #3A3A3A',
                marginTop: '-1px',
              }}
            >
            <button
              onClick={() => onEditorTypeChange?.(editorType === "block" ? "markdown" : "block")}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                border: '1px solid #3A3A3A',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '11px',
                color: '#e5e5e5',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#AC8E66';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#3A3A3A';
              }}
            >
              <FontAwesomeIcon icon={editorType === "block" ? faAlignLeft : faCode} style={{ color: '#AC8E66' }} />
              {editorType === "block" ? "Markdown" : "Block Editor"}
            </button>
            <button
              onClick={onPreview}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                border: '1px solid #3A3A3A',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '11px',
                color: '#e5e5e5',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#AC8E66';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#3A3A3A';
              }}
            >
              <FontAwesomeIcon icon={faFileLines} style={{ color: '#AC8E66' }} />
              Preview
            </button>
            <button
              onClick={onSaveToProject}
              disabled={!canSaveToProject}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                border: '1px solid #3A3A3A',
                borderRadius: '6px',
                cursor: canSaveToProject ? 'pointer' : 'not-allowed',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '11px',
                color: canSaveToProject ? '#e5e5e5' : '#555',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                opacity: canSaveToProject ? 1 : 0.5,
              }}
              onMouseEnter={(e) => {
                if (canSaveToProject) e.currentTarget.style.borderColor = '#AC8E66';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#3A3A3A';
              }}
            >
              <FontAwesomeIcon icon={faSave} style={{ color: '#AC8E66' }} />
              Speichern
            </button>
            <div style={{ flex: 1 }} />
            <button
              onClick={onNext}
              style={{
                padding: '8px 20px',
                backgroundColor: '#AC8E66',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '11px',
                fontWeight: 'bold',
                color: '#0A0A0A',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
            >
              Weiter
              <FontAwesomeIcon icon={faArrowRight} />
            </button>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 text-center">
            <p className="text-[#E89B5A] font-mono text-[10px]">{error}</p>
          </div>
        )}
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
                    await openExternal(EXTERNAL_DOCS_URL);
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

      {/* Tip Modal */}
      <ZenModal
        isOpen={showTipModal}
        onClose={() => setShowTipModal(false)}
        size="medium"
        showCloseButton={true}
      >
        <div style={{ padding: '24px' }}>
          <h2 style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '18px',
            color: '#AC8E66',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <FontAwesomeIcon icon={faInfoCircle} />
            Unterstützte Dateiformate
          </h2>

          <div style={{
            backgroundColor: '#1A1A1A',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <p style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '13px',
              color: '#e5e5e5',
              lineHeight: '1.8',
              margin: 0,
            }}>
              Du kannst folgende Dateiformate hochladen:
            </p>
            <ul style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
              color: '#999',
              lineHeight: '2',
              marginTop: '12px',
              paddingLeft: '20px',
            }}>
              <li><span style={{ color: '#AC8E66' }}>Markdown</span> (.md, .markdown)</li>
              <li><span style={{ color: '#AC8E66' }}>Word</span> (.docx, .doc)</li>
              <li><span style={{ color: '#AC8E66' }}>HTML</span> (.html, .htm)</li>
              <li><span style={{ color: '#AC8E66' }}>JSON</span> (.json)</li>
              <li><span style={{ color: '#AC8E66' }}>Text</span> (.txt)</li>
            </ul>
          </div>

          <p style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            color: '#777',
            lineHeight: '1.6',
          }}>
            Die Datei wird automatisch zu Markdown konvertiert und die AI optimiert den Inhalt für deine Zielplattform.
          </p>
       
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                   <p style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            color: '#777',
            lineHeight: '1.6',
          }}>
            Hast du ein anderes Format? <span>Nutze einfach den Converter</span> 
       

            </p>
      
          </div>
          <div className='flex justify-center mt-4'>
            <ZenRoughButton
              label="Converter öffnen"
              icon={<FontAwesomeIcon icon={faCheckCircle} className="text-[#AC8E66] " />}
              onClick={() => {
                setShowTipModal(false);
                onOpenConverter?.();
              }}
              variant="active"
            />
          </div>
        </div>
      </ZenModal>
    </div>
  );
};
