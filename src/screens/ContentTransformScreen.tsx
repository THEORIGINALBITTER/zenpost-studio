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
import { ZenSettingsModal, ZenMetadataModal, type ProjectMetadata } from '../kits/PatternKit/ZenModalSystem';
import { ZenFooterText } from '../kits/PatternKit/ZenModalSystem';
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
import {
  postToSocialMedia,
  loadSocialConfig,
  isPlatformConfigured,
  type SocialPlatform,
  type LinkedInPostOptions,
  type TwitterPostOptions,
  type RedditPostOptions,
  type DevToPostOptions,
  type MediumPostOptions,
} from '../services/socialMediaService';

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
  const [isPosting, setIsPosting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Settings Modal
  const [showSettings, setShowSettings] = useState(false);
  const [showSettingsNotification, setShowSettingsNotification] = useState(false);

  // Metadata Modal
  const [showMetadata, setShowMetadata] = useState(false);
  const [metadata, setMetadata] = useState<ProjectMetadata>({
    authorName: '',
    authorEmail: '',
    companyName: '',
    license: 'MIT',
    year: new Date().getFullYear().toString(),
    website: '',
    repository: '',
    contributingUrl: '',
  });

  // Replace placeholders in content with metadata
  const replacePlaceholders = (content: string): string => {
    let result = content;

    // Replace common placeholders
    const replacements: Record<string, string> = {
      '[yourName]': metadata.authorName || '[yourName]',
      '[Your Name]': metadata.authorName || '[Your Name]',
      '[authorName]': metadata.authorName || '[authorName]',
      '[yourEmail]': metadata.authorEmail || '[yourEmail]',
      '[Your Email]': metadata.authorEmail || '[Your Email]',
      '[authorEmail]': metadata.authorEmail || '[authorEmail]',
      '[companyName]': metadata.companyName || '[companyName]',
      '[Company Name]': metadata.companyName || '[Company Name]',
      '[website]': metadata.website || '[website]',
      '[Website]': metadata.website || '[Website]',
      '[repository]': metadata.repository || '[repository]',
      '[Repository]': metadata.repository || '[Repository]',
      '[year]': metadata.year || '[year]',
      '[Year]': metadata.year || '[Year]',
    };

    Object.entries(replacements).forEach(([placeholder, value]) => {
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });

    return result;
  };

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
      // Replace placeholders in source content before transforming
      const processedContent = replacePlaceholders(sourceContent);

      const result = await transformContent(processedContent, {
        platform: selectedPlatform,
        tone,
        length,
        audience,
      });

      if (result.success && result.data) {
        setTransformedContent(result.data);
        setCurrentStep(4);
      } else {
        const errorMsg = result.error || 'Transformation fehlgeschlagen';
        setError(errorMsg);
        // Show notification if error is related to AI configuration
        if (
          errorMsg.includes('API') ||
          errorMsg.includes('konfiguriert') ||
          errorMsg.includes('Konfiguration') ||
          errorMsg.includes('fehlt') ||
          errorMsg.includes('Einstellungen') ||
          errorMsg.includes('Key')
        ) {
          setShowSettingsNotification(true);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(errorMsg);
      // Show notification if error is related to AI configuration
      if (
        errorMsg.includes('API') ||
        errorMsg.includes('konfiguriert') ||
        errorMsg.includes('Konfiguration') ||
        errorMsg.includes('fehlt') ||
        errorMsg.includes('Einstellungen') ||
        errorMsg.includes('Key')
      ) {
        setShowSettingsNotification(true);
      }
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

  const handlePostDirectly = async () => {
    setIsPosting(true);
    setError(null);

    try {
      // Check if content exists
      if (!sourceContent.trim()) {
        setError('Kein Content zum Posten vorhanden');
        setIsPosting(false);
        return;
      }

      // Load social media config
      const config = loadSocialConfig();

      // Map ContentPlatform to SocialPlatform
      const platformMap: Record<ContentPlatform, SocialPlatform | null> = {
        'linkedin': 'linkedin',
        'twitter': 'twitter',
        'reddit': 'reddit',
        'devto': 'devto',
        'medium': 'medium',
        'github-discussion': 'github',
        'youtube': null, // YouTube is not supported for direct posting
      };

      const socialPlatform = platformMap[selectedPlatform];

      if (!socialPlatform) {
        setError('Diese Plattform unterstützt kein direktes Posten');
        setIsPosting(false);
        return;
      }

      // Check if platform is configured
      if (!isPlatformConfigured(socialPlatform, config)) {
        setError(`${selectedPlatform} ist nicht konfiguriert. Bitte füge deine API-Credentials in den Einstellungen hinzu.`);
        setShowSettingsNotification(true);
        setIsPosting(false);
        return;
      }

      // Prepare content based on platform
      let postContent: any;

      switch (socialPlatform) {
        case 'linkedin':
          postContent = {
            text: sourceContent,
            visibility: 'PUBLIC',
          } as LinkedInPostOptions;
          break;

        case 'twitter':
          // Split content into thread if too long
          const maxTweetLength = 280;
          if (sourceContent.length > maxTweetLength) {
            const sentences = sourceContent.split(/[.!?]+/).filter(s => s.trim());
            const thread: string[] = [];
            let currentTweet = '';

            for (const sentence of sentences) {
              if ((currentTweet + sentence).length > maxTweetLength) {
                if (currentTweet) thread.push(currentTweet.trim());
                currentTweet = sentence;
              } else {
                currentTweet += sentence + '.';
              }
            }
            if (currentTweet) thread.push(currentTweet.trim());

            postContent = {
              text: thread[0],
              thread: thread.slice(1),
            } as TwitterPostOptions;
          } else {
            postContent = {
              text: sourceContent,
            } as TwitterPostOptions;
          }
          break;

        case 'reddit':
          // Extract title (first line or first 100 chars)
          const lines = sourceContent.split('\n');
          const title = lines[0] || sourceContent.substring(0, 100);
          const body = lines.length > 1 ? lines.slice(1).join('\n') : sourceContent;

          postContent = {
            subreddit: 'test', // User would need to specify subreddit
            title: title,
            text: body,
          } as RedditPostOptions;

          // For Reddit, we need subreddit - show error
          setError('Für Reddit Posts muss ein Subreddit angegeben werden. Nutze die Transform-Funktion für mehr Optionen.');
          setIsPosting(false);
          return;

        case 'devto':
          // Extract title
          const devtoLines = sourceContent.split('\n');
          const devtoTitle = devtoLines[0] || 'Untitled';
          const devtoBody = devtoLines.length > 1 ? devtoLines.slice(1).join('\n') : sourceContent;

          postContent = {
            title: devtoTitle,
            body_markdown: devtoBody,
            published: false, // Save as draft by default
            tags: [],
          } as DevToPostOptions;
          break;

        case 'medium':
          const mediumLines = sourceContent.split('\n');
          const mediumTitle = mediumLines[0] || 'Untitled';
          const mediumContent = mediumLines.length > 1 ? mediumLines.slice(1).join('\n') : sourceContent;

          postContent = {
            title: mediumTitle,
            content: mediumContent,
            contentFormat: 'markdown',
            publishStatus: 'draft', // Save as draft by default
            tags: [],
          } as MediumPostOptions;
          break;

        case 'github':
          setError('GitHub Discussions benötigt Repository-Informationen. Nutze die Transform-Funktion für mehr Optionen.');
          setIsPosting(false);
          return;

        default:
          setError('Plattform nicht unterstützt');
          setIsPosting(false);
          return;
      }

      // Post to social media
      const result = await postToSocialMedia(socialPlatform, postContent, config);

      if (result.success) {
        // Show success message
        alert(`✓ Erfolgreich auf ${selectedPlatform} gepostet!\n${result.url || ''}`);
        handleReset();
      } else {
        setError(result.error || 'Posting fehlgeschlagen');
        if (result.error?.includes('configuration') || result.error?.includes('not found')) {
          setShowSettingsNotification(true);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unbekannter Fehler beim Posten';
      setError(errorMsg);
    } finally {
      setIsPosting(false);
    }
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
            onOpenMetadata={() => setShowMetadata(true)}
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
        const selectedPlatformOption = platformOptions.find(
          (option) => option.value === selectedPlatform
        );
        return (
          <Step3StyleOptions
            selectedPlatform={selectedPlatform}
            platformLabel={selectedPlatformOption?.label || 'Plattform'}
            tone={tone}
            length={length}
            audience={audience}
            onToneChange={setTone}
            onLengthChange={setLength}
            onAudienceChange={setAudience}
            onBack={() => setCurrentStep(2)}
            onBackToEditor={() => setCurrentStep(1)}
            onTransform={handleTransform}
            onPostDirectly={handlePostDirectly}
            isTransforming={isTransforming}
            isPosting={isPosting}
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
        onSettings={() => {
          setShowSettings(true);
          setShowSettingsNotification(false);
        }}
        showSettingsNotification={showSettingsNotification}
        onDismissNotification={() => setShowSettingsNotification(false)}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">{renderStepContent()}</div>

      {/* Footer */}
      <div className="relative border-t border-[#AC8E66] py-3">
        <ZenFooterText />
      </div>

      {/* Settings Modal */}
      <ZenSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={() => setError(null)}
        defaultTab="ai"
      />

      {/* Metadata Modal */}
      <ZenMetadataModal
        isOpen={showMetadata}
        onClose={() => setShowMetadata(false)}
        metadata={metadata}
        onSave={(newMetadata) => {
          setMetadata(newMetadata);
          setShowMetadata(false);
        }}
      />
    </div>
  );
};
