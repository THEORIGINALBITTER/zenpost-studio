// ./src/hooks/useOpenExternal.ts
import { useCallback } from "react";
import { openUrl } from '@tauri-apps/plugin-opener';

export const useOpenExternal = () => {
  const openExternal = useCallback(async (url: string) => {
    try {
      // 🧭 1️⃣ Tauri-Umgebung (Desktop App)
      if (typeof window !== "undefined" && (window as any).__TAURI__) {
        await openUrl(url);
        return;
      }

      // 🧭 2️⃣ Electron-Umgebung?
      if (
        typeof window !== "undefined" &&
        (window as any).process?.versions?.electron
      ) {
        const { shell } = (window as any).require("electron");
        shell.openExternal(url);
        return;
      }

      // 🧭 3️⃣ PWA oder normaler Browser
      if (typeof window !== "undefined" && window.open) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }

      // 🧭 4️⃣ Fallback (z. B. SSR)
      console.log("External link:", url);
    } catch (err) {
      console.error("Could not open external link:", err);
    }
  }, []);

  return { openExternal };
};
