import { useEffect, useState, useCallback, useRef } from "react";
import { loadMobileDrafts, optimizeMobileDraftPhoto, type MobileDraft } from "../services/mobileInboxService";
import { join } from "@tauri-apps/api/path";
import { readFile } from "@tauri-apps/plugin-fs";
import { isTauri } from "@tauri-apps/api/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faImage,
  faMobileScreen,
  faPencil,
  faArrowRight,
  faRotateRight,
} from "@fortawesome/free-solid-svg-icons";

const PLATFORM_COLORS: Record<string, string> = {
  LinkedIn: "#0A66C2",
  "Twitter/X": "#1DA1F2",
  Newsletter: "#AC8E66",
};

type Props = {
  onOpenInContentAI?: (draft: MobileDraft, photoSrc: string | null) => void;
};

export function MobileInboxScreen({ onOpenInContentAI }: Props) {
  const [drafts, setDrafts] = useState<MobileDraft[]>([]);
  const [basePath, setBasePath] = useState("");
  const [loading, setLoading] = useState(true);
  const [photoPaths, setPhotoPaths] = useState<Record<string, string>>({});
  // Rohe Dateipfade — nur noch intern für Thumbnail-Fallback genutzt
  const [_photoFilePaths, setPhotoFilePaths] = useState<Record<string, string>>({});
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [importedPackagesNotice, setImportedPackagesNotice] = useState<string | null>(null);
  const [optimizingDraftId, setOptimizingDraftId] = useState<string | null>(null);
  // Blob URLs für Thumbnails — müssen beim Refresh/Unmount revoked werden
  const blobUrlsRef = useRef<string[]>([]);
  const importNoticeTimeoutRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setFailedImages(new Set());
    try {
      const { drafts: loaded, basePath: bp, importedPackages } = await loadMobileDrafts();
      setDrafts(loaded);
      setBasePath(bp);
      if (importedPackages > 0) {
        setImportedPackagesNotice(
          `${importedPackages} Paket${importedPackages === 1 ? "" : "e"} importiert`
        );
        if (importNoticeTimeoutRef.current !== null) {
          window.clearTimeout(importNoticeTimeoutRef.current);
        }
        importNoticeTimeoutRef.current = window.setTimeout(() => {
          setImportedPackagesNotice(null);
          importNoticeTimeoutRef.current = null;
        }, 6000);
      }

      // Alte Blob-URLs freigeben
      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      blobUrlsRef.current = [];

      const paths: Record<string, string> = {};
      const filePaths: Record<string, string> = {};
      for (const d of loaded) {
        if (!isTauri() && d.webPhotoDataUrl) {
          paths[d.id] = d.webPhotoDataUrl;
          continue;
        }
        if (!isTauri() || !d.photoUri) continue;
        if (d.photoUri) {
          const fullPath = await join(bp, d.photoUri);
          filePaths[d.id] = fullPath;
          try {
            const bytes = await readFile(fullPath);
            const ext = fullPath.split('.').pop()?.toLowerCase() ?? 'jpg';
            const mime =
              ext === 'png' ? 'image/png' :
              ext === 'webp' ? 'image/webp' :
              ext === 'gif' ? 'image/gif' :
              ext === 'bmp' ? 'image/bmp' :
              'image/jpeg';
            const blobUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
            blobUrlsRef.current.push(blobUrl);
            paths[d.id] = blobUrl;
          } catch {
            // Foto nicht lesbar — Thumbnail-Placeholder bleibt
          }
        }
      }
      setPhotoPaths(paths);
      setPhotoFilePaths(filePaths);
    } catch {
      setDrafts([]);
      setBasePath("");
      setPhotoPaths({});
      setPhotoFilePaths({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10_000);
    const handleInboxChanged = () => {
      refresh();
    };
    window.addEventListener("zenpost-mobile-inbox-changed", handleInboxChanged);
    return () => {
      clearInterval(interval);
      window.removeEventListener("zenpost-mobile-inbox-changed", handleInboxChanged);
      if (importNoticeTimeoutRef.current !== null) {
        window.clearTimeout(importNoticeTimeoutRef.current);
      }
      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [refresh]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function handleImageError(draftId: string) {
    setFailedImages((prev) => new Set(prev).add(draftId));
  }

  const handleOpenInContentAI = useCallback(async (draft: MobileDraft) => {
    if (!onOpenInContentAI) return;
    setOptimizingDraftId(draft.id);
    try {
      const optimizedPhotoUrl = await optimizeMobileDraftPhoto(draft, basePath);
      onOpenInContentAI(draft, optimizedPhotoUrl);
    } catch {
      // Fallback: ohne Foto öffnen
      onOpenInContentAI(draft, null);
    } finally {
      setOptimizingDraftId(null);
    }
  }, [onOpenInContentAI, basePath]);

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.title}>Mobile Inbox</span>
          <span style={styles.subtitle}>
            {loading
              ? "Lädt…"
              : `${drafts.length} Entwurf${drafts.length !== 1 ? "e" : ""} vom iPhone`}
          </span>
        </div>
        <button style={styles.refreshBtn} onClick={refresh} title="Aktualisieren">
          <FontAwesomeIcon icon={faRotateRight} style={{ fontSize: 14 }} />
        </button>
      </div>

      {/* Pfad-Hinweis */}
      <div style={styles.pathHint}>
        <span style={styles.pathLabel}>Ordner:</span>
        <code style={styles.pathCode}>{basePath || "wird geladen…"}</code>
        {importedPackagesNotice ? (
          <span style={styles.importNotice}>{importedPackagesNotice}</span>
        ) : null}
      </div>

      {/* Inhalt */}
      {loading ? (
        <div style={styles.center}>
          <span style={{ color: "#6B6355", fontFamily: "IBM Plex Mono, monospace" }}>Lädt…</span>
        </div>
      ) : drafts.length === 0 ? (
        <div style={styles.empty}>
          <FontAwesomeIcon icon={faMobileScreen} style={{ fontSize: 36, color: "#2E2A25" }} />
          <div style={styles.emptyTitle}>Keine Entwürfe</div>
          <div style={styles.emptyText}>
            Halte eine Idee auf dem iPhone fest —<br />
            AirDrop die .md-Datei in den Ordner oben.
          </div>
        </div>
      ) : (
        <div style={styles.list}>
          {drafts.map((draft) => {
            const hasPhoto = !!draft.photoUri;
            const photoSrc = photoPaths[draft.id];
            const photoFailed = failedImages.has(draft.id);

            return (
              <div key={draft.id} style={styles.card}>
                {/* Thumbnail — immer anzeigen wenn photoUri vorhanden */}
                <div style={styles.thumbWrapper}>
                  {hasPhoto && photoSrc && !photoFailed ? (
                    <img
                      src={photoSrc}
                      alt=""
                      style={styles.thumb}
                      onError={() => handleImageError(draft.id)}
                    />
                  ) : (
                    <div style={styles.thumbPlaceholder}>
                      <FontAwesomeIcon
                        icon={hasPhoto ? faImage : faPencil}
                        style={{
                          fontSize: 18,
                          color: hasPhoto ? "#AC8E66" : "#3E3A35",
                          opacity: hasPhoto ? 0.6 : 0.4,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={styles.cardBody}>
                  <div style={styles.cardText}>
                    {draft.text || (
                      <span style={{ color: "#4A4540", fontStyle: "italic" }}>Kein Text</span>
                    )}
                  </div>
                  <div style={styles.cardMeta}>
                    <span style={styles.cardDate}>{formatDate(draft.createdAt)}</span>
                    {draft.platform && (
                      <span
                        style={{
                          ...styles.platformTag,
                          borderColor: PLATFORM_COLORS[draft.platform] ?? "#AC8E66",
                          color: PLATFORM_COLORS[draft.platform] ?? "#AC8E66",
                        }}
                      >
                        {draft.platform}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action: In Content AI öffnen */}
                <button
                  style={{
                    ...styles.openBtn,
                    ...(optimizingDraftId === draft.id ? styles.openBtnLoading : {}),
                  }}
                  onClick={() => handleOpenInContentAI(draft)}
                  disabled={optimizingDraftId === draft.id}
                  title="In Content AI öffnen"
                >
                  <span style={styles.openBtnLabel}>
                    {optimizingDraftId === draft.id ? "Optimiert…" : "In Content AI öffnen"}
                  </span>
                  <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: 10 }} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  root: {
    flex: 1,
    display: "flex" as const,
    flexDirection: "column" as const,
    height: "100%",
    backgroundColor: "#0F0F0F",
    fontFamily: "IBM Plex Mono, monospace",
    overflowY: "auto" as const,
  },
  header: {
    display: "flex" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: "32px 32px 16px",
    borderBottom: "1px solid #1E1E1E",
  },
  headerLeft: {
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#AC8E66",
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  subtitle: {
    fontSize: 12,
    color: "#6B6355",
  },
  refreshBtn: {
    background: "transparent",
    border: "1px solid #2E2A25",
    borderRadius: 8,
    color: "#6B6355",
    fontSize: 18,
    cursor: "pointer",
    width: 36,
    height: 36,
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  pathHint: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: 8,
    padding: "10px 32px",
    backgroundColor: "#0A0A0A",
    borderBottom: "1px solid #1E1E1E",
  },
  pathLabel: {
    fontSize: 11,
    color: "#4A4540",
    flexShrink: 0,
  },
  pathCode: {
    fontSize: 10,
    color: "#3E3A35",
    fontFamily: "IBM Plex Mono, monospace",
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    whiteSpace: "nowrap" as const,
  },
  importNotice: {
    marginLeft: 8,
    fontSize: 10,
    color: "#AC8E66",
    border: "1px solid rgba(172,142,102,0.4)",
    borderRadius: 6,
    padding: "3px 7px",
    whiteSpace: "nowrap" as const,
  },
  center: {
    flex: 1,
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  empty: {
    flex: 1,
    display: "flex" as const,
    flexDirection: "column" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 12,
    padding: 48,
    textAlign: "center" as const,
  },
  emptyTitle: {
    fontSize: 16,
    color: "#EDE6D8",
    fontWeight: "600" as const,
    fontFamily: "IBM Plex Mono, monospace",
    marginTop: 8,
  },
  emptyText: {
    fontSize: 12,
    color: "#6B6355",
    lineHeight: "1.6",
    fontFamily: "IBM Plex Mono, monospace",
  },
  list: {
    display: "flex" as const,
    flexDirection: "column" as const,
    padding: "16px 32px",
    gap: 0,
  },
  card: {
    display: "flex" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 16,
    padding: "16px 0",
    borderBottom: "1px solid #1A1A1A",
  },
  thumbWrapper: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: "hidden" as const,
    flexShrink: 0,
    backgroundColor: "#161616",
  },
  thumb: {
    width: 72,
    height: 72,
    objectFit: "cover" as const,
    display: "block" as const,
  },
  thumbPlaceholder: {
    width: "100%",
    height: "100%",
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "#161616",
    border: "1px solid #1E1E1E",
    borderRadius: 8,
  },
  cardBody: {
    flex: 1,
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: 6,
    minWidth: 0,
  },
  cardText: {
    fontSize: 13,
    color: "#EDE6D8",
    lineHeight: "1.5",
    display: "-webkit-box" as const,
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden" as const,
  },
  cardMeta: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  cardDate: {
    fontSize: 11,
    color: "#4A4540",
  },
  platformTag: {
    fontSize: 9,
    border: "1px solid",
    borderRadius: 10,
    padding: "1px 8px",
  },
  openBtn: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: 6,
    padding: "8px 12px",
    background: "transparent",
    border: "0.5px solid rgba(172,142,102,0.3)",
    borderRadius: 8,
    cursor: "pointer",
    color: "#AC8E66",
    flexShrink: 0,
    fontFamily: "IBM Plex Mono, monospace",
    transition: "all 0.15s ease",
  },
  openBtnLabel: {
    fontSize: 9,
    letterSpacing: 0.5,
    whiteSpace: "nowrap" as const,
  },
  openBtnLoading: {
    opacity: 0.6,
    cursor: "not-allowed" as const,
  },
};
