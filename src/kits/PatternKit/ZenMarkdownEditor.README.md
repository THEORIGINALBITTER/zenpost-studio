# ZenMarkdownEditor Component

A mobile-first Markdown editor with floating toolbar and slash command menu.

---

## 📝 Overview

**ZenMarkdownEditor** is a lightweight, Zen-inspired Markdown editor that provides an intuitive interface for writing and formatting Markdown content. It features two ways to format text:

1. **Floating Toolbar** (Mobile & Desktop) - Appears when text is selected
2. **Slash Command Menu** (Desktop) - Type `/` to open command menu like Notion

No permanent UI clutter - everything appears only when needed.

---

## ✨ Features

### 🎯 Mobile-First Design

- **Floating Toolbar:** Appears only on text selection, disappears when not needed
- **Touch-Optimized:** Larger tap targets (40x40px) for mobile devices
- **Smart Positioning:** Automatically positions above/below selection to stay in viewport
- **No UI Clutter:** Clean interface with maximum space for content

### ⌨️ Slash Command Menu (Desktop)

Type `/` at the beginning of a line or after a space to open the command menu:

- **Keyboard-First:** Navigate with arrow keys, select with Enter
- **Smart Filter:** Type to filter commands (e.g., `/b` shows "Bold")
- **7 Commands:** Bold, Italic, Heading, List, Code, Link, Quote
- **Visual Feedback:** Selected command highlighted in gold
- **Notion-like UX:** Familiar pattern for modern editors

**How to use:**
```
Type: /
→ Menu appears

Type: /b
→ Filters to: Bold

Press: ↓/↑
→ Navigate commands

Press: Enter
→ Execute command

Press: Esc
→ Close menu
```

### 📝 Markdown Actions

**Floating Toolbar** (6 buttons):
- **Bold** (`**text**`) - `Cmd+B`
- **Italic** (`*text*`) - `Cmd+I`
- **Heading** (`## text`)
- **List** (`- item`)
- **Code** (`` `code` `` or ` ```block``` `)
- **Link** (`[text](url)`) - `Cmd+K`

**Slash Command Menu** (7 commands):
- `/bold` - Fetter Text
- `/italic` - Kursiver Text
- `/heading` - Überschrift
- `/list` - Aufzählungsliste
- `/code` - Code-Block
- `/link` - Hyperlink
- `/quote` - Zitat

### ⌨️ Keyboard Shortcuts

Power users can use keyboard shortcuts without selecting text:

- `Cmd+B` / `Ctrl+B` - Bold
- `Cmd+I` / `Ctrl+I` - Italic
- `Cmd+K` / `Ctrl+K` - Link
- `/` - Open slash command menu (at line start or after space)

### 🎨 Zen Design

- Gold border (`#AC8E66`) on focus
- Dark theme background (`#2A2A2A`)
- Custom zen scrollbar
- Monospace font
- Smooth transitions

---

## 📦 Usage

### Basic Example

```tsx
import { useState } from 'react';
import { ZenMarkdownEditor } from '../kits/PatternKit/ZenMarkdownEditor';

export const MyComponent = () => {
  const [content, setContent] = useState('');

  return (
    <ZenMarkdownEditor
      value={content}
      onChange={setContent}
    />
  );
};
```

### With Custom Configuration

```tsx
<ZenMarkdownEditor
  value={markdownContent}
  onChange={handleContentChange}
  placeholder="Enter your Markdown content here..."
  height="500px"
  showCharCount={true}
/>
```

### Mobile-Optimized Usage

```tsx
// Editor automatically adapts to mobile:
// - Floating toolbar appears on text selection
// - Touch events properly handled
// - Viewport-aware positioning

<ZenMarkdownEditor
  value={content}
  onChange={setContent}
  height="60vh" // Use viewport units for mobile
/>
```

---

## 🎯 Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | *required* | Current editor content |
| `onChange` | `(value: string) => void` | *required* | Callback when content changes |
| `placeholder` | `string` | `'# Dein Markdown Inhalt hier einfügen...'` | Placeholder text when empty |
| `height` | `string` | `'400px'` | Height of the textarea |
| `showCharCount` | `boolean` | `true` | Show/hide character counter |

---

## 🎨 How It Works

### Floating Toolbar (Mobile & Desktop)

**Desktop Behavior:**
1. **Select Text:** User highlights text with mouse
2. **Toolbar Appears:** Floating toolbar appears above selection
3. **Click Action:** User clicks desired formatting button
4. **Text Formatted:** Selection is wrapped with Markdown syntax
5. **Toolbar Disappears:** Toolbar hides after action

**Mobile Behavior:**
1. **Long Press:** User long-presses to select text
2. **Toolbar Appears:** Floating toolbar appears below selection (if above would be off-screen)
3. **Tap Action:** User taps large touch-optimized button
4. **Text Formatted:** Selection is wrapped with Markdown syntax
5. **Toolbar Disappears:** Toolbar hides after action

