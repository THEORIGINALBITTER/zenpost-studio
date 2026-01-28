import { useState } from 'react';
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { save } from '@tauri-apps/plugin-dialog';
import { isTauri } from '@tauri-apps/api/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCode,
  faFilePdf,
  faFileLines,
  faFileAlt,
  faCheck,
  faSpinner,
  faCopy,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';
import { transformContent, type ContentTone, type ContentPlatform } from '../../../../services/aiService';

interface ToneOption {
  value: ContentTone;
  label: string;
  description: string;
}
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  faLinkedin,
  faMedium,
  faWordpress,
  faDev,
  faHashnode,
  faGithub,
} from '@fortawesome/free-brands-svg-icons';
import { ZenModal } from '../components/ZenModal';
import { useOpenExternal } from '../../../../hooks/useOpenExternal';

interface ZenExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  platform?: string;
  onNavigateToTransform?: () => void; // Navigate to Content AI Studio for multi-platform transform
}

interface ExportOption {
  id: string;
  label: string;
  icon: any;
  format: 'html' | 'pdf' | 'markdown' | 'text';
}

interface PublishOption {
  id: string;
  label: string;
  icon: any;
  url: string;
  color: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  { id: 'html', label: 'HTML', icon: faCode, format: 'html' },
  { id: 'pdf', label: 'PDF', icon: faFilePdf, format: 'pdf' },
  { id: 'markdown', label: 'Markdown', icon: faFileLines, format: 'markdown' },
  { id: 'text', label: 'Text', icon: faFileAlt, format: 'text' },
];

const TONE_OPTIONS: ToneOption[] = [
  { value: 'professional', label: 'Professional', description: 'Seriös, business-orientiert' },
  { value: 'casual', label: 'Casual', description: 'Locker, freundlich, nahbar' },
  { value: 'technical', label: 'Technical', description: 'Fachlich, präzise, detailliert' },
  { value: 'enthusiastic', label: 'Enthusiastic', description: 'Begeistert, motivierend, energisch' },
];

// Map PublishOption IDs to ContentPlatform
const PLATFORM_MAP: Record<string, ContentPlatform> = {
  'medium': 'medium',
  'wordpress': 'blog-post',
  'devto': 'devto',
  'hashnode': 'blog-post',
  'linkedin': 'linkedin',
  'github-gist': 'github-blog',
};

const PUBLISH_OPTIONS: PublishOption[] = [
  {
    id: 'medium',
    label: 'Medium',
    icon: faMedium,
    url: 'https://medium.com/new-story',
    color: '#000000',
  },
  {
    id: 'wordpress',
    label: 'WordPress',
    icon: faWordpress,
    url: 'https://wordpress.com/post',
    color: '#21759B',
  },
  {
    id: 'devto',
    label: 'DEV.to',
    icon: faDev,
    url: 'https://dev.to/new',
    color: '#0A0A0A',
  },
  {
    id: 'hashnode',
    label: 'Hashnode',
    icon: faHashnode,
    url: 'https://hashnode.com/draft/new',
    color: '#2962FF',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: faLinkedin,
    url: 'https://www.linkedin.com/feed/?shareActive=true',
    color: '#0077B5',
  },
  {
    id: 'github-gist',
    label: 'GitHub Gist',
    icon: faGithub,
    url: 'https://gist.github.com/',
    color: '#AC8E66',
  },
];

