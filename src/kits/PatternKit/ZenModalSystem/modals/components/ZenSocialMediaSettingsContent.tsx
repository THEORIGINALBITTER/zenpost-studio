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

export const ZenSocialMediaSettingsContent = () => {
  const [config, setConfig] = useState<SocialMediaConfig>({});
  const [activeTab, setActiveTab] = useState<TabType>('twitter');

  useEffect(() => {
    const loadedConfig = loadSocialConfig();
    setConfig(loadedConfig);
  }, []);

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

  return (
    <div className="px-8 py-6">
      <ZenInfoBox
        type="info"
        title="Optional"
        description="Social Media API-Integration ist optional. Du kannst Content auch ohne APIs kopieren und manuell posten."
      />

      {/* Sub-Tabs */}
      <div className="flex flex-wrap gap-2 mt-6 mb-6 border-b border-[#3a3a3a] justify-center">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-mono transition-colors relative ${
              activeTab === tab.id
                ? 'text-[#AC8E66]'
                : 'text-[#777] hover:text-[#999]'
            }`}
          >
            <FontAwesomeIcon icon={tab.icon} className="mr-1.5" />
            {tab.label}
            {isConfigValid(tab.id) && (
              <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#AC8E66]"></div>
            )}
          </button>
        ))}
      </div>

      {/* Twitter Config */}
      {activeTab === 'twitter' && (
        <div className="space-y-4 max-w-md mx-auto">
          <input
            type="password"
            value={config.twitter?.apiKey || ''}
            onChange={(e) => updateTwitterConfig('apiKey', e.target.value)}
            className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#AC8E66] rounded text-[#e5e5e5] font-mono text-xs focus:outline-none focus:border-[#D4AF78]"
            placeholder="API Key"
          />
          <input
            type="password"
            value={config.twitter?.apiSecret || ''}
            onChange={(e) => updateTwitterConfig('apiSecret', e.target.value)}
            className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#AC8E66] rounded text-[#e5e5e5] font-mono text-xs focus:outline-none focus:border-[#D4AF78]"
            placeholder="API Secret"
          />
          <input
            type="password"
            value={config.twitter?.accessToken || ''}
            onChange={(e) => updateTwitterConfig('accessToken', e.target.value)}
            className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#AC8E66] rounded text-[#e5e5e5] font-mono text-xs focus:outline-none focus:border-[#D4AF78]"
            placeholder="Access Token"
          />
          <input
            type="password"
            value={config.twitter?.accessTokenSecret || ''}
            onChange={(e) => updateTwitterConfig('accessTokenSecret', e.target.value)}
            className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#AC8E66] rounded text-[#e5e5e5] font-mono text-xs focus:outline-none focus:border-[#D4AF78]"
            placeholder="Access Token Secret"
          />
          <input
            type="password"
            value={config.twitter?.bearerToken || ''}
            onChange={(e) => updateTwitterConfig('bearerToken', e.target.value)}
            className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#AC8E66] rounded text-[#e5e5e5] font-mono text-xs focus:outline-none focus:border-[#D4AF78]"
            placeholder="Bearer Token (optional)"
          />
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
        <div className="space-y-4 max-w-md mx-auto">
          <input
            type="password"
            value={config.reddit?.clientId || ''}
            onChange={(e) => updateRedditConfig('clientId', e.target.value)}
            className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#AC8E66] rounded text-[#e5e5e5] font-mono text-xs focus:outline-none focus:border-[#D4AF78]"
            placeholder="Client ID"
          />
          <input
            type="password"
            value={config.reddit?.clientSecret || ''}
            onChange={(e) => updateRedditConfig('clientSecret', e.target.value)}
            className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#AC8E66] rounded text-[#e5e5e5] font-mono text-xs focus:outline-none focus:border-[#D4AF78]"
            placeholder="Client Secret"
          />
          <input
            type="text"
            value={config.reddit?.username || ''}
            onChange={(e) => updateRedditConfig('username', e.target.value)}
            className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#AC8E66] rounded text-[#e5e5e5] font-mono text-xs focus:outline-none focus:border-[#D4AF78]"
            placeholder="Username"
          />
          <input
            type="password"
            value={config.reddit?.password || ''}
            onChange={(e) => updateRedditConfig('password', e.target.value)}
            className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#AC8E66] rounded text-[#e5e5e5] font-mono text-xs focus:outline-none focus:border-[#D4AF78]"
            placeholder="Password"
          />
          <input
            type="text"
            value={config.reddit?.userAgent || 'ZenPostStudio/1.0'}
            onChange={(e) => updateRedditConfig('userAgent', e.target.value)}
            className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#AC8E66] rounded text-[#e5e5e5] font-mono text-xs focus:outline-none focus:border-[#D4AF78]"
            placeholder="User Agent"
          />
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
        <div className="space-y-4 max-w-md mx-auto">
          <input
            type="password"
            value={config.linkedin?.clientId || ''}
            onChange={(e) => updateLinkedInConfig('clientId', e.target.value)}
            className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#AC8E66] rounded text-[#e5e5e5] font-mono text-xs focus:outline-none focus:border-[#D4AF78]"
            placeholder="Client ID"
          />
          <input
            type="password"
            value={config.linkedin?.clientSecret || ''}
            onChange={(e) => updateLinkedInConfig('clientSecret', e.target.value)}
            className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#AC8E66] rounded text-[#e5e5e5] font-mono text-xs focus:outline-none focus:border-[#D4AF78]"
            placeholder="Client Secret"
          />
          <input
            type="password"
            value={config.linkedin?.accessToken || ''}
            onChange={(e) => updateLinkedInConfig('accessToken', e.target.value)}
            className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#AC8E66] rounded text-[#e5e5e5] font-mono text-xs focus:outline-none focus:border-[#D4AF78]"
            placeholder="Access Token"
          />
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
        <div className="space-y-4 max-w-md mx-auto">
          <input
            type="password"
            value={config.devto?.apiKey || ''}
            onChange={(e) => updateDevToConfig('apiKey', e.target.value)}
            className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#AC8E66] rounded text-[#e5e5e5] font-mono text-xs focus:outline-none focus:border-[#D4AF78]"
            placeholder="API Key"
          />
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
        <div className="space-y-4 max-w-md mx-auto">
          <input
            type="password"
            value={config.medium?.integrationToken || ''}
            onChange={(e) => updateMediumConfig('integrationToken', e.target.value)}
            className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#AC8E66] rounded text-[#e5e5e5] font-mono text-xs focus:outline-none focus:border-[#D4AF78]"
            placeholder="Integration Token"
          />
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
        <div className="space-y-4 max-w-md mx-auto">
          <input
            type="password"
            value={config.github?.accessToken || ''}
            onChange={(e) => updateGitHubConfig('accessToken', e.target.value)}
            className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#AC8E66] rounded text-[#e5e5e5] font-mono text-xs focus:outline-none focus:border-[#D4AF78]"
            placeholder="Personal Access Token"
          />
          <input
            type="text"
            value={config.github?.username || ''}
            onChange={(e) => updateGitHubConfig('username', e.target.value)}
            className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#AC8E66] rounded text-[#e5e5e5] font-mono text-xs focus:outline-none focus:border-[#D4AF78]"
            placeholder="GitHub Username"
          />
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
