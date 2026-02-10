import { useState } from "react";

interface ZenTerminalProps {
  command: string;
  title?: string;
}

export const ZenTerminal = ({ command, title = "Terminal" }: ZenTerminalProps) => {
  const [copied, setCopied] = useState(false);

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      style={{
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid rgba(172,142,102,0.25)",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          background: "#2a2a2a",
          borderBottom: "1px solid #333",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
        </div>
        <span
          style={{
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: 9,
            color: "#666",
            letterSpacing: "0.5px",
          }}
        >
          {title}
        </span>
        {/* Copy button */}
        <button
          onClick={copyCommand}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Befehl kopieren"
        >
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 7L6 10L11 4"
                stroke="#28c840"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="4.5" y="4.5" width="7" height="7" rx="1.5" stroke="#666" strokeWidth="1" />
              <path
                d="M9.5 4.5V3A1.5 1.5 0 008 1.5H3A1.5 1.5 0 001.5 3v5A1.5 1.5 0 003 9.5h1.5"
                stroke="#666"
                strokeWidth="1"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Command area */}
      <div
        style={{
          background: "#1a1a1a",
          padding: "14px 16px",
          fontFamily: "IBM Plex Mono, monospace",
          fontSize: 11,
          lineHeight: "1.6",
          color: "#e0e0e0",
          userSelect: "all",
          wordBreak: "break-all",
        }}
      >
        <span style={{ color: "#28c840", marginRight: 8 }}>$</span>
        {command}
      </div>
    </div>
  );
};
