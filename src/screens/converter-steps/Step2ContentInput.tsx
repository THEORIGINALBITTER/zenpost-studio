// ./screens/converter-steps/Step2ContentInput.tsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faUpload } from '@fortawesome/free-solid-svg-icons';
import { ZenSubtitle } from '../../kits/PatternKit/ZenSubtitle';
import { ZenRoughButton } from '../../kits/PatternKit/ZenModalSystem';
import { SupportedFormat } from '../../utils/fileConverter';

interface Step2ContentInputProps {
  fromFormat: SupportedFormat;
  inputContent: string;
  fileName: string;
  error: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onInputContentChange: (content: string) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBack: () => void;
  onNext: () => void;
}

export const Step2ContentInput = ({
  fromFormat,
  inputContent,
  fileName,
  error,
  fileInputRef,
  onInputContentChange,
  onFileUpload,
  onBack,
  onNext,
}: Step2ContentInputProps) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
      <h2 className="font-mono text-3xl text-[#e5e5e5] font-normal">
        Schritt 2: Inhalt bereitstellen
      </h2>
      <ZenSubtitle className="text-center max-w-md">
        Lade eine Datei hoch oder gib den Inhalt direkt ein
      </ZenSubtitle>

      {/* File Upload */}
      <div className="mt-8">
        <input
          ref={fileInputRef}
          type="file"
          onChange={onFileUpload}
          className="hidden"
          accept=".json,.md,.markdown,.html,.htm,.txt,.text,.js,.jsx,.ts,.tsx,.py,.rs,.go,.java,.c,.cpp,.h,.hpp,.cs,.php,.rb,.swift,.kt,.scala"
        />
        <ZenRoughButton
          label={fileName || 'Datei hochladen'}
          icon={<FontAwesomeIcon icon={faUpload} className="text-[#AC8E66]" />}
          onClick={() => fileInputRef.current?.click()}
        />
      </div>

      {/* OR Divider */}
      <div className="flex items-center gap-4 my-4">
        <div className="h-px w-20 bg-[#555]"></div>
        <span className= "mt-[10px] text-[#999] text-[10px] ">oder Code eintragen</span>
        <div className="h-px w-20 bg-[#555]"></div>
      </div>

      {/* Text Input */}
      <div className=" w-1/2 h-[150px]">
        <textarea
          value={inputContent}
          onChange={(e) => onInputContentChange(e.target.value)}
          className="w-full h-[128px] bg-[#2A2A2A] text-[#e5e5e5] border border-[#AC8E66] rounded p-4 font-mono text-sm resize-none focus:outline-none focus:border-[#D4AF78]"
          placeholder={`${fromFormat.toUpperCase()}-Inhalt hier eingeben...`}
        />
      </div>

      {error && (
        <div className="w-full max-w-2xl p-3 bg-red-900/20 border border-red-500/50 rounded text-red-300 text-sm font-mono">
          {error}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-4 mt-4">
        <ZenRoughButton
          label="Zurück"
          icon={<FontAwesomeIcon icon={faArrowRight} className="text-[#AC8E66]" rotation={180} />}
          onClick={onBack}
        />
        {inputContent.trim() && (
          <ZenRoughButton
            label="Weiter"
            icon={<FontAwesomeIcon icon={faArrowRight} className="text-[#AC8E66]" />}
            onClick={onNext}
          />
        )}
      </div>
    </div>
  );
};
