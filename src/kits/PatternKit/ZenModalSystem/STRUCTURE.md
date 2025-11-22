# ZenModalSystem - Folder Structure

## 📁 Directory Organization

```
ZenModalSystem/
├── components/           # Reusable UI components
│   ├── ZenModal.tsx             # Base modal wrapper
│   ├── ZenModalHeader.tsx       # Modal header with close button
│   ├── ZenModalFooter.tsx       # Modal footer with branding
│   ├── ZenFooterText.tsx        # Footer text component
│   ├── ZenDropdown.tsx          # Dropdown component
│   └── ZenRoughButton.tsx       # Button with rough.js styling
│
├── config/              # Configuration and presets
│   └── ZenModalConfig.ts        # Modal preset configurations
│
├── modals/              # Pre-built modal implementations
│   ├── ZenAISettingsModal.tsx   # AI Settings modal (example)
│   └── ZenAboutModal.tsx        # About modal (example)
│
├── docs/                # Documentation
│   ├── README.md                # Main documentation
│   ├── CONFIG.md                # Configuration guide
│   └── LINKEDIN.md              # Marketing content
│
├── utils/               # Utility functions (future)
│
├── index.ts             # Main entry point - exports all public APIs
├── package.json         # NPM package configuration
└── STRUCTURE.md         # This file
```

## 🎯 Design Principles

### 1. **Separation of Concerns**
Each directory has a single, clear responsibility:
- `components/` - Pure, reusable UI components
- `config/` - Configuration and data
- `modals/` - Complete modal implementations (examples)
- `docs/` - All documentation

### 2. **Clear Import Paths**
```typescript
// From outside the package
import { ZenModal, getModalPreset } from './ZenModalSystem';

// Within the package
import { ZenModal } from '../components/ZenModal';
import { getModalPreset } from '../config/ZenModalConfig';
```

### 3. **Scalability**
Easy to add new:
- Components → `components/`
- Presets → `config/ZenModalConfig.ts`
- Example modals → `modals/`
- Documentation → `docs/`

## 📦 What Goes Where?

### `components/`
✅ Reusable UI components
✅ Stateless functional components
✅ Components used by multiple modals
❌ Complete modal implementations
❌ Business logic

**Examples:**
- ZenModal (base wrapper)
- ZenModalHeader (header with close button)
- ZenDropdown (select component)

### `config/`
✅ Configuration objects
✅ Preset definitions
✅ Helper functions for config
❌ UI components
❌ Business logic

**Examples:**
- MODAL_PRESETS object
- getModalPreset() function
- createCustomPreset() function

### `modals/`
✅ Complete modal implementations
✅ Example use cases
✅ Pre-built modals for common scenarios
❌ Base components
❌ Reusable parts

**Examples:**
- ZenAISettingsModal (full implementation)
- ZenAboutModal (full implementation)
- ZenConfirmationDialog (future)

### `docs/`
✅ All documentation files
✅ README, guides, tutorials
✅ Marketing materials
❌ Code files
❌ Configuration

### `utils/` (future)
✅ Pure utility functions
✅ Helpers and validators
✅ Type guards
❌ Components
❌ Configuration

## 🔄 Import Flow

```
User's App
    ↓
index.ts (main entry)
    ↓
├─→ components/
├─→ config/
├─→ modals/ (optional, for examples)
└─→ utils/ (future)
```

## 🚀 Benefits of This Structure

### 1. **Easy to Navigate**
```
Need a component? → components/
Need a preset? → config/
Need an example? → modals/
Need docs? → docs/
```

### 2. **Clear Boundaries**
Each folder has a specific purpose. No ambiguity about where to put new files.

### 3. **Better Tree Shaking**
Import only what you need:
```typescript
// Only imports modal components
import { ZenModal, ZenModalHeader } from './ZenModalSystem';

// Doesn't import example modals unless explicitly needed
import { ZenAISettingsModal } from './ZenModalSystem';
```

### 4. **NPM Ready**
Structure mirrors common NPM package conventions:
- Clear entry point (`index.ts`)
- Organized source code
- Separated documentation
- Proper package.json

### 5. **Easy Testing**
```
tests/
├── components/
├── config/
└── modals/
```
Test structure mirrors source structure.

## 📖 Usage Examples

### Basic Import
```typescript
import {
  ZenModal,
  ZenModalHeader,
  ZenModalFooter,
  getModalPreset
} from './kits/PatternKit/ZenModalSystem';
```

### Custom Modal
```typescript
import {
  ZenModal,
  ZenModalHeader,
  ZenModalFooter,
  getModalPreset
} from './kits/PatternKit/ZenModalSystem';

const MyModal = ({ isOpen, onClose }) => {
  const preset = getModalPreset('my-modal');

  return (
    <ZenModal isOpen={isOpen} onClose={onClose}>
      <ZenModalHeader {...preset} onClose={onClose} />
      <div>My content</div>
      <ZenModalFooter />
    </ZenModal>
  );
};
```

### Using Pre-built Modal
```typescript
import { ZenAboutModal } from './kits/PatternKit/ZenModalSystem';

<ZenAboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
```

## 🔮 Future Additions

### Potential New Directories

```
ZenModalSystem/
├── animations/          # Animation configurations
├── themes/              # Theme presets (dark, light, etc.)
├── hooks/               # React hooks for modal state
├── providers/           # Context providers
└── tests/               # Test files
```

## 📝 File Naming Conventions

### Components
- PascalCase: `ZenModalHeader.tsx`
- Descriptive: Component name describes functionality
- Extension: `.tsx` for components, `.ts` for utils

### Config Files
- PascalCase: `ZenModalConfig.ts`
- Suffix: `Config` for configuration files

### Documentation
- UPPERCASE: `README.md`, `STRUCTURE.md`
- Descriptive: File name explains content

## 🎨 Visual Structure

```
ZenModalSystem (Package Root)
│
├─ 🎨 components/     → Building blocks
├─ ⚙️  config/        → Settings & presets
├─ 🏗️  modals/        → Complete examples
├─ 📚 docs/           → Documentation
├─ 🛠️  utils/         → Helper functions
│
└─ 📄 index.ts        → Public API
```

## ✅ Migration Checklist

When adding a new component:
- [ ] Place in correct directory (`components/`, `modals/`, etc.)
- [ ] Export from directory's index.ts (if needed)
- [ ] Export from main index.ts (if public API)
- [ ] Update documentation in `docs/`
- [ ] Add TypeScript types
- [ ] Write tests (future)

## 🔗 Related Documentation

- [README.md](./docs/README.md) - Main documentation
- [CONFIG.md](./docs/CONFIG.md) - Configuration guide
- [package.json](./package.json) - NPM package config

---

Made with ❤️ by [Denis Bitter](https://denisbitter.de)
