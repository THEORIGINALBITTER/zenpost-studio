// ./kits/DesignKit/PaperBG.tsx
import type { ReactNode } from "react";

export const PaperBG = ({ children }: { children?: ReactNode }) => (
  <div
    className="min-h-screen flex items-center justify-center text-[#1A1A1A] font-mono"
    style={{
      backgroundColor: "#FAF9F6", // warmer Paper-Ton
      backgroundImage: `
        radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)
      `,
      backgroundSize: "20px 20px", // zartes Dot-Muster
      boxShadow: "inset 0 6px 12px rgba(0,0,0,0.03)", // oben sanftes Licht
    }}
  >
    <div className="w-full">{children}</div>
  </div>
);
