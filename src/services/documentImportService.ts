import { convertFile, detectFormatFromFilename, type SupportedFormat } from '../utils/fileConverter';

export type ImportToMarkdownOptions = {
  convertCode?: boolean;
  fallbackToRawOnConvertError?: boolean;
  allowJsonPrettyFallback?: boolean;
  requireNonEmpty?: boolean;
};

export type ImportToMarkdownResult =
  | {
      success: true;
      content: string;
      detectedFormat: SupportedFormat | null;
      fallbackUsed: boolean;
      contentFormat: SupportedFormat;
    }
  | {
      success: false;
      error: string;
      detectedFormat: SupportedFormat | null;
    };

const isBinaryFormat = (format: SupportedFormat | null): format is 'docx' | 'doc' | 'pages' | 'pdf' =>
  format === 'docx' || format === 'doc' || format === 'pages' || format === 'pdf';

const readAsMarkdownFriendlyText = async (file: File): Promise<string> => {
  const text = await file.text();
  return text;
};

export async function importDocumentToMarkdown(
  file: File,
  options: ImportToMarkdownOptions = {}
): Promise<ImportToMarkdownResult> {
  const {
    convertCode = false,
    fallbackToRawOnConvertError = false,
    allowJsonPrettyFallback = true,
    requireNonEmpty = true,
  } = options;

  const detectedFormat = detectFormatFromFilename(file.name);

  try {
    if (!detectedFormat || detectedFormat === 'md' || detectedFormat === 'txt' || detectedFormat === 'gfm' || (!convertCode && detectedFormat === 'code')) {
      const content = await readAsMarkdownFriendlyText(file);
      if (requireNonEmpty && !content.trim()) {
        return { success: false, detectedFormat, error: 'Datei konnte nicht gelesen werden.' };
      }
      return {
        success: true,
        content,
        detectedFormat,
        fallbackUsed: false,
        contentFormat: detectedFormat ?? 'txt',
      };
    }

    if (isBinaryFormat(detectedFormat)) {
      const buffer = await file.arrayBuffer();
      const result = await convertFile(buffer, detectedFormat, 'md', file.name);
      if (!result.success || !result.data) {
        return { success: false, detectedFormat, error: result.error || 'Konvertierung fehlgeschlagen' };
      }
      if (requireNonEmpty && !result.data.trim()) {
        return { success: false, detectedFormat, error: 'Datei konnte nicht gelesen werden.' };
      }
      return {
        success: true,
        content: result.data,
        detectedFormat,
        fallbackUsed: false,
        contentFormat: 'md',
      };
    }

    if (detectedFormat === 'json') {
      const rawText = await file.text();
      const result = await convertFile(rawText, 'json', 'md', file.name);
      if (result.success && result.data) {
        if (requireNonEmpty && !result.data.trim()) {
          return { success: false, detectedFormat, error: 'Datei konnte nicht gelesen werden.' };
        }
        return {
          success: true,
          content: result.data,
          detectedFormat,
          fallbackUsed: false,
          contentFormat: 'md',
        };
      }

      if (allowJsonPrettyFallback) {
        try {
          const pretty = JSON.stringify(JSON.parse(rawText), null, 2);
          const markdownJson = `\`\`\`json\n${pretty}\n\`\`\``;
          return {
            success: true,
            content: markdownJson,
            detectedFormat,
            fallbackUsed: true,
            contentFormat: 'md',
          };
        } catch {
          return { success: false, detectedFormat, error: 'JSON konnte nicht verarbeitet werden.' };
        }
      }

      return { success: false, detectedFormat, error: result.error || 'JSON konnte nicht verarbeitet werden.' };
    }

    const rawText = await file.text();
    const result = await convertFile(rawText, detectedFormat, 'md', file.name);
    if (result.success && result.data) {
      if (requireNonEmpty && !result.data.trim()) {
        return { success: false, detectedFormat, error: 'Datei konnte nicht gelesen werden.' };
      }
      return {
        success: true,
        content: result.data,
        detectedFormat,
        fallbackUsed: false,
        contentFormat: 'md',
      };
    }

    if (fallbackToRawOnConvertError) {
      if (requireNonEmpty && !rawText.trim()) {
        return { success: false, detectedFormat, error: result.error || 'Datei konnte nicht gelesen werden.' };
      }
      return {
        success: true,
        content: rawText,
        detectedFormat,
        fallbackUsed: true,
        contentFormat: detectedFormat ?? 'txt',
      };
    }

    return { success: false, detectedFormat, error: result.error || 'Konvertierung fehlgeschlagen' };
  } catch {
    return {
      success: false,
      detectedFormat,
      error: 'Datei konnte nicht geladen werden.',
    };
  }
}
