import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { ZenCloseButton } from "../../../DesignKit/ZenCloseButton";

interface ZenModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "xxl" | "small" | "medium" | "large";
  /** Modal-Titel (wird im sticky Header angezeigt) */
  title?: string;
  /** Modal-Untertitel (wird im sticky Header angezeigt) */
  subtitle?: React.ReactNode;
  /** Ausrichtung von title/subtitle im sticky Header */
  headerAlign?: "left" | "center" | "right";
  showCloseButton?: boolean;
  /** Fester Header-Bereich (optional) - überschreibt title/subtitle */
  header?: React.ReactNode;
  /** Fester Footer-Bereich (optional) */
  footer?: React.ReactNode;
  fullscreen?: boolean;
  theme?: "dark" | "paper";
}

export const ZenModal = ({
  isOpen,
  onClose,
  children,
  size = "md",
  fullscreen = false,
  title,
  subtitle,
  headerAlign = "left",
  showCloseButton = true,
  header,
  footer,
  theme = "paper",
}: ZenModalProps) => {
  const modalRoot = document.getElementById("zen-modal-root");

  useEffect(() => {
    const appRoot = document.getElementById("root");
    if (isOpen) {
      if (appRoot) {
        appRoot.style.filter = "blur(4px)";
        appRoot.style.transition = "filter 0.2s ease-in-out";
      }
      document.body.style.overflow = "hidden";
    } else {
      if (appRoot) appRoot.style.filter = "";
      document.body.style.overflow = "";
    }

    return () => {
      if (appRoot) appRoot.style.filter = "";
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!modalRoot || !isOpen) return null;

  // ✅ Tailwind-unabhängig: konkrete px/rem-Werte
  const maxWidthBySize: Record<string, string> = {
    sm: "24rem", // ~ max-w-sm
    md: "32rem", // ~ max-w-lg
    lg: "42rem", // ~ max-w-2xl
    xl: "56rem", // ~ max-w-4xl
    xxl: "75rem", // optional größer als 6xl; oder 72rem
    small: "24rem",
    medium: "32rem",
    large: "56rem",
  };

  // ✅ “Viewport-Limit” + “maxWidth” sauber kombinieren
  const containerStyle: React.CSSProperties = fullscreen
    ? {
        width: "100vw",
        height: "100vh",
        maxWidth: "99vw",
        maxHeight: "100vh",
        paddingTop: "40px",
      }
    : {
        width: "95vw",
        maxWidth: maxWidthBySize[size] ?? "32rem",
        maxHeight: "90vh",
      };

  const modalBg =
    theme === "paper"
      ? "linear-gradient(180deg, #EDE6D8 0%, #E7DFD0 100%)"
      : "linear-gradient(0deg, #0B0B0B 0%, #171717 100%)";

  const headerBg =
    theme === "paper"
      ? " #1a1a1a"
      : "linear-gradient(0deg, #0B0B0B 0%, #171717 100%)";

  const borderColor = theme === "paper" ? "#555)" : "#555";

  const titleColor = theme === "paper" ? "#AC8E66" : "#AC8E66";
  const subtitleColor = theme === "paper" ? "#7a6a52" : "#777";

  const backdropOpacity = theme === "paper" ? "bg-black/20" : "bg-black/0";

  const modalContent = (
    <div
      className={`fixed inset-0 z-[10000] flex ${
        fullscreen ? "items-stretch justify-stretch" : "items-center justify-center"
      }`}
      role="dialog"
      aria-modal="true"
    >
      {/* Hintergrund */}
      <div
        className={`absolute inset-0 ${backdropOpacity} backdrop-blur-lg cursor-pointer`}
        style={{
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        onClick={onClose}
      />

      {/* Container */}
      <div
        className="relative z-20 pointer-events-auto"
        style={containerStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        {showCloseButton && (
          <div style={{ position: "absolute", top: "40px", right: "16px", zIndex: 50 }}>
            <ZenCloseButton onClick={onClose} size="md" />
          </div>
        )}

        <div
          className="relative shadow-[0_6px_25px_rgba(0,0,0,0.5)] animate-zenModalEnter overflow-hidden"
          style={{
            borderRadius: "12px",
            height: fullscreen ? "calc(100vh - 16px)" : "auto",
            maxHeight: fullscreen ? "calc(100vh - 16px)" : "90vh",
            display: "flex",
            flexDirection: "column",
            background: modalBg,
            border: `0.5px solid ${borderColor}`,
          }}
        >
          {/* Sticky Header */}
          {(title || subtitle) && !header && (
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 20,
                background: headerBg,
                borderBottom: `1px solid ${borderColor}`,
                padding: "20px 24px",
                flexShrink: 0,
              }}
            >
              {title && (
                <h2
                  style={{
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: "22px",
                    color: titleColor,
                    margin: 0,
                    marginBottom: subtitle ? "6px" : 0,
                    textAlign: headerAlign,
                  }}
                >
                  {title}
                </h2>
              )}
              {subtitle && (
                <p
                  style={{
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: "12px",
                    color: subtitleColor,
                    margin: 0,
                    textAlign: headerAlign,
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {header && <div style={{ flexShrink: 0 }}>{header}</div>}

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            {children}
          </div>

          {footer && <div style={{ flexShrink: 0 }}>{footer}</div>}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, modalRoot);
};
