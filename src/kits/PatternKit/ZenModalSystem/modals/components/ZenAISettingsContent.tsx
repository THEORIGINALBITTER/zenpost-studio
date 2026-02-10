import { useState, useEffect } from "react";
import { ZenDropdown } from "../../components/ZenDropdown";
import { ZenInfoBox } from "../../components/ZenInfoBox";
import { ZenSlider } from "../../components/ZenSlider";
import { AI_TEMPERATURE_INFO, getProviderInfo } from "../../config/ZenModalConfig";
import {
  loadAIConfig,
  saveAIConfig,
  getAvailableProviders,
  getModelsForProvider,
  type AIConfig,
  type AIProvider,
} from "../../../../../services/aiService";

export const ZenAISettingsContent = () => {
  const [aiConfig, setAiConfig] = useState<AIConfig>(loadAIConfig());

  // Auto-save on changes
  useEffect(() => {
    saveAIConfig(aiConfig);
  }, [aiConfig]);

  const availableProviders = getAvailableProviders();
  const availableModels = getModelsForProvider(aiConfig.provider);

return (
  <div className="w-full flex justify-center px-8 py-8">
    {/* Paper Panel (wie Editor) */}
    <div
      className="
        w-full max-w-[860px]
        rounded-2xl
        bg-[#E8E1D2]
        border
        rounded-[10px] 
        border-[#AC8E66]/60
        shadow-2xl
        overflow-hidden
      "
    >
      {/* Paper Header */}
      <div className="
      px-[10px] 
      py-4 
      border-b 
      border-[#AC8E66]/35
      
      "
      >
        <div className="font-mono text-[12px] text-[#555] text-center tracking-wide">
          AI Einstellungen
        </div>
        <div className="font-mono text-[10px] text-[#777] text-center mt-1">
          Provider · Modell · Verbindung · Stil
        </div>
      </div>

      {/* Paper Body */}
      <div className="px-8 py-8">
        <div className="mx-auto w-full max-w-[520px] flex flex-col gap-10">

          {/* ====== SECTION: Provider/Model ====== */}
          <div className="flex flex-col gap-6 pt-[19px]">
            {/* kleine Section-Überschrift */}
            <div className="font-mono text-[10px] text-[#555] tracking-wide text-center">
              KONFIGURATION
            </div>

            {/* Dropdowns wirken auf Paper besser mit dunklem Menü,
                aber Trigger/Label sollten “paper” sein */}
            <ZenDropdown
              label="AI-Provider:"
              labelSize="11px"
              value={aiConfig.provider}
              onChange={(value) => setAiConfig({ ...aiConfig, provider: value as AIProvider })}
              options={availableProviders.map((p) => ({ value: p.value, label: p.label }))}
              fullWidth
              variant="compact"
              // optional: wenn dein ZenDropdown Props für labelColor hat
              // labelColor="#6b5a3e"
            />

            {availableModels.length > 0 && (
              <ZenDropdown
                label="Modell:"
                labelSize="11px"
                value={aiConfig.model || ""}
                onChange={(value) => setAiConfig({ ...aiConfig, model: value })}
                options={availableModels.map((m) => ({ value: m, label: m }))}
                fullWidth
                variant="compact"
              />
            )}

            {/* API Key */}
            {availableProviders.find((p) => p.value === aiConfig.provider)?.requiresApiKey && (
              <div className="w-full">
                <label className="block font-mono text-[11px] text-[#6b5a3e] text-center mb-2">
                  API-Key
                </label>
                <input
                  type="password"
                  value={aiConfig.apiKey || ""}
                  onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="
                    w-full
                    bg-transparent
                    border border-[#AC8E66]/70
                    rounded-lg
                    px-4 py-2
                    font-mono text-[10px]
                    text-[#3a3a3a]
                    text-center
                    focus:outline-none focus:border-[#AC8E66]
                    placeholder:text-[#7a6a52]/70
                  "
                />
                <div className="font-mono text-[10px] text-[#7a6a52] text-center mt-2">
                  Wird lokal gespeichert (LocalStorage)
                </div>
              </div>
            )}

            {/* Base URL */}
            {(aiConfig.provider === "ollama" || aiConfig.provider === "custom") && (
              <div className="w-full">
                <label className="block font-mono text-[11px] text-[#6b5a3e] text-center mb-2">
                  Base URL
                </label>
                <input
                  type="text"
                  value={aiConfig.baseUrl || ""}
                  onChange={(e) => setAiConfig({ ...aiConfig, baseUrl: e.target.value })}
                  placeholder={
                    aiConfig.provider === "ollama"
                      ? "http://127.0.0.1:11434"
                      : "https://your-api.com"
                  }
                  className="
                    w-full
                    bg-transparent
                    border border-[#AC8E66]/70
                    rounded-lg
                    px-4 py-2
                    font-mono text-[10px]
                    text-[#3a3a3a]
                    text-center
                    focus:outline-none focus:border-[#AC8E66]
                    placeholder:text-[#7a6a52]/70
                  "
                />
              </div>
            )}
          </div>

          {/* Paper Divider */}
          <div className="border-t border-[#AC8E66]/30" />

          {/* ====== SECTION: Stil ====== */}
          <div className="flex flex-col gap-5">
            <div className="font-mono text-[10px] text-[#7a6a52] tracking-wide text-center">
              STIL
            </div>

            {/* Slider sitzt auf Paper — wirkt viel besser */}
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

            {/* Temperature Info – ggf. brauchst du eine "paper" Variante,
                sonst wirkt das dunkel/grün wie in deinem Screenshot */}
            <div className="mt-2">
              <ZenInfoBox {...AI_TEMPERATURE_INFO} />
            </div>
          </div>

          {/* Provider Info */}
          {getProviderInfo(aiConfig.provider) && (
            <div className="mt-2">
              <ZenInfoBox {...getProviderInfo(aiConfig.provider)!} />
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);


};
