import React, { useState, useEffect } from 'react';
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
} from '../../../../services/socialMediaService';
import { ZenModal } from '../components/ZenModal';
import { ZenModalFooter } from '../components/ZenModalFooter';
import { ZenInfoBox } from '../components/ZenInfoBox';

interface ZenSocialMediaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'twitter' | 'reddit' | 'linkedin' | 'devto' | 'medium' | 'github';

const ZenSocialMediaSettingsModal: React.FC<ZenSocialMediaSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [config, setConfig] = useState<SocialMediaConfig>({});
  const [activeTab, setActiveTab] = useState<TabType>('twitter');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (isOpen) {
      const loadedConfig = loadSocialConfig();
      setConfig(loadedConfig);
    }
  }, [isOpen]);

  const handleSave = () => {
    try {
      setSaveStatus('saving');
      saveSocialConfig(config);
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
        onClose();
      }, 1500);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

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
    { id: 'twitter' as TabType, label: 'Twitter', icon: '𝕏' },
    { id: 'reddit' as TabType, label: 'Reddit', icon: '🤖' },
    { id: 'linkedin' as TabType, label: 'LinkedIn', icon: '💼' },
    { id: 'devto' as TabType, label: 'dev.to', icon: '👩‍💻' },
    { id: 'medium' as TabType, label: 'Medium', icon: 'M' },
    { id: 'github' as TabType, label: 'GitHub', icon: '🐙' },
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
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Social Media API Settings"
      subtitle="Configure your API credentials"
    >
      <div className="p-6">
        <ZenInfoBox
          type="info"
          title="API Configuration"
          description="Configure your API credentials to enable direct posting to social media platforms. Your credentials are stored locally in your browser."
        />

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mt-6 mb-6 border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
              {isConfigValid(tab.id) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></span>
              )}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400"></div>
              )}
            </button>
          ))}
        </div>

        {/* Twitter Config */}
        {activeTab === 'twitter' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={config.twitter?.apiKey || ''}
                onChange={(e) => updateTwitterConfig('apiKey', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your Twitter API Key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Secret
              </label>
              <input
                type="password"
                value={config.twitter?.apiSecret || ''}
                onChange={(e) => updateTwitterConfig('apiSecret', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your Twitter API Secret"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Access Token
              </label>
              <input
                type="password"
                value={config.twitter?.accessToken || ''}
                onChange={(e) => updateTwitterConfig('accessToken', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your Twitter Access Token"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Access Token Secret
              </label>
              <input
                type="password"
                value={config.twitter?.accessTokenSecret || ''}
                onChange={(e) => updateTwitterConfig('accessTokenSecret', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your Twitter Access Token Secret"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bearer Token (Optional)
              </label>
              <input
                type="password"
                value={config.twitter?.bearerToken || ''}
                onChange={(e) => updateTwitterConfig('bearerToken', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your Twitter Bearer Token"
              />
            </div>
            <ZenInfoBox
              type="warning"
              title="Get Twitter API Credentials"
              description="Visit https://developer.twitter.com/en/portal/dashboard to create an app and get your credentials."
            />
          </div>
        )}

        {/* Reddit Config */}
        {activeTab === 'reddit' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Client ID
              </label>
              <input
                type="password"
                value={config.reddit?.clientId || ''}
                onChange={(e) => updateRedditConfig('clientId', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your Reddit Client ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Client Secret
              </label>
              <input
                type="password"
                value={config.reddit?.clientSecret || ''}
                onChange={(e) => updateRedditConfig('clientSecret', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your Reddit Client Secret"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={config.reddit?.username || ''}
                onChange={(e) => updateRedditConfig('username', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your Reddit username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={config.reddit?.password || ''}
                onChange={(e) => updateRedditConfig('password', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your Reddit password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                User Agent
              </label>
              <input
                type="text"
                value={config.reddit?.userAgent || 'ZenPostStudio/1.0'}
                onChange={(e) => updateRedditConfig('userAgent', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="ZenPostStudio/1.0"
              />
            </div>
            <ZenInfoBox
              type="warning"
              title="Get Reddit API Credentials"
              description="Visit https://www.reddit.com/prefs/apps to create an app and get your credentials."
            />
          </div>
        )}

        {/* LinkedIn Config */}
        {activeTab === 'linkedin' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Client ID
              </label>
              <input
                type="password"
                value={config.linkedin?.clientId || ''}
                onChange={(e) => updateLinkedInConfig('clientId', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your LinkedIn Client ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Client Secret
              </label>
              <input
                type="password"
                value={config.linkedin?.clientSecret || ''}
                onChange={(e) => updateLinkedInConfig('clientSecret', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your LinkedIn Client Secret"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Access Token
              </label>
              <input
                type="password"
                value={config.linkedin?.accessToken || ''}
                onChange={(e) => updateLinkedInConfig('accessToken', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your LinkedIn Access Token"
              />
            </div>
            <ZenInfoBox
              type="warning"
              title="Get LinkedIn API Credentials"
              description="Visit https://www.linkedin.com/developers/apps to create an app and get your credentials."
            />
          </div>
        )}

        {/* dev.to Config */}
        {activeTab === 'devto' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={config.devto?.apiKey || ''}
                onChange={(e) => updateDevToConfig('apiKey', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your dev.to API Key"
              />
            </div>
            <ZenInfoBox
              type="warning"
              title="Get dev.to API Key"
              description="Visit https://dev.to/settings/extensions to generate your API key."
            />
          </div>
        )}

        {/* Medium Config */}
        {activeTab === 'medium' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Integration Token
              </label>
              <input
                type="password"
                value={config.medium?.integrationToken || ''}
                onChange={(e) => updateMediumConfig('integrationToken', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your Medium Integration Token"
              />
            </div>
            <ZenInfoBox
              type="warning"
              title="Get Medium Integration Token"
              description="Visit https://medium.com/me/settings/security to generate your integration token."
            />
          </div>
        )}

        {/* GitHub Config */}
        {activeTab === 'github' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Personal Access Token
              </label>
              <input
                type="password"
                value={config.github?.accessToken || ''}
                onChange={(e) => updateGitHubConfig('accessToken', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your GitHub Personal Access Token"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={config.github?.username || ''}
                onChange={(e) => updateGitHubConfig('username', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your GitHub username"
              />
            </div>
            <ZenInfoBox
              type="warning"
              title="Get GitHub Personal Access Token"
              description="Visit https://github.com/settings/tokens to generate a new token with 'repo' and 'write:discussion' permissions."
            />
          </div>
        )}
      </div>

      <ZenModalFooter>
        <button
          onClick={onClose}
          className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saveStatus === 'saving' && 'Saving...'}
          {saveStatus === 'saved' && '✓ Saved!'}
          {saveStatus === 'error' && 'Error saving'}
          {saveStatus === 'idle' && 'Save Settings'}
        </button>
      </ZenModalFooter>
    </ZenModal>
  );
};

export default ZenSocialMediaSettingsModal;
