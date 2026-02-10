import { useState } from "react";
import { ZenModal } from "../components/ZenModal";
import { ZenDropdown } from "../components/ZenDropdown";

import { ZenInfoBox } from "../components/ZenInfoBox";
import { ZenSlider } from "../components/ZenSlider";
import { AI_TEMPERATURE_INFO, getModalPreset, getProviderInfo } from "../config/ZenModalConfig";
import {
  loadAIConfig,
  getAvailableProviders,
  getModelsForProvider,
  type AIConfig,
  type AIProvider,
} from "../../../../services/aiService";

interface ZenAISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ZenAISettingsModal = ({ isOpen, onClose }: ZenAISettingsModalProps) => {
  const [aiConfig, setAiConfig] = useState<AIConfig>(loadAIConfig());
  const modalPreset = getModalPreset("ai-settings");

  const availableProviders = getAvailableProviders();
  const availableModels = getModelsForProvider(aiConfig.provider);

  const providerMeta = availableProviders.find((p) => p.value === aiConfig.provider);

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalPreset.title}
      subtitle={modalPreset.subtitle}
      showCloseButton={true}
    >
      <div
        className="relative flex flex-col w-full bg-[#1E1E1E] border border-[#3a3a3a] rounded-xl shadow-2xl"
        style={{
          minHeight: modalPreset.minHeight,
          maxHeight: modalPreset.maxHeight,
          minWidth: modalPreset.minWidth,
        }}
      >
        {/* Scrollable Content */}

<div className="flex-1 overflow-y-auto overflow-x-hidden zen-scrollbar">
  <div className="px-8 py-8">
    {/* GRID: Form links (centered) + ruhige Abstände */}
    <div className="mx-auto w-full max-w-[720px] flex flex-col gap-8">
      

      {/* 1) FORM CARD */}
      <div className="rounded-2xl border border-[#3a3a3a] bg-[#151515] shadow-xl">
        <div className="px-6 py-5 border-b border-[#2a2a2a]">
          <div className="font-mono text-[12px] text-[#AC8E66] tracking-wide text-center">
            AI-Konfiguration
          </div>
          <div className="font-mono text-[10px] text-[#777] text-center mt-1">
            Provider, Modell & Verbindung
          </div>
        </div>

        {/* Form body */}
        <div className="px-6 py-6">
          {/* nicer spacing: same width for all controls */}
          <div className="mx-auto w-full max-w-[360px] flex flex-col gap-5">

            {/* Provider */}
            <ZenDropdown
              label="AI-Provider:"
              value={aiConfig.provider}
              onChange={(v) => setAiConfig({ ...aiConfig, provider: v as AIProvider })}
              options={availableProviders.map((p) => ({ value: p.value, label: p.label }))}
              fullWidth
            />

            {/* Model */}
            {availableModels.length > 0 && (
              <ZenDropdown
                label="Modell:"
                value={aiConfig.model || ""}
                onChange={(v) => setAiConfig({ ...aiConfig, model: v })}
                options={availableModels.map((m) => ({ value: m, label: m }))}
                fullWidth
              />
            )}

            {/* API Key */}
            {providerMeta?.requiresApiKey && (
              <div className="pt-2">
                <label className="block text-[#999] text-[11px] mb-2 font-mono text-center">
                  API-Key:
                </label>
                <input
                  type="password"
                  value={aiConfig.apiKey || ""}
                  onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="
                    w-full text-[#e5e5e5] bg-transparent
                    border border-[#AC8E66] rounded-lg
                    px-4 py-2 font-mono text-[11px] text-center
                    focus:outline-none focus:border-[#D4AF78]
                  "
                />
                <p className="text-[#777] text-[11px] mt-1 text-center">
                  Wird sicher in LocalStorage gespeichert
                </p>
              </div>
            )}

            {/* Base URL */}
            {(aiConfig.provider === "ollama" || aiConfig.provider === "custom") && (
              <div className="pt-1">
                <label className="block text-[#999] text-[11px] mb-2 font-mono text-center">
                  Base URL:
                </label>
                <input
                  type="text"
                  value={aiConfig.baseUrl || ""}
                  onChange={(e) => setAiConfig({ ...aiConfig, baseUrl: e.target.value })}
                  placeholder={aiConfig.provider === "ollama" ? "http://127.0.0.1:11434" : "https://your-api.com"}
                  className="
                    w-full text-[#e5e5e5] bg-transparent
                    border border-[#AC8E66] rounded-lg
                    px-4 py-2 font-mono text-[10px] text-center
                    focus:outline-none focus:border-[#D4AF78]
                  "
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2) STYLE CARD */}
      <div className="rounded-2xl border border-[#3a3a3a] bg-[#151515] shadow-xl">
        <div className="px-6 py-5 border-b border-[#2a2a2a]">
          <div className="font-mono text-[12px] text-[#AC8E66] tracking-wide text-center">
            Stil
          </div>
          <div className="font-mono text-[10px] text-[#777] text-center mt-1">
            Präzise ↔ Kreativ
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="mx-auto w-full max-w-[520px]">
            <ZenSlider
              label="Stil wählen"
              min={0}
              max={1}
              step={0.1}
              value={aiConfig.temperature ?? 0.0}
              onChange={(v) => setAiConfig({ ...aiConfig, temperature: v })}
              minLabel="Präzise (0.0)"
              maxLabel="Kreativ (1.0)"
              valueFormatter={(v) => v.toFixed(1)}
            />
          </div>

          <div className="mt-4">
            <ZenInfoBox {...AI_TEMPERATURE_INFO} />
          </div>
        </div>
      </div>

      {/* 3) PROVIDER INFO (calm, not dominant) */}
      {getProviderInfo(aiConfig.provider) ? (
        <div className="opacity-95">
          <ZenInfoBox {...getProviderInfo(aiConfig.provider)!} />
        </div>
      ) : null}
    </div>
  </div>
</div>

      
      </div>
    </ZenModal>
  );
};
