# ZenModal System

> A powerful, configuration-driven modal system for React with TypeScript support

[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8.svg)](https://tailwindcss.com/)

## 🎯 Why ZenModal?

Traditional modal implementations lead to:
- ❌ Duplicated header/footer code across modals
- ❌ Inconsistent styling and spacing
- ❌ Scattered configuration across components
- ❌ Difficult maintenance when design changes
- ❌ Poor scalability for large applications

**ZenModal solves this with:**
- ✅ **Centralized Configuration** - Define all modal presets in one place
- ✅ **Reusable Components** - Header, Footer, and Modal templates
- ✅ **Type-Safe** - Full TypeScript support with autocomplete
- ✅ **Consistent Design** - Golden shadows, borders, and Zen aesthetics
- ✅ **Flexible** - Easy to customize and extend
- ✅ **DRY Principle** - Write once, use everywhere

## 📦 Installation

```bash
npm install @zenpost/modal-system
# or
yarn add @zenpost/modal-system
# or
pnpm add @zenpost/modal-system
```

## 🚀 Quick Start

### 1. Define Your Modal Presets

```typescript
// ZenModalConfig.ts
export const MODAL_PRESETS = {
  'my-modal': {
    id: 'my-modal',
    title: 'My Awesome Modal',
    subtitle: 'This is a subtitle',
    titleColor: '#AC8E66',
    titleSize: '24px',
    subtitleSize: '13px',
    minHeight: '480px',
  }
};
```

### 2. Use the Modal

```tsx
import { ZenModal, ZenModalHeader, ZenModalFooter, getModalPreset } from '@zenpost/modal-system';

const MyModal = ({ isOpen, onClose }) => {
  const preset = getModalPreset('my-modal');

  return (
    <ZenModal isOpen={isOpen} onClose={onClose}>
      <div className="relative flex flex-col" style={{ minHeight: preset.minHeight }}>
        {/* Fixed Header */}
        <div className="p-8 pb-6 border-b border-[#AC8E66]">
          <ZenModalHeader {...preset} onClose={onClose} />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          <p>Your modal content here...</p>
        </div>

        {/* Footer */}
        <ZenModalFooter />
      </div>
    </ZenModal>
  );
};
```

## 🎨 Features

### 1. **Centralized Configuration**
All modal styling and content in one config file:
```typescript
MODAL_PRESETS: {
  'settings': { title: 'Settings', titleSize: '24px', ... },
  'about': { title: 'About', titleSize: '28px', ... },
  'help': { title: 'Help', titleSize: '20px', ... }
}
```

### 2. **Type-Safe Props**
Full TypeScript support with IntelliSense:
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

### 3. **Fixed Header/Footer with Scrollable Content**
- Header stays fixed at the top while scrolling
- Footer stays fixed at the bottom
- Golden accent lines with shadows for depth
- Smooth scrolling with custom zen-scrollbar

### 4. **Flexible Customization**
Override any preset property on-the-fly:
```typescript
const customPreset = createCustomPreset('default', {
  title: 'Custom Title',
  titleSize: '32px',
  titleColor: '#FF6B6B'
});
```

## 📖 Components

### `ZenModal`
Base modal wrapper with overlay and animations.

### `ZenModalHeader`
Configurable header with:
- Title and subtitle support
- Integrated close button
- Customizable colors and sizes

### `ZenModalFooter`
Consistent footer with:
- Golden accent line
- Optional footer text ("Made with ❤️")
- Custom children support

### `ZenModalConfig`
Configuration utilities:
- `getModalPreset(id)` - Retrieve a preset
- `createCustomPreset(baseId, overrides)` - Create custom preset
- `MODAL_PRESETS` - All preset definitions

## 🎭 Design Philosophy

The ZenModal system follows these principles:

1. **Separation of Concerns**
   - Configuration separate from implementation
   - Reusable components for common patterns

2. **Visual Hierarchy**
   - Fixed headers with golden accent lines
   - Subtle shadows for depth perception
   - Consistent spacing and typography

3. **Developer Experience**
   - Minimal boilerplate code
   - IntelliSense support
   - Easy to extend and customize

4. **Consistency**
   - Unified design language
   - Predictable behavior
   - Standardized animations

## 🔧 Configuration Guide

See [CONFIG.md](./CONFIG.md) for detailed configuration options.

## 📊 Real-World Example

**Before ZenModal:**
```tsx
// Settings Modal - 150 lines
<Modal>
  <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
    <CloseButton />
  </div>
  <h2 style={{ color: '#AC8E66', fontSize: '24px' }}>Settings</h2>
  <p style={{ color: '#ccc', fontSize: '13px' }}>Configure your app</p>
  {/* Content */}
  <div style={{ borderTop: '1px solid #AC8E66', padding: '10px' }}>
    <FooterText />
  </div>
</Modal>

// About Modal - 145 lines (duplicated code!)
<Modal>
  <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
    <CloseButton />
  </div>
  <h2 style={{ color: '#AC8E66', fontSize: '24px' }}>About</h2>
  {/* Same structure repeated... */}
</Modal>
```

**After ZenModal:**
```tsx
// Settings Modal - 20 lines
const preset = getModalPreset('settings');
<ZenModal isOpen={isOpen} onClose={onClose}>
  <ZenModalHeader {...preset} onClose={onClose} />
  {/* Content */}
  <ZenModalFooter />
</ZenModal>

// About Modal - 20 lines
const preset = getModalPreset('about');
<ZenModal isOpen={isOpen} onClose={onClose}>
  <ZenModalHeader {...preset} onClose={onClose} />
  {/* Content */}
  <ZenModalFooter />
</ZenModal>
```

**Result:** 80% less code, 100% consistency

## 🤝 Contributing

Contributions are welcome! Please see our contributing guidelines.

## 📄 License

MIT © Denis Bitter

## 🔗 Links

- [Documentation](./CONFIG.md)
- [LinkedIn Article](./LINKEDIN.md)
- [GitHub Repository](https://github.com/THEORIGINALBITTER/zenpost-studio)

---

Made with ❤️ by [Denis Bitter](https://denisbitter.de)
