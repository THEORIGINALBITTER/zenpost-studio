import { useState } from 'react';
import { ZenModal } from '../components/ZenModal';
import { ZenRoughButton } from '../components/ZenRoughButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faGlobe } from '@fortawesome/free-solid-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import type { ScheduledPost, SocialPlatform } from '../../../../types/scheduling';

interface ZenTodoChecklistProps {
  isOpen: boolean;
  onClose: () => void;
  scheduledPosts: ScheduledPost[];
}

const PLATFORM_INFO: Record<SocialPlatform, { emoji: string; name: string }> = {
  linkedin: { emoji: '💼', name: 'LinkedIn' },
  reddit: { emoji: '🤖', name: 'Reddit' },
  github: { emoji: '⚙️', name: 'GitHub' },
  devto: { emoji: '👨‍💻', name: 'Dev.to' },
  medium: { emoji: '📝', name: 'Medium' },
  hashnode: { emoji: '🔷', name: 'Hashnode' },
};

const DEFAULT_TASKS = [
  'Content erstellt und gespeichert',
  'Rechtschreibung und Grammatik geprüft',
  'Links und Referenzen überprüft',
  'Bilder und Medien hinzugefügt',
  'SEO-Keywords optimiert',
  'Call-to-Action hinzugefügt',
  'Vorschau auf allen Plattformen getestet',
  'Zeitplan festgelegt',
  'Hashtags/Tags vorbereitet',
  'Cross-Promotion geplant',
];

export function ZenTodoChecklist({ isOpen, onClose, scheduledPosts }: ZenTodoChecklistProps) {
  const [todos, setTodos] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    DEFAULT_TASKS.forEach((_task, index) => {
      initial[`task-${index}`] = false;
    });
    return initial;
  });

  const [customTask, setCustomTask] = useState('');

  const handleToggle = (taskId: string) => {
    setTodos(prev => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const addCustomTask = () => {
    if (!customTask.trim()) return;

    const newTaskId = `custom-${Date.now()}`;
    setTodos(prev => ({
      ...prev,
      [newTaskId]: false,
    }));

    setCustomTask('');
  };

  const completedCount = Object.values(todos).filter(Boolean).length;
  const totalCount = Object.keys(todos).length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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
          ✅ Publishing Checklist
        </h2>

        {/* Progress Overview */}
        <div
          style={{
            padding: '16px',
            backgroundColor: '#0A0A0A',
            borderRadius: '8px',
            border: '1px solid #3A3A3A',
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
                  color: '#e5e5e5',
                  margin: 0,
                  marginBottom: '2px',
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
              <div style={{ fontFamily: 'monospace', fontSize: '16px', color: '#e5e5e5', fontWeight: 'bold' }}>
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
              color: '#e5e5e5',
              margin: 0,
              marginBottom: '10px',
            }}
          >
            📱 Deine Plattformen
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
                  <span style={{ fontSize: '14px' }}>{info.emoji}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '9px', color: '#e5e5e5' }}>
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
        <div
          style={{
            marginBottom: '16px',
          }}
        >
          <h4
            style={{
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#e5e5e5',
              margin: 0,
              marginBottom: '10px',
            }}
          >
            📋 Aufgaben
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {DEFAULT_TASKS.map((task, index) => {
              const taskId = `task-${index}`;
              const isCompleted = todos[taskId];

              return (
                <label
                  key={taskId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    backgroundColor: isCompleted ? '#1A1A1A' : '#0A0A0A',
                    border: `1px solid ${isCompleted ? '#AC8E66' : '#3A3A3A'}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={() => handleToggle(taskId)}
                    style={{
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer',
                      accentColor: '#AC8E66',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '10px',
                      color: isCompleted ? '#777' : '#e5e5e5',
                      textDecoration: isCompleted ? 'line-through' : 'none',
                      flex: 1,
                    }}
                  >
                    {task}
                  </span>
                  {isCompleted && <span style={{ fontSize: '12px' }}>✓</span>}
                </label>
              );
            })}
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
              color: '#e5e5e5',
              margin: 0,
              marginBottom: '10px',
            }}
          >
            ➕ Eigene Aufgabe hinzufügen
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
                color: '#e5e5e5',
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
              color: '#e5e5e5',
              margin: 0,
              marginBottom: '10px',
            }}
          >
            📚 Hilfreiche Ressourcen
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
            variant="active"
          />
        </div>
      </div>
    </ZenModal>
  );
}
