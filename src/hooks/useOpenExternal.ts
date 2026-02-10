// ./src/hooks/useOpenExternal.ts
import { useCallback } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { open as shellOpen } from "@tauri-apps/plugin-shell";

export const useOpenExternal = () => {
  const openExternal = useCallback(async (url: string) => {
    console.log('[useOpenExternal] Attempting to open:', url);

    try {
      // 🧭 1️⃣ Tauri-Plugins nur in echter Tauri-Umgebung
      if (isTauri()) {
        try {
          console.log("[useOpenExternal] Trying opener plugin...");
          await openUrl(url);
          console.log("[useOpenExternal] openUrl succeeded");
          return;
        } catch (openerErr) {
          console.warn(
            "[useOpenExternal] opener plugin failed, trying shell plugin:",
            openerErr
          );
          try {
            await shellOpen(url);
            console.log("[useOpenExternal] shellOpen succeeded");
            return;
          } catch (shellErr) {
            console.warn("[useOpenExternal] shell plugin also failed:", shellErr);
          }
        }
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
        console.log('[useOpenExternal] Using window.open fallback');
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }

      // 🧭 4️⃣ Fallback (z. B. SSR)
      console.log("External link:", url);
    } catch (err) {
      console.error("[useOpenExternal] Could not open external link:", err);
      // Last resort fallback
      if (typeof window !== "undefined" && window.open) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    }
  }, []);

  return { openExternal };
};
