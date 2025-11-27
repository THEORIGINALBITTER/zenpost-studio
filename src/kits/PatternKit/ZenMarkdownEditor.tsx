import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBold,
  faItalic,
  faStrikethrough,
  faHeading,
  faListUl,
  faListOl,
  faLink,
  faCode,
  faQuoteRight,
} from '@fortawesome/free-solid-svg-icons';
import { ZenMarkdownPreview } from './ZenMarkdownPreview';
import { ZenPlusMenu, type ZenPlusMenuItem } from './ZenPlusMenu';

interface ZenMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  showCharCount?: boolean;
  showPreview?: boolean;
}

interface ToolbarButton {
  icon: any;
  label: string;
  action: () => void;
  shortcut?: string;
}

interface CommandMenuItem {
  command: string;
  label: string;
  description: string;
  icon: any;
  action: () => void;
}

interface FloatingToolbarPosition {
  top: number;
  left: number;
}

export const ZenMarkdownEditor = ({
  value,
  onChange,
  placeholder = '# Dein Markdown Inhalt hier einfügen...',
  height = '400px',
  showCharCount = true,
  showPreview = false,
  onPreviewToggle,
}: ZenMarkdownEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const commandMenuRef = useRef<HTMLDivElement>(null);

  const [isFocused, setIsFocused] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<FloatingToolbarPosition>({
    top: 0,
    left: 0,
  });

  // Slash Command Menu State
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [commandMenuPosition, setCommandMenuPosition] = useState<FloatingToolbarPosition>({
    top: 0,
    left: 0,
  });
  const [commandFilter, setCommandFilter] = useState('');
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [slashCommandStart, setSlashCommandStart] = useState(-1);

  // Helper: Get current selection or cursor position
  const getSelectionInfo = () => {
    const textarea = textareaRef.current;
    if (!textarea) return null;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);

    return { start, end, selectedText, beforeText, afterText };
  };

  // Helper: Calculate cursor position in pixels
  const getCursorPosition = () => {
    const textarea = textareaRef.current;
    if (!textarea) return { top: 0, left: 0 };

    const textareaRect = textarea.getBoundingClientRect();

    // Rough estimation based on line height and character position
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lines = textBeforeCursor.split('\n');
    const currentLineIndex = lines.length - 1;
    const currentLineText = lines[currentLineIndex];

    // Estimate position
    const lineHeight = 20; // Approximate line height in pixels
    const charWidth = 8; // Approximate character width in monospace

    const top = textareaRect.top + (currentLineIndex * lineHeight) + 30;
    const left = textareaRect.left + (currentLineText.length * charWidth) + 12;

    return { top, left };
  };

  // Helper: Calculate floating toolbar position
  const calculateToolbarPosition = () => {
    const textarea = textareaRef.current;
    const toolbar = toolbarRef.current;
    if (!textarea || !toolbar) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    try {
      const range = selection.getRangeAt(0);
      const rangeRect = range.getBoundingClientRect();

      const toolbarWidth = toolbar.offsetWidth;
      const toolbarHeight = toolbar.offsetHeight;

      let top = rangeRect.top - toolbarHeight - 8;
      let left = rangeRect.left + (rangeRect.width / 2) - (toolbarWidth / 2);

      if (top < 0) {
        top = rangeRect.bottom + 8;
      }

      const viewportWidth = window.innerWidth;
      if (left < 8) {
        left = 8;
      } else if (left + toolbarWidth > viewportWidth - 8) {
        left = viewportWidth - toolbarWidth - 8;
      }

      setToolbarPosition({ top, left });
    } catch (error) {
      const textareaRect = textarea.getBoundingClientRect();
      setToolbarPosition({
        top: textareaRect.top + 50,
        left: textareaRect.left + (textareaRect.width / 2) - 150,
      });
    }
  };

  // Handle text selection for floating toolbar
  const handleSelectionChange = () => {
    const info = getSelectionInfo();
    if (!info) return;

    const hasSelection = info.selectedText.length > 0;

    if (hasSelection && !showCommandMenu) {
      setShowToolbar(true);
      setTimeout(calculateToolbarPosition, 0);
    } else if (!hasSelection) {
      setShowToolbar(false);
    }
  };

  // Listen for selection changes
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleMouseUp = () => {
      setTimeout(handleSelectionChange, 10);
    };

    const handleKeyUp = () => {
      setTimeout(handleSelectionChange, 10);
    };

    textarea.addEventListener('mouseup', handleMouseUp);
    textarea.addEventListener('keyup', handleKeyUp);
    textarea.addEventListener('touchend', handleMouseUp);

    return () => {
      textarea.removeEventListener('mouseup', handleMouseUp);
      textarea.removeEventListener('keyup', handleKeyUp);
      textarea.removeEventListener('touchend', handleMouseUp);
    };
  }, [value, showCommandMenu]);

  // Hide toolbar on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (showToolbar) {
        calculateToolbarPosition();
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [showToolbar]);

  // Helper: Insert text at cursor or wrap selection
  const insertText = (
    before: string,
    after: string = '',
    placeholderText: string = ''
  ) => {
    const info = getSelectionInfo();
    if (!info) return;

    const { start, end, selectedText, beforeText, afterText } = info;
    const textToWrap = selectedText || placeholderText;
    const newText = beforeText + before + textToWrap + after + afterText;

    onChange(newText);

    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = start + before.length + textToWrap.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);

    setShowToolbar(false);
  };

  // Insert text at start of line(s)
  const insertAtLineStart = (prefix: string) => {
    const info = getSelectionInfo();
    if (!info) return;

    const { start, end, beforeText, afterText } = info;

    const lineStart = beforeText.lastIndexOf('\n') + 1;
    const lineEnd = value.indexOf('\n', end);
    const currentLine = value.substring(
      lineStart,
      lineEnd === -1 ? value.length : lineEnd
    );

    if (currentLine.startsWith(prefix)) {
      const newLine = currentLine.substring(prefix.length);
      const newText =
        value.substring(0, lineStart) +
        newLine +
        value.substring(lineEnd === -1 ? value.length : lineEnd);
      onChange(newText);
    } else {
      const newText =
        value.substring(0, lineStart) +
        prefix +
        currentLine +
        value.substring(lineEnd === -1 ? value.length : lineEnd);
      onChange(newText);
    }

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
    setShowToolbar(false);
  };

  // Markdown Actions
  const makeBold = () => insertText('**', '**', 'fetter Text');
  const makeItalic = () => insertText('*', '*', 'kursiver Text');
  const makeStrikethrough = () => insertText('~~', '~~', 'durchgestrichen');
  const makeHeading = () => insertAtLineStart('## ');
  const makeUnorderedList = () => insertAtLineStart('- ');
  const makeOrderedList = () => insertAtLineStart('1. ');
  const makeLink = () => insertText('[', '](url)', 'Link-Text');
  const makeCode = () => {
    const info = getSelectionInfo();
    if (!info) return;

    if (info.selectedText.includes('\n')) {
      insertText('```\n', '\n```', 'code');
    } else {
      insertText('`', '`', 'code');
    }
  };
  const makeQuote = () => insertAtLineStart('> ');

  // Detect if Mac or Windows/Linux for keyboard shortcuts
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  // Command Menu Items
  const commandMenuItems: CommandMenuItem[] = [
    { command: 'bold', label: 'Bold', description: 'Fetter Text', icon: faBold, action: makeBold },
    { command: 'italic', label: 'Italic', description: 'Kursiver Text', icon: faItalic, action: makeItalic },
    { command: 'heading', label: 'Heading', description: 'Überschrift', icon: faHeading, action: makeHeading },
    { command: 'list', label: 'List', description: 'Aufzählungsliste', icon: faListUl, action: makeUnorderedList },
    { command: 'code', label: 'Code', description: 'Code-Block', icon: faCode, action: makeCode },
    { command: 'link', label: 'Link', description: 'Hyperlink', icon: faLink, action: makeLink },
    { command: 'quote', label: 'Quote', description: 'Zitat', icon: faQuoteRight, action: makeQuote },
  ];

  // Plus Menu Items (similar to command menu but different format)
  const plusMenuItems: ZenPlusMenuItem[] = [
    { id: 'bold', label: 'Bold', icon: faBold, description: 'Fetter Text', action: makeBold, shortcut: `${modKey}+B` },
    { id: 'italic', label: 'Italic', icon: faItalic, description: 'Kursiver Text', action: makeItalic, shortcut: `${modKey}+I` },
    { id: 'strikethrough', label: 'Strikethrough', icon: faStrikethrough, description: 'Durchgestrichen', action: makeStrikethrough },
    { id: 'heading', label: 'Heading', icon: faHeading, description: 'Überschrift', action: makeHeading },
    { id: 'ul-list', label: 'Unordered List', icon: faListUl, description: 'Aufzählungsliste', action: makeUnorderedList },
    { id: 'ol-list', label: 'Ordered List', icon: faListOl, description: 'Nummerierte Liste', action: makeOrderedList },
    { id: 'link', label: 'Link', icon: faLink, description: 'Hyperlink', action: makeLink, shortcut: `${modKey}+K` },
    { id: 'code', label: 'Code', icon: faCode, description: 'Code-Block', action: makeCode },
    { id: 'quote', label: 'Quote', icon: faQuoteRight, description: 'Zitat', action: makeQuote },
  ];

  // Filter commands based on user input
  const filteredCommands = commandMenuItems.filter(
    (item) =>
      item.command.toLowerCase().includes(commandFilter.toLowerCase()) ||
      item.label.toLowerCase().includes(commandFilter.toLowerCase())
  );

  // Execute selected command
  const executeCommand = (command: CommandMenuItem) => {
    // Remove slash command text
    if (slashCommandStart >= 0) {
      const beforeSlash = value.substring(0, slashCommandStart);
      const afterCommand = value.substring(textareaRef.current?.selectionStart || slashCommandStart);
      onChange(beforeSlash + afterCommand);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(slashCommandStart, slashCommandStart);
          textareaRef.current.focus();
          command.action();
        }
      }, 0);
    }

    setShowCommandMenu(false);
    setCommandFilter('');
    setSlashCommandStart(-1);
    setSelectedCommandIndex(0);
  };

  // Keyboard shortcuts and command menu handling
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Command menu navigation
    if (showCommandMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedCommandIndex]) {
          executeCommand(filteredCommands[selectedCommandIndex]);
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setShowCommandMenu(false);
        setCommandFilter('');
        setSlashCommandStart(-1);
        return;
      }
    }

    // Detect slash command
    if (e.key === '/' && !showCommandMenu) {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const textBefore = value.substring(0, cursorPos);

      // Only trigger if at start of line or after whitespace
      if (textBefore.length === 0 || textBefore.endsWith('\n') || textBefore.endsWith(' ')) {
        setSlashCommandStart(cursorPos);
        setShowCommandMenu(true);
        setCommandFilter('');
        setSelectedCommandIndex(0);

        const pos = getCursorPosition();
        setCommandMenuPosition(pos);
      }
      return;
    }

    // Regular keyboard shortcuts
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    if (modifier && !showCommandMenu) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          makeBold();
          break;
        case 'i':
          e.preventDefault();
          makeItalic();
          break;
        case 'k':
          e.preventDefault();
          makeLink();
          break;
      }
    }
  };

  // Handle input for command filtering
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (showCommandMenu && slashCommandStart >= 0) {
      const cursorPos = e.target.selectionStart;
      const commandText = newValue.substring(slashCommandStart + 1, cursorPos);

      // Check if user deleted the slash or moved away
      if (cursorPos < slashCommandStart || !newValue[slashCommandStart]?.startsWith('/')) {
        setShowCommandMenu(false);
        setCommandFilter('');
        setSlashCommandStart(-1);
        return;
      }

      setCommandFilter(commandText);
      setSelectedCommandIndex(0);
    }
  };

  // Toolbar buttons configuration
  const toolbarButtons: ToolbarButton[] = [
    { icon: faBold, label: 'Bold', action: makeBold, shortcut: `${modKey}+B` },
    { icon: faItalic, label: 'Italic', action: makeItalic, shortcut: `${modKey}+I` },
    { icon: faHeading, label: 'Heading', action: makeHeading },
    { icon: faListUl, label: 'List', action: makeUnorderedList },
    { icon: faCode, label: 'Code', action: makeCode },
    { icon: faLink, label: 'Link', action: makeLink, shortcut: `${modKey}+K` },
  ];

  return (
    <div className="w-full relative">
      {/* Desktop Split-View or Mobile Toggle */}
      <div className={`flex gap-4 ${showPreview ? 'md:flex-row flex-col' : ''}`}>
        {/* Editor Section */}
        <div className={`${showPreview ? 'md:w-1/2 w-full' : 'w-full'} ${showPreview ? 'md:block hidden' : 'block'}`}>
          {/* Floating Toolbar - Appears on text selection */}
          {showToolbar && !showCommandMenu && (
        <div
          ref={toolbarRef}
          className="fixed z-50 flex items-center gap-1 p-1 bg-[#2A2A2A] border border-[#AC8E66] rounded-lg shadow-lg"
          style={{
            top: `${toolbarPosition.top}px`,
            left: `${toolbarPosition.left}px`,
          }}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
        >
          {toolbarButtons.map((button, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.preventDefault();
                button.action();
              }}
              title={`${button.label}${button.shortcut ? ` (${button.shortcut})` : ''}`}
              className="p-2 w-10 h-10 flex items-center justify-center
                text-[#888] hover:text-[#AC8E66] hover:bg-[#3a3a3a]
                rounded transition-colors touch-manipulation"
            >
              <FontAwesomeIcon icon={button.icon} className="text-base" />
            </button>
          ))}
        </div>
      )}

      {/* Slash Command Menu */}
      {showCommandMenu && (
        <div
          ref={commandMenuRef}
          className="fixed z-50 w-64 bg-[#2A2A2A] border border-[#AC8E66] rounded-lg shadow-lg overflow-hidden"
          style={{
            top: `${commandMenuPosition.top}px`,
            left: `${commandMenuPosition.left}px`,
          }}
        >
          {filteredCommands.length > 0 ? (
            <div className="py-1">
              {filteredCommands.map((item, index) => (
                <button
                  key={item.command}
                  onClick={() => executeCommand(item)}
                  className={`w-full px-3 py-2 flex items-center gap-3 text-left transition-colors
                    ${
                      index === selectedCommandIndex
                        ? 'bg-[#3a3a3a] text-[#AC8E66]'
                        : 'text-[#e5e5e5] hover:bg-[#3a3a3a]'
                    }`}
                >
                  <FontAwesomeIcon
                    icon={item.icon}
                    className={`text-sm ${
                      index === selectedCommandIndex ? 'text-[#AC8E66]' : 'text-[#888]'
                    }`}
                  />
                  <div className="flex-1">
                    <div className="font-mono text-sm">{item.label}</div>
                    <div className="font-mono text-xs text-[#777]">{item.description}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-4 text-center text-[#777] font-mono text-sm">
              Kein Befehl gefunden
            </div>
          )}
        </div>
      )}

      {/* Plus Menu Button */}
      <div style={{ position: 'relative', width: '100%' }}>
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
          <ZenPlusMenu
            items={plusMenuItems}
            position="top-right"
            size="small"
            variant="inline"
          />
        </div>

        {/* Editor Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            setTimeout(() => {
              setShowToolbar(false);
              setShowCommandMenu(false);
            }, 200);
          }}
          placeholder={placeholder}
          className={`w-full bg-[#2A2A2A] text-[#e5e5e5] font-mono text-sm
            border rounded-lg
            focus:outline-none
            resize-none transition-colors zen-scrollbar
            ${isFocused ? 'border-[#AC8E66]' : 'border-[#3a3a3a]'}`}
          style={{ height, padding: '12px', paddingRight: '60px' }}
        />
      </div>

        {/* Shortcut Footer - Always visible */}
        <div className="mt-2 flex items-center justify-between border-t border-[#3a3a3a] pt-2">
          {/* Shortcuts */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[#777] font-mono text-[10px]">
              <span className="text-[#AC8E66]">{modKey}+B</span> Bold
            </span>
            <span className="text-[#777] font-mono text-[10px]">
              <span className="text-[#AC8E66]">{modKey}+I</span> Italic
            </span>
            <span className="text-[#777] font-mono text-[10px]">
              <span className="text-[#AC8E66]">{modKey}+K</span> Link
            </span>
            <span className="text-[#777] font-mono text-[10px]">
              <span className="text-[#AC8E66]">/</span> Commands
            </span>
            <span className="text-[#777] font-mono text-[10px]">
              <span className="text-[#AC8E66]">Select</span> Toolbar
            </span>
          </div>

          {/* Right Side: Character Count */}
          <div className="flex items-center gap-3">
            {/* Character Count */}
            {showCharCount && (
              <span className="text-[#777] font-mono text-xs">
                {value.length} Zeichen
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Preview Section - Responsive */}
      {showPreview && (
        <div className={`${showPreview ? 'md:w-1/2 w-full' : 'hidden'} ${showPreview ? 'block md:block' : 'hidden'}`}>
          <ZenMarkdownPreview content={value} height={height} />
        </div>
      )}
    </div>
    </div>
  );
};
