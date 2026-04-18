import { useCallback, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudUploadAlt,
  faTrash,
  faCopy,
  faCheck,
  faSpinner,
  faImages,
  faExclamationTriangle,
  faRefresh,
} from '@fortawesome/free-solid-svg-icons';
import { ZenModal } from '../components/ZenModal';
import {
  canUploadToZenCloud,
  deleteCloudDocument,
  getCloudDocumentUrl,
  listCloudDocuments,
  uploadCloudDocument,
  type CloudDocumentInfo,
} from '../../../../services/cloudStorageService';
import { loadZenStudioSettings } from '../../../../services/zenStudioSettingsService';

const mono = 'IBM Plex Mono, monospace';
const gold = '#252525';
const IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/gif',
  'image/avif',
]);

interface GalleryImage extends CloudDocumentInfo {
  previewUrl: string;
}

interface ZenImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertUrl?: (url: string, fileName: string) => void;
}

export function ZenImageGalleryModal({ isOpen, onClose, onInsertUrl }: ZenImageGalleryModalProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragCounter = useRef(0);

  // Keyboard navigation: Escape schließt Lightbox, Pfeile navigieren
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (lightboxIndex !== null) {
        if (e.key === 'Escape') { setLightboxIndex(null); return; }
        if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); setLightboxIndex((i) => i !== null ? Math.min(i + 1, images.length - 1) : null); }
        if (e.key === 'ArrowLeft') { setLightboxIndex((i) => i !== null ? Math.max(i - 1, 0) : null); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, lightboxIndex, images.length]);

  const cloudAvailable = canUploadToZenCloud();
  const settings = loadZenStudioSettings();
  const projectId = settings.cloudProjectId;
  const projectName = settings.cloudProjectName ?? 'ZenCloud';

  const loadImages = useCallback(async () => {
    if (!projectId || !cloudAvailable) return;
    setLoading(true);
    setError(null);
    try {
      const docs = await listCloudDocuments(projectId);
      if (!docs) { setError('Verbindung zu ZenCloud fehlgeschlagen.'); return; }
      const imgs: GalleryImage[] = docs
        .filter((d) => IMAGE_MIME_TYPES.has(d.mimeType))
        .map((d) => ({ ...d, previewUrl: getCloudDocumentUrl(d.id) ?? '' }))
        .reverse();
      setImages(imgs);
    } catch {
      setError('Bilder konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [projectId, cloudAvailable]);

  useEffect(() => {
    if (isOpen) loadImages();
    else { setImages([]); setError(null); setUploadFeedback(null); }
  }, [isOpen, loadImages]);

  const handleUploadFiles = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((f) => IMAGE_MIME_TYPES.has(f.type));
    if (!imageFiles.length) return;
    setUploading(true);
    setUploadFeedback(null);
    let uploaded = 0;
    for (const file of imageFiles) {
      const result = await uploadCloudDocument(file);
      if (result) uploaded++;
    }
    setUploading(false);
    if (uploaded > 0) {
      setUploadFeedback(`${uploaded} Bild${uploaded !== 1 ? 'er' : ''} hochgeladen`);
      window.setTimeout(() => setUploadFeedback(null), 3000);
      await loadImages();
    } else {
      setError('Upload fehlgeschlagen — ZenCloud-Verbindung prüfen.');
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current <= 0) { dragCounter.current = 0; setIsDragOver(false); }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) await handleUploadFiles(e.dataTransfer.files);
  };

  const handleCopyUrl = async (img: GalleryImage) => {
    if (!img.previewUrl) return;
    try {
      await navigator.clipboard.writeText(img.previewUrl);
      setCopiedId(img.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleDelete = async (img: GalleryImage) => {
    setDeletingId(img.id);
    const ok = await deleteCloudDocument(img.id);
    setDeletingId(null);
    if (ok) setImages((prev) => prev.filter((i) => i.id !== img.id));
    else setError(`Löschen fehlgeschlagen: ${img.fileName}`);
  };

  

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const notReady = !cloudAvailable || !projectId;

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={lightboxIndex !== null ? () => setLightboxIndex(null) : onClose}
      size="xxl"
      theme="paper"
      title="ZenImage Gallery"
      subtitle={`@ZenCloud // ${projectName}`}
      bodyStyle={{ padding: 0 }}
       showCloseButton={lightboxIndex === null}
    >
      <div
        style={{ display: 'flex', flexDirection: 'column', fontFamily: mono }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag-Over Overlay */}
        {isDragOver && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 50,
              background: 'rgba(172,142,102,0.18)',
              border: `2px dashed ${gold}`,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <div style={{ textAlign: 'center', color: gold }}>
              <FontAwesomeIcon icon={faCloudUploadAlt} style={{ fontSize: 40, marginBottom: 12 }} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>Bilder hier ablegen</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>PNG, JPG, WEBP, SVG, GIF</div>
            </div>
          </div>
        )}

        {/* Toolbar — sticky */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: '#1c1c1c',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 10, color: '#e8e3d8', textTransform: 'uppercase', letterSpacing: 1, flex: 1 }}>
            {loading ? 'Lade…' : `${images.length} Bild${images.length !== 1 ? 'er' : ''}`}
          </span>

          {uploadFeedback && (
            <span style={{ fontSize: 10, color: '#9fd2ad', background: 'rgba(60,120,80,0.22)', border: '1px solid rgba(100,170,120,0.35)', borderRadius: 6, padding: '3px 8px' }}>
              <FontAwesomeIcon icon={faCheck} style={{ marginRight: 5 }} />
              {uploadFeedback}
            </span>
          )}

          <button
            type="button"
            onClick={() => void loadImages()}
            disabled={loading}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6,
              color: '#aaa',
              padding: '5px 10px',
              cursor: 'pointer',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <FontAwesomeIcon icon={faRefresh} style={{ opacity: loading ? 0.4 : 1 }} />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => e.target.files && void handleUploadFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || notReady}
            style={{
              background: uploading || notReady ? 'rgba(172,142,102,0.2)' : gold,
              border: `1px solid ${gold}`,
              borderRadius: 6,
              color: uploading || notReady ? '#888' : '#e8e3d8',
              padding: '5px 12px',
              cursor: uploading || notReady ? 'not-allowed' : 'pointer',
              fontSize: 11,
              fontFamily: mono,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <FontAwesomeIcon icon={uploading ? faSpinner : faCloudUploadAlt} spin={uploading} />
            {uploading ? 'Upload…' : 'Bild hochladen'}
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{ padding: '8px 16px', background: 'rgba(180,60,60,0.18)', borderBottom: '1px solid rgba(200,80,80,0.3)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#e07070', fontSize: 11 }} />
            <span style={{ fontSize: 11, color: '#e07070' }}>{error}</span>
            <button type="button" onClick={() => setError(null)} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', marginLeft: 'auto', fontSize: 12 }}>×</button>
          </div>
        )}

        {/* Not connected */}
        {notReady ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#666' }}>
            <FontAwesomeIcon icon={faImages} style={{ fontSize: 32, opacity: 0.4 }} />
            <div style={{ fontSize: 12 }}>ZenCloud Login + aktives Projekt erforderlich</div>
            <div style={{ fontSize: 10, opacity: 0.6 }}>Einstellungen → Cloud</div>
          </div>
        ) : loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#666' }}>
            <FontAwesomeIcon icon={faSpinner} spin />
            <span style={{ fontSize: 12 }}>Lade Bilder aus ZenCloud…</span>
          </div>
        ) : images.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
            <FontAwesomeIcon icon={faImages} style={{ fontSize: 40, color: '#444' }} />
            <div style={{ fontSize: 12, color: '#666' }}>Noch keine Bilder in diesem Projekt</div>
            <div style={{ fontSize: 10, color: '#e8e3d8' }}>Bilder per Drag & Drop oder Upload-Button hinzufügen</div>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                marginTop: 8,
                padding: '10px 20px',
                border: `1px dashed ${gold}`,
                borderRadius: 8,
                color: gold,
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              <FontAwesomeIcon icon={faCloudUploadAlt} style={{ marginRight: 8 }} />
              Erstes Bild hochladen
            </div>
          </div>
        ) : (
          /* Image Grid */
          <div
            style={{
              padding: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
              alignContent: 'start',
            }}
          >
            {images.map((img) => (
              <ImageCard
                key={img.id}
                img={img}
                isCopied={copiedId === img.id}
                isDeleting={deletingId === img.id}
                onCopy={() => void handleCopyUrl(img)}
                onDelete={() => void handleDelete(img)}
                onInsert={onInsertUrl ? () => onInsertUrl(img.previewUrl, img.fileName) : undefined}
                onLightbox={() => setLightboxIndex(images.indexOf(img))}
                formatBytes={formatBytes}
              />
            ))}
            {/* Upload Drop Target at end of grid */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                height: 200,
                border: `1px dashed rgba(172,142,102,0.35)`,
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
                color: '#e8e3d8',
                fontSize: 10,
              }}
            >
              <FontAwesomeIcon icon={faCloudUploadAlt} style={{ fontSize: 20, color: '#444' }} />
              <span>Hochladen</span>
            </div>
          </div>
        )}

        {/* Drag hint footer — sticky */}
        {!notReady && !loading && (
          <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', position: 'sticky', bottom: 0, background: '#1c1c1c', textAlign: 'center', zIndex: 10 }}>
            <span style={{ fontSize: 9, color: '#e8e3d8', textTransform: 'uppercase', letterSpacing: 1 }}>
              Drag & Drop zum Hochladen · Leertaste / Pfeile für Vorschau
            </span>
          </div>
        )}

        {/* Lightbox — fixed über alles */}
        {lightboxIndex !== null && images[lightboxIndex] && (
          <div
            onClick={() => setLightboxIndex(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: '#d2cabd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Prev */}
            {lightboxIndex > 0 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => i !== null ? i - 1 : null); }}
                style={{ 
                  position: 'absolute', 
                  left: 16, 
                    top: '50%',
                  background: '#252525', 
                  border: 'none', 
                  borderRadius: '999px', 
                  width: 36, 
                  height: 36, 
                  color: '#e8e3d8', cursor: 'pointer', fontSize: 10}}
              >‹</button>
            )}

            <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '80%', maxHeight: '80%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <img
                src={images[lightboxIndex].previewUrl}
                alt={images[lightboxIndex].fileName}
                style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: 8,  }}
              />
              <div style={{ fontFamily: mono, fontSize: 11, color: '#252525', textAlign: 'center' }}>
                {images[lightboxIndex].fileName} · {formatBytes(images[lightboxIndex].sizeBytes)}
                <span style={{ marginLeft: 8, opacity: 1, fontSize: 11, color: '#252525' }}>· Index: {lightboxIndex + 1} / {images.length}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => void handleCopyUrl(images[lightboxIndex!])}
                  style={{ background: 'rgba(172,142,102,0.2)', border: `1px solid ${gold}`, borderRadius: 6, color: copiedId === images[lightboxIndex].id ? '#9fd2ad' : gold, padding: '6px 14px', cursor: 'pointer', fontFamily: mono, fontSize: 10 }}
                >
                  <FontAwesomeIcon icon={copiedId === images[lightboxIndex].id ? faCheck : faCopy} style={{ marginRight: 6 }} />
                  {copiedId === images[lightboxIndex].id ? 'Kopiert' : 'URL kopieren'}
                </button>
              </div>
            </div>

            {/* Next */}
            {lightboxIndex < images.length - 1 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => i !== null ? i + 1 : null); }}
                style={{ 
  position: 'absolute', 
right: 16,
  top: '50%',
  transform: 'translateY(-50%)',
  background: '#252525', 
  border: 'none', 
  borderRadius: '999px', 
  width: 36, 
  height: 36, 
  color: '#e8e3d8', 
  cursor: 'pointer', 
  fontSize: 10
}}
              >›</button>
            )}

            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', color: '#252525', cursor: 'pointer', fontSize: 20 }}
            >×</button>
          </div>
        )}
      </div>
    </ZenModal>
  );
}

