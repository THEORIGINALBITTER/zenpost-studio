import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App1 from "./App1";
import { BlockEditorHarness } from "./test/BlockEditorHarness";
import './App.css'

const searchParams = new URLSearchParams(window.location.search);
const isE2EBlockEditorHarness = searchParams.get("e2eHarness") === "block-editor";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HelmetProvider>
      {isE2EBlockEditorHarness ? <BlockEditorHarness /> : <App1 />}
    </HelmetProvider>
  </React.StrictMode>,
);

const preloader = document.getElementById("zen-preloader");
if (preloader) {
  if (isE2EBlockEditorHarness) {
    preloader.remove();
  } else {
  const getIsMobileLike = () => {
    const ua = navigator.userAgent || "";
    return (
      /Android|iPhone|iPod|Windows Phone|webOS|Mobile/i.test(ua) ||
      ((navigator.maxTouchPoints || 0) > 1 &&
        Math.min(
          window.innerWidth || Number.MAX_SAFE_INTEGER,
          window.screen?.width || Number.MAX_SAFE_INTEGER
        ) <= 1280)
    );
  };

  if (getIsMobileLike()) {
    preloader.remove();
  } else {
    let removed = false;
    let progress = 0;
    const percentEl = preloader.querySelector(".percent") as HTMLElement | null;
    let rafId = 0;

    const updatePercent = () => {
      if (percentEl) {
        percentEl.textContent = `${Math.min(100, Math.round(progress))}%`;
      }
    };

    const tick = () => {
      // Ease up to 95% until app is ready.
      const remaining = 95 - progress;
      progress += Math.max(0.15, remaining * 0.02);
      updatePercent();
      if (progress < 95 && !removed) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const removePreloader = () => {
      if (removed) return;
      removed = true;
      if (rafId) cancelAnimationFrame(rafId);
      progress = 100;
      updatePercent();
      requestAnimationFrame(() => {
        preloader.style.transition = "opacity 200ms ease";
        preloader.style.opacity = "0";
        window.setTimeout(() => preloader.remove(), 220);
      });
    };

    updatePercent();
    rafId = requestAnimationFrame(tick);

    window.addEventListener("zenpost-app-ready", removePreloader, { once: true });
    window.setTimeout(removePreloader, 12000);
  }
  }
}
