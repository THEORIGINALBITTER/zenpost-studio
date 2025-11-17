// ./src/hooks/useOpenExternal.ts
import { useCallback } from "react";

export const useOpenExternal = () => {
  const openExternal = useCallback((url: string) => {
    try {
      // 🧭 1️⃣ Electron-Umgebung?
      if (
        typeof window !== "undefined" &&
        (window as any).process?.versions?.electron
      ) {
        const { shell } = (window as any).require("electron");
        shell.openExternal(url);
        return;
      }

      // 🧭 2️⃣ PWA oder normaler Browser
      if (typeof window !== "undefined" && window.open) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }

      // 🧭 3️⃣ Fallback (z. B. SSR)
      console.log("External link:", url);
    } catch (err) {
      console.error("Could not open external link:", err);
    }
  }, []);

  return { openExternal };
};
