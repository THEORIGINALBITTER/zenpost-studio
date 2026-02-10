import { useEffect, useMemo, useRef, useState } from "react";
import { ZenModal } from "../components/ZenModal";
import { MODAL_CONTENT } from "../config/ZenModalConfig";
import { ZenRoughButton } from "../components/ZenRoughButton";
import { ZenMetadataPanel } from "../components/ZenMetadataPanel";
import type { ProjectMetadata } from "./ZenMetadataModal";
import { getPublishingPaths } from "../../../../services/publishingService";
import type { ZenArticle } from "../../../../services/publishingService";
import type { ScheduledPost } from "../../../../types/scheduling";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDownAZ, faCalendarDays } from "@fortawesome/free-solid-svg-icons";
import { isTauri } from "@tauri-apps/api/core";
import { Command } from "@tauri-apps/plugin-shell";
import { convertFile, detectFormatFromFilename } from "../../../../utils/fileConverter";

interface ZenContentStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  projectPath: string | null;
  recentArticles: ZenArticle[];
  allFiles: { path: string; name: string; modifiedAt?: number }[];
  scheduledPosts: ScheduledPost[];
  activeTab: "project" | "recent";
  onSelectProject: () => void;
  onOpenArticle: (articleId: string) => void;
  onOpenFile: (filePath: string) => void;
  onEditScheduledPost?: (post: ScheduledPost) => void;
  metadata: ProjectMetadata;
  onSaveMetadata: (metadata: ProjectMetadata) => void;
  onLoadWebDocument?: (content: string, fileName: string) => void;
  onOpenConverter?: () => void;
}

