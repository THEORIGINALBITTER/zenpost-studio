import { useEffect, useMemo, useState } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { isTauri } from '@tauri-apps/api/core';
import { ZenModal } from '../components/ZenModal';
import { ZenRoughButton } from '../components/ZenRoughButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faCirclePlus, faCircleQuestion, faGlobe } from '@fortawesome/free-solid-svg-icons';
import {
  faLinkedin,
  faReddit,
  faGithub,
  faDev,
  faMedium,
  faHashnode,
  faTwitter,
} from '@fortawesome/free-brands-svg-icons';
import type { ScheduledPost, SocialPlatform } from '../../../../types/scheduling';
import {
  formatChecklistAsMarkdown,
  formatChecklistAsXlsx,
  loadChecklist,
  saveChecklist,
  type ChecklistItem,
} from '../../../../utils/checklistStorage';
import { PLATFORM_TASKS } from '../../../../config/tasks/platformTasks';

interface ZenTodoChecklistProps {
  isOpen: boolean;
  onClose: () => void;
  scheduledPosts: ScheduledPost[];
  projectPath?: string | null;
}

const PLATFORM_INFO: Record<SocialPlatform, { icon: any; name: string; color: string }> = {
  linkedin: { icon: faLinkedin, name: 'LinkedIn', color: '#0077B5' },
  reddit: { icon: faReddit, name: 'Reddit', color: '#FF4500' },
  github: { icon: faGithub, name: 'GitHub', color: '#181717' },
  devto: { icon: faDev, name: 'Dev.to', color: '#0A0A0A' },
  medium: { icon: faMedium, name: 'Medium', color: '#00AB6C' },
  hashnode: { icon: faHashnode, name: 'Hashnode', color: '#2962FF' },
  twitter: { icon: faTwitter, name: 'Twitter/X', color: '#1DA1F2' },
};


