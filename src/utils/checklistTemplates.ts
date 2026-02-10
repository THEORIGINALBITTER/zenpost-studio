import type { SocialPlatform } from "../types/scheduling";

export type ChecklistTemplateKey = SocialPlatform | "global";

export const CHECKLIST_TEMPLATES: Record<ChecklistTemplateKey, string[]> = {
  global: [
    "Content erstellt und überprüft",
    "Rechtschreibung/Links geprüft",
    "Bild/Assets vorbereitet",
    "Todos aktualisiert für Phase 1",
    "publishingService.ts mit CRUD-Operationen erstellt",
    ".zenpost/publishing Ordnerstruktur erzeugt",
    "Posts automatisch als .md-Dateien gespeichert",
    "schedule.json lesen & schreiben implementiert",
    "Auto-Save beim Zeitplan im DocStudio integriert",
    "Success Modal zeigt korrekte Dateipfade",
    "Auto-Save Funktionalität erfolgreich getestet",
    "Dokumentation für Publishing-Service ergänzt",
    "Publishing Workflow finalisiert",
  ],

  linkedin: [
    "Hook in den ersten 2 Zeilen sitzt",
    "Absätze/Whitespace für Mobile ok",
    "Call-to-Action (ohne Druck) gesetzt",
    "3–5 Hashtags (relevant, nicht generisch)",
    "1–2 Keywords im Text verteilt",
    "Optional: Kommentar vorbereiten (erster Kommentar)",
  ],

  reddit: [
    "Subreddit-Regeln gelesen",
    "Titel nicht clickbaitig",
    "Formatierung (Markdown) ok",
    "Keine Selbstpromo ohne Kontext",
  ],

  github: [
    "README/Changelog aktualisiert",
    "Screenshots/GIFs geprüft",
    "Release Notes draft",
    "Links (Docs/Wiki) geprüft",
  ],

  devto: [
    "Frontmatter gesetzt",
    "Codeblöcke formatiert",
    "Tags (max 4) sinnvoll",
  ],

  medium: [
    "Titel + Subtitle klar",
    "Zwischenüberschriften gesetzt",
    "Preview/Excerpt passt",
  ],

  hashnode: [
    "Tags & Cover gesetzt",
    "Canonical URL geprüft",
  ],

  twitter: [
    "Hook kurz & klar",
    "Thread-Struktur wenn nötig",
    "Link + UTM optional",
  ],
};
