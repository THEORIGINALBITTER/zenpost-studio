import { useState, type DragEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faFile, faFolderOpen, faArrowRight, faNoteSticky, faXmark, faImages } from '@fortawesome/free-solid-svg-icons';
import type { SupportedFormat } from '../../utils/fileConverter';
import { getCloudDocumentUrl } from '../../services/cloudStorageService';
import  { ZenBackButton as _ZenBackButton } from '../../kits/DesignKit';
interface FormatOption {
  value: SupportedFormat;
  label: string;
}

interface Step1FormatSelectionProps {
  detectedFormatLabel: string;
  fileName: string;
  hasInputContent: boolean;
  selectedFormats: SupportedFormat[];
  formatOptions: FormatOption[];
  recentConversions: Array<{
    id: string;
    fileName: string;
    fromFormat: SupportedFormat;
    targetFormats: SupportedFormat[];
    createdAt: number;
    previewImages?: Array<{
      format: SupportedFormat;
      fileName: string;
      url: string;
    }>;
    cloudImageAssets?: Array<{
      format: string;
      fileName: string;
      docId: number;
      url: string;
    }>;
  }>;
  error: string | null;
  isPreparingInput: boolean;
  isConverting: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onToggleFormat: (format: SupportedFormat) => void;
  onApplyRecentTargets: (targets: SupportedFormat[]) => void;
  onDeleteRecentItem: (id: string) => void;
  onClearRecentItems: () => void;
  onInsertRecentIntoContentStudio: (item: Step1FormatSelectionProps['recentConversions'][number]) => void;
  onCreateRecentAsZenNote?: (item: Step1FormatSelectionProps['recentConversions'][number]) => Promise<boolean> | boolean;
  onPreviewRecentItem?: (item: Step1FormatSelectionProps['recentConversions'][number]) => void;
  onUploadFile: (file: File) => void;
  onConvert: () => void;
  onOpenImageGallery?: () => void;
}

