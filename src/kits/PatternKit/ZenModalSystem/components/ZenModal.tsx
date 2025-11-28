import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { ZenCloseButton } from "../../../DesignKit/ZenCloseButton";

interface ZenModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'medium' | 'large';
  title?: string;
  showCloseButton?: boolean;
}

export const ZenModal = ({ isOpen, onClose, children, size = 'md', title, showCloseButton = true }: ZenModalProps) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    small: 'max-w-sm',
    medium: 'max-w-lg',
    large: 'max-w-4xl',
  };
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

  const modalContent = (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* 🌫 Hintergrund-Ebene */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-lg cursor-pointer"
        style={{
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        onClick={onClose} // Schließt nur beim Klick außerhalb
      />

      {/* 📦 Inhalt */}
      <div
        className={`relative ${sizeClasses[size]} z-20 pointer-events-auto`}
        style={{ width: '100%', maxWidth: '90vw' }}
        onClick={(e) => e.stopPropagation()} // Schutz für Innen-Buttons
      >
        <div
          className="relative bg-[#1A1A1A] border-2 border-[#AC8E66] rounded-3xl
                     p-8 shadow-[0_6px_25px_rgba(0,0,0,0.5)]
                     animate-zenModalEnter overflow-hidden transition-transform duration-300 ease-out"
          style={{ borderRadius: "24px" }}
        >
          {/* Close Button */}
          {showCloseButton && (
            <div
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                zIndex: 10,
              }}
            >
              <ZenCloseButton onClick={onClose} size="md" />
            </div>
          )}

          {/* Title */}
          {title && (
            <div
              style={{
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: '1px solid #3A3A3A',
              }}
            >
              <h2
                style={{
                  fontFamily: 'monospace',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#e5e5e5',
                  margin: 0,
                }}
              >
                {title}
              </h2>
            </div>
          )}

          {children}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, modalRoot);
};
