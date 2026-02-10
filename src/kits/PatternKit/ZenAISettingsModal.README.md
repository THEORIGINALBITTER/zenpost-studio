# ZenAISettingsModal

**Location:** `src/kits/PatternKit/ZenAISettingsModal.tsx`
**Category:** PatternKit - High-level UI Pattern
**Purpose:** Shared AI provider configuration modal for all AI-powered features

## Overview

`ZenAISettingsModal` is a reusable component that provides a unified interface for configuring AI provider settings across the entire application. It supports multiple AI providers (OpenAI, Anthropic, Ollama, Custom) and manages all provider-specific configuration options.

## Features

- **Multi-Provider Support**: OpenAI, Anthropic, Ollama, and Custom API endpoints
- **Dynamic Model Selection**: Provider-specific model lists
- **Secure Storage**: API keys stored in browser LocalStorage
- **Temperature Control**: Adjustable creativity slider (0.0 - 1.0)
- **Context-Aware Help**: Provider-specific help text with API key links
- **Zen Design**: Consistent with Zen Design System aesthetics

## Usage

### Basic Implementation

```tsx
import { ZenAISettingsModal } from '../kits/PatternKit/ZenAISettingsModal';

function MyScreen() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <button onClick={() => setShowSettings(true)}>
        Settings
      </button>

      <ZenAISettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={() => console.log('Settings saved!')}
      />
    </>
  );
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | ✅ | Controls modal visibility |
| `onClose` | `() => void` | ✅ | Callback when modal is closed (ESC or X button) |
| `onSave` | `() => void` | ❌ | Optional callback after settings are saved |

## Supported AI Providers

### 1. OpenAI
- **Models**: GPT-4o, GPT-4o-mini, GPT-4, GPT-3.5-turbo, o1-preview, o1-mini
- **Requires**: API Key from [platform.openai.com](https://platform.openai.com/api-keys)
- **Use Case**: Production-ready, high-quality AI responses

### 2. Anthropic
- **Models**: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
- **Requires**: API Key from [console.anthropic.com](https://console.anthropic.com/)
- **Use Case**: Advanced reasoning and long-context tasks

### 3. Ollama
- **Models**: llama3.1, codellama, mistral, mixtral, qwen2.5-coder
- **Requires**: Local Ollama server running (`ollama serve`)
- **Base URL**: `http://127.0.0.1:11434` (default)
- **Use Case**: Privacy-focused, offline AI

### 4. Custom API
- **Models**: User-defined
- **Requires**: Custom base URL
- **Use Case**: Custom AI implementations or proxy services

## Configuration Fields

### Provider Selection
Dropdown to select the AI provider (OpenAI, Anthropic, Ollama, Custom).

### Model Selection
Dynamically populated dropdown based on selected provider. Shows provider-specific models.

### API Key (OpenAI/Anthropic only)
- Password-masked input field
- Placeholder: `sk-...`
- Stored securely in LocalStorage
- Not required for Ollama

### Base URL (Ollama/Custom only)
- Text input for custom endpoint URLs
- Default for Ollama: `http://127.0.0.1:11434`
- Placeholder for Custom: `https://your-api.com`

### Temperature Slider
- Range: 0.0 (Precise) to 1.0 (Creative)
- Default: 0.3
- Step: 0.1
- Controls AI response randomness/creativity

## State Management

The modal manages its own internal state for the configuration form:

```tsx
const [aiConfig, setAiConfig] = useState<AIConfig>(loadAIConfig());
```

**On Save:**
1. Saves configuration to LocalStorage via `saveAIConfig(aiConfig)`
2. Calls optional `onSave()` callback
3. Closes modal via `onClose()`

**On Cancel:**
1. Discards unsaved changes
2. Closes modal via `onClose()`

## Integration Examples

### Example 1: File Converter Screen

```tsx
// ConverterScreen.tsx
import { ZenAISettingsModal } from '../kits/PatternKit/ZenAISettingsModal';

export const ConverterScreen = ({ onBack }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      {/* ... converter content ... */}

      <ZenInfoFooter
        onClick={() => setIsSettingsOpen(true)}
        iconType="settings"
      />

      <ZenAISettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={() => setError(null)}
      />
    </div>
  );
};
```

