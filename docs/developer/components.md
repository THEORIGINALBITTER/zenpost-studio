# Component Library

**ZenPost Studio Pattern Kit & Design Kit Reference**

Complete documentation of all reusable UI components in ZenPost Studio.

---

## 📦 Overview

ZenPost Studio uses two component kits:

- **PatternKit** - High-level UI patterns and business components
- **DesignKit** - Low-level design primitives (buttons, borders, backgrounds)

All components follow the **Zen Design System**:
- Monospace typography (IBM Plex Mono, Courier Prime)
- Hand-drawn aesthetics using Rough.js
- Dark theme (#1A1A1A background, #AC8E66 accent)
- Minimalist, focused interface

---

## 🎨 Design System Colors

```css
--theme-color: #AC8E66        /* Primary gold */
--theme-color-dark: #8A6E4E   /* Darker gold */
--accent-color: #D4AF78       /* Light gold */
--base-background: #1A1A1A    /* Dark background */
--secondary-bg: #2A2A2A       /* Lighter dark */
--border-color: #3a3a3a       /* Subtle borders */
--text-primary: #e5e5e5       /* Light text */
--text-secondary: #999        /* Gray text */
--text-muted: #777            /* Muted text */
```

---

## 📚 PatternKit Components

### ZenMarkdownEditor

**Purpose:** Real-time Markdown editor with live preview toggle

**Location:** `src/kits/PatternKit/ZenMarkdownEditor.tsx`

**Props:**
```typescript
interface ZenMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}
```

**Example:**
```tsx
import { ZenMarkdownEditor } from './kits/PatternKit/ZenMarkdownEditor';

<ZenMarkdownEditor
  value={content}
  onChange={setContent}
  placeholder="Enter your markdown here..."
  minHeight="400px"
/>
```

**Features:**
- Live markdown preview toggle
- Syntax highlighting
- Auto-growing textarea
- Zen-styled scrollbars
- Toggle button with Rough.js border

---

### ZenMarkdownPreview

**Purpose:** Renders Markdown content with Zen styling

**Location:** `src/kits/PatternKit/ZenMarkdownPreview.tsx`

**Props:**
```typescript
interface ZenMarkdownPreviewProps {
  content: string;
  className?: string;
}
```

**Example:**
```tsx
import { ZenMarkdownPreview } from './kits/PatternKit/ZenMarkdownPreview';

<ZenMarkdownPreview content={markdownText} />
```

**Features:**
- Uses `react-markdown` for rendering
- GitHub Flavored Markdown support
- Zen color scheme styling
- Code syntax highlighting
- Responsive typography

---

### ZenButton

**Purpose:** Primary action button with Rough.js border

**Location:** `src/kits/PatternKit/ZenButton.tsx`

**Props:**
```typescript
interface ZenButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
}
```

**Example:**
```tsx
<ZenButton onClick={handleSubmit}>
  Konvertieren
</ZenButton>
```

---

### ZenCard

**Purpose:** Container card with hand-drawn border

**Location:** `src/kits/PatternKit/ZenCard.tsx`

**Example:**
```tsx
<ZenCard>
  <h2>Card Title</h2>
  <p>Card content goes here</p>
</ZenCard>
```

---

### ZenHeading

**Purpose:** Styled heading component

**Location:** `src/kits/PatternKit/ZenHeading.tsx`

**Props:**
```typescript
interface ZenHeadingProps {
  children: React.ReactNode;
  level?: 1 | 2 | 3;
  color?: string;
  className?: string;
}
```

---

### ZenSubtitle

**Purpose:** Subtitle text with consistent styling

**Location:** `src/kits/PatternKit/ZenSubtitle.tsx`

**Example:**
```tsx
<ZenSubtitle>
  Your subtitle text here
</ZenSubtitle>
```

---

### ZenInfoText

**Purpose:** Small informational text

**Location:** `src/kits/PatternKit/ZenInfoText.tsx`

---

### ZenOptionButton

**Purpose:** Selectable option button for forms

**Location:** `src/kits/PatternKit/ZenOptionButton.tsx`

**Props:**
```typescript
interface ZenOptionButtonProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: any; // FontAwesome icon
}
```

**Example:**
```tsx
<ZenOptionButton
  label="Markdown"
  selected={format === 'markdown'}
  onClick={() => setFormat('markdown')}
  icon={faFileCode}
/>
```

---

### ZenHeader

**Purpose:** Application header with navigation

**Location:** `src/kits/PatternKit/ZenHeader.tsx`

**Props:**
```typescript
interface ZenHeaderProps {
  onBackClick?: () => void;
  onSettingsClick?: () => void;
  showBackButton?: boolean;
  showSettingsButton?: boolean;
}
```

---

### ZenSettingsNotification

**Purpose:** Notification banner for settings reminders

**Location:** `src/kits/PatternKit/ZenSettingsNotification.tsx`

**Props:**
```typescript
interface ZenSettingsNotificationProps {
  onOpenSettings: () => void;
  onDismiss?: () => void;
}
```

---

### ZenLogo

**Purpose:** ZenPost Studio logo

**Location:** `src/kits/PatternKit/ZenLogo.tsx`

---

### ZenInfoIcon

**Purpose:** Info icon with tooltip

**Location:** `src/kits/PatternKit/ZenInfoIcon.tsx`

---

### ZenInfoFooter

**Purpose:** Footer with links and info

**Location:** `src/kits/PatternKit/ZenInfoFooter.tsx`

---

## 🎯 Modal System Components

### ZenModal

**Purpose:** Base modal container with overlay

**Location:** `src/kits/PatternKit/ZenModalSystem/components/ZenModal.tsx`

**Props:**
```typescript
interface ZenModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  minWidth?: string;
  minHeight?: string;
  maxHeight?: string;
}
```

**Example:**
```tsx
<ZenModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  minWidth="520px"
  minHeight="480px"
>
  {/* Modal content */}
</ZenModal>
```

---

### ZenModalHeader

**Purpose:** Modal header with title, subtitle, and action buttons

**Location:** `src/kits/PatternKit/ZenModalSystem/components/ZenModalHeader.tsx`

**Props:**
```typescript
interface ZenModalHeaderProps {
  title: string;
  subtitle?: string | ReactNode;
  titleColor?: string;
  subtitleColor?: string;
  titleSize?: string;
  subtitleSize?: string;
  onClose: () => void;
  onSave?: () => void;
}
```

**Example:**
```tsx
<ZenModalHeader
  title="AI-Einstellungen"
  subtitle="Konfiguriere deinen AI-Provider"
  onClose={handleClose}
  onSave={handleSave}
/>
```

---

### ZenModalFooter

**Purpose:** Modal footer with decorative border

**Location:** `src/kits/PatternKit/ZenModalSystem/components/ZenModalFooter.tsx`

---

### ZenDropdown

**Purpose:** Styled dropdown/select component

**Location:** `src/kits/PatternKit/ZenModalSystem/components/ZenDropdown.tsx`

**Props:**
```typescript
interface ZenDropdownProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  placeholder?: string;
}
```

**Example:**
```tsx
<ZenDropdown
  label="AI Provider"
  value={provider}
  options={[
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'ollama', label: 'Ollama' }
  ]}
  onChange={setProvider}
/>
```

---

### ZenSlider

**Purpose:** Slider input with labels and value display

**Location:** `src/kits/PatternKit/ZenModalSystem/components/ZenSlider.tsx`

**Props:**
```typescript
interface ZenSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  minLabel?: string;
  maxLabel?: string;
  valueFormatter?: (value: number) => string;
}
```

**Example:**
```tsx
<ZenSlider
  label="Temperature"
  value={temperature}
  onChange={setTemperature}
  min={0}
  max={1}
  step={0.1}
  minLabel="Präzise (0.0)"
  maxLabel="Kreativ (1.0)"
  valueFormatter={(v) => v.toFixed(1)}
/>
```

---

### ZenInfoBox

**Purpose:** Information box with links

**Location:** `src/kits/PatternKit/ZenModalSystem/components/ZenInfoBox.tsx`

**Props:**
```typescript
interface InfoBoxLink {
  label: string;
  url: string;
}

interface ZenInfoBoxProps {
  title: string;
  description: string;
  links?: InfoBoxLink[];
  type?: 'info' | 'warning' | 'success' | 'error';
}
```

**Example:**
```tsx
<ZenInfoBox
  title="OpenAI"
  description="Benötigt API-Key von platform.openai.com"
  type="info"
  links={[
    { label: 'API-Key erstellen', url: 'https://platform.openai.com/api-keys' }
  ]}
/>
```

---

### ZenRoughButton

**Purpose:** Button with animated Rough.js border

**Location:** `src/kits/PatternKit/ZenModalSystem/components/ZenRoughButton.tsx`

---

## 🔧 Pre-built Modals

### ZenAISettingsModal

**Purpose:** Complete modal for AI provider configuration

**Location:** `src/kits/PatternKit/ZenModalSystem/modals/ZenAISettingsModal.tsx`

**Props:**
```typescript
interface ZenAISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}
```

**Features:**
- Provider selection (OpenAI, Anthropic, Ollama, Custom)
- Model selection
- API key input
- Temperature slider
- Provider-specific info boxes
- Auto-save to localStorage

---

### ZenAboutModal

**Purpose:** About dialog with app information

**Location:** `src/kits/PatternKit/ZenModalSystem/modals/ZenAboutModal.tsx`

---

## 🎨 DesignKit Components

### ZenCloseButton

**Purpose:** Close button with Rough.js circle border

**Location:** `src/kits/DesignKit/ZenCloseButton.tsx`

**Props:**
```typescript
interface ZenCloseButtonProps {
  onClick?: () => void;
  size?: 'sm' | 'md';
  className?: string;
}
```

**Example:**
```tsx
<ZenCloseButton onClick={handleClose} size="md" />
```

---

### ZenSaveButton

**Purpose:** Save button with checkmark icon

**Location:** `src/kits/DesignKit/ZenSaveButton.tsx`

**Props:**
```typescript
interface ZenSaveButtonProps {
  onClick?: () => void;
  size?: 'sm' | 'md';
  className?: string;
}
```

---

### ZenBackButton

**Purpose:** Back navigation button with arrow

**Location:** `src/kits/DesignKit/ZenBackButton.tsx`

---

### ZenSettingsButton

**Purpose:** Settings button with gear icon

**Location:** `src/kits/DesignKit/ZenSettingsButton.tsx`

---

### RoughBorder

**Purpose:** Hand-drawn rectangle border using Rough.js

**Location:** `src/kits/DesignKit/RoughBorder.tsx`

**Props:**
```typescript
interface RoughBorderProps {
  width: number;
  height: number;
  strokeColor?: string;
  fillColor?: string;
  roughness?: number;
  strokeWidth?: number;
}
```

---

### RoughCircle

**Purpose:** Hand-drawn circle using Rough.js

**Location:** `src/kits/DesignKit/RoughCircle.tsx`

---

### PaperBG

**Purpose:** Paper texture background

**Location:** `src/kits/DesignKit/PaperBG.tsx`

---

### ZenLogoFlip

**Purpose:** Animated logo with flip effect

**Location:** `src/kits/DesignKit/ZenLogoFlip.tsx`

---

## 🎨 Styling Utilities

### Zen Scrollbar

Custom scrollbar style used throughout the app:

```css
.zen-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.zen-scrollbar::-webkit-scrollbar-track {
  background: #2A2A2A;
  border-radius: 4px;
}

.zen-scrollbar::-webkit-scrollbar-thumb {
  background: #AC8E66;
  border-radius: 4px;
}

.zen-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #D4AF78;
}

/* Firefox */
.zen-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #AC8E66 #2A2A2A;
}
```

---

## 📐 Layout Patterns

### Centered Content Container

```tsx
<div className="flex-1 flex flex-col items-center justify-center px-6">
  <div className="flex flex-col items-center w-full max-w-4xl">
    {/* Content */}
  </div>
</div>
```

### Modal Layout

```tsx
<ZenModal isOpen={open} onClose={close}>
  <div className="flex flex-col h-full">
    {/* Header */}
    <div className="relative">
      <ZenModalHeader {...headerProps} />
    </div>

    {/* Scrollable Content */}
    <div className="flex-1 overflow-y-auto zen-scrollbar px-8 pb-8">
      {/* Content */}
    </div>

    {/* Footer */}
    <ZenModalFooter />
  </div>
</ZenModal>
```

---

## 🔧 Component Best Practices

### 1. Use Inline Styles for React Native Compatibility

```tsx
// ✅ Good
<div style={{ marginBottom: '10px' }}>

// ❌ Bad (doesn't work in React Native)
<div className="mb-2">
```

### 2. Use Rough.js for Hand-Drawn Elements

```tsx
import rough from 'roughjs/bin/rough';

const rc = rough.canvas(canvas);
rc.rectangle(0, 0, width, height, {
  stroke: '#AC8E66',
  roughness: 0.5,
  strokeWidth: 1.5
});
```

### 3. Follow Color System

Always use theme colors from the design system, never hardcode colors outside the palette.

### 4. Accessibility

- Always provide `aria-label` for icon buttons
- Use semantic HTML elements
- Ensure sufficient color contrast

---

## 🆘 Getting Help

**Component Issues:**
- [GitHub Issues](https://github.com/theoriginalbitter/zenpost-studio/issues)
- Check existing components for examples

**Design System:**
- See Tailwind config: `tailwind.config.js`
- Global styles: `src/index.css`

---

## 🎉 Contributing New Components

When adding new components:

1. Follow naming convention: `Zen[ComponentName]`
2. Add TypeScript interfaces for props
3. Use Zen color palette
4. Test with both light/dark content
5. Document in this file
6. Add usage examples

See [Contributing Guide](./contributing.md) for details.
