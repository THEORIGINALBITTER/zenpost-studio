import { useState, useEffect } from 'react';
import { ZenDropdown } from '../../components/ZenDropdown';
import { ZenInfoBox } from '../../components/ZenInfoBox';
import { ZenSlider } from '../../components/ZenSlider';
import { getProviderInfo } from '../../config/ZenModalConfig';
import {
  loadAIConfig,
  saveAIConfig,
  getAvailableProviders,
  getModelsForProvider,
  type AIConfig,
  type AIProvider,
} from '../../../../../services/aiService';

export const ZenAISettingsContent = () => {
  const [aiConfig, setAiConfig] = useState<AIConfig>(loadAIConfig());

  // Auto-save on changes
  useEffect(() => {
    saveAIConfig(aiConfig);
  }, [aiConfig]);

  const availableProviders = getAvailableProviders();
  const availableModels = getModelsForProvider(aiConfig.provider);

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      {/* Provider Selection */}
      <div className="w-full flex flex-col items-center">
        <ZenDropdown
          label="AI-Provider:"
          labelSize="11px"
          value={aiConfig.provider}
          onChange={(value) =>
            setAiConfig({ ...aiConfig, provider: value as AIProvider })
          }
          options={availableProviders.map((p) => ({
            value: p.value,
            label: p.label,
          }))}
          variant="compact"
        />
      </div>

      {/* Model Selection */}
      {availableModels.length > 0 && (
        <div className="flex flex-col items-center">
          <ZenDropdown
            label="Modell:"
            labelSize="11px"
            value={aiConfig.model || ''}
            onChange={(value) => setAiConfig({ ...aiConfig, model: value })}
            options={availableModels.map((model) => ({
              value: model,
              label: model,
            }))}
            variant="compact"
          />
        </div>
      )}

      {/* API Key */}
      {availableProviders.find((p) => p.value === aiConfig.provider)
        ?.requiresApiKey && (
        <div className="flex flex-col items-center w-full mt-8">
          <div className="w-full max-w-[300px]">
            <label className="block text-[#999] text-[11px] mb-2 font-mono text-center">
              API-Key:
            </label>
            <input
              type="password"
              value={aiConfig.apiKey || ''}
              onChange={(e) =>
                setAiConfig({ ...aiConfig, apiKey: e.target.value })
              }
              placeholder="sk-..."
              className="w-full bg-[#2A2A2A] text-[#e5e5e5] border border-[#AC8E66] rounded px-4 py-2 font-mono text-[11px] focus:outline-none focus:border-[#D4AF78]"
            />
            <p className="text-[#777] text-[11px] mt-1 text-center">
              Wird sicher in LocalStorage gespeichert
            </p>
          </div>
          {/* Info Text */}
          <div className="mt-4">
            {getProviderInfo(aiConfig.provider) && (
              <ZenInfoBox {...getProviderInfo(aiConfig.provider)!} />
            )}
          </div>
        </div>
      )}

      {/* Base URL for Custom/Ollama */}
      {(aiConfig.provider === 'ollama' || aiConfig.provider === 'custom') && (
        <div className="flex flex-col items-center w-full">
          <div className="w-full max-w-[300px] mt-4">
            <label className="block text-[#999] text-[11px] mb-2 font-mono text-center">
              Base URL:
            </label>
            <input
              type="text"
              value={aiConfig.baseUrl || ''}
              onChange={(e) =>
                setAiConfig({ ...aiConfig, baseUrl: e.target.value })
              }
              placeholder={
                aiConfig.provider === 'ollama'
                  ? 'http://localhost:11434'
                  : 'https://your-api.com'
              }
              className="w-full bg-[#2A2A2A] text-[#e5e5e5] border border-[#AC8E66] rounded px-4 py-2 font-mono text-[10px] focus:outline-none focus:border-[#D4AF78] text-center"
            />
          </div>
        </div>
      )}

      {/* Temperature */}
      <div className="mt-8 mb-8">
        <ZenSlider
          label="Stil wählen"
          min={0}
          max={1}
          step={0.1}
          value={aiConfig.temperature || 0.0}
          onChange={(value) => setAiConfig({ ...aiConfig, temperature: value })}
          minLabel="Präzise (0.0)"
          maxLabel="Kreativ (1.0)"
          valueFormatter={(v) => v.toFixed(1)}
        />
      </div>
    </div>
  );
};
