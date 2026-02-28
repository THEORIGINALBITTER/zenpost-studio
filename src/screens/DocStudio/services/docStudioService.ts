import { writeTextFile } from '@tauri-apps/plugin-fs';
import { scanProject } from '../../../services/projectScanService';
import { generateFromPrompt } from '../../../services/aiService';
import type { DocInputFields, DocTemplate, ProjectInfo } from '../types';
import type { TargetLanguage } from '../../../services/aiService';
import type { ProjectMetadata } from '../../../kits/PatternKit/ZenModalSystem/modals/ZenMetadataModal';

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

function templateLabel(template: DocTemplate | null): string {
  if (!template) return 'Dokumentation';
  if (template === 'readme') return 'README';
  if (template === 'changelog') return 'CHANGELOG';
  if (template === 'api-docs') return 'API Dokumentation';
  if (template === 'contributing') return 'Contributing Guide';
  if (template === 'data-room') return 'Data Room';
  if (template === 'bug') return 'Bug Report';
  if (template === 'draft') return 'Entwurf';
  return 'Dokumentation';
}

export function buildYamlFrontmatter(title: string, metadata: ProjectMetadata): string {
  const today = new Date().toISOString().split('T')[0];
  const keywordsList = metadata.keywords
    ? metadata.keywords.split(',').map((k) => `"${k.trim()}"`).join(', ')
    : '';
  return [
    '---',
    `title: "${title}"`,
    metadata.description ? `description: "${metadata.description}"` : null,
    metadata.authorName  ? `author: "${metadata.authorName}"`       : null,
    metadata.authorEmail ? `email: "${metadata.authorEmail}"`        : null,
    metadata.companyName ? `company: "${metadata.companyName}"`      : null,
    metadata.license     ? `license: "${metadata.license}"`          : null,
    metadata.year        ? `year: "${metadata.year}"`                : null,
    keywordsList         ? `keywords: [${keywordsList}]`             : null,
    metadata.lang        ? `lang: "${metadata.lang}"`                : null,
    `date: "${today}"`,
    '---',
    '',
  ].filter((line) => line !== null).join('\n');
}

export function buildDocGenerationPrompt(params: {
  template: DocTemplate | null;
  projectInfo: ProjectInfo | null;
  inputFields: DocInputFields;
  tone: 'professional' | 'casual' | 'technical' | 'enthusiastic';
  length: 'short' | 'medium' | 'long';
  audience: 'beginner' | 'intermediate' | 'expert';
  targetLanguage: TargetLanguage;
  existingTemplateContent: string;
  metadata?: ProjectMetadata;
}) {
  const {
    template,
    projectInfo,
    inputFields,
    tone,
    length,
    audience,
    targetLanguage,
    existingTemplateContent,
    metadata,
  } = params;

  const metadataBlock = metadata ? `
AUTOR & PROJEKT-METADATEN (EXAKTE WERTE VERWENDEN – KEINE PLATZHALTER):
- Autor: ${metadata.authorName || '-'}
- E-Mail: ${metadata.authorEmail || '-'}
- Unternehmen: ${metadata.companyName || '-'}
- Lizenz: ${metadata.license || '-'}
- Jahr: ${metadata.year || '-'}
- Website: ${metadata.website || '-'}
- Repository: ${metadata.repository || '-'}
- Beschreibung: ${metadata.description || '-'}
- Keywords: ${metadata.keywords || '-'}
` : '';

  return `
Du bist ein präziser Dokumentations-Assistent.
Erzeuge ein vollständiges Markdown-Dokument auf Basis der strukturierten Eingaben.

WICHTIGE REGELN:
- Antworte NUR mit Markdown-Inhalt (ohne YAML-Frontmatter — der wird separat ergänzt).
- Keine Code-Fences um das gesamte Ergebnis.
- Wenn vorhandene Template-Struktur gegeben ist, nutze diese als Grundgerüst.
- Fülle fehlende Abschnitte sinnvoll auf, aber erfinde keine konkreten Fakten.
${metadataBlock}
Ziel:
- Dokumenttyp: ${templateLabel(template)}
- Sprache: ${targetLanguage}
- Stil: ${tone}
- Länge: ${length}
- Zielgruppe: ${audience}

Projekt-Metadaten (Scan):
- Name: ${projectInfo?.name || '-'}
- Version: ${projectInfo?.version || '-'}
- Beschreibung: ${projectInfo?.description || '-'}
- Dateitypen: ${projectInfo?.fileTypes?.join(', ') || '-'}
- Dependencies (Top): ${projectInfo?.dependencies?.join(', ') || '-'}
- Tests vorhanden: ${projectInfo?.hasTests ? 'Ja' : 'Nein'}
- API vorhanden: ${projectInfo?.hasApi ? 'Ja' : 'Nein'}

Strukturierte Nutzereingaben:
- Produkt/Projektname: ${inputFields.productName || '-'}
- Kurzbeschreibung: ${inputFields.productSummary || '-'}
- Problem/Use Case: ${inputFields.problemSolved || '-'}
- Setup/Installation: ${inputFields.setupSteps || '-'}
- Usage Beispiele: ${inputFields.usageExamples || '-'}
- API Endpoints/Integrationen: ${inputFields.apiEndpoints || '-'}
- Testing/Qualität: ${inputFields.testingNotes || '-'}
- FAQ/Hinweise: ${inputFields.faq || '-'}
- Links: ${inputFields.links || '-'}

Vorhandene Template-Grundlage:
${existingTemplateContent || '(leer)'}

Jetzt generieren.
  `.trim();
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
