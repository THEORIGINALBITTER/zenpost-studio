import { useEffect, useMemo, useRef, useState } from 'react';
import {
  faFileCode,
  faFileAlt,
  faFilePdf,
  faFileLines,
  faRobot,
} from '@fortawesome/free-solid-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { isTauri } from '@tauri-apps/api/core';
import JSZip from 'jszip';
import { ZenSettingsModal, ZenGeneratingModal } from '../kits/PatternKit/ZenModalSystem';
import { Step1FormatSelection } from './converter-steps/Step1FormatSelection';
import { Step4Result } from './converter-steps/Step4Result';
import {
  convertFile,
  SupportedFormat,
  detectFormatFromFilename,
  getFileExtension,
  isImageFormat,
} from '../utils/fileConverter';
import { importDocumentToMarkdown } from '../services/documentImportService';
import { loadConverterHistory, saveConverterHistory } from '../services/converterHistoryService';

interface FormatOption {
  value: SupportedFormat;
  label: string;
  icon: any;
}

const formatOptions: FormatOption[] = [
  { value: 'code', label: 'Code (AI)', icon: faRobot },
  { value: 'json', label: 'JSON', icon: faFileCode },
  { value: 'md', label: 'Markdown', icon: faFileLines },
  { value: 'gfm', label: 'Markdown (GitHub)', icon: faGithub },
  { value: 'editorjs', label: 'Editor.js', icon: faFileCode },
  { value: 'html', label: 'HTML', icon: faFileAlt },
  { value: 'txt', label: 'Text', icon: faFileAlt },
  { value: 'pdf', label: 'PDF', icon: faFilePdf },
  { value: 'png', label: 'PNG', icon: faFileAlt },
  { value: 'jpg', label: 'JPG', icon: faFileAlt },
  { value: 'webp', label: 'WEBP', icon: faFileAlt },
  { value: 'svg', label: 'SVG', icon: faFileAlt },
];

interface ConverterScreenProps {
  onBack?: () => void;
  onStepChange?: (step: number) => void;
  onOpenInContentStudio?: (content: string, fileName: string) => void;
}

type RecentConversionItem = {
  id: string;
  fileName: string;
  fromFormat: SupportedFormat;
  targetFormats: SupportedFormat[];
  createdAt: number;
};

type ImagePreset = 'logo' | 'illustration' | 'photo' | 'custom';

