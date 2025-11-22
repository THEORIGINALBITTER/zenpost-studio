# Migration Guide - ZenModalSystem Reorganization

## 🔄 What Changed?

The ZenModal system has been reorganized into a professional, scalable folder structure.

### Before
```
PatternKit/
├── ZenModal.tsx
├── ZenModalHeader.tsx
├── ZenModalFooter.tsx
├── ZenModalConfig.ts
├── ZenAISettingsModal.tsx
├── ZenAboutModal.tsx
└── ... (all mixed together)
```

### After
```
PatternKit/
└── ZenModalSystem/
    ├── components/
    ├── config/
    ├── modals/
    └── docs/
```

## ✅ Import Changes

### Old Imports (DEPRECATED)
```typescript
// ❌ Old - Will not work
import { ZenModal } from '../kits/PatternKit/ZenModal';
import { ZenModalHeader } from '../kits/PatternKit/ZenModalHeader';
import { ZenAISettingsModal } from '../kits/PatternKit/ZenAISettingsModal';
import { getModalPreset } from '../kits/PatternKit/ZenModalConfig';
```

### New Imports (CURRENT)
```typescript
// ✅ New - Recommended
import {
  ZenModal,
  ZenModalHeader,
  ZenModalFooter,
  ZenAISettingsModal,
  getModalPreset
} from '../kits/PatternKit/ZenModalSystem';

// Or via PatternKit re-export (also works)
import {
  ZenModal,
  ZenModalHeader,
  getModalPreset
} from '../kits/PatternKit';
```

## 🔍 Find & Replace Guide

If you have existing code using the old imports, use these find/replace patterns:

### Pattern 1: Individual Imports
**Find:**
```
from '../kits/PatternKit/ZenModal'
```
**Replace with:**
```
from '../kits/PatternKit/ZenModalSystem'
```

### Pattern 2: Modal Components
**Find:**
```
from '../kits/PatternKit/ZenModalHeader'
```
**Replace with:**
```
from '../kits/PatternKit/ZenModalSystem'
```

### Pattern 3: Configuration
**Find:**
```
from '../kits/PatternKit/ZenModalConfig'
```
**Replace with:**
```
from '../kits/PatternKit/ZenModalSystem'
```

### Pattern 4: Pre-built Modals
**Find:**
```
from '../kits/PatternKit/ZenAISettingsModal'
```
**Replace with:**
```
from '../kits/PatternKit/ZenModalSystem'
```

## 📝 Step-by-Step Migration

### 1. Update Screen Imports

**File:** `src/screens/ContentTransformScreen.tsx`

Before:
```typescript
import { ZenAISettingsModal } from '../kits/PatternKit/ZenAISettingsModal';
import { ZenFooterText } from '../kits/PatternKit/ZenFooterText';
```

After:
```typescript
import { ZenAISettingsModal, ZenFooterText } from '../kits/PatternKit/ZenModalSystem';
```

### 2. Update Component Imports

**File:** `src/screens/ConverterScreen.tsx`

Before:
```typescript
import { ZenAISettingsModal } from '../kits/PatternKit/ZenAISettingsModal';
import { ZenFooterText } from '../kits/PatternKit/ZenFooterText';
```

After:
```typescript
import { ZenAISettingsModal, ZenFooterText } from '../kits/PatternKit/ZenModalSystem';
```

### 3. No Code Changes Required!

The good news: **No changes to your component code are needed**. Only imports change!

```typescript
// This code stays exactly the same
const MyComponent = () => {
  const preset = getModalPreset('settings');

  return (
    <ZenModal isOpen={isOpen} onClose={onClose}>
      <ZenModalHeader {...preset} onClose={onClose} />
      {/* content */}
      <ZenModalFooter />
    </ZenModal>
  );
};
```

## 🧪 Testing Your Migration

### 1. Check TypeScript Errors
```bash
npm run typecheck
```

Look for errors like:
- `Module './ZenModal' not found`
- `Module './ZenModalHeader' not found`

These indicate imports that need updating.

### 2. Run Development Server
```bash
npm run dev
```

If the app starts without errors, migration is complete!

### 3. Test Modal Functionality
- Open AI Settings modal
- Open About modal
- Verify close buttons work
- Check styling is intact

## 🆘 Troubleshooting

### Error: "Module not found: './ZenModal'"

**Problem:** Old import path still being used

**Solution:**
```typescript
// Change from:
import { ZenModal } from './ZenModal';

// To:
import { ZenModal } from './ZenModalSystem';
// or
import { ZenModal } from '../kits/PatternKit/ZenModalSystem';
```

### Error: "Module not found: './ZenModalConfig'"

**Problem:** Config import using old path

**Solution:**
```typescript
// Change from:
import { getModalPreset } from './ZenModalConfig';

// To:
import { getModalPreset } from './ZenModalSystem';
```

### IDE Shows Errors But Code Compiles

**Problem:** IDE cache out of date

**Solution:**
1. Restart your IDE/VSCode
2. Run `npm run typecheck`
3. Delete `.next` or `dist` folders
4. Restart dev server

### Import Autocomplete Not Working

**Problem:** IDE hasn't indexed new structure

**Solution:**
1. Restart TypeScript server (VSCode: Cmd+Shift+P → "Restart TS Server")
2. Close and reopen files
3. Restart IDE

## 📦 Benefits of New Structure

### 1. Clear Organization
```
components/  → UI components only
config/      → Configuration only
modals/      → Example implementations
docs/        → Documentation
```

### 2. Better Imports
```typescript
// Single import for everything you need
import {
  ZenModal,
  ZenModalHeader,
  getModalPreset
} from './ZenModalSystem';
```

### 3. Tree Shaking
Only import what you use:
```typescript
// Example modals are NOT included unless explicitly imported
import { ZenModal } from './ZenModalSystem'; // ✅ Small bundle
import { ZenAISettingsModal } from './ZenModalSystem'; // ✅ Only when needed
```

### 4. NPM Ready
The `ZenModalSystem` folder can now be published as standalone package!

## ✅ Migration Checklist

- [ ] Update all screen imports
- [ ] Update all component imports
- [ ] Run `npm run typecheck`
- [ ] Test dev server starts
- [ ] Test AI Settings modal opens
- [ ] Test About modal opens
- [ ] Test close buttons work
- [ ] Verify no TypeScript errors
- [ ] Verify no runtime errors
- [ ] Update any custom modals you created
- [ ] Clear IDE cache if needed

## 🔗 Additional Resources

- [STRUCTURE.md](./STRUCTURE.md) - Detailed folder structure
- [README.md](./docs/README.md) - Usage documentation
- [CONFIG.md](./docs/CONFIG.md) - Configuration reference

## 📞 Need Help?

If you encounter issues:
1. Check this migration guide
2. Check [STRUCTURE.md](./STRUCTURE.md) for folder layout
3. Check GitHub issues
4. Contact: contact@denisbitter.de

---

Made with ❤️ by [Denis Bitter](https://denisbitter.de)
