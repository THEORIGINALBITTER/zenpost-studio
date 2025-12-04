import { useState } from 'react';
import { ZenModal } from '../components/ZenModal';
import { ZenDropdown } from '../components/ZenDropdown';
import { ZenModalHeader } from '../components/ZenModalHeader';
import { ZenModalFooter } from '../components/ZenModalFooter';
import { ZenInfoBox } from '../components/ZenInfoBox';
import { ZenSlider } from '../components/ZenSlider';
import { getModalPreset, getProviderInfo } from '../config/ZenModalConfig';
import {
  loadAIConfig,
  saveAIConfig,
  getAvailableProviders,
  getModelsForProvider,
  type AIConfig,
  type AIProvider,
} from '../../../../services/aiService';

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
  const modalPreset = getModalPreset('ai-settings');

  const handleSave = () => {
    saveAIConfig(aiConfig);
    onSave?.();
    onClose();
  };

  const availableProviders = getAvailableProviders();
  const availableModels = getModelsForProvider(aiConfig.provider);

  return (
    <ZenModal isOpen={isOpen} onClose={onClose} showCloseButton={false}>
     <div
       className="relative flex flex-col w-full bg-[#1E1E1E] border border-[#3a3a3a] rounded-xl shadow-2xl"
       style={{
         minHeight: modalPreset.minHeight,
         maxHeight: modalPreset.maxHeight,
         minWidth: modalPreset.minWidth,
       }}
     >

        {/* Fixed Header */}
        <div className="p-8 pb-6 border-b border-[#AC8E66] relative z-10 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]">
          <ZenModalHeader
            title={modalPreset.title}
            subtitle={
              <>
                {modalPreset.subtitle?.toString().split(' ').slice(0, 3).join(' ')} <br />
                {modalPreset.subtitle?.toString().split(' ').slice(3).join(' ')}
              </>
            }
            titleColor={modalPreset.titleColor}
            subtitleColor={modalPreset.subtitleColor}
            titleSize={modalPreset.titleSize}
            subtitleSize={modalPreset.subtitleSize}
            onClose={onClose}
            onSave={handleSave}
          />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 flex flex-col gap-6 px-8 pb-8 
        overflow-y-auto overflow-x-hidden zen-scrollbar relative">
          {/* Provider Selection */}
          <div className='w-full'>
          <div className="w-full flex flex-col items-center"
                      style={{ paddingTop: 40 }}
          >
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
            <div className="flex flex-col items-center w-full"
               style={{ paddingTop: 40 }}
                    >
              <div className="w-full max-w-[300px]"
                 style={{ paddingTop: 40 }}
                    >
                <label className="block 
                text-[#999] text-[11px] mb-2 font-mono text-center">
                  API-Key:
                </label>
                <input
                  type="password"

                  
                  value={aiConfig.apiKey || ''}
                  onChange={(e) =>
                    setAiConfig({ ...aiConfig, apiKey: e.target.value })
                  }
                  placeholder="sk-..."
                  className="w-full 
                  bg-[#2A2A2A] text-[#e5e5e5] 
                  border border-[#AC8E66] rounded 
                  items-center
                  px-4 py-2 font-mono text-[11px] 
                  focus:outline-none focus:border-[#D4AF78]"
                />
                <p className="text-[#777] text-[11px] mt-1 text-center">
                  Wird sicher in LocalStorage gespeichert
                </p>
              </div>
                   {/* Info Text - Config-basiert */}
          <div style={{ paddingTop: 10 }}>
            {getProviderInfo(aiConfig.provider) && (
              <ZenInfoBox {...getProviderInfo(aiConfig.provider)!} />
            )}
          </div>
            </div>
          )}

          {/* Base URL for Custom/Ollama */}
          {(aiConfig.provider === 'ollama' || aiConfig.provider === 'custom') && (
            <div className="
            flex flex-col items-center w-full padding-bottom: 10px;">
              <div className="w-full max-w-[300px]"
                          style={{ paddingTop: 20 }}
              >
                <label className="block text-[#999] text-[11px] 
                
                padding-top: 100px;
                mb-2 font-mono text-center text-[11px]">
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
                  className="w-full bg-[#2A2A2A] text-[#e5e5e5]
                   border border-[#AC8E66] rounded px-4 py-2 font-mono 
                   text-[10px] focus:outline-none focus:border-[#D4AF78] 
                   text-center"
                />
              </div>
            </div>
          )}

          {/* Temperature */}
          <div className= ""     style={{ paddingTop: 20, paddingBottom: 40 }}>
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

        {/* Footer */}
        <ZenModalFooter />
      </div>
    </ZenModal>
  );
};
