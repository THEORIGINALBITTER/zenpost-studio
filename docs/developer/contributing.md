# Contributing Guide

**How to Contribute to ZenPost Studio**

Welcome! This guide will help you contribute to ZenPost Studio.

---

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style Guidelines](#code-style-guidelines)
- [Component Guidelines](#component-guidelines)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** installed
- **npm 9+** or **yarn 1.22+**
- **Git** configured
- Basic knowledge of **React**, **TypeScript**, and **Tailwind CSS**

### Ways to Contribute

1. **Report Bugs** - Found an issue? [Open an issue](https://github.com/theoriginalbitter/zenpost-studio/issues)
2. **Suggest Features** - Have an idea? [Start a discussion](https://github.com/theoriginalbitter/zenpost-studio/discussions)
3. **Fix Bugs** - Browse [open issues](https://github.com/theoriginalbitter/zenpost-studio/issues)
4. **Add Features** - Implement new functionality
5. **Improve Docs** - Update documentation
6. **Write Tests** - Increase test coverage

---

## 🛠️ Development Setup

### 1. Fork the Repository

Click the **Fork** button on GitHub to create your own copy.

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/zenpost-studio.git
cd zenpost-studio
```

### 3. Add Upstream Remote

```bash
git remote add upstream https://github.com/theoriginalbitter/zenpost-studio.git
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 6. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

**Branch Naming:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding tests
- `chore/` - Maintenance tasks

---

## 📐 Code Style Guidelines

### TypeScript

**Use TypeScript for all new files:**

```typescript
// ✅ Good - Explicit types
interface ButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export const ZenButton = ({ onClick, disabled = false, children }: ButtonProps) => {
  // ...
};

// ❌ Bad - No types
export const ZenButton = ({ onClick, disabled, children }) => {
  // ...
};
```

### React Patterns

**Use functional components with hooks:**

```typescript
// ✅ Good
export const MyComponent = () => {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
};

// ❌ Bad - Class components
export class MyComponent extends React.Component {
  // ...
}
```

**Props destructuring:**

```typescript
// ✅ Good - Destructure props
export const ZenButton = ({ onClick, children }: ButtonProps) => {
  return <button onClick={onClick}>{children}</button>;
};

// ❌ Bad - Use props object
export const ZenButton = (props: ButtonProps) => {
  return <button onClick={props.onClick}>{props.children}</button>;
};
```

### Styling

**Use inline styles for React Native compatibility:**

```tsx
// ✅ Good - Inline styles (works in React Native)
<div style={{ marginBottom: '10px', padding: '20px' }}>

// ❌ Bad - Tailwind utilities don't work in React Native
<div className="mb-2 p-5">
```

**Use Tailwind for web-only layouts:**

```tsx
// ✅ Acceptable for flex layouts
<div className="flex flex-col items-center justify-center">
```

**Follow Zen color palette:**

```typescript
// ✅ Good - Use design system colors
style={{ color: '#AC8E66' }}  // theme-color
style={{ color: '#e5e5e5' }}  // text-primary

// ❌ Bad - Random colors
style={{ color: '#ff0000' }}
style={{ color: 'blue' }}
```

### File Organization

**Component file structure:**

```
ZenButton/
├── ZenButton.tsx        # Component
├── index.ts             # Export
└── README.md            # Documentation (optional)
```

**Simple components:**

```
ZenButton.tsx            # Component + export
```

### Naming Conventions

**Components:**
- PascalCase
- Prefix with `Zen` for pattern components
- Descriptive names

```typescript
// ✅ Good
export const ZenMarkdownEditor = () => { };
export const ZenModalHeader = () => { };

// ❌ Bad
export const editor = () => { };
export const ModalHdr = () => { };
```

**Functions:**
- camelCase
- Verb-first naming

```typescript
// ✅ Good
function analyzeCode(code: string) { }
function loadAIConfig() { }

// ❌ Bad
function CodeAnalyze(code: string) { }
function AIConfigLoad() { }
```

**Constants:**
- UPPER_SNAKE_CASE for true constants
- camelCase for configuration objects

```typescript
// ✅ Good
const MAX_RETRIES = 3;
const API_TIMEOUT = 5000;

const modalPresets = { /* ... */ };

// ❌ Bad
const maxRetries = 3;
const MODAL_PRESETS = { /* ... */ };
```

---

## 🎨 Component Guidelines

### Creating New Components

**1. Follow the component template:**

```typescript
import React from 'react';

interface ZenMyComponentProps {
  // Required props
  value: string;
  onChange: (value: string) => void;

  // Optional props
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const ZenMyComponent = ({
  value,
  onChange,
  placeholder = 'Default placeholder',
  disabled = false,
  className = ''
}: ZenMyComponentProps) => {
  return (
    <div className={className}>
      {/* Component JSX */}
    </div>
  );
};
```

**2. Add JSDoc comments:**

```typescript
/**
 * ZenMyComponent - Brief description
 *
 * @param value - Current value
 * @param onChange - Change handler
 * @param placeholder - Placeholder text (optional)
 */
export const ZenMyComponent = ({ /* ... */ }) => {
  // ...
};
```

**3. Export from appropriate kit:**

```typescript
// For business components
// src/kits/PatternKit/ZenMyComponent.tsx

// For design primitives
// src/kits/DesignKit/ZenMyComponent.tsx
```

**4. Add to Component Library docs:**

Update `docs/developer/components.md` with:
- Component name and purpose
- Props interface
- Usage example
- Features list

### Component Best Practices

**1. Single Responsibility:**

Each component should do one thing well.

```typescript
// ✅ Good - Focused component
export const ZenButton = ({ onClick, children }) => { };

// ❌ Bad - Too many responsibilities
export const ZenButtonWithTooltipAndModal = ({ /* ... */ }) => { };
```

**2. Composition over Props:**

```typescript
// ✅ Good - Composable
<ZenModal>
  <ZenModalHeader title="Settings" />
  <ZenModalContent>{/* ... */}</ZenModalContent>
</ZenModal>

// ❌ Bad - Too many props
<ZenModal
  title="Settings"
  headerColor="#AC8E66"
  content={<div>...</div>}
/>
```

**3. Accessibility:**

```typescript
// ✅ Good - Accessible
<button
  aria-label="Close modal"
  onClick={onClose}
>
  <FontAwesomeIcon icon={faTimes} />
</button>

// ❌ Bad - No aria-label for icon button
<button onClick={onClose}>
  <FontAwesomeIcon icon={faTimes} />
</button>
```

**4. Error Boundaries:**

Handle errors gracefully:

```typescript
try {
  // Risky operation
} catch (error) {
  console.error('Error in MyComponent:', error);
  // Show user-friendly error
}
```

---

## 📝 Commit Conventions

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style (formatting, missing semicolons, etc.)
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance tasks

### Examples

```bash
# Feature
git commit -m "feat(markdown): add ZenMarkdownEditor component"

# Bug fix
git commit -m "fix(modal): correct header button positioning"

# Documentation
git commit -m "docs(api): add AI service documentation"

# Refactor
git commit -m "refactor(services): extract common AI logic"

# Multiple changes
git commit -m "feat(transform): add platform selection step

- Add Step2PlatformSelection component
- Add platform icons
- Update transform flow"
```

### Commit Best Practices

**1. Make atomic commits:**

One logical change per commit.

```bash
# ✅ Good
git commit -m "feat(button): add ZenButton component"
git commit -m "docs(button): add usage examples"

# ❌ Bad
git commit -m "add button, fix modal, update docs"
```

**2. Write descriptive messages:**

```bash
# ✅ Good
git commit -m "fix(modal): prevent body scroll when modal is open"

# ❌ Bad
git commit -m "fix bug"
```

**3. Reference issues:**

```bash
git commit -m "fix(ai): handle API timeout errors

Fixes #123"
```

---

## 🔄 Pull Request Process

### Before Submitting

**1. Update your fork:**

```bash
git fetch upstream
git rebase upstream/main
```

**2. Run linter:**

```bash
npm run lint
```

**3. Test your changes:**

```bash
npm run build
# Manually test in browser
```

**4. Update documentation:**

If you added/changed functionality, update relevant docs.

### Submitting a PR

**1. Push your branch:**

```bash
git push origin feature/your-feature-name
```

**2. Create Pull Request on GitHub:**

- Click **"New Pull Request"**
- Select your fork and branch
- Fill out the PR template

**3. PR Title Format:**

```
<type>(<scope>): <description>
```

Examples:
- `feat(markdown): add live preview toggle`
- `fix(modal): correct button alignment`
- `docs(api): add service reference`

**4. PR Description Template:**

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Other (describe)

## Changes Made
- Change 1
- Change 2
- Change 3

## Screenshots (if applicable)
[Add screenshots]

## Testing
How did you test these changes?

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Commented complex code
- [ ] Updated documentation
- [ ] No new warnings
- [ ] Tested in browser
```

### PR Review Process

**1. Automated checks:**
- Linting passes
- Build succeeds

**2. Code review:**
- Maintainer reviews code
- May request changes
- Approves when ready

**3. Merge:**
- Maintainer merges PR
- Your changes go live!

### After Merge

**1. Sync your fork:**

```bash
git checkout main
git pull upstream main
git push origin main
```

**2. Delete branch:**

```bash
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

---

## 🧪 Testing

### Manual Testing Checklist

**For all changes:**
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Responsive on mobile
- [ ] No console errors
- [ ] No TypeScript errors

**For UI components:**
- [ ] Matches design system colors
- [ ] Follows Zen aesthetic
- [ ] Accessible (keyboard navigation, ARIA labels)
- [ ] Smooth animations

**For AI features:**
- [ ] Test with OpenAI
- [ ] Test with Anthropic
- [ ] Test with Ollama (if applicable)
- [ ] Error handling works

### Writing Tests (Future)

We plan to add automated testing. When contributing tests:

**Unit Tests:**
```typescript
import { detectLanguage } from './aiService';

describe('detectLanguage', () => {
  it('detects TypeScript', () => {
    const code = 'interface Foo { bar: string }';
    expect(detectLanguage(code)).toBe('TypeScript');
  });
});
```

**Component Tests:**
```typescript
import { render, screen } from '@testing-library/react';
import { ZenButton } from './ZenButton';

describe('ZenButton', () => {
  it('renders with text', () => {
    render(<ZenButton>Click me</ZenButton>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

---

## 📚 Documentation

### Updating Documentation

**When to update docs:**
- Adding new component → Update `docs/developer/components.md`
- Changing API → Update `docs/developer/api.md`
- Fixing bug → Add to troubleshooting guide
- Adding feature → Update README and relevant docs

### Documentation Style

**Use clear, concise language:**

```markdown
✅ Good:
## ZenButton

Simple button component with Rough.js border.

❌ Bad:
## ZenButton

This is a button component that you can use in your application
and it has a rough border made with rough.js library...
```

**Include examples:**

````markdown
✅ Good:
```tsx
<ZenButton onClick={handleClick}>
  Click me
</ZenButton>
```

❌ Bad:
Use ZenButton in your code.
````

**Document props:**

```markdown
✅ Good:
**Props:**
- `onClick` - Click handler function
- `disabled` - Whether button is disabled (optional)

❌ Bad:
Props: onClick, disabled
```

---

## 🎯 Areas Looking for Contributors

### High Priority

- [ ] Add unit tests for services
- [ ] Add component tests
- [ ] Improve error handling
- [ ] Add more AI providers (Groq, Mistral)
- [ ] Mobile app version
- [ ] Offline support

### Medium Priority

- [ ] Dark/light theme toggle
- [ ] Export formats (PDF, DOCX)
- [ ] Template library
- [ ] Plugin system
- [ ] Keyboard shortcuts

### Low Priority

- [ ] Internationalization (i18n)
- [ ] Custom themes
- [ ] Analytics dashboard
- [ ] Advanced AI settings

---

## ❓ Questions?

**Need help?**
- [GitHub Discussions](https://github.com/theoriginalbitter/zenpost-studio/discussions)
- [Open an Issue](https://github.com/theoriginalbitter/zenpost-studio/issues)

**Found a bug?**
- [Report it](https://github.com/theoriginalbitter/zenpost-studio/issues/new)

---

## 🙏 Thank You!

Every contribution, no matter how small, makes ZenPost Studio better.

We appreciate your time and effort!

**Happy coding! 🚀**
