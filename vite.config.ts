import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,

  // ✅ Chunking / Splitting (fix for 4MB index chunk)
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;

          // Big/common buckets
          if (id.includes("react-icons")) return "icons";
          if (id.includes("@tiptap")) return "tiptap";
          if (id.includes("@editorjs") || id.includes("editorjs")) return "editorjs";
          if (id.includes("monaco-editor")) return "monaco";
          if (id.includes("codemirror")) return "codemirror";
          if (id.includes("roughjs")) return "roughjs";
          if (id.includes("framer-motion")) return "motion";

          return "vendor";
        },
      },
    },

    // optional: only adjusts warning threshold, doesn't reduce size by itself
    chunkSizeWarningLimit: 900,
  },

  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    // Force IPv4 localhost to avoid EPERM on ::1 in some macOS environments
    host: host || "127.0.0.1",
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
