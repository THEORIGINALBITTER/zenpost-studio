import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRotateLeft,
  faCopy,
  faDownload,
  faCheck,
  faRocket,
  faCog,
} from '@fortawesome/free-solid-svg-icons';
import { ZenSubtitle } from '../../kits/PatternKit/ZenSubtitle';
import { ZenRoughButton } from '../../kits/PatternKit/ZenModalSystem';
import { ContentPlatform } from '../../services/aiService';
import {
  postToSocialMedia,
  loadSocialConfig,
  isPlatformConfigured,
  SocialPlatform,
  PostResult,
} from '../../services/socialMediaService';
import { ZenSettingsModal } from '../../kits/PatternKit/ZenModalSystem/modals/ZenSettingsModal';

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
  'github-blog': 'GitHub Blog Post',
  youtube: 'YouTube Description',
};

// Map ContentPlatform to SocialPlatform
const platformMapping: Record<ContentPlatform, SocialPlatform | null> = {
  twitter: 'twitter',
  reddit: 'reddit',
  linkedin: 'linkedin',
  devto: 'devto',
  medium: 'medium',
  'github-discussion': 'github',
  'github-blog': 'github',
  youtube: null, // YouTube doesn't have direct posting API in this implementation
};

export const Step4TransformResult = ({
  transformedContent,
  platform,
  onReset,
  onBack,
}: Step4TransformResultProps) => {
  const [copied, setCopied] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postResult, setPostResult] = useState<PostResult | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const socialPlatform = platformMapping[platform];
  const config = loadSocialConfig();
  const hasConfig = socialPlatform ? isPlatformConfigured(socialPlatform, config) : false;

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

  const handlePost = async () => {
    if (!socialPlatform) {
      alert('Diese Plattform unterstützt derzeit kein direktes Posten. Bitte kopiere den Content manuell.');
      return;
    }

    if (!hasConfig) {
      const shouldConfigure = window.confirm(
        'Du hast noch keine API-Credentials konfiguriert. Möchtest du das jetzt tun?\n\n' +
        'Hinweis: Die API-Integration ist optional. Du kannst den Content auch manuell kopieren und posten.'
      );
      if (shouldConfigure) {
        setShowSettings(true);
      }
      return;
    }

    setIsPosting(true);
    setPostResult(null);

    try {
      // Prepare content based on platform
      let postContent: any;

      switch (platform) {
        case 'twitter':
          // Split into tweets if content is long
          const tweets = transformedContent.split('\n\n').filter((t) => t.trim());
          postContent = {
            text: tweets[0],
            thread: tweets.length > 1 ? tweets.slice(1) : undefined,
          };
          break;

        case 'reddit':
          // Extract title from first line
          const lines = transformedContent.split('\n');
          const title = lines[0].replace(/^#\s*/, '').substring(0, 300);
          const text = lines.slice(1).join('\n').trim();
          postContent = {
            subreddit: 'test', // User should specify this
            title,
            text,
          };
          break;

        case 'linkedin':
          postContent = {
            text: transformedContent,
            visibility: 'PUBLIC',
          };
          break;

        case 'devto':
          const devtoLines = transformedContent.split('\n');
          const devtoTitle = devtoLines[0].replace(/^#\s*/, '');
          const bodyMarkdown = devtoLines.slice(1).join('\n').trim();
          postContent = {
            title: devtoTitle,
            body_markdown: bodyMarkdown,
            published: false, // Draft by default
            tags: [],
          };
          break;

        case 'medium':
          const mediumLines = transformedContent.split('\n');
          const mediumTitle = mediumLines[0].replace(/^#\s*/, '');
          const content = mediumLines.slice(1).join('\n').trim();
          postContent = {
            title: mediumTitle,
            content,
            contentFormat: 'markdown' as const,
            publishStatus: 'draft' as const,
          };
          break;

        case 'github-discussion':
          const ghLines = transformedContent.split('\n');
          const ghTitle = ghLines[0].replace(/^#\s*/, '');
          const body = ghLines.slice(1).join('\n').trim();
          postContent = {
            owner: '', // User needs to specify
            repo: '', // User needs to specify
            title: ghTitle,
            body,
            categoryId: '', // User needs to specify
          };
          break;

        default:
          postContent = { text: transformedContent };
      }

      const result = await postToSocialMedia(socialPlatform, postContent, config);
      setPostResult(result);

      if (result.success && result.url) {
        // Open the post in a new tab
        window.open(result.url, '_blank');
      }
    } catch (error) {
      setPostResult({
        success: false,
        platform: socialPlatform,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12"
        style={{ padding: '0.5rem 1.5rem' }}
    
    >



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
        <div className="w-full bg-[#2A2A2A] border border-[#AC8E66] "
          style={{
    width: "100%",
    backgroundColor: "#2A2A2A",
    border: "1px solid #AC8E66",
    borderRadius: "1.5rem",
            padding: '0.5rem 0',
  }}
        >
          <div className="flex justify-between items-center mb-4"
              style={{ padding: '0.5rem 1.5rem' }}
          >
            <h3 className="font-mono text-sm text-[#AC8E66]">Vorschau - Transformierter Content:</h3>
            <div className="font-mono text-xs text-[#AC8E66]  px-3 py-1 rounded">
             Preview-Modus
            </div>
          </div>

          {/* Content Display */}
          <div className="bg-[#1F1F1F] rounded p-4 max-h-[500px] overflow-y-auto"
              style={{ padding: '0.5rem 1.5rem' }}
          >
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

        {/* Post Result Status */}
        {postResult && (
          <div
            className={`w-full max-w-2xl mb-6 p-4 rounded-lg border ${
              postResult.success
                ? 'bg-green-900/20 border-green-600'
                : 'bg-red-900/20 border-red-600'
            }`}
              style={{ padding: '0.5rem 1.5rem' }}
          
          >
            <div className="flex items-center gap-3">
              <FontAwesomeIcon
                icon={postResult.success ? faCheck : faRotateLeft}
                className={postResult.success ? 'text-green-500' : 'text-red-500'}
              />
              <div className="flex-1">
                <p
                  className={`font-mono text-sm ${
                    postResult.success ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {postResult.success
                    ? `Erfolgreich auf ${platformLabels[platform]} gepostet!`
                    : `Fehler beim Posten: ${postResult.error}`}
                </p>
                {postResult.success && postResult.url && (
                  <a
                    href={postResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline"
                  >
                    Post öffnen →
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8 justify-center"
            style={{ padding: '0.5rem 1.5rem' }}
        >
          {/* Copy Button */}
          <ZenRoughButton
            label={copied ? '✓ Kopiert!' : 'Kopieren'}
            icon={<FontAwesomeIcon icon={copied ? faCheck : faCopy} className="text-[#AC8E66]" />}
            onClick={handleCopy}
            variant={copied ? 'active' : 'default'}
          />

          {/* Download Button */}
          <ZenRoughButton
            label="Download"
            icon={<FontAwesomeIcon icon={faDownload} className="text-[#AC8E66]" />}
            onClick={handleDownload}
          />

          {/* Edit Button - zurück zum Content Transform */}
          <ZenRoughButton
            label="Nachbearbeiten"
            icon="✏️"
            onClick={onBack}
            variant="active"
          />

          {socialPlatform && (
            <div className="flex items-center gap-3">
              <ZenRoughButton
                label={hasConfig ? 'Direkt posten' : 'API konfigurieren (optional)'}
                icon={
                  <FontAwesomeIcon
                    icon={hasConfig ? faRocket : faCog}
                    className="text-[#AC8E66]"
                  />
                }
                onClick={hasConfig ? handlePost : () => setShowSettings(true)}
                disabled={isPosting}
              />
              {hasConfig && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="text-[#777] hover:text-[#AC8E66] transition-colors"
                  title="API-Einstellungen bearbeiten"
                >
                  <FontAwesomeIcon icon={faCog} className="text-xl" />
                </button>
              )}
            </div>
          )}

          <ZenRoughButton
            label="Neuer Transform"
            icon={<FontAwesomeIcon icon={faRotateLeft} className="text-[#AC8E66]" />}
            onClick={onReset}
          />
        </div>

        {/* Info Text */}
        <div className="text-center max-w-2xl space-y-2">
          <p className="text-[#777] font-mono text-xs leading-relaxed">
            {socialPlatform && hasConfig
              ? `Du kannst den Content direkt auf ${platformLabels[platform]} posten oder manuell kopieren.`
              : `Kopiere den Content und füge ihn in ${platformLabels[platform]} ein.`}
          </p>
          {socialPlatform && !hasConfig && (
            <p className="text-[#555] font-mono text-[10px] italic">
              💡 Optional: API-Credentials konfigurieren für direktes Posten
            </p>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <ZenSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        defaultTab="social"
      />
    </div>
  );
};
