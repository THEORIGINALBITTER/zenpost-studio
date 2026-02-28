import { useState, useEffect } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { ZenRoughButton } from "../../components/ZenRoughButton";
import { ZenDropdown } from "../../components/ZenDropdown";
import { ZenTerminal } from "../../components/ZenTerminal";
import { loadAIConfig } from "../../../../../services/aiService";

type OSType = "macos" | "windows" | "linux";

const OS_OPTIONS = [
  { value: "macos", label: "macOS" },
  { value: "windows", label: "Windows" },
  { value: "linux", label: "Linux" },
];

const TERMINAL_HINTS: Record<OSType, string> = {
  macos: `Spotlight öffnen (Cmd + Leertaste) → "Terminal" eingeben → Enter drücken`,
  windows: `Windows-Taste drücken → "PowerShell" eingeben → Enter drücken`,
  linux: `Strg + Alt + T drücken oder im Anwendungsmenü nach "Terminal" suchen`,
};

const getServerCommand = (os: OSType, origin?: string) => {
  const safeOrigin = origin || "https://deine-domain";
  if (os === "windows") {
    return `$env:OLLAMA_ORIGINS="${safeOrigin}"; ollama serve`;
  }
  return `OLLAMA_ORIGINS="${safeOrigin}" ollama serve`;
};

const SETUP_STEPS = [
  {
    id: "install-ollama",
    title: "Ollama installieren",
    description:
      "Ollama ist die lokale KI-Engine. Lade es herunter und installiere es auf deinem Rechner.",
    action: "link" as const,
    url: "https://ollama.com/download",
    actionLabel: "Ollama herunterladen",
  },
  {
    id: "install-node",
    title: "Node.js installieren",
    description:
      "Node.js wird für den lokalen Proxy benötigt, damit die Web-Version mit Ollama kommunizieren kann.",
    action: "link" as const,
    url: "https://nodejs.org/en/download",
    actionLabel: "Node.js herunterladen",
  },
  {
    id: "pull-model",
    title: "Modell laden",
    description: "Öffne ein Terminal auf deinem Rechner und führe diesen Befehl aus:",
    action: "terminal" as const,
    command: "ollama pull llama3.1",
  },
  {
    id: "start-server",
    title: "Server starten",
    description:
      "Starte Ollama mit CORS-Unterstützung, damit die Web-Version darauf zugreifen kann:",
    action: "terminal-os" as const,
  },
];

const STORAGE_KEY = "zenpost-ollama-setup";
const OS_STORAGE_KEY = "zenpost-ollama-os";

function loadCompletedSteps(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return new Set();
}

function saveCompletedSteps(steps: Set<number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...steps]));
}

function detectOS(): OSType {
  const saved = localStorage.getItem(OS_STORAGE_KEY);
  if (saved === "macos" || saved === "windows" || saved === "linux") return saved;
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "macos";
  if (ua.includes("win")) return "windows";
  return "linux";
}