**Smart Positioning:**
- **Preferred:** Above selection, centered horizontally
- **Fallback:** Below selection if above would be off-screen
- **Horizontal:** Always within viewport boundaries (8px padding)
- **Scroll:** Updates position when page scrolls

### Slash Command Menu (Desktop Only)

**Opening the Menu:**
1. **Type `/`** at line start or after space
2. **Menu Appears** at cursor position with all commands
3. **Type to Filter** - e.g., `/b` shows only "Bold"
4. **Navigate** with ↓/↑ arrow keys
5. **Execute** with Enter or click

**Closing the Menu:**
- Press `Esc` to cancel
- Press `Backspace` to delete `/` and close
- Click outside editor to close
- Execute a command (auto-closes)

**Command Execution:**
1. **Slash Removed:** The `/command` text is automatically removed
2. **Cursor Positioned:** Cursor moves to where slash was
3. **Action Applied:** Selected Markdown format is inserted
4. **Menu Closes:** Command menu disappears

**Example Flow:**
```
1. User types: /bo
2. Menu shows: "Bold" (filtered)
3. User presses: Enter
4. Result: /bo is removed, **fetter Text** appears, cursor inside
```

---

## 🎯 Floating Toolbar Actions

### Bold
**Icon:** **B**
**Action:** Wraps selected text or inserts placeholder
**Shortcut:** `Cmd+B` / `Ctrl+B`

```markdown
Selected: "hello"  →  **hello**
No selection     →  **fetter Text**
```

### Italic
**Icon:** *I*
**Action:** Wraps selected text or inserts placeholder
**Shortcut:** `Cmd+I` / `Ctrl+I`

```markdown
Selected: "hello"  →  *hello*
No selection     →  *kursiver Text*
```

### Heading
**Icon:** H
**Action:** Adds `## ` at start of current line (toggles on/off)

```markdown
"Hello World"  →  "## Hello World"
"## Hello"     →  "Hello"
```

### List
**Icon:** •
**Action:** Adds `- ` at start of current line (toggles on/off)

```markdown
"Item"     →  "- Item"
"- Item"   →  "Item"
```

### Code
**Icon:** `<>`
**Action:** Inline code for single line, code block for multi-line

```markdown
Single line:  "code"     →  `code`
Multi-line:   "line1\nline2"  →  ```\nline1\nline2\n```
```

### Link
**Icon:** 🔗
**Action:** Wraps selected text in link syntax
**Shortcut:** `Cmd+K` / `Ctrl+K`

```markdown
Selected: "Click here"  →  [Click here](url)
No selection           →  [Link-Text](url)
```

---

## 🧩 Integration Examples

### With File Upload

```tsx
import { useState } from 'react';
import { ZenMarkdownEditor } from '../kits/PatternKit/ZenMarkdownEditor';
import { ZenRoughButton } from '../kits/PatternKit/ZenRoughButton';

export const EditorWithUpload = () => {
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setContent(text);
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-4">
      <input
        type="file"
        accept=".md,.markdown,.txt"
        onChange={handleFileUpload}
        id="file-upload"
        className="hidden"
      />

      <ZenRoughButton
        label={fileName || 'Datei hochladen'}
        onClick={() => document.getElementById('file-upload')?.click()}
      />

      <ZenMarkdownEditor
        value={content}
        onChange={setContent}
      />
    </div>
  );
};
```

### With Validation

```tsx
export const ValidatedEditor = () => {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleChange = (newContent: string) => {
    setContent(newContent);

    // Validate
    if (newContent.length < 10) {
      setError('Content must be at least 10 characters');
    } else if (newContent.length > 5000) {
      setError('Content must be less than 5000 characters');
    } else {
      setError(null);
    }
  };

  return (
    <div>
      <ZenMarkdownEditor
        value={content}
        onChange={handleChange}
      />

      {error && (
        <p className="text-[#E89B5A] font-mono text-sm mt-2">
          {error}
        </p>
      )}
    </div>
  );
};
```

### Responsive Heights

```tsx
// Desktop: Fixed height
<ZenMarkdownEditor
  value={content}
  onChange={setContent}
  height="600px"
/>

// Mobile: Viewport-relative
<ZenMarkdownEditor
  value={content}
  onChange={setContent}
  height="70vh"
/>

// Responsive with media queries
<div className="editor-container">
  <ZenMarkdownEditor
    value={content}
    onChange={setContent}
    height="400px" // Override in CSS for responsive
  />
</div>

// CSS:
// @media (max-width: 768px) {
//   .editor-container textarea {
//     height: 60vh !important;
//   }
// }
```

---

## 🎨 Styling

### Colors

The editor uses Zen Design System colors:

- **Focus Border:** `#AC8E66` (gold)
- **Default Border:** `#3a3a3a` (dark gray)
- **Background:** `#2A2A2A` (dark)
- **Text:** `#e5e5e5` (light gray)
- **Toolbar Background:** `#2A2A2A` (dark)
- **Toolbar Border:** `#AC8E66` (gold)
- **Button Icons:** `#888` (gray)
- **Button Icons Hover:** `#AC8E66` (gold)

