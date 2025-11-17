import { useState } from 'react';
import { ZenModal } from './ZenModal';
import { ZenDropdown } from './ZenDropdown';
import {
  loadAIConfig,
  saveAIConfig,
  getAvailableProviders,
  getModelsForProvider,
  type AIConfig,
  type AIProvider,
} from '../../services/aiService';

interface ZenAISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export const ZenAISettingsModal = ({
  isOpen,
  onClose,
  onSave,
}: ZenAISettingsModalProps) => {
  const [aiConfig, setAiConfig] = useState<AIConfig>(loadAIConfig());

  const handleSave = () => {
    saveAIConfig(aiConfig);
    onSave?.();
    onClose();
  };

  const availableProviders = getAvailableProviders();
  const availableModels = getModelsForProvider(aiConfig.provider);

  return (
    <ZenModal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col gap-4">
        {/* Modal Title */}
        <h3 className="font-mono text-2xl text-[#e5e5e5] font-normal mb-4">
          AI-Einstellungen
        </h3>

        {/* Provider Selection */}
        <ZenDropdown
          label="AI-Provider:"
          value={aiConfig.provider}
          onChange={(value) =>
            setAiConfig({ ...aiConfig, provider: value as AIProvider })
          }
          options={availableProviders.map((p) => ({
            value: p.value,
            label: p.label,
          }))}
          fullWidth
          variant="compact"
        />

        {/* Model Selection */}
        {availableModels.length > 0 && (
          <ZenDropdown
            label="Modell:"
            value={aiConfig.model || ''}
            onChange={(value) => setAiConfig({ ...aiConfig, model: value })}
            options={availableModels.map((model) => ({
              value: model,
              label: model,
            }))}
            fullWidth
            variant="compact"
          />
        )}

        {/* API Key */}
        {availableProviders.find((p) => p.value === aiConfig.provider)
          ?.requiresApiKey && (
          <div>
            <label className="block text-[#999] text-sm mb-2 font-mono">
              API-Key:
            </label>
            <input
              type="password"
              value={aiConfig.apiKey || ''}
              onChange={(e) =>
                setAiConfig({ ...aiConfig, apiKey: e.target.value })
              }
              placeholder="sk-..."
              className="w-full bg-[#2A2A2A] text-[#e5e5e5] border border-[#AC8E66] rounded px-4 py-2 font-mono text-sm focus:outline-none focus:border-[#D4AF78]"
            />
            <p className="text-[#777] text-xs mt-1">
              Wird sicher in LocalStorage gespeichert
            </p>
          </div>
        )}

        {/* Base URL for Custom/Ollama */}
        {(aiConfig.provider === 'ollama' || aiConfig.provider === 'custom') && (
          <div>
            <label className="block text-[#999] text-sm mb-2 font-mono">
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
              className="w-full bg-[#2A2A2A] text-[#e5e5e5] border border-[#AC8E66] rounded px-4 py-2 font-mono text-sm focus:outline-none focus:border-[#D4AF78]"
            />
          </div>
        )}

        {/* Temperature */}
        <div>
          <label className="block text-[#999] text-sm mb-2 font-mono">
            Temperature: {aiConfig.temperature?.toFixed(1) || '0.3'}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={aiConfig.temperature || 0.3}
            onChange={(e) =>
              setAiConfig({
                ...aiConfig,
                temperature: parseFloat(e.target.value),
              })
            }
            className="w-full"
          />
          <div className="flex justify-between text-[#777] text-xs mt-1">
            <span>Präzise (0.0)</span>
            <span>Kreativ (1.0)</span>
          </div>
        </div>

        {/* Info Text */}
        <div className="mt-4 p-3 bg-[#AC8E66]/10 border border-[#AC8E66]/30 rounded">
          <p className="text-[#AC8E66] text-xs leading-relaxed">
            {aiConfig.provider === 'openai' && (
              <>
                <strong>OpenAI:</strong> Benötigt API-Key von{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  platform.openai.com
                </a>
              </>
            )}
            {aiConfig.provider === 'anthropic' && (
              <>
                <strong>Anthropic:</strong> Benötigt API-Key von{' '}
                <a
                  href="https://console.anthropic.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  console.anthropic.com
                </a>
              </>
            )}
            {aiConfig.provider === 'ollama' && (
              <>
                <strong>Ollama:</strong> Lokale AI, keine API-Key benötigt.
                Stelle sicher, dass Ollama läuft (ollama serve).
              </>
            )}
            {aiConfig.provider === 'custom' && (
              <>
                <strong>Custom API:</strong> Nutze deine eigene
                AI-API-Implementierung.
              </>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSave}
            className="flex-1 bg-[#AC8E66] hover:bg-[#D4AF78] text-[#1A1A1A] font-mono text-sm py-2 px-4 rounded transition-colors"
          >
            Speichern
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-[#e5e5e5] font-mono text-sm py-2 px-4 rounded transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </ZenModal>
  );
};
