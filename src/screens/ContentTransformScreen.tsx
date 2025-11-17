import { useState } from 'react';
import {
  faLinkedin,
  faDev,
  faTwitter,
  faMedium,
  faReddit,
  faGithub,
  faYoutube,
} from '@fortawesome/free-brands-svg-icons';
import { ZenHeader } from '../kits/PatternKit/ZenHeader';
import { ZenAISettingsModal } from '../kits/PatternKit/ZenAISettingsModal';
import { ZenInfoFooter } from '../kits/PatternKit/ZenInfoFooter';
import { ZenFooterText } from '../kits/PatternKit/ZenFooterText';
import { Step1SourceInput } from './transform-steps/Step1SourceInput';
import { Step2PlatformSelection } from './transform-steps/Step2PlatformSelection';
import { Step3StyleOptions } from './transform-steps/Step3StyleOptions';
import { Step4TransformResult } from './transform-steps/Step4TransformResult';
import {
  transformContent,
  type ContentPlatform,
  type ContentTone,
  type ContentLength,
  type ContentAudience,
} from '../services/aiService';

interface PlatformOption {
  value: ContentPlatform;
  label: string;
  icon: any;
  description: string;
}

const platformOptions: PlatformOption[] = [
  {
    value: 'linkedin',
    label: 'LinkedIn Post',
    icon: faLinkedin,
    description: 'Professional business network post',
  },
  {
    value: 'devto',
    label: 'dev.to Article',
    icon: faDev,
    description: 'Community-focused developer article',
  },
  {
    value: 'twitter',
    label: 'Twitter Thread',
    icon: faTwitter,
    description: 'Concise, engaging thread',
  },
  {
    value: 'medium',
    label: 'Medium Blog',
    icon: faMedium,
    description: 'Long-form storytelling blog',
  },
  {
    value: 'reddit',
    label: 'Reddit Post',
    icon: faReddit,
    description: 'Community discussion post',
  },
  {
    value: 'github-discussion',
    label: 'GitHub Discussion',
    icon: faGithub,
    description: 'Technical collaborative discussion',
  },
  {
    value: 'youtube',
    label: 'YouTube Description',
    icon: faYoutube,
    description: 'SEO-optimized video description',
  },
];

interface ContentTransformScreenProps {
  onBack: () => void;
}

export const ContentTransformScreen = ({ onBack }: ContentTransformScreenProps) => {
  // Step Management
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Source Input
  const [sourceContent, setSourceContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  // Step 2: Platform Selection
  const [selectedPlatform, setSelectedPlatform] = useState<ContentPlatform>('linkedin');

  // Step 3: Style Options
  const [tone, setTone] = useState<ContentTone>('professional');
  const [length, setLength] = useState<ContentLength>('medium');
  const [audience, setAudience] = useState<ContentAudience>('intermediate');

  // Step 4: Result
  const [transformedContent, setTransformedContent] = useState<string>('');
  const [isTransforming, setIsTransforming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Settings Modal
  const [showSettings, setShowSettings] = useState(false);

  // Navigation Handlers
  const handleBack = () => {
    if (currentStep === 1) {
      onBack(); // Go back to WelcomeScreen
    } else {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleNextFromStep1 = () => {
    if (!sourceContent.trim()) {
      setError('Bitte gib Inhalt ein oder lade eine Datei hoch');
      return;
    }
    setError(null);
    setCurrentStep(2);
  };

  const handleNextFromStep2 = () => {
    setError(null);
    setCurrentStep(3);
  };

  const handleTransform = async () => {
    setIsTransforming(true);
    setError(null);

    try {
      const result = await transformContent(sourceContent, {
        platform: selectedPlatform,
        tone,
        length,
        audience,
      });

      if (result.success && result.data) {
        setTransformedContent(result.data);
        setCurrentStep(4);
      } else {
        setError(result.error || 'Transformation fehlgeschlagen');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsTransforming(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSourceContent('');
    setFileName('');
    setTransformedContent('');
    setError(null);
  };

  // Render Step Content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1SourceInput
            sourceContent={sourceContent}
            fileName={fileName}
            error={error}
            onSourceContentChange={setSourceContent}
            onFileNameChange={setFileName}
            onNext={handleNextFromStep1}
          />
        );
      case 2:
        return (
          <Step2PlatformSelection
            selectedPlatform={selectedPlatform}
            platformOptions={platformOptions}
            onPlatformChange={setSelectedPlatform}
            onBack={() => setCurrentStep(1)}
            onNext={handleNextFromStep2}
          />
        );
      case 3:
        return (
          <Step3StyleOptions
            tone={tone}
            length={length}
            audience={audience}
            onToneChange={setTone}
            onLengthChange={setLength}
            onAudienceChange={setAudience}
            onBack={() => setCurrentStep(2)}
            onTransform={handleTransform}
            isTransforming={isTransforming}
            error={error}
          />
        );
      case 4:
        return (
          <Step4TransformResult
            transformedContent={transformedContent}
            platform={selectedPlatform}
            onReset={handleReset}
            onBack={() => setCurrentStep(3)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#1A1A1A] text-[#e5e5e5] overflow-hidden">
      {/* Header */}
      <ZenHeader
        leftText="ZenPost Studio • Content Transform"
        rightText={`Schritt ${currentStep}/4 • ${
          currentStep === 1
            ? 'Quelle eingeben'
            : currentStep === 2
            ? 'Plattform wählen'
            : currentStep === 3
            ? 'Stil anpassen'
            : 'Ergebnis'
        }`}
        onBack={handleBack}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">{renderStepContent()}</div>

      {/* Footer */}
      <div className="relative">
        <ZenInfoFooter onClick={() => setShowSettings(true)} iconType="settings" />
        <ZenFooterText />
      </div>

      {/* AI Settings Modal */}
      <ZenAISettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={() => setError(null)}
      />
    </div>
  );
};
