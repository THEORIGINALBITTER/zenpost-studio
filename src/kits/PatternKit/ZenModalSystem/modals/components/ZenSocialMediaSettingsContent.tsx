import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTwitter,
  faReddit,
  faLinkedin,
  faDev,
  faMedium,
  faGithub,
} from '@fortawesome/free-brands-svg-icons';
import {
  loadSocialConfig,
  saveSocialConfig,
  SocialMediaConfig,
  validateTwitterConfig,
  validateRedditConfig,
  validateLinkedInConfig,
  validateDevToConfig,
  validateMediumConfig,
  validateGitHubConfig,
} from '../../../../../services/socialMediaService';
import { ZenInfoBox } from '../../components/ZenInfoBox';

type TabType = 'twitter' | 'reddit' | 'linkedin' | 'devto' | 'medium' | 'github';

interface ZenSocialMediaSettingsContentProps {
  initialTab?: TabType;
  showMissingConfigHint?: boolean;
  missingPlatformLabel?: string;
}

export const ZenSocialMediaSettingsContent = ({
  initialTab,
  showMissingConfigHint = false,
  missingPlatformLabel,
}: ZenSocialMediaSettingsContentProps) => {
  const [config, setConfig] = useState<SocialMediaConfig>({});
  const [activeTab, setActiveTab] = useState<TabType>('twitter');

  useEffect(() => {
    const loadedConfig = loadSocialConfig();
    setConfig(loadedConfig);
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Auto-save on changes
  useEffect(() => {
    saveSocialConfig(config);
  }, [config]);

  const updateTwitterConfig = (field: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      twitter: {
        ...prev.twitter,
        apiKey: prev.twitter?.apiKey || '',
        apiSecret: prev.twitter?.apiSecret || '',
        accessToken: prev.twitter?.accessToken || '',
        accessTokenSecret: prev.twitter?.accessTokenSecret || '',
        [field]: value,
      },
    }));
  };

  const updateRedditConfig = (field: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      reddit: {
        ...prev.reddit,
        clientId: prev.reddit?.clientId || '',
        clientSecret: prev.reddit?.clientSecret || '',
        username: prev.reddit?.username || '',
        password: prev.reddit?.password || '',
        userAgent: prev.reddit?.userAgent || 'ZenPostStudio/1.0',
        [field]: value,
      },
    }));
  };

  const updateLinkedInConfig = (field: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      linkedin: {
        ...prev.linkedin,
        clientId: prev.linkedin?.clientId || '',
        clientSecret: prev.linkedin?.clientSecret || '',
        accessToken: prev.linkedin?.accessToken || '',
        [field]: value,
      },
    }));
  };

  const updateDevToConfig = (_field: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      devto: {
        ...prev.devto,
        apiKey: value,
      },
    }));
  };

  const updateMediumConfig = (_field: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      medium: {
        ...prev.medium,
        integrationToken: value,
      },
    }));
  };

  const updateGitHubConfig = (field: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      github: {
        ...prev.github,
        accessToken: prev.github?.accessToken || '',
        username: prev.github?.username || '',
        [field]: value,
      },
    }));
  };

  const tabs = [
    { id: 'twitter' as TabType, label: 'Twitter', icon: faTwitter },
    { id: 'reddit' as TabType, label: 'Reddit', icon: faReddit },
    { id: 'linkedin' as TabType, label: 'LinkedIn', icon: faLinkedin },
    { id: 'devto' as TabType, label: 'dev.to', icon: faDev },
    { id: 'medium' as TabType, label: 'Medium', icon: faMedium },
    { id: 'github' as TabType, label: 'GitHub', icon: faGithub },
  ];

  const isConfigValid = (tab: TabType): boolean => {
    switch (tab) {
      case 'twitter':
        return config.twitter ? validateTwitterConfig(config.twitter) : false;
      case 'reddit':
        return config.reddit ? validateRedditConfig(config.reddit) : false;
      case 'linkedin':
        return config.linkedin ? validateLinkedInConfig(config.linkedin) : false;
      case 'devto':
        return config.devto ? validateDevToConfig(config.devto) : false;
      case 'medium':
        return config.medium ? validateMediumConfig(config.medium) : false;
      case 'github':
        return config.github ? validateGitHubConfig(config.github) : false;
      default:
        return false;
    }
  };

  // Reusable Input Field Component
  const InputField = ({
    type,
    value,
    onChange,
    placeholder,
  }: {
    type: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
  }) => (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="font-mono text-[#e5e5e5] bg-[#2A2A2A] focus:border-[#D4AF78] focus:outline-none"
      style={{
        width: '100%',
        padding: '14px 16px',
        border: '1px solid #AC8E66',
        borderRadius: '8px',
        fontSize: '9px',
        transition: 'border-color 0.2s',
      }}
    />
  );

  return (
    <div style={{ padding: '24px 32px',  fontSize: '11px', }}>
      <div style={{ marginBottom: '24px' }}>
        {showMissingConfigHint && missingPlatformLabel && (
          <div style={{ marginBottom: '12px' }}>
            <ZenInfoBox
              type="warning"
              title="API fehlt"
              description={`${missingPlatformLabel} ist noch nicht konfiguriert. Bitte fuege deine API-Credentials hinzu.`}
            />
          </div>
        )}
        <ZenInfoBox
          type="info"
          title="Optional"
          description="Social Media API-Integration ist optional. Du kannst Content auch ohne APIs kopieren und manuell posten."
        />
      </div>

      {/* Sub-Tabs */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          marginTop: '32px',
          marginBottom: '32px',
          borderBottom: '1px solid #3a3a3a',
          justifyContent: 'center',
          paddingBottom: '8px',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="font-mono transition-colors"
            style={{
              padding: '10px 16px',
              fontSize: '11px',
              position: 'relative',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: activeTab === tab.id ? '#AC8E66' : '#777',
            }}
          >
            <FontAwesomeIcon icon={tab.icon} style={{ marginRight: '8px' }} />
            {tab.label}
            {isConfigValid(tab.id) && (
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '6px',
                  height: '6px',
                  backgroundColor: '#22c55e',
                  borderRadius: '50%',
                }}
              />
            )}
            {activeTab === tab.id && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '-8px',
                  left: 0,
                  right: 0,
                  height: '2px',
                  backgroundColor: '#AC8E66',
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Twitter Config */}
      {activeTab === 'twitter' && (
        <div
          style={{
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <InputField
              type="password"
              value={config.twitter?.apiKey || ''}
              onChange={(value) => updateTwitterConfig('apiKey', value)}
              placeholder="API Key"
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <InputField
              type="password"
              value={config.twitter?.apiSecret || ''}
              onChange={(value) => updateTwitterConfig('apiSecret', value)}
              placeholder="API Secret"
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <InputField
              type="password"
              value={config.twitter?.accessToken || ''}
              onChange={(value) => updateTwitterConfig('accessToken', value)}
              placeholder="Access Token"
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <InputField
              type="password"
              value={config.twitter?.accessTokenSecret || ''}
              onChange={(value) => updateTwitterConfig('accessTokenSecret', value)}
              placeholder="Access Token Secret"
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <InputField
              type="password"
              value={config.twitter?.bearerToken || ''}
              onChange={(value) => updateTwitterConfig('bearerToken', value)}
              placeholder="Bearer Token (optional)"
            />
          </div>
          <ZenInfoBox
            type="warning"
            title="API Credentials"
            description="Visit developer.twitter.com to create an app and get credentials"
            links={[
              {
                label: 'Twitter Developer Portal',
                url: 'https://developer.twitter.com/en/portal/dashboard',
              },
            ]}
          />
        </div>
      )}

      {/* Reddit Config */}
      {activeTab === 'reddit' && (
        <div
          style={{
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <InputField
              type="password"
              value={config.reddit?.clientId || ''}
              onChange={(value) => updateRedditConfig('clientId', value)}
              placeholder="Client ID"
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <InputField
              type="password"
              value={config.reddit?.clientSecret || ''}
              onChange={(value) => updateRedditConfig('clientSecret', value)}
              placeholder="Client Secret"
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <InputField
              type="text"
              value={config.reddit?.username || ''}
              onChange={(value) => updateRedditConfig('username', value)}
              placeholder="Username"
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <InputField
              type="password"
              value={config.reddit?.password || ''}
              onChange={(value) => updateRedditConfig('password', value)}
              placeholder="Password"
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <InputField
              type="text"
              value={config.reddit?.userAgent || 'ZenPostStudio/1.0'}
              onChange={(value) => updateRedditConfig('userAgent', value)}
              placeholder="User Agent"
            />
          </div>
          <ZenInfoBox
            type="warning"
            title="API Credentials"
            description="Visit reddit.com/prefs/apps to create an app"
            links={[
              {
                label: 'Reddit Apps',
                url: 'https://www.reddit.com/prefs/apps',
              },
            ]}
          />
        </div>
      )}

      {/* LinkedIn Config */}
      {activeTab === 'linkedin' && (
        <div
          style={{
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <InputField
              type="password"
              value={config.linkedin?.clientId || ''}
              onChange={(value) => updateLinkedInConfig('clientId', value)}
              placeholder="Client ID"
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <InputField
              type="password"
              value={config.linkedin?.clientSecret || ''}
              onChange={(value) => updateLinkedInConfig('clientSecret', value)}
              placeholder="Client Secret"
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <InputField
              type="password"
              value={config.linkedin?.accessToken || ''}
              onChange={(value) => updateLinkedInConfig('accessToken', value)}
              placeholder="Access Token"
            />
          </div>
          <ZenInfoBox
            type="warning"
            title="API Credentials"
            description="Visit linkedin.com/developers/apps to create an app"
            links={[
              {
                label: 'LinkedIn Developers',
                url: 'https://www.linkedin.com/developers/apps',
              },
            ]}
          />
        </div>
      )}

      {/* dev.to Config */}
      {activeTab === 'devto' && (
        <div
          style={{
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          <div style={{ marginBottom: '24px' }}>
            <InputField
              type="password"
              value={config.devto?.apiKey || ''}
              onChange={(value) => updateDevToConfig('apiKey', value)}
              placeholder="API Key"
            />
          </div>
          <ZenInfoBox
            type="warning"
            title="API Key"
            description="Visit dev.to/settings/extensions to generate API key"
            links={[
              {
                label: 'dev.to Extensions',
                url: 'https://dev.to/settings/extensions',
              },
            ]}
          />
        </div>
      )}

      {/* Medium Config */}
      {activeTab === 'medium' && (
        <div
          style={{
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          <div style={{ marginBottom: '24px' }}>
            <InputField
              type="password"
              value={config.medium?.integrationToken || ''}
              onChange={(value) => updateMediumConfig('integrationToken', value)}
              placeholder="Integration Token"
            />
          </div>
          <ZenInfoBox
            type="warning"
            title="Integration Token"
            description="Visit medium.com/me/settings/security to generate token"
            links={[
              {
                label: 'Medium Security Settings',
                url: 'https://medium.com/me/settings/security',
              },
            ]}
          />
        </div>
      )}

      {/* GitHub Config */}
      {activeTab === 'github' && (
        <div
          style={{
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <InputField
              type="password"
              value={config.github?.accessToken || ''}
              onChange={(value) => updateGitHubConfig('accessToken', value)}
              placeholder="Personal Access Token"
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <InputField
              type="text"
              value={config.github?.username || ''}
              onChange={(value) => updateGitHubConfig('username', value)}
              placeholder="GitHub Username"
            />
          </div>
          <ZenInfoBox
            type="warning"
            title="Personal Access Token"
            description="Visit github.com/settings/tokens to generate token with 'repo' and 'write:discussion' permissions"
            links={[
              {
                label: 'GitHub Tokens',
                url: 'https://github.com/settings/tokens',
              },
            ]}
          />
        </div>
      )}
    </div>
  );
};
