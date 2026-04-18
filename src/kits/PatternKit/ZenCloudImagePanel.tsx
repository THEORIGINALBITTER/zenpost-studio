import { useCallback, useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowsRotate, faCheck, faImage, faWandMagicSparkles, faXmark } from '@fortawesome/free-solid-svg-icons';
import {
  getCloudDocumentUrl,
  listCloudDocuments,
  type CloudDocumentInfo,
} from '../../services/cloudStorageService';
import { openImageAssetInConverter } from '../../services/assetActionService';
import { insertContentStudioImages } from '../../services/contentStudioBridgeService';
import { subscribeToCloudSessionSync } from '../../services/cloudSessionSyncService';
import { loadZenStudioSettings } from '../../services/zenStudioSettingsService';

const gold = '#AC8E66';
const border = '#2a2a2a';
const fontMono = 'IBM Plex Mono, monospace';

interface ZenCloudImagePanelProps {
  onClose: () => void;
}

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'avif']);

function isImageDocument(doc: CloudDocumentInfo): boolean {
  if (doc.mimeType.toLowerCase().startsWith('image/')) return true;
  const extension = doc.fileName.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.has(extension);
}

function fileNameToAlt(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Bild';
}

export function ZenCloudImagePanel({ onClose }: ZenCloudImagePanelProps) {
  const [documents, setDocuments] = useState<CloudDocumentInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [insertedId, setInsertedId] = useState<number | null>(null);
  const [converterId, setConverterId] = useState<number | null>(null);
  const settings = loadZenStudioSettings();
  const isLoggedIn = !!settings.cloudAuthToken && !!settings.cloudProjectId;

  const load = useCallback(async () => {
    const current = loadZenStudioSettings();
    if (!current.cloudProjectId || !current.cloudAuthToken) {
      setDocuments([]);
      return;
    }
    setLoading(true);
    const docs = await listCloudDocuments(current.cloudProjectId);
    setDocuments((docs ?? []).filter(isImageDocument));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return subscribeToCloudSessionSync(() => {
      void load();
    });
  }, [load]);

  const imageDocs = useMemo(
    () => [...documents].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    [documents],
  );

  const handleInsert = (doc: CloudDocumentInfo) => {
    const url = getCloudDocumentUrl(doc.id);
    if (!url) return;
    insertContentStudioImages({
      images: [{ url, alt: fileNameToAlt(doc.fileName) }],
    });
    setInsertedId(doc.id);
    window.setTimeout(() => setInsertedId(null), 1800);
  };

  const handleOpenInConverter = async (doc: CloudDocumentInfo) => {
    try {
      const result = await openImageAssetInConverter({
        source: 'cloud',
        fileName: doc.fileName,
        docId: doc.id,
        mimeType: doc.mimeType,
      });
      if (!result.success) return;
      setConverterId(doc.id);
      window.setTimeout(() => setConverterId(null), 1800);
    } catch {
      // keep panel stable if the image cannot be loaded right now
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 320,
        background: '#111',
        borderLeft: `1px solid ${border}`,
        borderRadius: '0 10px 10px 0',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
        boxShadow: '-6px 0 24px rgba(0,0,0,0.4)',
        fontFamily: fontMono,
      }}
    >
      <div
        style={{
          padding: '10px 12px 8px',
          borderBottom: `1px solid #1e1e1e`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FontAwesomeIcon icon={faImage} style={{ fontSize: 11, color: gold }} />
          <span style={{ fontSize: 11, color: '#d0cbb8', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
            ZenCloud Bilder
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={() => { void load(); }}
            disabled={loading}
            style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 11, padding: '2px 4px' }}
            title="Bilder neu laden"
          >
            <FontAwesomeIcon icon={faArrowsRotate} spin={loading} />
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 13, padding: '2px 4px' }}
            title="Panel schließen"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      </div>

      <div style={{ padding: '10px 12px', borderBottom: `1px solid #1a1a1a`, color: '#e8e3d8', fontSize: 10, lineHeight: 1.5 }}>
        Bilder aus dem aktiven ZenCloud-Projekt direkt in den Editor einfügen.
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 12px' }}>
        {!isLoggedIn ? (
          <div
            style={{
              marginTop: 18,
              border: `1px dashed ${gold}55`,
              borderRadius: 8,
              padding: '16px 14px',
              color: '#e8e3d8',
              fontSize: 12,
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            ZenCloud Bilder benötigen einen aktiven Login mit Projekt.
          </div>
        ) : null}

        {isLoggedIn && !loading && imageDocs.length === 0 ? (
          <div
            style={{
              marginTop: 18,
              border: `1px dashed ${border}`,
              borderRadius: 8,
              padding: '16px 14px',
              color: '#8b8479',
              fontSize: 11,
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            Keine Bilder im aktuellen ZenCloud-Projekt gefunden.
          </div>
        ) : null}

        {imageDocs.map((doc) => {
          const imageUrl = getCloudDocumentUrl(doc.id);
          return (
            <div
              key={doc.id}
              style={{
                border: `1px solid ${border}`,
                borderRadius: 8,
                marginBottom: 10,
                background: '#252525',
                overflow: 'hidden',
              }}
            >
              <div style={{ height: 128, background: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={doc.fileName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <FontAwesomeIcon icon={faImage} style={{ color: '#444', fontSize: 22 }} />
                )}
              </div>
              <div style={{ padding: '10px 10px 8px' }}>
                <div style={{ color: '#e8e3d8', fontSize: 11, lineHeight: 1.5, wordBreak: 'break-word' }}>{doc.fileName}</div>
                <div style={{ color: '#e8e3d8', fontSize: 10, marginTop: 4 }}>
                  {doc.mimeType || 'image'} · {new Date(doc.createdAt).toLocaleDateString('de-DE')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleInsert(doc)}
                    disabled={!imageUrl}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: `1px solid ${insertedId === doc.id ? '#5ea36f' : `${gold}66`}`,
                      background: insertedId === doc.id ? 'rgba(94,163,111,0.14)' : 'transparent',
                      color: insertedId === doc.id ? '#8ed39f' : '#d0cbb8',
                      cursor: imageUrl ? 'pointer' : 'not-allowed',
                      fontFamily: fontMono,
                      fontSize: 10,
                    }}
                  >
                    <FontAwesomeIcon icon={insertedId === doc.id ? faCheck : faImage} style={{ marginRight: 6 }} />
                    {insertedId === doc.id ? 'Eingefügt' : 'In Editor'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { void handleOpenInConverter(doc); }}
                    disabled={!imageUrl}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: `1px solid ${converterId === doc.id ? '#5ea36f' : `${gold}66`}`,
                      background: converterId === doc.id ? 'rgba(94,163,111,0.14)' : 'transparent',
                      color: converterId === doc.id ? '#8ed39f' : '#d0cbb8',
                      cursor: imageUrl ? 'pointer' : 'not-allowed',
                      fontFamily: fontMono,
                      fontSize: 10,
                    }}
                  >
                    <FontAwesomeIcon icon={converterId === doc.id ? faCheck : faWandMagicSparkles} style={{ marginRight: 6 }} />
                    {converterId === doc.id ? 'Im Converter' : 'Converter'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
