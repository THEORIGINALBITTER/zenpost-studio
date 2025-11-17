import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faFileUpload } from '@fortawesome/free-solid-svg-icons';
import { ZenSubtitle } from '../../kits/PatternKit/ZenSubtitle';
import { ZenRoughButton } from '../../kits/PatternKit/ZenRoughButton';

interface Step1SourceInputProps {
  sourceContent: string;
  fileName: string;
  error: string | null;
  onSourceContentChange: (content: string) => void;
  onFileNameChange: (name: string) => void;
  onNext: () => void;
}

export const Step1SourceInput = ({
  sourceContent,
  fileName,
  error,
  onSourceContentChange,
  onFileNameChange,
  onNext,
}: Step1SourceInputProps) => {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    onFileNameChange(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      onSourceContentChange(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center w-3/4 max-w-3xl">
        {/* Title */}
        <div className="mb-4">
          <h2 className="font-mono text-3xl text-[#e5e5e5] text-center">
            Schritt 1: Quelle eingeben
          </h2>
        </div>

        {/* Subtitle */}
        <div className="mb-20">
          <ZenSubtitle>
            Füge deinen Markdown-Inhalt ein oder lade eine Datei hoch
          </ZenSubtitle>
        </div>

             <div className="mb-8">
          <label htmlFor="file-upload">
            <div className="cursor-pointer">
              <ZenRoughButton
                label={fileName || 'Datei hochladen'}
                icon={<FontAwesomeIcon icon={faFileUpload} className="text-[#AC8E66]" />}
                onClick={() => document.getElementById('file-upload')?.click()}
              />
            </div>
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".md,.markdown,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Textarea */}
        <div className="w-full mt-[8px]">
          <textarea
            value={sourceContent}
            onChange={(e) => onSourceContentChange(e.target.value)}
            placeholder="# Dein Markdown Inhalt hier einfügen..."
            className="w-full h-[400px] bg-[#2A2A2A] text-[#e5e5e5] font-mono text-sm
              border border-[#AC8E66] rounded-lg
              focus:outline-none focus:border-[#AC8E66]
              resize-none transition-colors zen-scrollbar"
            style={{ padding: '5px' }}
          />
        </div>

        {/* File Upload Button */}
   

        {/* Error Message */}
        {error && (
          <div className="mb-8 text-center">
            <p className="text-red-400 font-mono text-sm">{error}</p>
          </div>
        )}

        {/* Character Count */}
        <div className="mb-8">
          <p className="text-[#777] font-mono text-xs">
            {sourceContent.length} Zeichen
          </p>
        </div>

        {/* Next Button */}
        <div className="mb-8">
          <ZenRoughButton
            label="Weiter"
            icon={<FontAwesomeIcon icon={faArrowRight} className="text-[#AC8E66]" />}
            onClick={onNext}
          />
        </div>

        {/* Info Text */}
        <div className="text-center max-w-xl mt-[20px]">
          <p className="text-[#777] font-mono text-[10px] leading-relaxed mt-[10px]">
            Tipp: Füge deine README.md, Blog-Entwürfe oder technische Dokumentation ein.
            Die AI wird den Inhalt für die gewählte Plattform optimieren.
          </p>
        </div>
        <div className='mt-[50px]'></div>
      </div>
    </div>
  );
};