export const Step1FormatSelection = ({
  detectedFormatLabel,
  fileName,
  hasInputContent,
  selectedFormats,
  formatOptions,
  recentConversions,
  error,
  isPreparingInput,
  isConverting,
  fileInputRef,
  onToggleFormat,
  onApplyRecentTargets,
  onDeleteRecentItem,
  onClearRecentItems,
  onInsertRecentIntoContentStudio,
  onCreateRecentAsZenNote,
  onPreviewRecentItem,
  onUploadFile,
  onConvert,
  onOpenImageGallery,
}: Step1FormatSelectionProps) => {
  const [isDropActive, setIsDropActive] = useState(false);
  const [previewItem, setPreviewItem] = useState<Step1FormatSelectionProps['recentConversions'][number] | null>(null);
  const [isDownloadingPreview, setIsDownloadingPreview] = useState(false);
  const [isCreatingZenNote, setIsCreatingZenNote] = useState(false);
  const [previewActionFeedback, setPreviewActionFeedback] = useState<string | null>(null);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDropActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onUploadFile(file);
  };

  const canConvert = hasInputContent && selectedFormats.length > 0 && !isPreparingInput && !isConverting;

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const resolvePreviewImages = (item: Step1FormatSelectionProps['recentConversions'][number]) =>
    item.cloudImageAssets && item.cloudImageAssets.length > 0
      ? item.cloudImageAssets.map((asset) => ({
          format: asset.format as SupportedFormat,
          fileName: asset.fileName,
          url: getCloudDocumentUrl(asset.docId) ?? asset.url,
        }))
      : item.previewImages ?? [];

  const showPreviewFeedback = (message: string) => {
    setPreviewActionFeedback(message);
    window.setTimeout(() => setPreviewActionFeedback(null), 2200);
  };

  const downloadImage = async (url: string, fileName: string) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  const handleDownloadPreview = async () => {
    if (!previewItem) return;
    const images = resolvePreviewImages(previewItem);
    if (images.length === 0) return;
    setIsDownloadingPreview(true);
    try {
      for (const image of images) {
        await downloadImage(image.url, image.fileName);
      }
      showPreviewFeedback(
        `${images.length} Bild${images.length !== 1 ? 'er' : ''} gespeichert`
      );
    } catch {
      showPreviewFeedback('Download fehlgeschlagen');
    } finally {
      setIsDownloadingPreview(false);
    }
  };

  const handleCreateZenNote = async () => {
    if (!previewItem || !onCreateRecentAsZenNote) return;
    setIsCreatingZenNote(true);
    try {
      const ok = await onCreateRecentAsZenNote(previewItem);
      showPreviewFeedback(ok ? 'Als ZenNote gespeichert' : 'ZenNote nicht gespeichert');
    } catch {
      showPreviewFeedback('ZenNote nicht gespeichert');
    } finally {
      setIsCreatingZenNote(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: 'clamp(24px, 4vw, 48px) clamp(12px, 3vw, 32px)',
        gap: '14px',
        maxWidth: '1080px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: 'min(100%, 660px)' }}>
        <div
          style={{
            borderRadius: '12px',
            border: '1px solid #b8b0a0',
            background: '#d0cbb8',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '4px 4px 20px rgba(0,0,0,0.28)',
          }}
        >
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDropActive(true); }}
            onDragEnter={(e) => { e.preventDefault(); setIsDropActive(true); }}
            onDragLeave={() => setIsDropActive(false)}
            onDrop={handleDrop}
            onClick={() => !isPreparingInput && fileInputRef.current?.click()}
            style={{
              borderRadius: '10px',
              border: isDropActive
                ? '1px dashed #3A3A3A'
                : hasInputContent
                ? '1px solid rgba(#3e362c)'
                : '1px dashed rgba(#3e362c)',
              background: isDropActive
                ? 'rgba(#d2cabd)'
                : hasInputContent
                ? 'rgba(#e8e3d8)'
                : 'rgba(255,255,255,0.28)',
              padding: '20px 14px',
              minHeight: '86px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              cursor: isPreparingInput ? 'wait' : 'pointer',
              transition: 'border-color 0.2s, background 0.2s',
            }}
          >
            <FontAwesomeIcon
              icon={isDropActive ? faFolderOpen : faFile}
              style={{
                fontSize: '16px',
                color: isDropActive ? '#1a1a1a' : hasInputContent ? '#3e362c' : '#3e362c',
                transition: 'color 0.2s',
              }}
            />
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'IBM Plex Mono, monospace',
                color: isDropActive ? '#1a1a1a' : '#252525',
                textAlign: 'center',
                fontWeight: isDropActive ? 500 : 400,
              }}
            >
              {isPreparingInput
                ? 'Datei wird vorbereitet…'
                : isDropActive
                ? 'Loslassen zum Importieren'
                : hasInputContent
                ? fileName
                : 'Datei hier ablegen oder klicken'}
            </span>
            <span style={{ fontSize: '9px', color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', textAlign: 'center' }}>
              {isPreparingInput
                ? ''
                : isDropActive
                ? ''
                : hasInputContent
                ? `${detectedFormatLabel} erkannt · klicken zum Wechseln`
                : 'Formate · .md .txt .json .html .pdf .docx .pages .png .jpg .jpeg .webp .svg'}
            </span>
          </div>

          {/* Format selection */}
          <div>
            <p
              style={{
                fontSize: '9px',
                color: '#7a7060',
                fontFamily: 'IBM Plex Mono, monospace',
                margin: '0 0 8px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Ausgabeformate — Mehrfachwahl
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {formatOptions.map((opt) => {
                const isSel = selectedFormats.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onToggleFormat(opt.value)}
                    style={{
                      padding: '6px 4px',
                      borderRadius: '6px',
                      border: isSel ? '1px solid rgba(172,142,102,0.7)' : '1px solid rgba(90,80,60,0.3)',
                      background: isSel ? '#3e362c' : 'rgba(255,255,255,0.3)',
                      color: isSel ? '#fff' : '#5a5040',
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '10px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s',
                      fontWeight: isSel ? 500 : 400,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(172,142,102,0.25)' }} />

          {/* Convert button row */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={onConvert}
              disabled={!canConvert}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '8px',
                border: canConvert ? '1px solid rgba(172,142,102,0.65)' : '1px solid rgba(172,142,102,0.2)',
                background: canConvert ? '#3e362c' : 'rgba(172,142,102,0.12)',
                color: canConvert ? '#fff' : '#9a8870',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '12px',
                cursor: canConvert ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                fontWeight: 500,
              }}
            >
              <FontAwesomeIcon icon={faArrowRight} />
              {isPreparingInput ? 'Datei wird vorbereitet…' : 'Jetzt konvertieren'}
            </button>

        
          </div>

          {error && (
            <div
              style={{
                borderRadius: '6px',
                border: '1px solid rgba(180,80,80,0.45)',
                background: 'rgba(180,80,80,0.08)',
                padding: '8px 10px',
                fontSize: '10px',
                color: '#8b3a3a',
                fontFamily: 'IBM Plex Mono, monospace',
              }}
            >
              {error}
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,.txt,.json,.html,.htm,.pdf,.docx,.doc,.pages,.png,.jpg,.jpeg,.webp,.svg,.js,.jsx,.ts,.tsx,.py,.rs,.go,.java,.c,.cpp,.h,.hpp,.cs,.php,.rb,.swift,.kt,.scala"
          style={{ display: 'none' }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUploadFile(file);
            event.currentTarget.value = '';
          }}
        />
      </div>

      {/* ─── Bottom: conversion map ─── */}
      <div
        style={{
          width: 'min(100%, 660px)',
          borderRadius: '14px',
          border: '0.5px solid #2F2F2F',
          padding: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
          <p
            style={{
              margin: 0,
              fontSize: '9px',
              color: '#b0ac9b',
              fontFamily: 'IBM Plex Mono, monospace',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            Konvertierungs-Mappe
          </p>
          <button
            type="button"
            onClick={onClearRecentItems}
            disabled={recentConversions.length === 0}
            style={{
              borderRadius: '6px',
              border: '1px solid rgba(90,80,60,0.35)',
              background: recentConversions.length > 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
              color: recentConversions.length > 0 ? '#bfa985' : '#7d7568',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '9px',
              padding: '4px 8px',
              cursor: recentConversions.length > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            Alle leeren
          </button>
        </div>
        {recentConversions.length === 0 ? (
          <div
            style={{
              borderRadius: '8px',
              border: '0.5px solid #2F2F2F',
              padding: '12px',
              fontSize: '10px',
              color: '#555',
              fontFamily: 'IBM Plex Mono, monospace',
            }}
          >
            Noch keine Konvertierungen vorhanden.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '210px', overflow: 'auto' }}>
            {recentConversions.map((item) => (
              <div
                key={item.id}
                style={{
                  borderRadius: '8px',
                  border: '0.5px solid #3A3A3A',
                  background: 'rgba(255,255,255,0.01)',
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '11px',
                      color: '#E7CCAA',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: '3px',
                    }}
                  >
                    {item.fileName}
                  </div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#8E8E8E' }}>
                    {item.fromFormat.toUpperCase()} → {item.targetFormats.map((f) => f.toUpperCase()).join(', ')}
                  </div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px', color: '#555', marginTop: '2px' }}>
                    {formatDate(item.createdAt)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onPreviewRecentItem?.(item);
                    setPreviewItem(item);
                  }}
                  disabled={resolvePreviewImages(item).length === 0}
                  style={{
                    borderRadius: '6px',
                    border: '1px solid rgba(120,120,160,0.4)',
                    background: resolvePreviewImages(item).length > 0 ? 'rgba(120,120,160,0.1)' : 'rgba(255,255,255,0.02)',
                    color: resolvePreviewImages(item).length > 0 ? '#c9c8ef' : '#7d7568',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '10px',
                    padding: '6px 8px',
                    cursor: resolvePreviewImages(item).length > 0 ? 'pointer' : 'not-allowed',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Ansehen
                </button>
                <button
                  type="button"
                  onClick={() => onApplyRecentTargets(item.targetFormats)}
                  style={{
                    borderRadius: '6px',
                    border: '1px solid rgba(172,142,102,0.45)',
                    background: 'rgba(172,142,102,0.12)',
                    color: '#d9c29e',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '10px',
                    padding: '6px 8px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Ziele übernehmen
                </button>
                {item.cloudImageAssets && item.cloudImageAssets.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onInsertRecentIntoContentStudio(item)}
                    style={{
                      borderRadius: '6px',
                      border: '1px solid rgba(70,120,90,0.45)',
                      background: 'rgba(70,120,90,0.12)',
                      color: '#a8d0b2',
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '10px',
                      padding: '6px 8px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    In Content Studio einfügen
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDeleteRecentItem(item.id)}
                  style={{
                    borderRadius: '6px',
                    border: '1px solid rgba(140,80,80,0.4)',
                    background: 'rgba(160,90,90,0.1)',
                    color: '#b0ac9b',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '10px',
                    padding: '6px 8px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Löschen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewItem && resolvePreviewImages(previewItem).length > 0 && (
        <div
          onClick={() => setPreviewItem(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '24px',
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(920px, 100%)',
              maxHeight: '82vh',
              overflow: 'auto',
              borderRadius: '12px',
              border: '1px solid rgba(208,203,184,0.28)',
              background: '#e8e3d8',
              boxShadow: '0 18px 60px rgba(0,0,0,0.45)',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', gap: '10px' }}>
              <div style={{ minWidth: 0 }}>
              
                <div style={{ color: '#3e362c', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', marginTop: '4px' }}>
                  Bild-Vorschau aus der Konvertierungs-Mappe
                </div>
                  <div style={{ color: '#3e362c', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px' }}>
                  {previewItem.fileName}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {previewActionFeedback ? (
                  <div style={{ color: '#8fc29d', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px' }}>
                    {previewActionFeedback}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => { void handleDownloadPreview(); }}
                  disabled={isDownloadingPreview}
                  style={{
                    borderRadius: '7px',
                    border: '1px solid rgba(172,142,102,0.32)',
                    background: 'rgba(172,142,102,0.08)',
                    color: '#3e362c',
                    minHeight: '36px',
                    padding: '0 12px',
                    cursor: isDownloadingPreview ? 'wait' : 'pointer',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                  }}
                >
                  <FontAwesomeIcon icon={faDownload} />
                  <span>{isDownloadingPreview ? 'Speichert…' : 'Download speichern'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { void handleCreateZenNote(); }}
                  disabled={isCreatingZenNote || !onCreateRecentAsZenNote}
                  style={{
                    borderRadius: '7px',
                    border: '1px solid rgba(94,163,111,0.32)',
                    background: 'rgba(94,163,111,0.08)',
                    color: onCreateRecentAsZenNote ? '#3e362c' : '#7d7568',
                    minHeight: '36px',
                    padding: '0 12px',
                    cursor: isCreatingZenNote ? 'wait' : onCreateRecentAsZenNote ? 'pointer' : 'not-allowed',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                  }}
                >
                  <FontAwesomeIcon icon={faNoteSticky} />
                  <span>{isCreatingZenNote ? 'Erstellt…' : 'Als ZenNote Quicknote'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  style={{
                    borderRadius: '8px',
                    border: '1px solid rgba(30, 24, 16, 0.22)',
                    background: 'rgba(255,255,255,0.02)',
                    color: '#3e362c',
                    minHeight: '40px',
                    minWidth: '40px',
                    padding: '0 12px',
                    cursor: 'pointer',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <FontAwesomeIcon icon={faXmark} />
                  <span>Schließen</span>
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              {resolvePreviewImages(previewItem).map((image) => (
                <div
                  key={`${image.format}-${image.fileName}`}
                  style={{
                    borderRadius: '10px',
                    border: '1px solid #2f2f2f',
                    background: '#252525',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '10px', borderBottom: '1px solid #222' }}>
                    <div style={{ color: '#E7CCAA', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', wordBreak: 'break-word' }}>
                      {image.fileName}
                    </div>
                 
                  </div>
                  <div style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '220px', background: '#1a1a1a' }}>
                    <img
                      src={image.url}
                      alt={image.fileName}
                      style={{ maxWidth: '100%', maxHeight: '320px', objectFit: 'contain', display: 'block' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
