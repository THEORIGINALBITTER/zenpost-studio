import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faFileUpload, faEye, faPencil } from '@fortawesome/free-solid-svg-icons';
import { ZenSubtitle } from '../../kits/PatternKit/ZenSubtitle';
import { ZenRoughButton } from '../../kits/PatternKit/ZenModalSystem';
import { ZenMarkdownEditor } from '../../kits/PatternKit/ZenMarkdownEditor';

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
  const [showPreview, setShowPreview] = useState(false);

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
           <span className='text-[#AC8E66]'> Schritt 1:</span> Quelle eingeben
          </h2>
        </div>

        {/* Subtitle */}
        <div className="mb-8">
          <ZenSubtitle>
            Füge deinen Markdown-Inhalt ein oder lade eine Datei hoch
          </ZenSubtitle>
        </div>

    {/* Info Text */}
<div className="text-center max-w-xl mb-8 px-4">
  <p className="text-[#777] font-mono text-[11px] leading-relaxed whitespace-normal">
    <span className='text-[#AC8E66]'>Tipp:  </span>Du kannst hier deine README.md, Blog-Entwürfe oder technische Dokumentation einfügen.
    Die AI formatiert und optimiert den Inhalt automatisch für die von dir gewählte Plattform.
  </p>
</div>

        {/* File Upload Button */}
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

        {/* Markdown Editor */}
        <div className="w-full mb-8"
         style={{ paddingTop: 10, marginTop: 20 }}
        >
          <ZenMarkdownEditor
            value={sourceContent}
            onChange={onSourceContentChange}
            placeholder="# Dein Markdown Inhalt hier einfügen... mit shift+/ Menu öffnen" 
            height="400px"
            showCharCount={false}
            showPreview={showPreview}
            onPreviewToggle={setShowPreview}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 text-center">
            <p className="text-[#E89B5A] font-mono text-[10px]">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-8 flex gap-4 items-center"
        
         style={{ paddingTop: 10, marginTop: 20 }}
        >
          {showPreview ? (
            // When in preview mode, show both "Weiter verfassen" and "Weiter" buttons
            <>
              <ZenRoughButton
                label="Weiter verfassen"
                icon={<FontAwesomeIcon icon={faPencil} className="text-[#AC8E66]" />}
                onClick={() => setShowPreview(false)}
              />
              <ZenRoughButton
                label="Weiter"
                icon={<FontAwesomeIcon icon={faArrowRight} className="text-[#AC8E66]" />}
                onClick={onNext}
              />
            </>
          ) : (
            // When in editor mode, show "Preview" button
            <ZenRoughButton
              label="Preview"
              icon={<FontAwesomeIcon icon={faEye} className="text-[#AC8E66]" />}
              onClick={() => setShowPreview(true)}
            />
          )}
        </div>

        <div className='mt-[50px]'></div>
      </div>
    </div>
  );
};
