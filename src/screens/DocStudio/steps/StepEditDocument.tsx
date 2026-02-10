import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import { ZenMarkdownEditor } from '../../../kits/PatternKit/ZenMarkdownEditor';
import { TemplateHintBanner } from '../components/TemplateHintBanner';
import { defaultEditorSettings, type EditorSettings } from '../../../services/editorSettingsService';
import type { DocTab } from '../types';



interface TemplateHint {
  message: string;
  detectedType?: string;
}

export function StepEditDocument({
  tabs,
  activeTabId,
  contents,
  showPreview,
  dirtyMap,
  templateHint,
  onTabChange,
  onCloseTab,
  onContentChange,
  onDismissHint,
}: {
  tabs: DocTab[];
  activeTabId: string;
  contents: Record<string, string>;
  showPreview: boolean;
  dirtyMap: Record<string, boolean>;
  templateHint?: TemplateHint | null;
  onTabChange: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onContentChange: (tabId: string, value: string) => void;
  onDismissHint?: () => void;
}) {
  const activeContent = contents[activeTabId] ?? '';
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(() => {
    if (typeof window === 'undefined') return { ...defaultEditorSettings };
    const raw = localStorage.getItem('zenpost_editor_settings');
    if (!raw) return { ...defaultEditorSettings };
    try {
      return { ...defaultEditorSettings, ...JSON.parse(raw) };
    } catch {
      return { ...defaultEditorSettings };
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<EditorSettings>).detail;
      if (detail) setEditorSettings(detail);
    };
    window.addEventListener('zen-editor-settings-updated', handler);
    return () => window.removeEventListener('zen-editor-settings-updated', handler);
  }, []);

  const updateEditorTheme = (nextTheme: 'dark' | 'light') => {
    if (typeof window === 'undefined') return;
    const nextSettings = {
      ...defaultEditorSettings,
      ...editorSettings,
      theme: nextTheme,
    };
    localStorage.setItem('zenpost_editor_settings', JSON.stringify(nextSettings));
    window.dispatchEvent(
      new CustomEvent('zen-editor-settings-updated', { detail: nextSettings })
    );
    setEditorSettings(nextSettings);
  };

  const themeStyles = {
    dark: {
      panelBg: '#222',
      border: '#AC8E66',
      shadow: '0 6px 16px rgba(0,0,0,0.35), inset 0 0 24px rgba(0,0,0,0.45)',
      text: '#e5e5e5',
    },
    light: {
      panelBg: '#222',
      shadow: '0 6px 16px rgba(0,0,0,0.35), inset 0 0 24px rgba(0,0,0,0.25)',
      border: '#AC8E66',
      text: '#1a1a1a',
    },
  };

  const colors = themeStyles[editorSettings.theme];

  return (
    <div className="flex-1 flex flex-col items-center bg-[#121212] px-6">
      <div className="w-3/4 max-w-5xl">
        {/* Document Title Header */}
        <div className="mb-4">
          <h2 className="font-mono text-[16px] text-[#dbd9d5] mb-1">
            {tabs.find((tab) => tab.id === activeTabId)?.title ?? 'Dokument'}
          </h2>
          <p className="font-mono text-[11px] text-[#dbd9d5]">Bearbeite und Speicher jetzt deine Dokumentation</p>
        </div>

        {/* Template Hint Banner */}
        {templateHint && onDismissHint && (
          <TemplateHintBanner
            message={templateHint.message}
            detectedType={templateHint.detectedType}
            onDismiss={onDismissHint}
          />
        )}

        {/* Tab Bar - always show when tabs exist */}
        {tabs.length > 0 && (
          <div className="w-full" style={{ marginBottom: '-19px' }}>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                padding: '4px',
                backgroundColor: 'transparent',
                borderRadius: '12px 12px 0 0',
              
                borderBottom: 'none',
                flexWrap: 'wrap',
              }}
            >

             
              {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                const isDirty = !!dirtyMap[tab.id];
                return (
                 
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    style={{
                      marginBottom: '12px',
                      flex: '1 1 140px',
                      padding: '10px 16px',
                      backgroundColor: 'transparent',
                      border: isActive ? '1px solid #AC8E66' : '1px dotted #3A3A3A',
                      borderRadius: '8px 8px 0px 0px',
                      borderBottom: 'none',
                      cursor: 'pointer',
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: isActive ? '9px' : '10px',
                      fontWeight: isActive ? '200' : '400',
                      color: isActive ? '#e5e5e5' : '#999',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {isDirty ? <span style={{ color: isActive ? '#e5e5e5' : '#AC8E66' }}>•</span> : null}
                    <span>{tab.title}</span>
                    <span
                      onClick={(event) => {
                        event.stopPropagation();
                        onCloseTab(tab.id);
                      }}
                      style={{
                        marginLeft: '6px',
                        fontSize: '12px',
                        color: isActive ? '#e5e5e5' : '#777',
                        opacity: 0.8,
                      }}
                    >
                      ×
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Editor */}
        <div className="w-full mb-4" style={{ position: 'relative' }}>
          <div
            className="p-[10px]"
            style={{
              borderRadius: tabs.length > 0 ? '8px 8px 12px 12px' : '12px',
              border: `0.6px solid ${colors.border}`,
              background: colors.panelBg,
              boxShadow: colors.shadow,
              borderTop: tabs.length > 0 ? '1px solid #AC8E66' : `1px solid ${colors.border}`,
              backgroundColor: colors.panelBg,
            }}
          >
            <ZenMarkdownEditor
              value={activeContent}
              onChange={(value) => onContentChange(activeTabId, value)}
              placeholder="Deine Dokumentation..."
              showPreview={showPreview}
              showLineNumbers={true}
              showHeader={false}
              theme={editorSettings.theme}
            />
          </div>

          {/* Docked Label + Theme Toggle */}
         
          <div
            style={{
              position: 'absolute',
              left: '100%',
              top: '-20px',
              transform: 'translatex(10%) rotate(90deg)',
              transformOrigin: 'left center',
              zIndex: 49,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 8px',
                backgroundColor: '#0A0A0A',
                border: '1px solid #AC8E66',
                borderRadius: '6px',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '10px',
                color: '#e5e5e5',
                boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
                whiteSpace: 'nowrap',
              }}
            >

              <button
                onClick={() => updateEditorTheme('dark')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: editorSettings.theme === 'dark' ? '1px solid #AC8E66' : '1px solid #3A3A3A',
                  backgroundColor: editorSettings.theme === 'dark' ? '#1a1a1a' : 'transparent',
                  color: '#e5e5e5',
                  cursor: 'pointer',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '9px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <FontAwesomeIcon
                  icon={faMoon}
                  style={{ color: editorSettings.theme === 'dark' ? '#AC8E66' : '#777' }}
                />
                Dark
              </button>
              <button
                onClick={() => updateEditorTheme('light')}
                style={{
                  padding: '3px 10px',
                  borderRadius: '4px',
                  border: editorSettings.theme === 'light' ? '1px solid #AC8E66' : '1px solid #3A3A3A',
                  backgroundColor: editorSettings.theme === 'light' ? '#D9D4C5' : 'transparent',
                  color: editorSettings.theme === 'light' ? '#1a1a1a' : '#e5e5e5',
                  cursor: 'pointer',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '9px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <FontAwesomeIcon
                  icon={faSun}
                  style={{ color: editorSettings.theme === 'light' ? '#AC8E66' : '#aaa' }}
                />
                Light
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