### Example 2: Content Transform Screen

```tsx
// ContentTransformScreen.tsx
import { ZenAISettingsModal } from '../kits/PatternKit/ZenAISettingsModal';

export const ContentTransformScreen = ({ onBack }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      {/* ... transform content ... */}

      <ZenInfoFooter
        onClick={() => setShowSettings(true)}
        iconType="settings"
      />

      <ZenAISettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={() => setError(null)}
      />
    </div>
  );
};
```

## Design System Integration

### Zen Design Principles Applied

1. **Zen Modal**: Uses `ZenModal` for consistent modal behavior
2. **Zen Dropdown**: Uses `ZenDropdown` for provider/model selection
3. **Color Palette**:
   - Background: `#2A2A2A`
   - Border: `#AC8E66` (gold accent)
   - Text: `#e5e5e5` (light)
   - Muted text: `#999`, `#777`
4. **Typography**: Monospace font (`font-mono`)
5. **Spacing**: Consistent `gap-4` between form elements
6. **Transitions**: Smooth hover effects on buttons

### Button Styling

**Save Button:**
```css
bg-[#AC8E66] hover:bg-[#D4AF78] text-[#1A1A1A]
```

**Cancel Button:**
```css
bg-[#2A2A2A] hover:bg-[#3A3A3A] text-[#e5e5e5]
```

## Dependencies

### Internal Dependencies
- `ZenModal` - Base modal component
- `ZenDropdown` - Custom dropdown component
- `aiService.ts` - AI configuration service

### Service Functions
```tsx
import {
  loadAIConfig,      // Load config from LocalStorage
  saveAIConfig,      // Save config to LocalStorage
  getAvailableProviders, // Get list of AI providers
  getModelsForProvider,  // Get models for selected provider
  type AIConfig,
  type AIProvider,
} from '../../services/aiService';
```

## TypeScript Interface

```tsx
interface ZenAISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}
```

## AI Configuration Schema

```tsx
interface AIConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'custom';
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
}
```

## Storage

All settings are persisted to `localStorage` under the key `zenpost-ai-config`:

```json
{
  "provider": "openai",
  "model": "gpt-4o-mini",
  "apiKey": "sk-...",
  "temperature": 0.3
}
```

## Shared Settings

The modal uses a **shared configuration** approach:
- Settings are stored globally in LocalStorage
- All AI-powered features (Converter, Content Transform) share the same configuration
- Changes made in one screen immediately affect all other features

## Security Considerations

⚠️ **API Key Storage:**
- API keys are stored in browser LocalStorage
- LocalStorage is **not encrypted** by default
- Keys are only accessible to the same origin
- Consider warning users about shared/public computers

## Accessibility

- ✅ Keyboard navigation supported (ESC to close)
- ✅ Password field for API keys
- ✅ Clear labels for all inputs
- ✅ Provider-specific help text
- ✅ Range slider with visible value

## Future Enhancements

Potential improvements:
1. **API Key Validation**: Test API key before saving
2. **Usage Statistics**: Show API usage/costs
3. **Multiple Profiles**: Save different provider configurations
4. **Export/Import**: Share configurations between devices
5. **Key Encryption**: Encrypt API keys in LocalStorage
6. **Rate Limiting**: Display current rate limits for selected provider

## Related Components

- `ZenModal` - Base modal wrapper
- `ZenDropdown` - Dropdown selector
- `ZenInfoFooter` - Settings icon trigger
- `aiService.ts` - Configuration management service

## Location in Project Structure

```
src/
└── kits/
    └── PatternKit/
        ├── ZenAISettingsModal.tsx        ← This component
        ├── ZenAISettingsModal.README.md  ← This documentation
        ├── ZenModal.tsx
        └── ZenDropdown.tsx
```

---

**ZenAISettingsModal** - Unified AI configuration for ZenPost Studio
