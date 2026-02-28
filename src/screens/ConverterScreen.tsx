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
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { isTauri } from '@tauri-apps/api/core';
import { ZenSettingsModal, ZenGeneratingModal } from '../kits/PatternKit/ZenModalSystem';
import { Step1FormatSelection } from './converter-steps/Step1FormatSelection';
import { Step4Result } from './converter-steps/Step4Result';
import {
  convertFile,
  SupportedFormat,
  getFileExtension,
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
  const [outputByFormat, setOutputByFormat] = useState<Record<string, string>>({});
  const [fromFormat, setFromFormat] = useState<SupportedFormat>('txt');
  const [selectedToFormats, setSelectedToFormats] = useState<SupportedFormat[]>(['md']);
  const [activeResultFormat, setActiveResultFormat] = useState<SupportedFormat>('md');
  const [isConverting, setIsConverting] = useState(false);
  const [isPreparingInput, setIsPreparingInput] = useState(false);
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

  useEffect(() => {
    void loadConverterHistory().then((items) => {
      if (items.length > 0) setRecentConversions(items as RecentConversionItem[]);
    });
  }, []);

  useEffect(() => {
    void saveConverterHistory(recentConversions);
  }, [recentConversions]);

  const handleFileUpload = async (file: File) => {
    setFileName(file.name);
    setOutputByFormat({});
    setError(null);
    setIsPreparingInput(true);

    try {
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
      setFromFormat(result.contentFormat);
      setDetectedSourceFormat(result.detectedFormat);
      setActiveResultFormat(selectedToFormats[0] ?? 'md');
    } catch {
      setError('Datei konnte nicht geladen werden.');
    } finally {
      setIsPreparingInput(false);
    }
  };

  const handleConvert = async (): Promise<boolean> => {
    if (!inputContent.trim()) {
      setError('Bitte zuerst eine Datei hochladen.');
      return false;
    }

    setIsConverting(true);
    setError(null);

    if (selectedToFormats.length === 0) {
      setError('Bitte mindestens ein Ausgabeformat wählen.');
      setIsConverting(false);
      return false;
    }

    try {
      const nextOutputs: Record<string, string> = {};
      const failedFormats: SupportedFormat[] = [];

      for (const targetFormat of selectedToFormats) {
        const result = await convertFile(inputContent, fromFormat, targetFormat, fileName);
        if (result.success && result.data) {
          nextOutputs[targetFormat] = result.data;
          continue;
        }
        failedFormats.push(targetFormat);
      }

      if (Object.keys(nextOutputs).length === 0) {
        setError('Konvertierung fehlgeschlagen.');
        return false;
      }

      setOutputByFormat(nextOutputs);
      const firstSuccessFormat = selectedToFormats.find((format) => Boolean(nextOutputs[format]));
      if (firstSuccessFormat) {
        setActiveResultFormat(firstSuccessFormat);
      }

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

      if (failedFormats.length > 0) {
        setError(`Teilweise konvertiert. Fehlgeschlagen: ${failedFormats.join(', ')}`);
      }

      return true;
    } catch (err) {
      setError(
        `Fehler: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`
      );
      return false;
    } finally {
      setIsConverting(false);
    }
  };

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

      // Speichere die Datei
      await writeTextFile(filePath, outputContent);

      // Erfolg - entferne mögliche vorherige Fehler
      setError(null);
    } catch (error) {
      console.error('Download-Fehler:', error);
      setError(`Download fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };


  // Render step content
  const step1Props = {
    detectedFormatLabel: detectedSourceFormat ? detectedSourceFormat.toUpperCase() : 'Auto',
    fileName,
    hasInputContent: inputContent.trim().length > 0,
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
            onDownload={handleDownload}
            onStartOver={() => {
              handleSetCurrentStep(1);
              setInputContent('');
              setOutputByFormat({});
              setFileName('');
              setFromFormat('txt');
              setDetectedSourceFormat(null);
              setSelectedToFormats(['md']);
              setActiveResultFormat('md');
              setError(null);
            }}
            showOpenInContentStudio={!isTauri() && !!activeOutputContent}
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
