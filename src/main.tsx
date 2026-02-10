import React from "react";
import ReactDOM from "react-dom/client";
import App1 from "./App1";
import './App.css'

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App1 />
  </React.StrictMode>,
);

const preloader = document.getElementById("zen-preloader");
if (preloader) {
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
