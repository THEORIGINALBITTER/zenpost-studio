# ZenModal Configuration Guide

Complete reference for configuring and customizing ZenModal System.

## 📋 Table of Contents

- [Modal Preset Configuration](#modal-preset-configuration)
- [Header Configuration](#header-configuration)
- [Footer Configuration](#footer-configuration)
- [Custom Presets](#custom-presets)
- [Advanced Examples](#advanced-examples)
- [Best Practices](#best-practices)

---

## Modal Preset Configuration

### Basic Structure

```typescript
interface ModalPreset {
  id: string;                    // Unique identifier
  title: string;                 // Modal title
  subtitle?: string | ReactNode; // Optional subtitle
  titleColor?: string;           // Title color (hex)
  subtitleColor?: string;        // Subtitle color (hex)
  titleSize?: string;            // Title font size (px)
  subtitleSize?: string;         // Subtitle font size (px)
  minHeight?: string;            // Minimum modal height
  maxHeight?: string;            // Maximum modal height
  minWidth?: string;             // Minimum modal width
}
```

### Default Values

| Property | Default Value | Description |
|----------|--------------|-------------|
| `titleColor` | `#AC8E66` | Zen gold color |
| `subtitleColor` | `#ccc` | Light gray |
| `titleSize` | `24px` | Default title size |
| `subtitleSize` | `13px` | Default subtitle size |
| `minHeight` | `400px` | Minimum modal height |
| `maxHeight` | `undefined` | No max height by default |
| `minWidth` | `undefined` | No min width by default |

---

## Header Configuration

### ZenModalHeader Props

```typescript
interface ZenModalHeaderProps {
  title: string;                 // Required: Modal title
  subtitle?: string | ReactNode; // Optional: Subtitle content
  onClose: () => void;          // Required: Close handler
  titleColor?: string;          // Optional: Title color
  subtitleColor?: string;       // Optional: Subtitle color
  titleSize?: string;           // Optional: Title font size
  subtitleSize?: string;        // Optional: Subtitle font size
}
```

### Usage Examples

#### Simple Header
```tsx
<ZenModalHeader
  title="Settings"
  onClose={onClose}
/>
```

#### With Subtitle
```tsx
<ZenModalHeader
  title="AI Settings"
  subtitle="Configure your AI provider for content transformation"
  onClose={onClose}
/>
```

#### With ReactNode Subtitle
```tsx
<ZenModalHeader
  title="About"
  subtitle={
    <div>
      <p>Version 1.0.0</p>
      <p>Build 2024.01</p>
    </div>
  }
  onClose={onClose}
/>
```

#### Fully Customized
```tsx
<ZenModalHeader
  title="Warning"
  subtitle="This action cannot be undone"
  titleColor="#FF6B6B"
  subtitleColor="#FFA07A"
  titleSize="28px"
  subtitleSize="14px"
  onClose={onClose}
/>
```

---

## Footer Configuration

### ZenModalFooter Props

```typescript
interface ZenModalFooterProps {
  children?: ReactNode;      // Optional: Custom footer content
  showFooterText?: boolean;  // Optional: Show "Made with ❤️"
  className?: string;        // Optional: Additional CSS classes
  style?: CSSProperties;     // Optional: Inline styles
}
```

### Usage Examples

#### Default Footer
```tsx
<ZenModalFooter />
// Shows: "Made with ❤️ by Denis Bitter"
```

#### Without Footer Text
```tsx
<ZenModalFooter showFooterText={false} />
```

#### With Custom Content
```tsx
<ZenModalFooter>
  <div className="flex justify-between">
    <button>Cancel</button>
    <button>Save</button>
  </div>
</ZenModalFooter>
```

#### Custom Styling
```tsx
<ZenModalFooter
  className="bg-gray-900"
  style={{ padding: '20px' }}
>
  Custom footer content
</ZenModalFooter>
```

---

## Custom Presets

### Method 1: Define in Config

```typescript
// ZenModalConfig.ts
export const MODAL_PRESETS: Record<string, ModalPreset> = {
  'my-custom-modal': {
    id: 'my-custom-modal',
    title: 'Custom Modal',
    subtitle: 'This is my custom modal',
    titleColor: '#FF6B6B',
    subtitleColor: '#FFA07A',
    titleSize: '32px',
    subtitleSize: '16px',
    minHeight: '600px',
    maxHeight: '800px',
    minWidth: '500px',
  },
};
```

### Method 2: Use Helper Function

```typescript
import { createCustomPreset } from './ZenModalConfig';

// Extend existing preset
const customPreset = createCustomPreset('default', {
  title: 'My Title',
  titleSize: '28px',
  titleColor: '#4A90E2',
});

// Use in component
<ZenModalHeader {...customPreset} onClose={onClose} />
```

### Method 3: Override Props Directly

```typescript
const preset = getModalPreset('default');

<ZenModalHeader
  {...preset}
  title="Override Title"
  titleSize="30px"
  onClose={onClose}
/>
```

---

## Advanced Examples

### Example 1: Confirmation Dialog

```typescript
// In ZenModalConfig.ts
'confirmation': {
  id: 'confirmation',
  title: 'Are you sure?',
  subtitle: 'This action cannot be undone',
  titleColor: '#FF6B6B',
  subtitleColor: '#FFA07A',
  titleSize: '20px',
  subtitleSize: '12px',
  minHeight: '300px',
  minWidth: '400px',
}
```

```tsx
// In component
const ConfirmationModal = ({ isOpen, onClose, onConfirm }) => {
  const preset = getModalPreset('confirmation');

  return (
    <ZenModal isOpen={isOpen} onClose={onClose}>
      <div style={{ minHeight: preset.minHeight, minWidth: preset.minWidth }}>
        <div className="p-8 pb-6 border-b border-[#FF6B6B]">
          <ZenModalHeader {...preset} onClose={onClose} />
        </div>

        <div className="p-8">
          <p>Are you sure you want to delete this item?</p>
        </div>

        <ZenModalFooter showFooterText={false}>
          <div className="flex justify-end gap-3">
            <button onClick={onClose}>Cancel</button>
            <button onClick={onConfirm}>Delete</button>
          </div>
        </ZenModalFooter>
      </div>
    </ZenModal>
  );
};
```

### Example 2: Multi-Step Wizard

```typescript
// In ZenModalConfig.ts
'wizard': {
  id: 'wizard',
  title: 'Setup Wizard',
  subtitle: 'Step 1 of 3',
  titleColor: '#AC8E66',
  subtitleColor: '#999',
  titleSize: '24px',
  subtitleSize: '12px',
  minHeight: '500px',
  minWidth: '600px',
}
```

```tsx
const WizardModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const preset = getModalPreset('wizard');

  const customPreset = {
    ...preset,
    subtitle: `Step ${step} of 3`,
  };

  return (
    <ZenModal isOpen={isOpen} onClose={onClose}>
      <div style={{ minHeight: preset.minHeight }}>
        <div className="p-8 pb-6 border-b border-[#AC8E66]">
          <ZenModalHeader {...customPreset} onClose={onClose} />
        </div>

        <div className="flex-1 p-8">
          {step === 1 && <Step1Content />}
          {step === 2 && <Step2Content />}
          {step === 3 && <Step3Content />}
        </div>

        <ZenModalFooter showFooterText={false}>
          <div className="flex justify-between">
            <button onClick={() => setStep(step - 1)} disabled={step === 1}>
              Previous
            </button>
            <button onClick={() => setStep(step + 1)} disabled={step === 3}>
              Next
            </button>
          </div>
        </ZenModalFooter>
      </div>
    </ZenModal>
  );
};
```

### Example 3: Scrollable Content with Fixed Header/Footer

```tsx
const ScrollableModal = ({ isOpen, onClose }) => {
  const preset = getModalPreset('ai-settings');

  return (
    <ZenModal isOpen={isOpen} onClose={onClose}>
      <div
        className="relative flex flex-col"
        style={{
          minHeight: preset.minHeight,
          maxHeight: preset.maxHeight,
          minWidth: preset.minWidth,
        }}
      >
        {/* Fixed Header with Shadow */}
        <div className="p-8 pb-6 border-b border-[#AC8E66] relative z-10 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]">
          <ZenModalHeader {...preset} onClose={onClose} />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 px-8 pb-8 overflow-y-auto zen-scrollbar relative">
          {/* Long content here */}
          <p>Content line 1</p>
          <p>Content line 2</p>
          {/* ... many more lines ... */}
        </div>

        {/* Fixed Footer with Shadow */}
        <ZenModalFooter />
      </div>
    </ZenModal>
  );
};
```

---

## Best Practices

### 1. **Use Presets for Consistency**
Define all common modals in the config file:
```typescript
MODAL_PRESETS: {
  'settings': { ... },
  'about': { ... },
  'help': { ... },
  'error': { ... },
  'success': { ... },
}
```

### 2. **Follow Color Conventions**
- Primary/Info: `#AC8E66` (Zen gold)
- Success: `#4CAF50` (Green)
- Warning: `#FFA726` (Orange)
- Error: `#FF6B6B` (Red)

### 3. **Typography Scale**
Use consistent font sizes:
- Large Title: `28-32px`
- Standard Title: `24px`
- Small Title: `20px`
- Large Subtitle: `14-16px`
- Standard Subtitle: `13px`
- Small Subtitle: `11-12px`

### 4. **Responsive Heights**
Set appropriate min/max heights:
- Small Modal: `300-400px`
- Medium Modal: `480-600px`
- Large Modal: `720-800px`

### 5. **Semantic Naming**
Use descriptive preset IDs:
```typescript
'user-settings'    // Good
'modal1'           // Bad

'confirmation'     // Good
'popup'            // Bad
```

### 6. **DRY Principle**
Create base presets and extend them:
```typescript
const baseErrorPreset = {
  titleColor: '#FF6B6B',
  subtitleColor: '#FFA07A',
};

'error-delete': { ...baseErrorPreset, title: 'Delete Error' },
'error-upload': { ...baseErrorPreset, title: 'Upload Error' },
```

---

## Styling Guidelines

### Golden Accent Lines
Use the Zen gold color for borders:
```tsx
<div className="border-b border-[#AC8E66]">
```

### Shadows for Depth
Add subtle shadows to fixed elements:
```tsx
<div className="shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]">
```

### Z-Index Management
- Close Button: `z-index: 99`
- Fixed Header: `z-index: 10`
- Fixed Footer: `z-index: 10`
- Scrollable Content: `z-index: auto`

### Spacing
Standard padding values:
- Modal Container: `p-8` (32px)
- Header Bottom: `pb-6` (24px)
- Content: `px-8 pb-8` (32px)
- Footer: `py-3 px-4` (12px, 16px)

---

## Troubleshooting

### Issue: Header not staying fixed
**Solution:** Ensure parent container uses `flex-col` and header has `relative z-10`

### Issue: Shadow not visible
**Solution:** Check z-index values and ensure parent has `relative` position

### Issue: Preset not found
**Solution:** Verify preset ID matches exactly (case-sensitive)

### Issue: TypeScript errors
**Solution:** Ensure all required props are provided and types match

---

## Migration Guide

### From Legacy Modal to ZenModal

**Before:**
```tsx
<div className="modal">
  <button onClick={onClose}>×</button>
  <h2 style={{ color: '#AC8E66' }}>Title</h2>
  <p style={{ color: '#ccc' }}>Subtitle</p>
  {/* content */}
  <footer>Footer</footer>
</div>
```

**After:**
```tsx
const preset = getModalPreset('my-modal');
<ZenModal isOpen={isOpen} onClose={onClose}>
  <ZenModalHeader {...preset} onClose={onClose} />
  {/* content */}
  <ZenModalFooter />
</ZenModal>
```

---

## Support

For issues, questions, or contributions:
- [GitHub](https://github.com/THEORIGINALBITTER/zenpost-studio)
- [Email](saghallo@denisbitter.de)
- [LinkedIn](https://www.linkedin.com/in/denisbitter/)

- [Youtube](https://www.youtube.com/@denisbitterfullstack)

---

Made with ❤️ by [Denis Bitter](https://denisbitter.de)
