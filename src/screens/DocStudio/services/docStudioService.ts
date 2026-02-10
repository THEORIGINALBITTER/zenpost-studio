import { writeTextFile } from '@tauri-apps/plugin-fs';
import { scanProject } from '../../../services/projectScanService';
import { generateFromPrompt } from '../../../services/aiService';

export async function scanProjectService(path: string, includeDataRoom = true) {
  return scanProject(path, includeDataRoom);
}

export async function generateDocService(prompt: string) {
  const res = await generateFromPrompt(prompt);
  if (!res.success || !res.data) {
    throw new Error(res.error || 'Generation failed');
  }
  return res.data;
}

/**
 * Generiert einen Dateinamen mit Zeitstempel
 * Format: TEMPLATE_YYYY-MM-DD_HHmm.md
 */
export function generateDocFilename(template: string, version?: string): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const time = now.toTimeString().slice(0, 5).replace(':', ''); // HHmm

  const baseName = template === 'data-room' ? 'DATA-ROOM' : template.toUpperCase();
  const versionSuffix = version ? `_v${version}` : '';

  return `${baseName}${versionSuffix}_${date}_${time}.md`;
}

/**
 * Gibt den Standard-Pfad für ein Dokument zurück
 */
export function getDefaultDocPath(projectPath: string, template: string): string {
  const filename = generateDocFilename(template);
  if (template === 'data-room') {
    return `${projectPath}/data-room/${filename}`;
  }
  return `${projectPath}/${filename}`;
}

/**
 * Speichert ein Dokument an einem bestimmten Pfad
 */
export async function saveDocToPath(filePath: string, content: string): Promise<string> {
  await writeTextFile(filePath, content);
  return filePath.split(/[\\/]/).pop() ?? 'Dokument.md';
}

/**
 * Legacy-Funktion für direktes Speichern (überschreibt)
 */
export async function saveDocService(projectPath: string, template: string, content: string) {
  const file = template === 'data-room' ? 'data-room/INDEX.md' : `${template.toUpperCase()}.md`;
  await writeTextFile(`${projectPath}/${file}`, content);
  return file;
}
