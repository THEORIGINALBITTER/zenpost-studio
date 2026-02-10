/**
 * Doc Studio Templates
 * Zentrale Export-Datei für alle Dokumentations-Templates
 */

import type { DocTemplate, ProjectInfo } from '../types';

// Smart README
import { getSmartReadmeTemplate } from './readme';
export type { ReadmeTemplateType } from './readme';
export { getSmartReadmeTemplate, getTemplateHint, detectProjectType } from './readme';
export { libraryTemplate, appTemplate, apiTemplate } from './readme';

// Statische Templates
import { changelogTemplate } from './changelog.template';
import { apiDocsTemplate } from './api-docs.template';
import { contributingTemplate } from './contributing.template';
import { dataRoomTemplate } from './data-room.template';
import { bugTemplate } from './bug.template';

export { changelogTemplate } from './changelog.template';
export { apiDocsTemplate } from './api-docs.template';
export { contributingTemplate } from './contributing.template';
export { dataRoomTemplate } from './data-room.template';
export { bugTemplate } from './bug.template';

// Template-Map für schnellen Zugriff (statisch, ohne README)
const templates: Record<Exclude<DocTemplate, 'draft' | 'readme'>, string> = {
  changelog: changelogTemplate,
  'api-docs': apiDocsTemplate,
  contributing: contributingTemplate,
  'data-room': dataRoomTemplate,
  bug: bugTemplate,
};

/**
 * Gibt das Template für einen bestimmten Dokumentationstyp zurück (statisch)
 * Für README: Nutze stattdessen getSmartDocTemplate mit projectInfo
 */
export function getDocTemplate(template: DocTemplate): string {
  if (template === 'draft') return '';

  // README ohne projectInfo → Library-Template als Fallback
  if (template === 'readme') {
    return getSmartReadmeTemplate(null);
  }

  return templates[template as keyof typeof templates] || '';
}

/**
 * Smart Version: berücksichtigt projectInfo für README-Template-Auswahl
 */
export function getSmartDocTemplate(template: DocTemplate, projectInfo?: ProjectInfo | null): string {
  if (template === 'draft') return '';

  if (template === 'readme') {
    return getSmartReadmeTemplate(projectInfo ?? null);
  }

  return templates[template as keyof typeof templates] || '';
}