export const ZenContentStudioModal = ({
  isOpen,
  onClose,
  title,
  projectPath,
  recentArticles: _recentArticles,
  allFiles,
  scheduledPosts,
  activeTab,
  onSelectProject,
  onOpenArticle: _onOpenArticle,
  onOpenFile,
  onEditScheduledPost,
  metadata,
  onSaveMetadata,
  onLoadWebDocument,
  onOpenConverter,
}: ZenContentStudioModalProps) => {
  const [activePanel, setActivePanel] = useState<"project" | "all" | "metadata" | "planned" | "help">(
    activeTab === "recent" ? "all" : "project"
  );
  const [fileSort, setFileSort] = useState<"name-asc" | "name-desc" | "date-desc" | "date-asc">("name-asc");
  const projectName = projectPath
    ? projectPath.split(/[\\/]/).filter(Boolean).pop() || "Projekt"
    : "Kein Projekt gewaehlt";
  const plannedPosts = scheduledPosts ?? [];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [webLoadError, setWebLoadError] = useState<string | null>(null);
  const [isWebConverting, setIsWebConverting] = useState(false);
  const [publishingPaths, setPublishingPaths] = useState<{ posts: string } | null>(null);

  useEffect(() => {
    if (!projectPath) {
      setPublishingPaths(null);
      return;
    }
    getPublishingPaths(projectPath).then((paths) => setPublishingPaths({ posts: paths.posts }));
  }, [projectPath]);

  const plannedFiles = publishingPaths
    ? plannedPosts.map((post) => ({
        post,
        // Use savedFilePath if the post was saved to a project directory, otherwise use publishing path
        path: post.savedFilePath || `${publishingPaths.posts}/${post.platform}-${post.id}.md`,
      }))
    : [];

  useEffect(() => {
    setActivePanel(activeTab === "recent" ? "all" : "project");
  }, [activeTab]);

  const sortedAllFiles = useMemo(() => {
    const files = [...allFiles];
    if (fileSort.startsWith("name")) {
      files.sort((a, b) => {
        const compare = a.name.localeCompare(b.name, "de", {
          numeric: true,
          sensitivity: "base",
        });
        return fileSort === "name-asc" ? compare : -compare;
      });
    } else {
      files.sort((a, b) => {
        const aTime = a.modifiedAt ?? 0;
        const bTime = b.modifiedAt ?? 0;
        const compare = aTime - bTime;
        return fileSort === "date-asc" ? compare : -compare;
      });
    }
    return files;
  }, [allFiles, fileSort]);

  const cycleFileSort = () => {
    setFileSort((prev) => {
      switch (prev) {
        case "name-asc":
          return "name-desc";
        case "name-desc":
          return "date-desc";
        case "date-desc":
          return "date-asc";
        default:
          return "name-asc";
      }
    });
  };

  const handleWebFile = async (file: File) => {
    setWebLoadError(null);
    const detectedFormat = detectFormatFromFilename(file.name);

    if (detectedFormat === "docx" || detectedFormat === "doc" || detectedFormat === "pages") {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        setIsWebConverting(true);
        try {
          const result = await convertFile(arrayBuffer, detectedFormat, "md", file.name);
          if (result.success && result.data) {
            onLoadWebDocument?.(result.data, file.name);
          } else {
            setWebLoadError(result.error || "Konvertierung fehlgeschlagen");
          }
        } catch (error) {
          setWebLoadError("Konvertierung fehlgeschlagen");
          console.error("[ContentStudioModal] Web-Konvertierung fehlgeschlagen:", error);
        } finally {
          setIsWebConverting(false);
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      if (!text) {
        setWebLoadError("Datei konnte nicht gelesen werden.");
        return;
      }
      onLoadWebDocument?.(text, file.name);
    };
    reader.onerror = () => setWebLoadError("Datei konnte nicht gelesen werden.");
    reader.readAsText(file);
  };

  const handleShowInFinder = async (targetPath?: string) => {
    if (!targetPath || !isTauri()) return;

    try {
      const platform = navigator.platform.toLowerCase();
      const isMac = platform.includes("mac");
      const isWindows = platform.includes("win");

      if (isMac) {
        await Command.create("open", ["-R", targetPath]).execute();
      } else if (isWindows) {
        await Command.create("explorer", ["/select,", targetPath]).execute();
      } else {
        const parentDir = targetPath.substring(0, targetPath.lastIndexOf("/"));
        await Command.create("xdg-open", [parentDir]).execute();
      }
    } catch (error) {
      console.error("[ContentStudioModal] Failed to show file in finder:", error);
      try {
        const parentDir = targetPath.substring(0, targetPath.lastIndexOf("/"));
        await Command.create("open", [parentDir]).execute();
      } catch (fallbackError) {
        console.error("[ContentStudioModal] Finder fallback failed:", fallbackError);
      }
    }
  };

  // Modal-Content und dynamischer Subtitle
  const content = MODAL_CONTENT.contentStudio;
  const dynamicSubtitle =
    activePanel === "project"
      ? "Projekt verwalten"
      : activePanel === "metadata"
        ? "Projekt-Metadaten"
        : activePanel === "planned"
          ? "Geplante Posts"
          : activePanel === "help"
            ? "Hilfe"
            : "Dokumente";

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      size="xxl"
      title={title ?? content.title}
      subtitle={dynamicSubtitle}
    >
      <div
        className="relative flex flex-col pt-[20px]"
        style={{ minHeight: "480px", height: "80vh" }}
      >
        {/* Tabs */}
        <div className="px-[20px] border-b border-[#AC8E66]">
          <div className="flex flex-wrap gap-2 py-[0px]">
            <button
              onClick={() => {
                setActivePanel("project");
              }}
              className="font-mono text-[10px]"
              style={{
                border: activePanel === "project" ? "1px solid #AC8E66" : "1px dotted #3A3A3A",
                borderBottom: "0",
                borderRadius: "10px 10px 0 0",
                padding: "10px 16px",
                color: activePanel === "project" ? "#AC8E66" : "#555",
                fontWeight: activePanel === "project" ? "200" : "400",
                background:
                  activePanel === "project"
                    ? "#2a2a2a"
                    : "transparent",
              }}
            >
              Projekt wechseln
            </button>
            <button
              onClick={() => {
                if (!projectPath) return;
                setActivePanel("all");
              }}
              className="font-mono text-[10px]"
              style={{
                border: activePanel === "all" ? "1px solid #AC8E66" : "1px dotted #3A3A3A",
                borderBottom: "0",
                borderRadius: "10px 10px 0 0",
                padding: "10px 16px",
                color: activePanel === "all" ? "#AC8E66" : "#555",
                fontWeight: activePanel === "all" ? "200" : "400",
                cursor: projectPath ? "pointer" : "not-allowed",
                opacity: projectPath ? 1 : 0.5,
                background:
                  activePanel === "all"
                    ? "#2a2a2a"
                    : "transparent",
              }}
            >
              Projekt Dokumente
            </button>
          
            <button
              onClick={() => setActivePanel("planned")}
              className="font-mono text-[10px]"
              style={{
                border: activePanel === "planned" ? "1px solid #AC8E66" : "1px dotted #3A3A3A",
                borderBottom: "0",
                borderRadius: "10px 10px 0 0",
                padding: "10px 16px",
                color: activePanel === "planned" ? "#AC8E66" : "#555",
                fontWeight: activePanel === "planned" ? "200" : "400",
                background:
                  activePanel === "planned"
                    ? "#2a2a2a"
                    : "transparent",
              }}
            >
              Geplante Post
            </button>
              <button
              onClick={() => setActivePanel("metadata")}
              className="font-mono text-[10px]"
              style={{
                border: activePanel === "metadata" ? "1px solid #AC8E66" : "1px dotted #3A3A3A",
                borderBottom: "0",
                borderRadius: "10px 10px 0 0",
                padding: "10px 16px",
                color:  activePanel === "metadata" ? "#AC8E66" : "#555",
                fontWeight: activePanel === "metadata" ? "200" : "400",
                background:
                  activePanel === "metadata"
                    ? "#2a2a2a"
                    : "transparent",
              }}
            >
              Metadaten
            </button>
            <button
              onClick={() => setActivePanel("help")}
              className="font-mono text-[10px]"
              style={{
                border: activePanel === "help" ? "1px solid #AC8E66" : "1px dotted #3A3A3A",
                borderBottom: "0",
                borderRadius: "10px 10px 0 0",
                padding: "10px 16px",
                color: activePanel === "help" ? "#AC8E66" : "#555",
                fontWeight: activePanel === "help" ? "200" : "400",
                background:
                  activePanel === "help"
                    ? "#2a2a2a"
                    : "transparent",
              }}
            >
              Hilfe
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-20 pb-12 pt-[20px] px-[10px]">
          
          {activePanel === "project" ? (
            <div className="flex flex-col gap-4 px-[10px]">
              <div className="font-mono text-[12px] text-[#555]">
               Du bist aktuell im Verzeichnis:
              </div>
              <div className="font-mono text-[10px] font-bold text-[#777]">
               <span className="text-[#777] font-cursive"
               
                  style={{
                    paddingLeft: "8px",
                    borderLeft: "1px solid #AC8E66",
                  }}
               ></span> {projectName}
               <div className="font-mono text-[12px] py-[10px] text-[#555]"
               
               >Dein aktueller Projekt Ordner:</div>
              </div>
              {projectPath && (
                <div
                  className="font-mono text-[10px] text-[#777]"
                  style={{
                    paddingLeft: "8px",
                    borderLeft: "1px solid #AC8E66",
                  }}
                >
                  {projectPath}
                </div>
              )}

              <div className="border-b pt-[10px] text-[#AC8E66]"></div>

              <div className="pt-[20px]">
                {isTauri() ? (
                  <ZenRoughButton
                    label={projectPath ? "Projekt wechseln" : "Projekt waehlen"}
                    onClick={onSelectProject}
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    <div
                      className="font-mono text-[11px]"
                      style={{
                        border: "1px dotted #3A3A3A",
                        borderRadius: "10px",
                        padding: "12px",
                        color: "#fef3c7",
                       
                        background: "#0A0A0A",
                      }}
                    >
                      Hinweis: In der Web-Version ist die Projektordner-Auswahl
                      eingeschränkt. Lade ein Dokument oder nutze den Converter.
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ZenRoughButton
                        label="Zum Converter Studio"
                        onClick={onOpenConverter}
                      />
                    </div>

                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragActive(true);
                      }}
                      onDragLeave={() => setIsDragActive(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragActive(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) void handleWebFile(file);
                      }}
                      style={{
                        border: `2px dashed ${isDragActive ? "#AC8E66" : "#3A3A3A"}`,
                        borderRadius: "14px",
                        padding: "24px",
                        background: isDragActive ? "rgba(172,142,102,0.08)" : "#0A0A0A",
                        textAlign: "center",
                        color: "#555",
                        fontFamily: "IBM Plex Mono, monospace",
                        fontSize: "12px",
                      }}
                    >
                      {isWebConverting
                        ? "Konvertiere Dokument…"
                        : "Datei hier ablegen (Drag & Drop)"}
                      <div style={{ marginTop: "8px", fontSize: "10px", color: "#777" }}>
                        Unterstützt: .md, .txt, .docx, .doc, .pages
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          marginTop: "12px",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px dotted #3A3A3A",
                          background: "transparent",
                          color: "#555",
                          fontFamily: "IBM Plex Mono, monospace",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                      >
                        Dokument laden
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".md,.txt,.docx,.doc,.pages"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleWebFile(file);
                        }}
                      />
                    </div>
                    {webLoadError && (
                      <div className="font-mono text-[10px] text-[#FF6B6B]">
                        {webLoadError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : activePanel === "all" ? (
            <div className="flex flex-col gap-4 px-[20px]">
              <div className="mb-[10px] flex items-center justify-between">
                <div
                  className="
                    font-mono 
                    text-[11px] 
                    text-[#555] 
                  "
                >
                  Dateien deines Projekt Ordner 
                </div>
                <button
                  type="button"
                  onClick={cycleFileSort}
                  className="font-mono text-[11px]"
                  title={
                    fileSort === "name-asc"
                      ? "Sortieren: A–Z"
                      : fileSort === "name-desc"
                        ? "Sortieren: Z–A"
                        : fileSort === "date-desc"
                          ? "Sortieren: Neueste zuerst"
                          : "Sortieren: Aelteste zuerst"
                  }
                  style={{
                    border: "1px solid #1a1a1a",
                    borderRadius: "8px",
                    padding: "6px 10px",
                    color: "#555",
                    background: "transparent",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <FontAwesomeIcon icon={fileSort.startsWith("name") ? faArrowDownAZ : faCalendarDays} />
                  {fileSort === "name-asc"
                    ? "A–Z"
                    : fileSort === "name-desc"
                      ? "Z–A"
                      : fileSort === "date-desc"
                        ? "Neueste"
                        : "Aelteste"}
                </button>
              </div>
              {allFiles.length === 0 ? (
                <div className="font-mono text-[12px] text-[#777] py-[10px]">
                  {projectPath
                    ? "Keine Dateien gefunden."
                    : "Kein Projekt ausgewaehlt. Bitte zuerst einen Projektordner waehlen."}
                </div>
              ) : (
                sortedAllFiles.map((file) => (
                  <div
                    key={file.path}
                    onClick={() => onOpenFile(file.path)}
                    className="text-left font-mono"
                    style={{
                      border: "0.6px solid #3A3A3A",
                      borderRadius: "12px",
                      padding: "12px 16px",
                      background: "transparent",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      color: "#555",
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#a1a1a1";
                      e.currentTarget.style.background = "#d9d4c5";
                      e.currentTarget.style.backdropFilter = "blur(8px)";
                      e.currentTarget.style.transform = " translateX(10px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#3A3A3A";
                      e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.background = "transparent";

                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", fontWeight: 600 }}>
                        {file.name}
                      </span>
                      {isTauri() && (
                        <button
                          type="button"
                          className="font-mono text-[10px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShowInFinder(file.path);
                          }}
                          style={{
                            border: "1px dotted #3A3A3A",
                            borderRadius: "8px",
                            padding: "4px 8px",
                            color: "#AC8E66",
                            background: "transparent",
                            cursor: "pointer",
                          }}
                        >
                          Im Finder|DateiManager anzeigen
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: "10px", color: "#777" }}>
                      {file.path}
                    </span>
                  </div>
                ))
              )}

              <div className="border-b pt-[10px] text-[#AC8E66]"></div>

              <div className="font-mono text-[11px] text-[#555] mt-[10px]">
                Geplante Posts
              </div>
              {!projectPath ? (
                <div className="font-mono text-[12px] text-[#777] py-[10px]">
                  Kein Projekt ausgewaehlt. Bitte zuerst einen Projektordner waehlen.
                </div>
              ) : plannedFiles.length === 0 ? (
                <div className="font-mono text-[12px] text-[#777] py-[10px]">
                  Keine geplanten Posts vorhanden.
                </div>
              ) : (
                plannedFiles.map(({ post, path }) => (
                  <div
                    key={post.id}
                    onClick={() => onOpenFile(path)}
                    className="text-left font-mono"
                    style={{
                      border: "1px dotted #3A3A3A",
                      borderRadius: "12px",
                      padding: "12px 16px",
                      background: "transparent",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      color: "#555",
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#AC8E66";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#3A3A3A";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", fontWeight: 400 }}>
                        {post.title || post.platform}
                      </span>
                      {isTauri() && (
                        <button
                          type="button"
                          className="font-mono text-[10px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShowInFinder(path);
                          }}
                          style={{
                            border: "1px dotted #3A3A3A",
                            borderRadius: "8px",
                            padding: "4px 8px",
                            color: "#AC8E66",
                            background: "transparent",
                            cursor: "pointer",
                          }}
                        >
                          Im Finder anzeigen...
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: "10px", color: "#777" }}>
                      {path}
                    </span>
                  </div>
                ))
              )}
            </div>
          ) : activePanel === "metadata" ? (
            <div className="px-[10px]">
              <ZenMetadataPanel metadata={metadata} onSave={onSaveMetadata} />
            </div>
          ) : activePanel === "planned" ? (
            <div className="flex flex-col gap-4 px-[20px]">
              <div className="font-mono text-[11px] text-[#555] mb-[10px]">
                Geplante Posts aus deinem Projekt
              </div>
              {!projectPath ? (
                <div className="font-mono text-[12px] text-[#777]">
                  Kein Projekt ausgewaehlt. Bitte zuerst einen Projektordner waehlen.
                </div>
              ) : scheduledPosts.length === 0 ? (
                <div className="font-mono text-[12px] text-[#777]">
                  Noch keine geplanten Posts vorhanden.
                </div>
              ) : (
                scheduledPosts.map((post) => {
                  const dateLabel = post.scheduledDate
                    ? new Date(post.scheduledDate).toLocaleDateString("de-DE")
                    : "Kein Datum";
                  // Use savedFilePath if the post was saved to a project directory, otherwise use publishing path
                  const filePath = post.savedFilePath
                    || (publishingPaths ? `${publishingPaths.posts}/${post.platform}-${post.id}.md` : "");
                  return (
                    <div
                      key={post.id}
                      className="text-left font-mono"
                      style={{
                        border: "1px dotted #3A3A3A",
                        borderRadius: "12px",
                        padding: "12px 16px",
                        background: "transparent",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        color: "#555",
                        cursor: projectPath ? "pointer" : "default",
                      }}
                      onClick={() => {
                        if (projectPath) {
                          onOpenFile(filePath);
                        }
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 600 }}>
                          {post.title || post.platform}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            color: post.status === "scheduled" ? "#AC8E66" : "#777",
                            textTransform: "uppercase",
                          }}
                        >
                          {post.status}
                        </span>
                      </div>
                      <span style={{ fontSize: "10px", color: "#777" }}>
                        {dateLabel} {post.scheduledTime ? `· ${post.scheduledTime}` : ""}
                      </span>
                      {post.content && (
                        <span style={{ fontSize: "10px", color: "#aaa" }}>
                          {post.content.slice(0, 120)}
                        </span>
                      )}
                      {onEditScheduledPost && (
                        <div
                          className="pt-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ZenRoughButton
                            label="Weiterbearbeiten"
                            onClick={() => onEditScheduledPost(post)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="px-[20px] py-[20px]">
              <div className="font-mono text-[11px] text-[#555] mb-4">
                Pages-Dokument als DOCX exportieren
              </div>
              <div className="font-mono text-[11px] text-[#777] mb-4">
                DOCX-Export behält Formatierungen, Bilder und Tabellen bei!
              </div>  
              <div className="border-b pt-[10px] text-[#AC8E66]"></div>

              <div className="flex flex-col gap-3 font-mono text-[12px] text-[#555] px-[10px] py-[15px]">
                <div>
                  <span className="text-[#AC8E66]">1.</span> Pages-Dokument oeffnen
                </div>
                <div>
                  <span className="text-[#AC8E66]">2.</span> Ablage → Exportieren → Word...
                </div>
                <div>
                  <span className="text-[#AC8E66]">3.</span> Format "Word" (.docx) waehlen
                </div>
                <div>
                  <span className="text-[#AC8E66]">4.</span> Datei speichern
                </div>
                <div>
                  <span className="text-[#AC8E66]">5.</span> DOCX in ZenPost Studio hochladen
                </div>
              </div>
            </div>
          )}
        </div>

      
      </div>
    </ZenModal>
  );
};
