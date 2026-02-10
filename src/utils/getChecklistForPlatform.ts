import type { SocialPlatform } from "../types/scheduling";
import { CHECKLIST_TEMPLATES } from "./checklistTemplates";

export function getChecklistTasksForPlatform(platform?: SocialPlatform | null) {
  const global = CHECKLIST_TEMPLATES.global;
  if (!platform) return global;

  const specific = CHECKLIST_TEMPLATES[platform] ?? [];
  // Global + spezifisch (ohne Duplikate)
  return Array.from(new Set([...global, ...specific]));
}
