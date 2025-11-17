import React, { useEffect } from "react";
import ReactDOM from "react-dom";

interface ZenModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const ZenModal = ({ isOpen, onClose, children }: ZenModalProps) => {
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
        className="relative max-w-lg w-[90%] z-20 pointer-events-auto"
        onClick={(e) => e.stopPropagation()} // Schutz für Innen-Buttons
      >
        <div
          className="relative bg-[#1A1A1A] border-2 border-[#AC8E66] rounded-3xl
                     p-8 shadow-[0_6px_25px_rgba(0,0,0,0.5)]
                     animate-zenModalEnter overflow-hidden transition-transform duration-300 ease-out"
          style={{ borderRadius: "24px" }}
        >
          {children}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, modalRoot);
};