export const ZenLocalAISetupContent = () => {
  const isDesktop = isTauri();

  const [completedSteps, setCompletedSteps] = useState<Set<number>>(loadCompletedSteps);
  const [expandedStep, setExpandedStep] = useState<number | null>(() => {
    const completed = loadCompletedSteps();
    const firstIncomplete = SETUP_STEPS.findIndex((_, i) => !completed.has(i));
    return firstIncomplete >= 0 ? firstIncomplete : null;
  });
  const [serverStatus, setServerStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [serverMessage, setServerMessage] = useState("");
  const [selectedOS, setSelectedOS] = useState<OSType>(detectOS);

  const aiConfig = loadAIConfig();
  const baseUrl = aiConfig.baseUrl || "http://127.0.0.1:11434";
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // Web-Modus: Info-Seite statt Setup
  if (!isDesktop) {
    return (
      <div className="w-full flex justify-center" style={{ padding: "32px 32px" }}>
        <div
          className="w-full max-w-[860px] bg-[#E8E1D2] border border-[#AC8E66]/60 shadow-2xl overflow-hidden"
          style={{ borderRadius: 10 }}
        >
          {/* Header */}
          <div className="border-b border-[#AC8E66]/35" style={{ padding: "16px 10px" }}>
            <div className="font-mono text-[12px] text-[#555] text-center tracking-wide">
              Lokale AI
            </div>
            <div className="font-mono text-[10px] text-[#777] text-center" style={{ marginTop: 4 }}>
              Nur in ZenPost Studio (Desktop) verfügbar
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: "48px 32px" }}>
            <div className="mx-auto w-full max-w-[520px] flex flex-col items-center" style={{ gap: 24 }}>
              {/* Icon */}
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 64,
                  height: 64,
                  background: "rgba(172,142,102,0.1)",
                  border: "2px solid rgba(172,142,102,0.25)",
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#AC8E66" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M2 17l10 5 10-5" stroke="#AC8E66" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M2 12l10 5 10-5" stroke="#AC8E66" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </div>

              {/* Message */}
              <div
                className="font-mono text-[11px] text-[#6b5a3e] text-center leading-relaxed"
                style={{ maxWidth: 400 }}
              >
                Lokale KI ist in der Web-Version aus Sicherheitsgründen nicht möglich.
                Der Browser kann aus Datenschutzgründen nicht auf lokale Dienste wie Ollama zugreifen.
              </div>

              {/* Divider */}
              <div className="w-full border-t border-[#AC8E66]/20" />

              {/* Desktop Feature Highlights */}
              <div className="flex flex-col" style={{ gap: 12 }}>
                <div className="font-mono text-[10px] text-[#7a6a52] tracking-wide text-center">
                  MIT ZENPOST STUDIO (DESKTOP)
                </div>
                {[
                  "Ollama lokal ausführen — keine Daten verlassen deinen Rechner",
                  "Volle Kontrolle über deine KI-Modelle",
                  "Keine API-Keys, keine Cloud, keine Kosten",
                ].map((text, i) => (
                  <div
                    key={i}
                    className="flex items-start font-mono text-[10px] text-[#6b5a3e]"
                    style={{ gap: 10 }}
                  >
                    <span style={{ color: "#AC8E66", flexShrink: 0 }}>●</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="w-full border-t border-[#AC8E66]/20" />

              {/* CTA */}
              <div className="flex flex-col items-center" style={{ gap: 8 }}>
                <ZenRoughButton
                  label="Desktop-Version herunterladen"
                  size="small"
                  onClick={() => window.open("https://github.com/theoriginalbitter/zenpost-studio/releases", "_blank", "noopener,noreferrer")}
                  width={280}
                  height={42}
                />
                <div className="font-mono text-[9px] text-[#7a6a52] text-center">
                  Kostenlos für macOS, Windows & Linux
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const openExternal = (url: string) => {
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleOSChange = (value: string) => {
    const os = value as OSType;
    setSelectedOS(os);
    localStorage.setItem(OS_STORAGE_KEY, os);
  };

  const toggleStep = (index: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
        const nextIncomplete = SETUP_STEPS.findIndex((_, i) => i > index && !next.has(i));
        if (nextIncomplete >= 0) setExpandedStep(nextIncomplete);
        else setExpandedStep(null);
      }
      saveCompletedSteps(next);
      return next;
    });
  };

  const checkServer = async () => {
    setServerStatus("checking");
    setServerMessage("");
    const url = `${baseUrl.replace(/\/$/, "")}/api/tags`;

    try {
      if (isTauri()) {
        const result = await invoke<{ status: number; body: string }>("http_fetch", {
          request: { url, method: "GET", headers: { "Content-Type": "application/json" }, body: null },
        });
        if (result.status >= 200 && result.status < 300) {
          setServerStatus("ok");
          setServerMessage("Ollama läuft und ist erreichbar.");
          return;
        }
        setServerStatus("error");
        setServerMessage(`Ollama Antwort: ${result.status}`);
        return;
      }

      const response = await fetch(url, { method: "GET" });
      if (response.ok) {
        setServerStatus("ok");
        setServerMessage("Ollama läuft und ist erreichbar.");
        return;
      }
      const text = await response.text().catch(() => "");
      setServerStatus("error");
      setServerMessage(`Ollama Fehler: ${response.status}${text ? ` – ${text}` : ""}`);
    } catch {
      setServerStatus("error");
      setServerMessage(
        `Nicht erreichbar oder durch CORS blockiert. Starte Ollama mit OLLAMA_ORIGINS für ${
          origin || "deine Domain"
        } (z.B. OLLAMA_ORIGINS="${origin || "https://deine-domain"}" ollama serve) oder nutze einen lokalen Proxy.`
      );
    }
  };

  // auto-check on mount
  useEffect(() => {
    checkServer();
  }, []);

  const allDone = SETUP_STEPS.every((_, i) => completedSteps.has(i));

  return (
    <div className="w-full flex justify-center" style={{ padding: "32px 32px" }}>
      <div
        className="w-full max-w-[860px] bg-[#E8E1D2] border border-[#AC8E66]/60 shadow-2xl overflow-hidden"
        style={{ borderRadius: 10 }}
      >
        {/* Header */}
        <div
          className="border-b border-[#AC8E66]/35"
          style={{ padding: "16px 10px" }}
        >
          <div className="font-mono text-[12px] text-[#555] text-center tracking-wide">
            Lokale KI einrichten
          </div>
          <div className="font-mono text-[10px] text-[#777] text-center" style={{ marginTop: 4 }}>
            Schritt für Schritt · Ollama auf deinem Rechner
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "32px 32px" }}>
          <div className="mx-auto w-full max-w-[520px] flex flex-col" style={{ gap: 24 }}>

            {/* Status Banner */}
            <div
              className="flex items-center justify-center font-mono text-[11px]"
              style={{
                gap: 12,
                padding: "12px 16px",
                borderRadius: 10,
                background:
                  serverStatus === "ok"
                    ? "rgba(76,140,74,0.12)"
                    : serverStatus === "error"
                      ? "rgba(180,60,60,0.08)"
                      : "rgba(172,142,102,0.08)",
                border: `1px solid ${
                  serverStatus === "ok"
                    ? "rgba(76,140,74,0.3)"
                    : serverStatus === "error"
                      ? "rgba(180,60,60,0.2)"
                      : "rgba(172,142,102,0.25)"
                }`,
                color:
                  serverStatus === "ok"
                    ? "#3a6e38"
                    : serverStatus === "error"
                      ? "#8b3a3a"
                      : "#7a6a52",
              }}
            >
              <span
                className="rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  flexShrink: 0,
                  background:
                    serverStatus === "ok"
                      ? "#4c8c4a"
                      : serverStatus === "error"
                        ? "#b43c3c"
                        : serverStatus === "checking"
                          ? "#AC8E66"
                          : "#999",
                }}
              />
              <span>
                {serverStatus === "checking"
                  ? "Prüfe Verbindung..."
                  : serverStatus === "ok"
                    ? "Ollama läuft und ist erreichbar"
                    : serverStatus === "error"
                      ? serverMessage
                      : `Prüft: ${baseUrl}/api/tags`}
              </span>
            </div>

            <div className="flex flex-col items-center font-mono text-[9px] text-[#7a6a52]" style={{ gap: 4 }}>
              <div>Runtime: Desktop (Tauri)</div>
              <div>
                Origin: {origin || "unbekannt"}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[#AC8E66]/20" />

            {/* OS Selection */}
            <ZenDropdown
              label="Dein Betriebssystem:"
              labelSize="11px"
              value={selectedOS}
              onChange={handleOSChange}
              options={OS_OPTIONS}
              fullWidth
              variant="compact"
            />

            {/* Divider */}
            <div className="border-t border-[#AC8E66]/20" />

            {/* Steps */}
            <div className="flex flex-col" style={{ gap: 0 }}>
              {SETUP_STEPS.map((step, index) => {
                const isDone = completedSteps.has(index);
                const isOpen = expandedStep === index;
                const isLast = index === SETUP_STEPS.length - 1;

                return (
                  <div key={step.id}>
                    {/* Step Row */}
                    <button
                      onClick={() => setExpandedStep(isOpen ? null : index)}
                      className="w-full flex items-center group"
                      style={{
                        gap: 16,
                        padding: "14px 0",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        borderBottom: isOpen
                          ? "none"
                          : `1px solid rgba(172,142,102,${isLast ? "0" : "0.15"})`,
                      }}
                    >
                      {/* Step Number */}
                      <span
                        className="flex items-center justify-center rounded-full font-mono text-[10px] transition-all duration-200"
                        style={{
                          width: 30,
                          height: 30,
                          flexShrink: 0,
                          background: isDone ? "#AC8E66" : "transparent",
                          border: `2px solid ${isDone ? "#AC8E66" : "rgba(172,142,102,0.35)"}`,
                          color: isDone ? "#1a1a1a" : "#AC8E66",
                        }}
                      >
                        {isDone ? (
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <path
                              d="M2.5 6.5L5.5 9.5L10.5 3.5"
                              stroke="#fff"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          <span>{index + 1}</span>
                        )}
                      </span>

                      {/* Title */}
                      <span
                        className="flex-1 font-mono text-[11px] tracking-wide text-left transition-colors"
                        style={{ color: isDone ? "#AC8E66" : "#3a3a3a" }}
                      >
                        {step.title}
                      </span>

                      {/* Chevron */}
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        className="transition-transform duration-200"
                        style={{
                          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                          opacity: 0.35,
                          flexShrink: 0,
                        }}
                      >
                        <path
                          d="M2.5 4.5L6 8L9.5 4.5"
                          stroke="#3a3a3a"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {/* Expanded Content */}
                    {isOpen && (
                      <div
                        className="flex flex-col"
                        style={{
                          gap: 16,
                          paddingBottom: 16,
                          marginLeft: 46,
                          borderBottom: `1px solid rgba(172,142,102,${isLast ? "0" : "0.15"})`,
                        }}
                      >
                        {/* Description */}
                        <div className="font-mono text-[10px] text-[#6b5a3e] leading-relaxed">
                          {step.description}
                        </div>

                        {/* Link Action (Steps 1 & 2) */}
                        {step.action === "link" && (
                          <div className="flex justify-center">
                            <ZenRoughButton
                              label={step.actionLabel!}
                              size="small"
                              onClick={() => openExternal(step.url!)}
                              width={280}
                              height={42}
                            />
                          </div>
                        )}

                        {/* Terminal Action (Step 3 — same command for all OS) */}
                        {step.action === "terminal" && (
                          <>
                            {/* Terminal hint */}
                            <div
                              className="font-mono text-[9px] leading-relaxed"
                              style={{
                                color: "#7a6a52",
                                padding: "8px 12px",
                                borderRadius: 8,
                                background: "rgba(172,142,102,0.06)",
                                border: "1px solid rgba(172,142,102,0.15)",
                              }}
                            >
                              <span style={{ color: "#AC8E66" }}>Terminal öffnen:</span>{" "}
                              {TERMINAL_HINTS[selectedOS]}
                            </div>
                            <ZenTerminal command={step.command!} />
                          </>
                        )}

                        {/* Terminal with OS-specific command (Step 4) */}
                        {step.action === "terminal-os" && (
                          <>
                            <div
                              className="font-mono text-[9px] leading-relaxed"
                              style={{
                                color: "#7a6a52",
                                padding: "8px 12px",
                                borderRadius: 8,
                                background: "rgba(172,142,102,0.06)",
                                border: "1px solid rgba(172,142,102,0.15)",
                              }}
                            >
                              <span style={{ color: "#AC8E66" }}>Terminal öffnen:</span>{" "}
                              {TERMINAL_HINTS[selectedOS]}
                            </div>
                            <ZenTerminal
                              command={getServerCommand(selectedOS, origin)}
                              title={selectedOS === "windows" ? "PowerShell" : "Terminal"}
                            />
                          </>
                        )}

                        {/* Done Toggle */}
                        <div className="flex justify-center">
                          <ZenRoughButton
                            label={isDone ? "Erledigt" : "Als erledigt markieren"}
                            size="small"
                            variant={isDone ? "active" : "default"}
                            icon={
                              isDone ? (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path
                                    d="M2 6L5 9L10 3"
                                    stroke="#AC8E66"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              ) : null
                            }
                            onClick={() => toggleStep(index)}
                            width={280}
                            height={42}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Divider */}
            <div className="border-t border-[#AC8E66]/20" />

            {/* Server Check */}
            <div className="flex flex-col items-center" style={{ gap: 12 }}>
              <ZenRoughButton
                label={serverStatus === "checking" ? "Prüfe..." : "Verbindung prüfen"}
                size="small"
                variant={serverStatus === "ok" ? "active" : "default"}
                onClick={checkServer}
                width={280}
                height={42}
              />
              <div className="font-mono text-[9px] text-[#7a6a52] text-center">
                Prüft: {baseUrl}/api/tags
              </div>
            </div>

            {/* All done message */}
            {allDone && serverStatus === "ok" && (
              <>
                <div className="border-t border-[#AC8E66]/20" />
                <div
                  className="flex items-center justify-center font-mono text-[11px]"
                  style={{
                    gap: 8,
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: "rgba(76,140,74,0.1)",
                    border: "1px solid rgba(76,140,74,0.25)",
                    color: "#3a6e38",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M3 7L6 10L11 4"
                      stroke="#3a6e38"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Alles eingerichtet — Ollama ist einsatzbereit!
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
