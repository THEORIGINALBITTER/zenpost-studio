import { useState, useRef } from 'react';
import {
  faFileCode,
  faFileAlt,
  faFilePdf,
  faFileLines,
  faRobot,
} from '@fortawesome/free-solid-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { ZenHeader } from '../kits/PatternKit/ZenHeader';
import { ZenAISettingsModal } from '../kits/PatternKit/ZenAISettingsModal';
import { ZenInfoFooter } from '../kits/PatternKit/ZenInfoFooter';
import { ZenFooterText } from '../kits/PatternKit/ZenFooterText';
import { Step1FormatSelection } from './converter-steps/Step1FormatSelection';
import { Step2ContentInput } from './converter-steps/Step2ContentInput';
import { Step3Convert } from './converter-steps/Step3Convert';
import { Step4Result } from './converter-steps/Step4Result';
import {
  convertFile,
  SupportedFormat,
  detectFormatFromFilename,
  getFileExtension,
} from '../utils/fileConverter';

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
  { value: 'html', label: 'HTML', icon: faFileAlt },
  { value: 'txt', label: 'Text', icon: faFileAlt },
  { value: 'pdf', label: 'PDF', icon: faFilePdf },
];

interface ConverterScreenProps {
  onBack?: () => void;
}

export const ConverterScreen = ({ onBack }: ConverterScreenProps) => {
  // Step State
  const [currentStep, setCurrentStep] = useState(1);

  // Data State
  const [inputContent, setInputContent] = useState('');
  const [outputContent, setOutputContent] = useState('');
  const [fromFormat, setFromFormat] = useState<SupportedFormat>('code');
  const [toFormat, setToFormat] = useState<SupportedFormat>('md');
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    // Auto-detect format from filename
    const detectedFormat = detectFormatFromFilename(file.name);
    if (detectedFormat) {
      setFromFormat(detectedFormat);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setInputContent(content);
      setError(null);
      setCurrentStep(3); // Move to conversion step after upload
    };
    reader.onerror = () => {
      setError('Fehler beim Lesen der Datei');
    };
    reader.readAsText(file);
  };

  const handleConvert = async () => {
    if (!inputContent.trim()) {
      setError('Bitte Inhalt eingeben oder Datei hochladen');
      return;
    }

    setIsConverting(true);
    setError(null);

    try {
      const result = await convertFile(inputContent, fromFormat, toFormat, fileName);

      if (result.success && result.data) {
        setOutputContent(result.data);

        // Für PDF: Öffne Print-Dialog
        if (toFormat === 'pdf') {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(result.data);
            printWindow.document.close();
            setTimeout(() => {
              printWindow.print();
            }, 250);
          }
        }
      } else {
        setError(result.error || 'Konvertierung fehlgeschlagen');
      }
    } catch (err) {
      setError(
        `Fehler: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`
      );
    } finally {
      setIsConverting(false);
    }
  };


  // Step titles for header
  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Step 1/4 · Format wählen';
      case 2:
        return 'Step 2/4 · Inhalt bereitstellen';
      case 3:
        return 'Step 3/4 · Konvertierung';
      case 4:
        return 'Step 4/4 · Fertig!';
      default:
        return 'Step 1/4 · Format wählen';
    }
  };

  const handleDownload = () => {
    if (!outputContent) {
      setError('Keine Ausgabe zum Herunterladen verfügbar');
      return;
    }

    const blob = new Blob([outputContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const baseFileName = fileName
      ? fileName.replace(/\.[^/.]+$/, '')
      : 'converted';
    link.download = `${baseFileName}${getFileExtension(toFormat)}`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1FormatSelection
            fromFormat={fromFormat}
            toFormat={toFormat}
            formatOptions={formatOptions}
            onFromFormatChange={setFromFormat}
            onToFormatChange={setToFormat}
            onNext={() => setCurrentStep(2)}
          />
        );
      case 2:
        return (
          <Step2ContentInput
            fromFormat={fromFormat}
            inputContent={inputContent}
            fileName={fileName}
            error={error}
            fileInputRef={fileInputRef}
            onInputContentChange={setInputContent}
            onFileUpload={handleFileUpload}
            onBack={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(3)}
          />
        );
      case 3:
        return (
          <Step3Convert
            fromFormat={fromFormat}
            toFormat={toFormat}
            inputContent={inputContent}
            error={error}
            isConverting={isConverting}
            onConvert={async () => {
              await handleConvert();
              if (outputContent) {
                setCurrentStep(4);
              }
            }}
            onBack={() => setCurrentStep(2)}
          />
        );
      case 4:
        return (
          <Step4Result
            toFormat={toFormat}
            outputContent={outputContent}
            onDownload={handleDownload}
            onStartOver={() => {
              setCurrentStep(1);
              setInputContent('');
              setOutputContent('');
              setFileName('');
              setError(null);
            }}
          />
        );
      default:
        return (
          <Step1FormatSelection
            fromFormat={fromFormat}
            toFormat={toFormat}
            formatOptions={formatOptions}
            onFromFormatChange={setFromFormat}
            onToFormatChange={setToFormat}
            onNext={() => setCurrentStep(2)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex flex-col">
      <ZenHeader
        leftText="ZenPost Studio Converter"
        rightText={getStepTitle()}
        onBack={onBack}
      />

      {/* Step Indicator */}
      <div className="flex justify-center gap-2 pt-6 pb-2">
        {[1, 2, 3, 4].map((step) => (
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

      {/* Footer */}
      <ZenInfoFooter
        onClick={() => setIsSettingsOpen(true)}
        fixed={false}
        className="mb-4"
        iconType="settings"
      />

      <ZenFooterText className="mb-8" />

      {/* AI Settings Modal */}
      <ZenAISettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={() => setError(null)}
      />
    </div>
  );
};
