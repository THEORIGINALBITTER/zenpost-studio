# API Reference

**ZenPost Studio Services & Functions**

Complete reference for all services, utilities, and helper functions.

---

## 📋 Table of Contents

- [AI Service](#ai-service)
- [Storage Utilities](#storage-utilities)
- [Helper Functions](#helper-functions)
- [Type Definitions](#type-definitions)

---

## 🤖 AI Service

**Location:** `src/services/aiService.ts`

The AI Service provides a unified interface for interacting with multiple AI providers (OpenAI, Anthropic, Ollama, Custom).

### Types

#### AIProvider

```typescript
type AIProvider = 'openai' | 'anthropic' | 'ollama' | 'custom';
```

Supported AI providers.

---

#### AIConfig

```typescript
interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  temperature?: number;
}
```

Configuration for AI provider.

**Properties:**
- `provider` - The AI provider to use
- `apiKey` - API key for cloud providers (not required for Ollama)
- `model` - Model name (e.g., 'gpt-4o-mini', 'claude-3-5-sonnet-20241022')
- `baseUrl` - Base URL for API (custom endpoints or local Ollama)
- `temperature` - Creativity level (0.0 = precise, 1.0 = creative)

---

#### CodeAnalysisResult

```typescript
interface CodeAnalysisResult {
  success: boolean;
  readme?: string;
  error?: string;
}
```

Result from code analysis.

**Properties:**
- `success` - Whether analysis succeeded
- `readme` - Generated documentation (if successful)
- `error` - Error message (if failed)

---

#### ContentPlatform

```typescript
type ContentPlatform =
  | 'linkedin'
  | 'devto'
  | 'twitter'
  | 'medium'
  | 'reddit'
  | 'github-discussion'
  | 'youtube';
```

Supported content platforms for transformation.

---

#### ContentTone

```typescript
type ContentTone = 'professional' | 'casual' | 'technical' | 'enthusiastic';
```

Tone of voice for content.

---

#### ContentLength

```typescript
type ContentLength = 'short' | 'medium' | 'long';
```

Desired content length.

---

#### ContentAudience

```typescript
type ContentAudience = 'beginner' | 'intermediate' | 'expert';
```

Target audience expertise level.

---

#### TransformConfig

```typescript
interface TransformConfig {
  platform: ContentPlatform;
  tone?: ContentTone;
  length?: ContentLength;
  audience?: ContentAudience;
}
```

Configuration for content transformation.

**Properties:**
- `platform` - Target platform (required)
- `tone` - Content tone (optional, defaults based on platform)
- `length` - Content length (optional)
- `audience` - Target audience (optional)

---

#### TransformResult

```typescript
interface TransformResult {
  success: boolean;
  data?: string;
  error?: string;
}
```

Result from content transformation.

**Properties:**
- `success` - Whether transformation succeeded
- `data` - Transformed content (if successful)
- `error` - Error message (if failed)

---

### Functions

#### loadAIConfig()

```typescript
function loadAIConfig(): AIConfig
```

Loads AI configuration from LocalStorage.

**Returns:** AIConfig object (defaults if not found)

**Example:**
```typescript
const config = loadAIConfig();
console.log(config.provider); // 'openai'
console.log(config.model);    // 'gpt-4o-mini'
```

---

#### saveAIConfig()

```typescript
function saveAIConfig(config: AIConfig): void
```

Saves AI configuration to LocalStorage.

**Parameters:**
- `config` - AIConfig object to save

**Example:**
```typescript
saveAIConfig({
  provider: 'anthropic',
  apiKey: 'sk-ant-api03-...',
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.3
});
```

---

#### analyzeCode()

```typescript
async function analyzeCode(code: string): Promise<CodeAnalysisResult>
```

Analyzes code and generates documentation.

**Parameters:**
- `code` - Source code to analyze

**Returns:** Promise resolving to CodeAnalysisResult

**Example:**
```typescript
const result = await analyzeCode(`
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n-1) + fibonacci(n-2);
}
`);

if (result.success) {
  console.log(result.readme);
} else {
  console.error(result.error);
}
```

**What it does:**
1. Detects programming language
2. Loads AI config from LocalStorage
3. Calls appropriate AI provider
4. Generates comprehensive documentation
5. Returns formatted markdown

---

#### transformContent()

```typescript
async function transformContent(
  markdown: string,
  config: TransformConfig
): Promise<TransformResult>
```

Transforms markdown content for specific platform.

**Parameters:**
- `markdown` - Source markdown content
- `config` - Transformation configuration

**Returns:** Promise resolving to TransformResult

**Example:**
```typescript
const result = await transformContent(
  '# My Blog Post\n\nThis is a great article...',
  {
    platform: 'linkedin',
    tone: 'professional',
    length: 'medium',
    audience: 'intermediate'
  }
);

if (result.success) {
  console.log(result.data); // LinkedIn-optimized content
}
```

**Platform-Specific Transformations:**

**LinkedIn:**
- Professional tone
- Hook in first line
- Bullet points and emojis
- Call-to-action
- Hashtags

**Dev.to:**
- Technical depth
- Code examples
- Front matter
- Tags

**Twitter/X:**
- Thread format
- Character limits
- Engaging hooks
- Hashtags

**Medium:**
- Storytelling
- Subheadings
- Longer paragraphs
- Visual descriptions

**Reddit:**
- Conversational tone
- TL;DR section
- Community-focused
- Minimal self-promotion

**GitHub Discussions:**
- Technical detail
- Code snippets
- Problem/solution format
- Links to resources

**YouTube:**
- Video script format
- Timestamps
- Call-to-action
- Engaging intro/outro

---

#### detectLanguage()

```typescript
function detectLanguage(code: string): string
```

Detects programming language from code.

**Parameters:**
- `code` - Source code string

**Returns:** Language name or 'Unknown'

**Example:**
```typescript
const lang = detectLanguage('function hello() { }');
console.log(lang); // 'JavaScript'

const lang2 = detectLanguage('def hello():\n    pass');
console.log(lang2); // 'Python'
```

**Supported Languages:**
- TypeScript
- JavaScript
- Python
- Java
- C++
- C#
- Go
- Rust
- PHP
- Ruby
- Swift
- Kotlin

---

#### getAvailableProviders()

```typescript
function getAvailableProviders(): AIProvider[]
```

Returns list of available AI providers.

**Returns:** Array of provider names

**Example:**
```typescript
const providers = getAvailableProviders();
// ['openai', 'anthropic', 'ollama', 'custom']
```

---

#### getModelsForProvider()

```typescript
function getModelsForProvider(provider: AIProvider): string[]
```

Returns available models for a provider.

**Parameters:**
- `provider` - Provider name

**Returns:** Array of model names

**Example:**
```typescript
const models = getModelsForProvider('openai');
// ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']

const claudeModels = getModelsForProvider('anthropic');
// ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', ...]
```

**Provider Models:**

**OpenAI:**
- `gpt-4o` - Latest GPT-4 Omni
- `gpt-4o-mini` - Smaller, faster GPT-4o
- `gpt-4-turbo` - GPT-4 Turbo
- `gpt-3.5-turbo` - Fast, affordable

**Anthropic:**
- `claude-3-5-sonnet-20241022` - Latest Claude 3.5
- `claude-3-opus-20240229` - Most capable
- `claude-3-sonnet-20240229` - Balanced
- `claude-3-haiku-20240307` - Fastest

**Ollama:**
- `llama3.1` - Meta's Llama 3.1
- `codellama` - Code-specialized
- `mistral` - Fast, efficient
- `qwen2.5-coder` - Advanced code understanding
- `phi3` - Microsoft's Phi-3

---

### Internal Functions

These functions are used internally by the service but are exported for advanced usage.

#### buildPromptForCodeAnalysis()

```typescript
function buildPromptForCodeAnalysis(code: string, language: string): string
```

Builds AI prompt for code analysis.

**Parameters:**
- `code` - Source code
- `language` - Detected language

**Returns:** Formatted prompt string

---

#### buildPromptForTransform()

```typescript
function buildPromptForTransform(
  markdown: string,
  config: TransformConfig
): string
```

Builds AI prompt for content transformation.

**Parameters:**
- `markdown` - Source content
- `config` - Transform configuration

**Returns:** Formatted prompt string

---

#### callOpenAI()

```typescript
async function callOpenAI(
  prompt: string,
  config: AIConfig
): Promise<string>
```

Calls OpenAI API.

**Internal use only.**

---

#### callAnthropic()

```typescript
async function callAnthropic(
  prompt: string,
  config: AIConfig
): Promise<string>
```

Calls Anthropic Claude API.

**Internal use only.**

---

#### callOllama()

```typescript
async function callOllama(
  prompt: string,
  config: AIConfig
): Promise<string>
```

Calls local Ollama API.

**Internal use only.**

---

#### callCustomAPI()

```typescript
async function callCustomAPI(
  prompt: string,
  config: AIConfig
): Promise<string>
```

Calls custom API endpoint.

**Internal use only.**

---

## 💾 Storage Utilities

### LocalStorage Keys

ZenPost Studio uses these LocalStorage keys:

```typescript
'zenpost_ai_config'           // AIConfig object
'zenpost_settings_dismissed'  // 'true' | null
```

### Storage Functions

#### Get AI Config

```typescript
const config = loadAIConfig();
```

#### Save AI Config

```typescript
saveAIConfig({
  provider: 'openai',
  apiKey: 'sk-...',
  model: 'gpt-4o-mini',
  temperature: 0.3
});
```

#### Check Settings Dismissed

```typescript
const dismissed = localStorage.getItem('zenpost_settings_dismissed') === 'true';
```

#### Dismiss Settings Notification

```typescript
localStorage.setItem('zenpost_settings_dismissed', 'true');
```

---

## 🛠️ Helper Functions

### Component Utilities

#### getModalPreset()

```typescript
function getModalPreset(presetId: string): ModalPreset
```

**Location:** `src/kits/PatternKit/ZenModalSystem/config/ZenModalConfig.ts`

Gets modal configuration preset.

**Parameters:**
- `presetId` - Preset identifier ('ai-settings', 'about', 'default')

**Returns:** ModalPreset object

**Example:**
```typescript
const preset = getModalPreset('ai-settings');
console.log(preset.title);      // 'AI-Einstellungen'
console.log(preset.minHeight);  // '520px'
```

---

#### getProviderInfo()

```typescript
function getProviderInfo(provider: string): InfoBoxConfig | undefined
```

**Location:** `src/kits/PatternKit/ZenModalSystem/config/ZenModalConfig.ts`

Gets provider information for InfoBox.

**Parameters:**
- `provider` - Provider name ('openai', 'anthropic', 'ollama', 'custom')

**Returns:** InfoBoxConfig or undefined

**Example:**
```typescript
const info = getProviderInfo('openai');
console.log(info.title);        // 'OpenAI'
console.log(info.description);  // 'Benötigt API-Key...'
console.log(info.links);        // Array of links
```

---

#### getSliderConfig()

```typescript
function getSliderConfig(sliderName: string): SliderConfig | undefined
```

**Location:** `src/kits/PatternKit/ZenModalSystem/config/ZenModalConfig.ts`

Gets slider configuration.

**Parameters:**
- `sliderName` - Slider name ('temperature', 'topP', 'maxTokens')

**Returns:** SliderConfig or undefined

**Example:**
```typescript
const config = getSliderConfig('temperature');
console.log(config.min);        // 0
console.log(config.max);        // 1
console.log(config.step);       // 0.1
console.log(config.minLabel);   // 'Präzise (0.0)'
```

---

#### createCustomPreset()

```typescript
function createCustomPreset(
  basePresetId: string,
  overrides: Partial<ModalPreset>
): ModalPreset
```

**Location:** `src/kits/PatternKit/ZenModalSystem/config/ZenModalConfig.ts`

Creates custom modal preset based on existing preset.

**Parameters:**
- `basePresetId` - Base preset to extend
- `overrides` - Properties to override

**Returns:** New ModalPreset object

**Example:**
```typescript
const customPreset = createCustomPreset('ai-settings', {
  title: 'Custom Settings',
  minHeight: '600px'
});
```

---

## 📐 Type Definitions

### Modal System Types

#### ModalHeaderConfig

```typescript
interface ModalHeaderConfig {
  title: string;
  subtitle?: string | ReactNode;
  titleColor?: string;
  subtitleColor?: string;
  titleSize?: string;
  subtitleSize?: string;
}
```

---

#### InfoBoxLink

```typescript
interface InfoBoxLink {
  label: string;
  url: string;
}
```

---

#### InfoBoxConfig

```typescript
interface InfoBoxConfig {
  title: string;
  description: string;
  links?: InfoBoxLink[];
  type?: 'info' | 'warning' | 'success' | 'error';
}
```

---

#### SliderConfig

```typescript
interface SliderConfig {
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  minLabel?: string;
  maxLabel?: string;
  valueFormatter?: (value: number) => string;
}
```

---

#### ModalPreset

```typescript
interface ModalPreset extends ModalHeaderConfig {
  id: string;
  minHeight?: string;
  maxHeight?: string;
  minWidth?: string;
}
```

---

## 🔒 Error Handling

### AI Service Errors

All AI functions return structured results with error handling:

```typescript
try {
  const result = await analyzeCode(code);

  if (result.success) {
    // Handle success
    console.log(result.readme);
  } else {
    // Handle error
    console.error(result.error);
  }
} catch (error) {
  // Handle unexpected errors
  console.error('Unexpected error:', error);
}
```

### Common Error Messages

**API Key Issues:**
- `"API-Key fehlt"`
- `"Incorrect API key provided"`
- `"Invalid API Key"`

**Network Issues:**
- `"Connection refused"`
- `"Failed to connect"`
- `"Network error"`

**Rate Limiting:**
- `"Rate limit exceeded"`
- `"Too many requests"`

**Model Issues:**
- `"Model not found"`
- `"The model does not exist"`

---

## 📚 Related Documentation

- [Architecture Overview](./architecture.md)
- [Component Library](./components.md)
- [Contributing Guide](./contributing.md)

---

## 🆘 Questions?

**API Questions:**
- [GitHub Discussions](https://github.com/theoriginalbitter/zenpost-studio/discussions)
- [GitHub Issues](https://github.com/theoriginalbitter/zenpost-studio/issues)