export function ZenTodoChecklist({ isOpen, onClose, scheduledPosts, projectPath }: ZenTodoChecklistProps) {
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [checklistLoaded, setChecklistLoaded] = useState(false);
  const [customTask, setCustomTask] = useState('');

  const checklistStats = useMemo(() => {
    const completed = checklistItems.filter(item => item.completed).length;
    return {
      completed,
      total: checklistItems.length,
      percent: checklistItems.length > 0 ? Math.round((completed / checklistItems.length) * 100) : 0,
    };
  }, [checklistItems]);

  // Unique platforms from scheduled posts → platform-specific task groups
  const platformGroups = useMemo(() => {
    const unique = [...new Set(scheduledPosts.map(p => p.platform))];
    return unique.map(platform => ({
      platform,
      tasks: PLATFORM_TASKS[platform] ?? [],
    }));
  }, [scheduledPosts]);

  const defaultTasks = useMemo(
    () => platformGroups.flatMap(g => g.tasks),
    [platformGroups],
  );

  useEffect(() => {
    if (!isOpen) return;
    setChecklistLoaded(false);
    loadChecklist(defaultTasks, projectPath)
      .then(items => {
        setChecklistItems(items);
        setChecklistLoaded(true);
      })
      .catch(() => {
        setChecklistItems(
          defaultTasks.map((task, index) => ({
            id: `task-${index}`,
            text: task,
            completed: false,
            source: 'default',
          })),
        );
        setChecklistLoaded(true);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, projectPath]); // defaultTasks intentionally excluded: only reload on open/project-change

  useEffect(() => {
    if (!checklistLoaded) return;
    saveChecklist(checklistItems, projectPath).catch(() => {});
  }, [checklistItems, checklistLoaded, projectPath]);

  const completeAll = () => {
    setChecklistItems(prev => prev.map(item => ({ ...item, completed: true })));
  };

  const renderChecklistItem = (item: ChecklistItem) => {
    const isCompleted = item.completed;
    return (
      <label
        key={item.id}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 8px',
          backgroundColor: isCompleted ? '#1A1A1A' : '#0A0A0A',
          border: `1px solid ${isCompleted ? '#AC8E66' : '#2A2A2A'}`,
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '3px',
        }}
      >
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={() => {
            setChecklistItems(prev =>
              prev.map(current =>
                current.id === item.id ? { ...current, completed: !current.completed } : current,
              ),
            );
          }}
          style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: '#AC8E66', flexShrink: 0 }}
        />
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '10px',
            color: isCompleted ? '#555' : '#dbd9d5',
            textDecoration: isCompleted ? 'line-through' : 'none',
            flex: 1,
          }}
        >
          {item.text}
        </span>
      </label>
    );
  };

  const addCustomTask = () => {
    if (!customTask.trim()) return;
    const newItem: ChecklistItem = {
      id: `custom-${Date.now()}`,
      text: customTask.trim(),
      completed: false,
      source: 'custom',
    };
    setChecklistItems(prev => [...prev, newItem]);
    setCustomTask('');
  };

  const completedCount = checklistStats.completed;
  const totalCount = checklistStats.total;
  const completionPercentage = checklistStats.percent;

  const scheduledCount = scheduledPosts.filter(p => p.status === 'scheduled').length;
  const draftCount = scheduledPosts.filter(p => p.status === 'draft').length;

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="large"
      showCloseButton={true}
    >
      {/* Fixed Header */}
      <div
        style={{
          padding: '24px 24px 16px 24px',
          borderBottom: '2px solid #AC8E66',
          backgroundColor: '#1A1A1A',
        }}
      >
        <h2
          style={{
            fontFamily: 'monospace',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#AC8E66',
            margin: 0,
            marginBottom: '16px',
          }}
        >
          Publishing Checklist
        </h2>

        {/* Progress Overview */}
        <div
          style={{
            padding: '16px',
            backgroundColor: '#0A0A0A',
            borderRadius: '8px',
            border: '1px solid #AC8E66',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <div>
              <h3
                style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: '#dbd9d5',
                  margin: 0,
                  marginBottom: '2px',
                  fontWeight: 'normal'
                }}
              >
                Workflow Fortschritt
              </h3>
              <p
                style={{
                  fontFamily: 'monospace',
                  fontSize: '10px',
                  color: '#777',
                  margin: 0,
                }}
              >
                {completedCount} von {totalCount} Aufgaben erledigt
              </p>
            </div>
            <div
              style={{
                fontSize: '24px',
                fontFamily: 'monospace',
                color: '#AC8E66',
                fontWeight: 'bold',
              }}
            >
              {completionPercentage}%
            </div>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#0A0A0A',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${completionPercentage}%`,
                backgroundColor: '#AC8E66',
                borderRadius: '3px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          {/* Post Stats */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginTop: '12px',
            }}
          >
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '16px', color: '#AC8E66', fontWeight: 'bold' }}>
                {scheduledCount}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#777' }}>
                Geplant
              </div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '16px', color: '#999', fontWeight: 'bold' }}>
                {draftCount}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#777' }}>
                Entwürfe
              </div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '16px', color: '#dbd9d5', fontWeight: 'bold' }}>
                {scheduledPosts.length}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#777' }}>
                Gesamt
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div
        style={{
          maxHeight: '60vh',
          overflowY: 'auto',
          padding: '20px 24px',
        }}
      >
        {/* Platform Overview */}
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#1A1A1A',
            borderRadius: '6px',
            border: '1px solid #3A3A3A',
          }}
        >
          <h4
            style={{
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#dbd9d5',
              margin: 0,
              marginBottom: '10px',
            }}
          >
            Deine Plattformen
          </h4>
          <div
            style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
            }}
          >
            {scheduledPosts.map(post => {
              const info = PLATFORM_INFO[post.platform];
              return (
                <div
                  key={post.id}
                  style={{
                    padding: '6px 10px',
                    backgroundColor: '#0A0A0A',
                    borderRadius: '4px',
                    border: '1px solid #3A3A3A',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <FontAwesomeIcon icon={info.icon} style={{ fontSize: '14px', color: '#AC8E66' }} />
                  <span style={{ fontFamily: 'monospace', fontSize: '9px', color: '#dbd9d5' }}>
                    {info.name}
                  </span>
                  {post.status === 'scheduled' && (
                    <span style={{ fontSize: '9px' }}>✓</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Checklist */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ fontFamily: 'monospace', fontSize: '11px', color: '#dbd9d5', margin: 0 }}>
              Aufgaben
            </h4>
            <button
              onClick={completeAll}
              style={{
                padding: '3px 8px',
                background: 'transparent',
                border: '1px solid rgba(172,142,102,0.4)',
                borderRadius: 3,
                color: '#1a1a1a',
                fontFamily: 'monospace',
                fontSize: 9,
                cursor: 'pointer',
              }}
            >
              Alle abschliessen
            </button>
          </div>

          <div>
            {platformGroups.map(({ platform, tasks }) => {
              const info = PLATFORM_INFO[platform];
              const platformItems = checklistItems.filter(i => tasks.includes(i.text));
              if (platformItems.length === 0) return null;
              return (
                <div key={platform} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, paddingLeft: 2 }}>
                    <FontAwesomeIcon icon={info.icon} style={{ fontSize: 9, color: '#555' }} />
                    <span style={{ fontFamily: 'monospace', fontSize: 8, color: '#555', letterSpacing: '0.1em' }}>
                      {info.name.toUpperCase()}
                    </span>
                  </div>
                  {platformItems.map(renderChecklistItem)}
                </div>
              );
            })}
            {checklistItems.filter(i => i.source === 'custom').length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 8, color: '#555', letterSpacing: '0.1em', marginBottom: 4, paddingLeft: 2 }}>
                  EIGENE
                </div>
                {checklistItems.filter(i => i.source === 'custom').map(renderChecklistItem)}
              </div>
            )}
          </div>
        </div>

        {/* Add Custom Task */}
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#1A1A1A',
            borderRadius: '6px',
            border: '1px solid #3A3A3A',
          }}
        >
          <h4
            style={{
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#dbd9d5',
              margin: 0,
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <FontAwesomeIcon icon={faCirclePlus} style={{ color: '#AC8E66' }} />
            Eigene Aufgabe hinzufügen
          </h4>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={customTask}
              onChange={(e) => setCustomTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomTask()}
              placeholder="Neue Aufgabe..."
              style={{
                flex: 1,
                padding: '6px 10px',
                backgroundColor: '#0A0A0A',
                border: '1px solid #3A3A3A',
                borderRadius: '4px',
                color: '#dbd9d5',
                fontFamily: 'monospace',
                fontSize: '10px',
              }}
            />
            <button
              onClick={addCustomTask}
              style={{
                padding: '6px 12px',
                backgroundColor: '#AC8E66',
                border: 'none',
                borderRadius: '4px',
                color: '#0A0A0A',
                fontFamily: 'monospace',
                fontSize: '10px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              +
            </button>
          </div>
        </div>

        {/* Export Checklist */}
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#1A1A1A',
            borderRadius: '6px',
            border: '1px solid #3A3A3A',
          }}
        >
          <h4
            style={{
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#dbd9d5',
              margin: 0,
              marginBottom: '10px',
            }}
          >
            Checklist exportieren
          </h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <ZenRoughButton
              label="Markdown"
              onClick={async () => {
                const content = formatChecklistAsMarkdown(checklistItems, 'Publishing Checklist');
                const filename = 'zenpost-checklist.md';
                if (isTauri()) {
                  const filePath = await save({
                    defaultPath: filename,
                    filters: [{ name: 'Markdown', extensions: ['md'] }],
                  });
                  if (filePath) await writeTextFile(filePath, content);
                } else if (typeof window !== 'undefined') {
                  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = filename;
                  a.click();
                  URL.revokeObjectURL(url);
                }
              }}
            />
            <ZenRoughButton
              label=" Excel Numbers (.xlsx)"
              onClick={async () => {
                const buffer = await formatChecklistAsXlsx(checklistItems, 'zenpost-checklist');
                const filename = 'zenpost-checklist.xlsx';
                if (isTauri()) {
                  const filePath = await save({
                    defaultPath: filename,
                    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
                  });
                  if (filePath) {
                    const normalizedPath = filePath.toLowerCase().endsWith('.xlsx')
                      ? filePath
                      : `${filePath}.xlsx`;
                    await writeFile(normalizedPath, buffer);
                  }
                } else if (typeof window !== 'undefined') {
                  const arrayBuffer = buffer.slice().buffer as ArrayBuffer;
                  const blob = new Blob([arrayBuffer], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = filename;
                  a.click();
                  URL.revokeObjectURL(url);
                }
              }}
            />
          </div>
        </div>

        {/* Completion Message */}
        {completionPercentage === 100 && (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#AC8E66',
              borderRadius: '6px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '6px' }}>🎉</div>
            <p
              style={{
                fontFamily: 'monospace',
                fontSize: '10px',
                color: '#0A0A0A',
                fontWeight: 'bold',
                margin: 0,
              }}
            >
              Perfekt! Alle Aufgaben erledigt. Du bist bereit zum Veröffentlichen!
            </p>
          </div>
        )}

        {/* Resource Buttons */}
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#1A1A1A',
            borderRadius: '6px',
            border: '1px solid #3A3A3A',
          }}
        >
          <h4
            style={{
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#dbd9d5',
              margin: 0,
              marginBottom: '10px',
            }}
          >
           
           <FontAwesomeIcon icon={faCircleQuestion}  style={{ fontSize: '10px' }} />
            Hilfreiche Ressourcen
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            <ZenRoughButton
              label="Wiki & Dokumentation"
              icon={<FontAwesomeIcon icon={faBook} className="text-[#AC8E66]" />}
              href="https://github.com/THEORIGINALBITTER/zenpost-studio/wiki"
              target="_blank"
              rel="noopener noreferrer"
              title="Umfassende Dokumentation und Anleitungen"
            />
            <ZenRoughButton
              label="GitHub Repository"
              icon={<FontAwesomeIcon icon={faGithub} className="text-[#AC8E66]" />}
              href="https://github.com/THEORIGINALBITTER/zenpost-studio"
              target="_blank"
              rel="noopener noreferrer"
              title="Quellcode, Issues und Discussions"
            />
            <ZenRoughButton
              label="Website & Demo"
              icon={<FontAwesomeIcon icon={faGlobe} className="text-[#AC8E66]" />}
              href="https://zenpost-studio.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              title="Live Demo und weitere Informationen"
            />
          </div>
        </div>

        {/* Close Button */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ZenRoughButton
            label="Schließen"
            onClick={onClose}
            variant="default"
          />
        </div>
      </div>
    </ZenModal>
  );
}
