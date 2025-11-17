import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotateLeft, faCopy, faDownload, faCheck } from '@fortawesome/free-solid-svg-icons';
import { ZenSubtitle } from '../../kits/PatternKit/ZenSubtitle';
import { ZenRoughButton } from '../../kits/PatternKit/ZenRoughButton';
import { ContentPlatform } from '../../services/aiService';

interface Step4TransformResultProps {
  transformedContent: string;
  platform: ContentPlatform;
  onReset: () => void;
  onBack: () => void;
}

const platformLabels: Record<ContentPlatform, string> = {
  linkedin: 'LinkedIn Post',
  devto: 'dev.to Artikel',
  twitter: 'Twitter Thread',
  medium: 'Medium Blog',
  reddit: 'Reddit Post',
  'github-discussion': 'GitHub Discussion',
  youtube: 'YouTube Description',
};

export const Step4TransformResult = ({
  transformedContent,
  platform,
  onReset,
  onBack,
}: Step4TransformResultProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transformedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([transformedContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${platform}-content.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div className="flex flex-col items-center w-full max-w-4xl">
        {/* Title */}
        <div className="mb-4">
          <h2 className="font-mono text-3xl text-[#e5e5e5] text-center">
            Transformation abgeschlossen!
          </h2>
        </div>

        {/* Subtitle */}
        <div className="mb-12">
          <ZenSubtitle>
            {`Dein Content wurde für ${platformLabels[platform]} optimiert`}
          </ZenSubtitle>
        </div>

        {/* Result Container */}
        <div className="w-full bg-[#2A2A2A] border border-[#3a3a3a] rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-mono text-sm text-[#AC8E66]">Transformierter Content:</h3>
            <div className="flex gap-3">
              {/* Copy Button */}
              <button
                onClick={handleCopy}
                className="text-[#777] hover:text-[#AC8E66] transition-colors"
                title="In Zwischenablage kopieren"
              >
                <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="text-lg" />
              </button>

              {/* Download Button */}
              <button
                onClick={handleDownload}
                className="text-[#777] hover:text-[#AC8E66] transition-colors"
                title="Als Datei herunterladen"
              >
                <FontAwesomeIcon icon={faDownload} className="text-lg" />
              </button>
            </div>
          </div>

          {/* Content Display */}
          <div className="bg-[#1F1F1F] rounded p-4 max-h-[500px] overflow-y-auto">
            <pre className="font-mono text-sm text-[#e5e5e5] whitespace-pre-wrap break-words">
              {transformedContent}
            </pre>
          </div>
        </div>

        {/* Character Count */}
        <div className="mb-12">
          <p className="text-[#777] font-mono text-xs">
            {transformedContent.length} Zeichen • {transformedContent.split('\n').length} Zeilen
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-6 mb-8">
          <ZenRoughButton
            label="Neuer Transform"
            icon={<FontAwesomeIcon icon={faRotateLeft} className="text-[#AC8E66]" />}
            onClick={onReset}
          />
        </div>

        {/* Info Text */}
        <div className="text-center max-w-2xl">
          <p className="text-[#777] font-mono text-xs leading-relaxed">
            Tipp: Du kannst den Content jetzt direkt kopieren und in {platformLabels[platform]}{' '}
            einfügen. Bei Bedarf kannst du ihn auch als Markdown-Datei herunterladen.
          </p>
        </div>
      </div>
    </div>
  );
};