export function ZenExportModal({ isOpen, onClose, content, platform: _platform, onNavigateToTransform }: ZenExportModalProps) {
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportedId, setExportedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [optimizingPlatform, setOptimizingPlatform] = useState<string | null>(null);
  const [optimizedPlatform, setOptimizedPlatform] = useState<string | null>(null);
  const [showToneSelector, setShowToneSelector] = useState(false);
  const [pendingPlatform, setPendingPlatform] = useState<PublishOption | null>(null);
  const { openExternal } = useOpenExternal();

  const createPdfBytes = async (text: string) => {
    const normalizedText = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    const lineHeight = 16;
    const margin = 40;

    let page = pdfDoc.addPage();
    let { width, height } = page.getSize();
    let y = height - margin;

    const maxWidth = width - margin * 2;
    const rawLines = normalizedText.replace(/\r\n/g, '\n').split('\n');

    const wrapLine = (line: string) => {
      if (!line) return [''];
      const words = line.split(' ');
      const lines: string[] = [];
      let current = '';
      words.forEach((word) => {
        const test = current ? `${current} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(test, fontSize);
        if (testWidth <= maxWidth) {
          current = test;
        } else {
          if (current) lines.push(current);
          current = word;
        }
      });
      if (current) lines.push(current);
      return lines;
    };

    const drawLine = (line: string) => {
      if (y < margin + lineHeight) {
        page = pdfDoc.addPage();
        ({ width, height } = page.getSize());
        y = height - margin;
      }
      page.drawText(line, {
        x: margin,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight;
    };

    rawLines.forEach((line) => {
      const wrapped = wrapLine(line);
      wrapped.forEach(drawLine);
      if (line === '') {
        y -= lineHeight / 2;
      }
    });

    return pdfDoc.save();
  };

  const normalizeHtmlEntities = (text: string) =>
    text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

  const handleExport = async (option: ExportOption) => {
    setExportingId(option.id);
    try {
      const normalizedContent = normalizeHtmlEntities(content);
      let fileContent = normalizedContent;
      let extension = 'md';

      switch (option.format) {
        case 'html':
          // Simple markdown to HTML conversion
          fileContent = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Export</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
    pre { background: #f4f4f4; padding: 1rem; border-radius: 4px; overflow-x: auto; }
    code { background: #f4f4f4; padding: 0.2rem 0.4rem; border-radius: 3px; }
  </style>
</head>
<body>
${normalizedContent.replace(/\n/g, '<br>')}
</body>
</html>`;
          extension = 'html';
          break;
        case 'pdf':
          extension = 'pdf';
          break;
        case 'text':
          extension = 'txt';
          break;
        case 'markdown':
        default:
          extension = 'md';
          break;
      }

      const inTauri = isTauri();
      const filePath = inTauri
        ? await save({
            defaultPath: `export.${extension}`,
            filters: [{ name: option.label, extensions: [extension] }],
          })
        : null;

      if (option.format === 'pdf') {
        const pdfBytes = await createPdfBytes(content);
        if (filePath) {
          const ensureExt = (path: string, ext: string) =>
            path.toLowerCase().endsWith(`.${ext}`) ? path : `${path}.${ext}`;
          const normalizedPath = ensureExt(filePath, extension);
          await writeFile(normalizedPath, pdfBytes);
        } else if (typeof window !== 'undefined') {
          const pdfArray = new Uint8Array(pdfBytes);
          const blob = new Blob([pdfArray.buffer], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `export.${extension}`;
          a.click();
          URL.revokeObjectURL(url);
        }
        setExportedId(option.id);
        setTimeout(() => setExportedId(null), 2000);
        return;
      }

      if (filePath) {
        const ensureExt = (path: string, ext: string) =>
          path.toLowerCase().endsWith(`.${ext}`) ? path : `${path}.${ext}`;
        const normalizedPath = ensureExt(filePath, extension);

        await writeTextFile(normalizedPath, fileContent);

        setExportedId(option.id);
        setTimeout(() => setExportedId(null), 2000);
      } else if (!inTauri && typeof window !== 'undefined') {
        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export.${extension}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportingId(null);
    }
  };

  const handlePublish = async (option: PublishOption) => {
    // Copy content to clipboard first
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }

    // Open the platform's posting page
    try {
      console.log('[ZenExportModal] Opening URL:', option.url);
      await openExternal(option.url);
      console.log('[ZenExportModal] URL opened successfully');
    } catch (err) {
      console.error('[ZenExportModal] Failed to open URL:', err);
      // Fallback: try window.open directly
      window.open(option.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Show tone selector before optimization
  const handleOptimizeAndPublish = (option: PublishOption) => {
    setPendingPlatform(option);
    setShowToneSelector(true);
  };

  // Handle tone selection and start optimization
  const handleToneSelected = async (tone: ContentTone) => {
    if (!pendingPlatform) return;

    setShowToneSelector(false);
    const option = pendingPlatform;
    setPendingPlatform(null);
    setOptimizingPlatform(option.id);

    try {
      // Get platform mapping
      const platform = PLATFORM_MAP[option.id] || 'blog-post';

      // Transform content with AI using selected tone
      const result = await transformContent(content, {
        platform,
        tone,
        length: 'medium',
        audience: 'intermediate',
      });

      if (result.success && result.data) {
        // Copy optimized content to clipboard
        await navigator.clipboard.writeText(result.data);
        setOptimizedPlatform(option.id);
        setTimeout(() => setOptimizedPlatform(null), 2000);

        // Open the platform's posting page
        try {
          await openExternal(option.url);
        } catch (err) {
          window.open(option.url, '_blank', 'noopener,noreferrer');
        }
      } else {
        console.error('AI optimization failed:', result.error);
        // Fallback: copy original content and open platform
        await navigator.clipboard.writeText(content);
        try {
          await openExternal(option.url);
        } catch (err) {
          window.open(option.url, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (err) {
      console.error('Optimization failed:', err);
    } finally {
      setOptimizingPlatform(null);
    }
  };

  // Cancel tone selection
  const handleCancelToneSelector = () => {
    setShowToneSelector(false);
    setPendingPlatform(null);
  };

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="large"
      showCloseButton={true}
    >
      <div style={{ padding: '24px', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
        {/* Header */}
        <h2 style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '24px',
          color: '#AC8E66',
          marginBottom: '8px',
          textDecoration: 'underline',
          textUnderlineOffset: '4px',
        }}>
          Export & Veröffentlichen
        </h2>
        <p style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '14px',
          color: '#777',
          marginBottom: '24px',
        }}>
          Exportiere deinen Content oder teile ihn direkt auf Plattformen
        </p>

        <hr style={{ border: 'none', borderTop: '1px solid #AC8E66', marginBottom: '24px' }} />

        {/* Mit KI Transformieren - Prominent CTA */}
        {onNavigateToTransform && (
          <div style={{ marginBottom: '32px' }}>
            <button
              onClick={() => {
                onClose();
                onNavigateToTransform();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '20px 24px',
                backgroundColor: '#AC8E66',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '16px',
                fontWeight: '600',
                color: '#1A1A1A',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#C4A67A';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#AC8E66';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <FontAwesomeIcon icon={faWandMagicSparkles} style={{ fontSize: '20px' }} />
              Mit KI für mehrere Plattformen transformieren
            </button>
            <p style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '11px',
              color: '#777',
              textAlign: 'center',
              marginTop: '8px',
            }}>
              Wähle mehrere Plattformen und erhalte optimierten Content für jede einzelne
            </p>
          </div>
        )}

        {/* Datei-Export Section */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '16px',
            color: '#e5e5e5',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <FontAwesomeIcon icon={faFileLines} style={{ color: '#AC8E66' }} />
            Datei-Export
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
          }}>
            {EXPORT_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => handleExport(option)}
                disabled={exportingId !== null}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  padding: '24px 16px',
                  backgroundColor: '#1A1A1A',
                  border: '2px solid #3A3A3A',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#AC8E66';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#3A3A3A';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <FontAwesomeIcon
                  icon={exportingId === option.id ? faSpinner : (exportedId === option.id ? faCheck : option.icon)}
                  style={{
                    fontSize: '32px',
                    color: exportedId === option.id ? '#4CAF50' : '#AC8E66',
                  }}
                  spin={exportingId === option.id}
                />
                <span style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '14px',
                  color: '#e5e5e5',
                }}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Direkt Veröffentlichen Section */}
        <div>
          <h3 style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '16px',
            color: '#e5e5e5',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <FontAwesomeIcon icon={faMedium} style={{ color: '#AC8E66' }} />
            Direkt Veröffentlichen
          </h3>
          <p style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '12px',
            color: '#777',
            marginBottom: '16px',
          }}>
            Klicke auf eine Plattform, um den Content zu kopieren und die Posting-Seite zu öffnen
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
          }}>
            {PUBLISH_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => handlePublish(option)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  padding: '24px 16px',
                  backgroundColor: '#1A1A1A',
                  border: '2px solid #3A3A3A',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = option.color;
                  e.currentTarget.style.backgroundColor = option.color + '20';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#3A3A3A';
                  e.currentTarget.style.backgroundColor = '#1A1A1A';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <FontAwesomeIcon
                  icon={option.icon}
                  style={{
                    fontSize: '32px',
                    color: '#e5e5e5',
                  }}
                />
                <span style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '14px',
                  color: '#e5e5e5',
                }}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* KI-Optimierung + Veröffentlichen */}
        <div style={{ marginTop: '32px' }}>
          <h3 style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '16px',
            color: '#e5e5e5',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <FontAwesomeIcon icon={faWandMagicSparkles} style={{ color: '#AC8E66' }} />
            Mit KI optimieren & Veröffentlichen
          </h3>
          <p style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '12px',
            color: '#777',
            marginBottom: '16px',
          }}>
            Content wird mit KI verbessert, kopiert und die Plattform geöffnet
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
          }}>
            {PUBLISH_OPTIONS.map((option) => (
              <button
                key={`ai-${option.id}`}
                onClick={() => handleOptimizeAndPublish(option)}
                disabled={optimizingPlatform !== null}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '20px 16px',
                  backgroundColor: optimizedPlatform === option.id ? '#4CAF5020' : '#1A1A1A',
                  border: `2px solid ${optimizedPlatform === option.id ? '#4CAF50' : '#AC8E66'}`,
                  borderRadius: '12px',
                  cursor: optimizingPlatform ? 'wait' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: optimizingPlatform && optimizingPlatform !== option.id ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!optimizingPlatform) {
                    e.currentTarget.style.backgroundColor = '#AC8E6620';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!optimizingPlatform) {
                    e.currentTarget.style.backgroundColor = optimizedPlatform === option.id ? '#4CAF5020' : '#1A1A1A';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                <div style={{ position: 'relative' }}>
                  <FontAwesomeIcon
                    icon={optimizingPlatform === option.id ? faSpinner : (optimizedPlatform === option.id ? faCheck : option.icon)}
                    style={{
                      fontSize: '24px',
                      color: optimizedPlatform === option.id ? '#4CAF50' : '#e5e5e5',
                    }}
                    spin={optimizingPlatform === option.id}
                  />
                  {optimizingPlatform !== option.id && optimizedPlatform !== option.id && (
                    <FontAwesomeIcon
                      icon={faWandMagicSparkles}
                      style={{
                        fontSize: '10px',
                        color: '#AC8E66',
                        position: 'absolute',
                        top: '-4px',
                        right: '-8px',
                      }}
                    />
                  )}
                </div>
                <span style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '12px',
                  color: '#e5e5e5',
                }}>
                  {optimizingPlatform === option.id ? 'Optimiere...' : option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Copy Button */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleCopyToClipboard}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: copied ? '#4CAF50' : '#AC8E66',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '14px',
              color: '#1A1A1A',
              fontWeight: '500',
              transition: 'all 0.2s',
            }}
          >
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
            {copied ? 'Kopiert!' : 'In Zwischenablage kopieren'}
          </button>
        </div>

        {/* Tone Selector Overlay */}
        {showToneSelector && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(26, 26, 26, 0.95)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              borderRadius: '12px',
            }}
          >
            <h3 style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '20px',
              color: '#AC8E66',
              marginBottom: '8px',
              textDecoration: 'underline',
              textUnderlineOffset: '4px',
            }}>
              Schreibstil wählen
            </h3>
            <p style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
              color: '#777',
              marginBottom: '24px',
            }}>
              {pendingPlatform?.label} • Wie soll der Content optimiert werden?
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              maxWidth: '400px',
              width: '100%',
              padding: '0 24px',
            }}>
              {TONE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleToneSelected(option.value)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '16px 12px',
                    backgroundColor: '#1A1A1A',
                    border: '2px solid #AC8E66',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#AC8E6630';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#1A1A1A';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#e5e5e5',
                  }}>
                    {option.label}
                  </span>
                  <span style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '10px',
                    color: '#777',
                    textAlign: 'center',
                  }}>
                    {option.description}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={handleCancelToneSelector}
              style={{
                marginTop: '24px',
                padding: '10px 24px',
                backgroundColor: 'transparent',
                border: '1px solid #555',
                borderRadius: '8px',
                cursor: 'pointer',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '12px',
                color: '#777',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#AC8E66';
                e.currentTarget.style.color = '#e5e5e5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#555';
                e.currentTarget.style.color = '#777';
              }}
            >
              Abbrechen
            </button>
          </div>
        )}
      </div>
    </ZenModal>
  );
}