interface ImageCardProps {
  img: GalleryImage;
  isCopied: boolean;
  isDeleting: boolean;
  onCopy: () => void;
  onDelete: () => void;
  onInsert?: () => void;
  onLightbox: () => void;
  formatBytes: (b: number) => string;
}

function ImageCard({ img, isCopied, isDeleting, onCopy, onDelete, onInsert, onLightbox, formatBytes }: ImageCardProps) {
  const [hovered, setHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 8,
        border: `1px solid ${hovered ? 'rgba(172,142,102,0.5)' : 'rgba(255,255,255,0.1)'}`,
        background: hovered ? '#2a2a2a' : '#222',
        overflow: 'hidden',
        transition: 'border-color 0.15s, background 0.15s',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
      }}
    >
      {/* Thumbnail */}
      <div
        onClick={onLightbox}
        style={{
          height: 160,
          background: '#e8e3d8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {img.previewUrl && !imgError ? (
          <>
            {!imgLoaded && (
              <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 16, color: '#e8e3d8', position: 'absolute' }} />
            )}
            <img
              src={img.previewUrl}
              alt={img.fileName}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: imgLoaded ? 'block' : 'none' }}
            />
          </>
        ) : (
          <FontAwesomeIcon icon={faImages} style={{ fontSize: 22, color: '#e8e3d8' }} />
        )}
        {/* Hover overlay */}
        {hovered && imgLoaded && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesomeIcon icon={faImages} style={{ color: '#e8e3d8', fontSize: 18 }} />
          </div>
        )}
      </div>

      {/* Meta */}
      <div style={{ padding: '6px 8px', flex: 1 }}>
        <div style={{ fontSize: 9, color: '#e8e3d8', fontFamily: mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={img.fileName}>
          {img.fileName}
        </div>
        <div style={{ fontSize: 8, color: '#e8e3d8', fontFamily: mono, marginTop: 2 }}>
         Größe {formatBytes(img.sizeBytes)}
        </div>
      </div>

      {/* Action row */}
      <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <button
          type="button"
          onClick={onCopy}
          title="URL kopieren"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            color: isCopied ? '#9fd2ad' : '#777',
            padding: '6px 0',
            cursor: 'pointer',
            fontSize: 10,
            fontFamily: mono,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <FontAwesomeIcon icon={isCopied ? faCheck : faCopy} />
          {isCopied ? 'Kopiert' : 'URL'}
        </button>

        {onInsert && (
          <button
            type="button"
            onClick={onInsert}
            title="In Editor einfügen"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              borderRight: '1px solid rgba(255,255,255,0.05)',
              color: '#7a9aff',
              padding: '6px 0',
              cursor: 'pointer',
              fontSize: 9,
              fontFamily: mono,
            }}
          >
            Einfügen
          </button>
        )}

        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          title="Löschen"
          style={{
            background: 'transparent',
            border: 'none',
            color: isDeleting ? '#e8e3d8' : '#c06060',
            padding: '6px 10px',
            cursor: isDeleting ? 'not-allowed' : 'pointer',
            fontSize: 10,
          }}
        >
          <FontAwesomeIcon icon={isDeleting ? faSpinner : faTrash} spin={isDeleting} />
        </button>
      </div>
    </div>
  );
}