### Custom Height

```tsx
<ZenMarkdownEditor
  value={content}
  onChange={setContent}
  height="800px" // Custom height
/>
```

### Hide Character Count

```tsx
<ZenMarkdownEditor
  value={content}
  onChange={setContent}
  showCharCount={false}
/>
```

---

## 📱 Mobile Optimization

### Touch Events

- Listens to `touchend` events for mobile selection
- Uses `touch-manipulation` CSS for better touch response
- Larger button size (40x40px) for easy tapping

### Viewport Awareness

- Automatically detects viewport boundaries
- Positions toolbar to always stay visible
- Adjusts on scroll and window resize

### Performance

- Event listeners properly cleaned up
- Debounced position calculations
- Minimal re-renders with React refs

---

## 🔧 Implementation Details

### Selection Detection

The editor detects text selection through multiple events:

```typescript
textarea.addEventListener('mouseup', handleSelectionChange);    // Desktop
textarea.addEventListener('keyup', handleSelectionChange);      // Keyboard selection
textarea.addEventListener('touchend', handleSelectionChange);   // Mobile
```

### Position Calculation

Toolbar position is calculated based on:

1. Selection bounding rectangle (`range.getBoundingClientRect()`)
2. Toolbar dimensions (`toolbar.offsetWidth`, `toolbar.offsetHeight`)
3. Viewport dimensions (`window.innerWidth`)
4. Scroll position

### Preventing Selection Loss

When clicking toolbar buttons:

```typescript
onMouseDown={(e) => {
  e.preventDefault(); // Prevents losing text selection
}}
```

---

## 🐛 Troubleshooting

### Issue: Toolbar appears in wrong position

**Solution:** This is automatically handled with smart positioning. The toolbar:
- Positions above selection by default
- Moves below if above would be off-screen
- Stays within horizontal viewport bounds

### Issue: Toolbar disappears when trying to click it

**Solution:** This shouldn't happen - the component uses `preventDefault()` on toolbar's `onMouseDown`. If it does, check for conflicting event handlers.

### Issue: Selection detection not working on mobile

**Solution:** Ensure touch events aren't being blocked by parent elements. Check for `touch-action: none` in CSS.

### Issue: Toolbar stays visible after formatting

**Solution:** This is intentional - toolbar hides with 200ms delay to allow multiple actions. It disappears when clicking outside or typing.

---

## 🌟 Best Practices

### 1. Controlled Component

Always use as controlled component:

```tsx
const [content, setContent] = useState('');

<ZenMarkdownEditor
  value={content}
  onChange={setContent}
/>
```

### 2. Responsive Heights

Use viewport units for better mobile experience:

```tsx
// Good for mobile
<ZenMarkdownEditor height="70vh" />

// Better: Responsive breakpoints
<ZenMarkdownEditor height={isMobile ? '60vh' : '500px'} />
```

### 3. Don't Override z-index

The floating toolbar uses `z-index: 50` to stay above content. Avoid using higher z-index values in parent containers.

### 4. Character Limits

Validate content length to prevent performance issues:

```tsx
const handleChange = (newContent: string) => {
  if (newContent.length <= 10000) {
    setContent(newContent);
  }
};
```

---

## 🆚 Comparison: Floating vs. Fixed Toolbar

### Fixed Toolbar (Old Approach)

❌ Takes permanent vertical space
❌ Clutters UI on mobile
❌ Reduced content visibility
✅ Always accessible

### Floating Toolbar (Current Approach)

✅ No permanent UI overhead
✅ Mobile-first and clean
✅ Maximum content space
✅ Context-aware (appears on selection)
✅ Intuitive UX (like Medium, Notion)
⚠️ Requires text selection first

---

## 🔮 Future Enhancements

Potential future features:

- **Live Preview:** Split-pane Markdown preview
- **Syntax Highlighting:** Color-coded Markdown syntax in textarea
- **Drag & Drop:** File upload via drag & drop
- **Custom Toolbar:** Allow passing custom button configurations
- **Toolbar Themes:** Light/dark toolbar variants
- **More Actions:** Table, image, horizontal rule buttons

---

## 📚 Related Components

- **[ZenModal](./ZenModal.README.md)** - Modal container
- **[ZenRoughButton](./ZenRoughButton.README.md)** - Action buttons
- **[ZenDropdown](./ZenDropdown.README.md)** - Dropdown selections
- **[ZenAISettingsModal](./ZenAISettingsModal.README.md)** - AI configuration

---

## 🤝 Contributing

To improve or extend the editor:

1. Modify `toolbarButtons` array to add/remove buttons
2. Create action functions for new Markdown syntax
3. Add keyboard shortcuts in `handleKeyDown`
4. Update this README with changes

---

**Where simplicity meets functionality** ✨

**Mobile-first design for the modern web** 📱

[← Back to PatternKit](./README.md)