export const ConverterScreen = ({
  onBack: _onBack,
  onStepChange,
  onOpenInContentStudio,
}: ConverterScreenProps) => {
  // Step State
  const [currentStep, setCurrentStep] = useState(1);

  // Notify parent of step changes
  const handleSetCurrentStep = (step: number) => {
    setCurrentStep(step);
    onStepChange?.(step);
  };

  // Data State
  const [inputContent, setInputContent] = useState('');
  const [inputBinaryContent, setInputBinaryContent] = useState<ArrayBuffer | null>(null);
  const [outputByFormat, setOutputByFormat] = useState<Record<string, string>>({});
  const [fromFormat, setFromFormat] = useState<SupportedFormat>('txt');
  const [selectedToFormats, setSelectedToFormats] = useState<SupportedFormat[]>(['md']);
  const [activeResultFormat, setActiveResultFormat] = useState<SupportedFormat>('md');
  const [isConverting, setIsConverting] = useState(false);
  const [isPreviewRefreshing, setIsPreviewRefreshing] = useState(false);
  const [isPreparingInput, setIsPreparingInput] = useState(false);
  const [imageQuality, setImageQuality] = useState(86);
  const [imageRasterSize, setImageRasterSize] = useState(160);
  const [imageSmoothEdges, setImageSmoothEdges] = useState(true);
  const [activeImagePreset, setActiveImagePreset] = useState<ImagePreset>('custom');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [detectedSourceFormat, setDetectedSourceFormat] = useState<SupportedFormat | null>(null);
  const [recentConversions, setRecentConversions] = useState<RecentConversionItem[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetFormatOptions = formatOptions.filter((option) => option.value !== 'code');
  const availableOutputFormats = useMemo(
    () => selectedToFormats.filter((format) => Boolean(outputByFormat[format])),
    [selectedToFormats, outputByFormat]
  );
  const activeOutputContent = outputByFormat[activeResultFormat] ?? '';
  const hasAnyInput = inputBinaryContent !== null || inputContent.trim().length > 0;
  const showImageOptions = Boolean(detectedSourceFormat && isImageFormat(detectedSourceFormat));

  useEffect(() => {
    void loadConverterHistory().then((items) => {
      if (items.length > 0) setRecentConversions(items as RecentConversionItem[]);
    });
  }, []);

  useEffect(() => {
    void saveConverterHistory(recentConversions);
  }, [recentConversions]);

  const runConversion = async (
    opts: { silent?: boolean; preserveActiveFormat?: boolean; skipHistory?: boolean } = {}
  ): Promise<boolean> => {
    const { silent = false, preserveActiveFormat = false, skipHistory = false } = opts;
    const sourceContent: string | ArrayBuffer = inputBinaryContent ?? inputContent;

    if (typeof sourceContent === 'string' && !sourceContent.trim()) {
      if (!silent) setError('Bitte zuerst eine Datei hochladen.');
      return false;
    }

    if (sourceContent instanceof ArrayBuffer && sourceContent.byteLength === 0) {
      if (!silent) setError('Bitte zuerst eine Datei hochladen.');
      return false;
    }

    if (selectedToFormats.length === 0) {
      if (!silent) setError('Bitte mindestens ein Ausgabeformat wählen.');
      return false;
    }

    if (silent) {
      setIsPreviewRefreshing(true);
    } else {
      setIsConverting(true);
      setError(null);
    }

    try {
      const nextOutputs: Record<string, string> = {};
      const failedFormats: SupportedFormat[] = [];

      for (const targetFormat of selectedToFormats) {
        const result = await convertFile(sourceContent, fromFormat, targetFormat, fileName, {
          imageQuality: imageQuality / 100,
          imageRasterSize,
          imageSmoothEdges,
        });
        if (result.success && result.data) {
          nextOutputs[targetFormat] = result.data;
          continue;
        }
        failedFormats.push(targetFormat);
      }

      if (Object.keys(nextOutputs).length === 0) {
        if (!silent) setError('Konvertierung fehlgeschlagen.');
        return false;
      }

      setOutputByFormat(nextOutputs);
      const firstSuccessFormat = selectedToFormats.find((format) => Boolean(nextOutputs[format]));
      if (firstSuccessFormat && !preserveActiveFormat) {
        setActiveResultFormat(firstSuccessFormat);
      }

      if (!silent && !skipHistory) {
        setRecentConversions((prev) => [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            fileName: fileName?.trim() || 'Untitled',
            fromFormat,
            targetFormats: Object.keys(nextOutputs) as SupportedFormat[],
            createdAt: Date.now(),
          },
          ...prev,
        ].slice(0, 12));
      }

      if (!silent && failedFormats.length > 0) {
        setError(`Teilweise konvertiert. Fehlgeschlagen: ${failedFormats.join(', ')}`);
      }

      return true;
    } catch (err) {
      if (!silent) {
        setError(`Fehler: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
      }
      return false;
    } finally {
      if (silent) {
        setIsPreviewRefreshing(false);
      } else {
        setIsConverting(false);
      }
    }
  };

  const handleFileUpload = async (file: File) => {
    setFileName(file.name);
    setOutputByFormat({});
    setError(null);
    setIsPreparingInput(true);
    setInputBinaryContent(null);

    try {
      const detectedFormat = detectFormatFromFilename(file.name);
      if (detectedFormat && isImageFormat(detectedFormat)) {
        const preferredTargets: SupportedFormat[] =
          detectedFormat === 'svg' ? ['png'] : ['svg', 'webp'];

        if (detectedFormat === 'svg') {
          const svgText = await file.text();
          if (!svgText.trim()) {
            setError('SVG-Datei ist leer.');
            return;
          }
          setInputContent(svgText);
          setInputBinaryContent(null);
          setFromFormat('svg');
          setDetectedSourceFormat('svg');
        } else {
          const arrayBuffer = await file.arrayBuffer();
          setInputBinaryContent(arrayBuffer);
          setInputContent('');
          setFromFormat(detectedFormat);
          setDetectedSourceFormat(detectedFormat);
        }
        setSelectedToFormats(preferredTargets);
        setActiveResultFormat(preferredTargets[0]);
        setActiveImagePreset('custom');
        return;
      }

      const result = await importDocumentToMarkdown(file, {
        convertCode: true,
        fallbackToRawOnConvertError: true,
        allowJsonPrettyFallback: true,
        requireNonEmpty: true,
      });

      if (!result.success) {
        setError(result.error || 'Datei konnte nicht geladen werden.');
        return;
      }

      setInputContent(result.content);
      setInputBinaryContent(null);
      setFromFormat(result.contentFormat);
      setDetectedSourceFormat(result.detectedFormat);
      setActiveResultFormat(selectedToFormats[0] ?? 'md');
      setActiveImagePreset('custom');
    } catch {
      setError('Datei konnte nicht geladen werden.');
    } finally {
      setIsPreparingInput(false);
    }
  };

  const handleConvert = async (): Promise<boolean> => runConversion();

  useEffect(() => {
    if (currentStep !== 2) return;
    if (!showImageOptions) return;
    if (Object.keys(outputByFormat).length === 0) return;

    const timer = window.setTimeout(() => {
      void runConversion({
        silent: true,
        preserveActiveFormat: true,
        skipHistory: true,
      });
    }, 260);

    return () => window.clearTimeout(timer);
  }, [
    currentStep,
    showImageOptions,
    imageQuality,
    imageRasterSize,
    imageSmoothEdges,
    selectedToFormats,
    fromFormat,
    inputContent,
    inputBinaryContent,
    fileName,
  ]);

  const handleDownload = async (format: SupportedFormat) => {
    const outputContent = outputByFormat[format] ?? '';
    if (!outputContent) {
      setError('Keine Ausgabe zum Herunterladen verfügbar');
      return;
    }

    try {
      // Bestimme den Standarddateinamen
      const baseFileName = fileName
        ? fileName.replace(/\.[^/.]+$/, '')
        : 'converted';
      const defaultFileName = `${baseFileName}${getFileExtension(format)}`;

      const downloadInBrowser = (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = defaultFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      };

      const isRasterOutput = format === 'png' || format === 'jpg' || format === 'jpeg' || format === 'webp';
      const isSvgOutput = format === 'svg';

      // Web-Fallback: ohne Tauri Save-Dialog direkt herunterladen
      if (!isTauri()) {
        if (isRasterOutput) {
          if (!outputContent.startsWith('data:image/')) {
            throw new Error('Ungültige Bilddaten für Download');
          }
          const base64Part = outputContent.split(',')[1] ?? '';
          const binary = atob(base64Part);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
          }
          downloadInBrowser(new Blob([bytes], { type: `image/${format === 'jpg' ? 'jpeg' : format}` }));
        } else if (isSvgOutput) {
          downloadInBrowser(new Blob([outputContent], { type: 'image/svg+xml;charset=utf-8' }));
        } else {
          downloadInBrowser(new Blob([outputContent], { type: 'text/plain;charset=utf-8' }));
        }
        setError(null);
        return;
      }

      // Öffne Save-Dialog mit Tauri
      const filePath = await save({
        defaultPath: defaultFileName,
        filters: [
          {
            name: `${format.toUpperCase()} Datei`,
            extensions: [getFileExtension(format).replace('.', '')],
          },
        ],
      });

      if (!filePath) {
        // Benutzer hat abgebrochen
        return;
      }

      if (isRasterOutput) {
        if (!outputContent.startsWith('data:image/')) {
          throw new Error('Ungültige Bilddaten für Download');
        }

        const base64Part = outputContent.split(',')[1] ?? '';
        const binary = atob(base64Part);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        await writeFile(filePath, bytes);
      } else if (isSvgOutput) {
        await writeTextFile(filePath, outputContent);
      } else {
        await writeTextFile(filePath, outputContent);
      }

      // Erfolg - entferne mögliche vorherige Fehler
      setError(null);
    } catch (error) {
      console.error('Download-Fehler:', error);
      setError(`Download fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  const handleDownloadAll = async () => {
    const formatsToSave = availableOutputFormats.filter((fmt) => fmt !== 'pdf' && Boolean(outputByFormat[fmt]));
    if (formatsToSave.length === 0) {
      setError('Keine Ausgaben zum Speichern verfügbar');
      return;
    }

    const baseFileName = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'converted';
    const zipFileName = `${baseFileName}-converted.zip`;

    const decodeDataUrl = (dataUrl: string) => {
      const base64Part = dataUrl.split(',')[1] ?? '';
      const binary = atob(base64Part);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    };

    try {
      const zip = new JSZip();
      for (const fmt of formatsToSave) {
        const content = outputByFormat[fmt] ?? '';
        const filename = `${baseFileName}${getFileExtension(fmt)}`;

        if (fmt === 'png' || fmt === 'jpg' || fmt === 'jpeg' || fmt === 'webp') {
          if (!content.startsWith('data:image/')) continue;
          zip.file(filename, decodeDataUrl(content));
          continue;
        }

        zip.file(filename, content);
      }

      const zipBytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });

      if (!isTauri()) {
        const blob = new Blob([zipBytes], { type: 'application/zip' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = zipFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setError(null);
        return;
      }

      const filePath = await save({
        defaultPath: zipFileName,
        filters: [{ name: 'ZIP', extensions: ['zip'] }],
      });
      if (!filePath) return;
      await writeFile(filePath, zipBytes);
      setError(null);
    } catch (error) {
      setError(`Alle speichern fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  const copyWithFallback = async (value: string): Promise<boolean> => {
    if (!value) return false;

    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {
        // fallback below
      }
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  };

  const getCurrentImageData = () => {
    const content = outputByFormat[activeResultFormat] ?? '';
    if (!content) return { dataUrl: '', base64: '' };

    if (content.startsWith('data:')) {
      const base64 = content.split(',')[1] ?? '';
      return { dataUrl: content, base64 };
    }

    if (activeResultFormat === 'svg') {
      const encoded = encodeURIComponent(content);
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encoded}`;
      const base64 = btoa(unescape(encodeURIComponent(content)));
      return { dataUrl, base64 };
    }

    return { dataUrl: '', base64: '' };
  };

  const handleImagePresetSelect = (preset: 'logo' | 'illustration' | 'photo') => {
    setActiveImagePreset(preset);
    if (preset === 'logo') {
      setImageQuality(96);
      setImageRasterSize(96);
      return;
    }
    if (preset === 'illustration') {
      setImageQuality(84);
      setImageRasterSize(176);
      return;
    }
    setImageQuality(72);
    setImageRasterSize(256);
  };

  const showCopyFeedback = (message: string) => {
    setCopyFeedback(message);
    window.setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleCopyImageDataUrl = async () => {
    const { dataUrl } = getCurrentImageData();
    if (!dataUrl) {
      setError('Keine Data URL zum Kopieren verfügbar');
      return;
    }
    const ok = await copyWithFallback(dataUrl);
    if (ok) {
      setError(null);
      showCopyFeedback('Data URL kopiert');
    } else {
      setError('Kopieren fehlgeschlagen (Clipboard blockiert)');
    }
  };

  const handleCopyImageBase64 = async () => {
    const { base64 } = getCurrentImageData();
    if (!base64) {
      setError('Für dieses Ergebnis ist kein Base64-String verfügbar');
      return;
    }
    const ok = await copyWithFallback(base64);
    if (ok) {
      setError(null);
      showCopyFeedback('Base64 kopiert');
    } else {
      setError('Kopieren fehlgeschlagen (Clipboard blockiert)');
    }
  };

  const saveTextFileInBrowser = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveImageText = async (kind: 'dataurl' | 'base64') => {
    const { dataUrl, base64 } = getCurrentImageData();
    const payload = kind === 'dataurl' ? dataUrl : base64;
    if (!payload) {
      setError(`Kein ${kind === 'dataurl' ? 'Data URL' : 'Base64'}-Inhalt verfügbar`);
      return;
    }

    const baseFileName = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'converted-image';
    const defaultFileName = `${baseFileName}-${kind}.txt`;

    try {
      if (!isTauri()) {
        saveTextFileInBrowser(payload, defaultFileName);
        setError(null);
        return;
      }

      const filePath = await save({
        defaultPath: defaultFileName,
        filters: [{ name: 'Textdatei', extensions: ['txt'] }],
      });

      if (!filePath) return;
      await writeTextFile(filePath, payload);
      setError(null);
    } catch (error) {
      setError(`TXT speichern fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };


  // Render step content
  const step1Props = {
    detectedFormatLabel: detectedSourceFormat ? detectedSourceFormat.toUpperCase() : 'Auto',
    fileName,
    hasInputContent: hasAnyInput,
    selectedFormats: selectedToFormats,
    formatOptions: targetFormatOptions,
    recentConversions,
    error,
    isPreparingInput,
    isConverting,
    fileInputRef,
    onToggleFormat: (format: SupportedFormat) => {
      setSelectedToFormats((prev) => {
        const next = prev.includes(format)
          ? prev.filter((item) => item !== format)
          : [...prev, format];
        if (next.length > 0 && !next.includes(activeResultFormat)) {
          setActiveResultFormat(next[0]);
        }
        return next;
      });
    },
    onApplyRecentTargets: (targets: SupportedFormat[]) => {
      const uniqueTargets = Array.from(new Set(targets));
      if (uniqueTargets.length === 0) return;
      setSelectedToFormats(uniqueTargets);
      setActiveResultFormat(uniqueTargets[0]);
    },
    onDeleteRecentItem: (id: string) => {
      setRecentConversions((prev) => prev.filter((item) => item.id !== id));
    },
    onClearRecentItems: () => {
      setRecentConversions([]);
    },
    onUploadFile: (file: File) => { void handleFileUpload(file); },
    onConvert: async () => {
      const success = await handleConvert();
      if (success) handleSetCurrentStep(2);
    },
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step1FormatSelection {...step1Props} />;
      case 2:
        return (
          <Step4Result
            activeFormat={activeResultFormat}
            outputByFormat={outputByFormat}
            availableFormats={availableOutputFormats}
            onActiveFormatChange={setActiveResultFormat}
            showImageControls={showImageOptions}
            imageQuality={imageQuality}
            imageRasterSize={imageRasterSize}
            imageSmoothEdges={imageSmoothEdges}
            activeImagePreset={activeImagePreset}
            isPreviewRefreshing={isPreviewRefreshing}
            onImageQualityChange={(value) => {
              setImageQuality(value);
              setActiveImagePreset('custom');
            }}
            onImageRasterSizeChange={(value) => {
              setImageRasterSize(value);
              setActiveImagePreset('custom');
            }}
            onImageSmoothEdgesChange={(value) => {
              setImageSmoothEdges(value);
              setActiveImagePreset('custom');
            }}
            onImagePresetSelect={handleImagePresetSelect}
            copyFeedback={copyFeedback}
            onCopyImageDataUrl={handleCopyImageDataUrl}
            onCopyImageBase64={handleCopyImageBase64}
            onSaveDataUrlTxt={() => void handleSaveImageText('dataurl')}
            onSaveBase64Txt={() => void handleSaveImageText('base64')}
            onDownload={handleDownload}
            onDownloadAll={() => void handleDownloadAll()}
            onStartOver={() => {
              handleSetCurrentStep(1);
              setInputContent('');
              setInputBinaryContent(null);
              setOutputByFormat({});
              setFileName('');
              setFromFormat('txt');
              setDetectedSourceFormat(null);
              setSelectedToFormats(['md']);
              setActiveResultFormat('md');
              setImageQuality(86);
              setImageRasterSize(160);
              setImageSmoothEdges(true);
              setActiveImagePreset('custom');
              setError(null);
            }}
            showOpenInContentStudio={
              !isTauri() &&
              !!activeOutputContent &&
              !(activeResultFormat === 'png' || activeResultFormat === 'jpg' || activeResultFormat === 'jpeg' || activeResultFormat === 'webp' || activeResultFormat === 'svg')
            }
            onOpenInContentStudio={() => {
              const name = fileName?.trim() || `converted${getFileExtension(activeResultFormat)}`;
              onOpenInContentStudio?.(activeOutputContent, name);
            }}
          />
        );
      default:
        return <Step1FormatSelection {...step1Props} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex flex-col">
      {/* Step Indicator */}
      <div className="flex justify-center gap-2 pt-6 pb-2">
        {[1, 2].map((step) => (
          <div
            key={step}
            className={`w-2 h-2 rounded-full transition-colors ${
              step === currentStep
                ? 'bg-[#AC8E66]'
                : step < currentStep
                ? 'bg-[#AC8E66]/50'
                : 'bg-[#555]'
            }`}
          />
        ))}
      </div>

      {/* Step Content */}
      {renderStepContent()}

      {/* Settings Modal */}
      <ZenSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={() => setError(null)}
        defaultTab="ai"
      />

      {/* Generating Modal */}
      <ZenGeneratingModal
        isOpen={isConverting}
        templateName={`${selectedToFormats.map((format) => format.toUpperCase()).join(', ')} Konvertierung`}
        onClose={() => setIsConverting(false)}
      />
    </div>
  );
};
