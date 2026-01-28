import { useState, useEffect, useMemo } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { isTauri } from '@tauri-apps/api/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faClipboardList,
  faClock,
  faLightbulb,
  faSave,
  faBook,
  faCirclePlus,
  faCircleQuestion,
  faDownload,
} from '@fortawesome/free-solid-svg-icons';
import {
  faLinkedin,
  faReddit,
  faGithub,
  faDev,
  faMedium,
  faHashnode,
  faTwitter,
} from '@fortawesome/free-brands-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { ZenModal } from '../components/ZenModal';
import { ZenRoughButton } from '../components/ZenRoughButton';
import { ZenDropdown } from '../components/ZenDropdown';
import { ZenCloseButton } from '../../../DesignKit/ZenCloseButton';
import { ZenAddButton } from '../../../DesignKit/ZenAddButton';
import { downloadICSFile, generateICSFile } from '../../../../utils/calendarExport';
import type { ScheduledPost, SocialPlatform, PublishingStatus } from '../../../../types/scheduling';
import {
  formatChecklistAsCsv,
  formatChecklistAsMarkdown,
  loadChecklist,
  saveChecklist,
  type ChecklistItem,
} from '../../../../utils/checklistStorage';

// ==================== TYPES ====================

interface ZenPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduledPosts: ScheduledPost[];
  projectPath?: string | null;
  posts?: Array<{
    platform: SocialPlatform;
    title: string;
    content: string;
    characterCount: number;
    wordCount: number;
  }>;
  onScheduleSave?: (scheduledPosts: ScheduledPost[]) => void;
  onScheduledPostsChange?: (posts: ScheduledPost[]) => void;
  onEditPost?: (post: ScheduledPost) => void;
  onAddPost?: (date: Date) => void;
  preSelectedDate?: Date;
  initialSchedules?: Partial<Record<SocialPlatform, { date: string; time: string }>>;
  defaultTab?: 'planen' | 'kalender' | 'checklist';
}

type TabType = 'planen' | 'kalender' | 'checklist';

type PostSchedule = { date: string; time: string };
type ScheduleMap = Record<string, PostSchedule>;
type PlannerPost = {
  id: string;
  platform: SocialPlatform;
  title: string;
  content: string;
  characterCount: number;
  wordCount: number;
  source: 'content' | 'manual';
};

// ==================== CONSTANTS ====================

const PLATFORM_INFO: Record<SocialPlatform, { emoji: string; name: string; color: string; icon: IconDefinition }> = {
  linkedin: { emoji: '💼', name: 'LinkedIn', color: '#0077B5', icon: faLinkedin },
  reddit: { emoji: '🤖', name: 'Reddit', color: '#FF4500', icon: faReddit },
  github: { emoji: '⚙️', name: 'GitHub', color: '#181717', icon: faGithub },
  devto: { emoji: '👨‍💻', name: 'Dev.to', color: '#0A0A0A', icon: faDev },
  medium: { emoji: '📝', name: 'Medium', color: '#00AB6C', icon: faMedium },
  hashnode: { emoji: '🔷', name: 'Hashnode', color: '#2962FF', icon: faHashnode },
  twitter: { emoji: '🐦', name: 'Twitter/X', color: '#1DA1F2', icon: faTwitter },
};

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const DAY_NAMES = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

const DEFAULT_TASKS = [
  'Content erstellt und überprüft',
  'Hashtags und Keywords recherchiert',
  'Bilder/Grafiken vorbereitet',
  'Beste Posting-Zeit festgelegt',
  'Cross-Posting geplant',
  'Engagement-Strategie definiert',
  'Analytics-Ziele gesetzt',
  'Community-Interaktion geplant',
];

const TABS: { id: TabType; label: string; icon: IconDefinition }[] = [
  { id: 'planen', label: 'Planen', icon: faClock },
  { id: 'kalender', label: 'Kalender', icon: faCalendarDays },
  { id: 'checklist', label: 'Checklist', icon: faClipboardList },
];

// ==================== HELPER FUNCTIONS ====================

const buildScheduleMap = (
  posts: PlannerPost[],
  date: string,
  overrides?: Partial<Record<SocialPlatform, PostSchedule>>,
): ScheduleMap => {
  const map: ScheduleMap = {};
  posts.forEach((post) => {
    const override = overrides?.[post.platform];
    map[post.id] = {
      date: override?.date ?? date,
      time: override?.time ?? '',
    };
  });
  return map;
};

// ==================== MAIN COMPONENT ====================

export function ZenPlannerModal({
  isOpen,
  onClose,
  scheduledPosts,
  projectPath,
  posts = [],
  onScheduleSave,
  onScheduledPostsChange,
  onEditPost,
  onAddPost,
  preSelectedDate,
  initialSchedules,
  defaultTab = 'planen',
}: ZenPlannerModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);

  // ==================== PLANEN STATE ====================
  const initialDate = preSelectedDate ? preSelectedDate.toISOString().split('T')[0] : '';

  // ==================== MANUAL PLAN POSTS ====================
  const [manualPosts, setManualPosts] = useState<PlannerPost[]>([]);
  const [newPostPlatform, setNewPostPlatform] = useState<SocialPlatform>('linkedin');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');

  const planningPosts = useMemo<PlannerPost[]>(
    () => [
      ...posts.map((post, index) => ({
        ...post,
        id: `${post.platform}-${index}`,
        source: 'content' as const,
      })),
      ...manualPosts,
    ],
    [posts, manualPosts],
  );

  const [schedules, setSchedules] = useState<ScheduleMap>(() =>
    buildScheduleMap(planningPosts, initialDate, initialSchedules)
  );

  useEffect(() => {
    if (!isOpen) return;
    setSchedules((prev) => {
      const base = buildScheduleMap(planningPosts, initialDate, initialSchedules);
      planningPosts.forEach((post) => {
        if (prev[post.id]) {
          base[post.id] = prev[post.id];
        }
      });
      return base;
    });
  }, [isOpen, initialSchedules, initialDate, planningPosts]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(defaultTab);
  }, [defaultTab, isOpen]);

  useEffect(() => {
    if (!preSelectedDate) return;
    const dateStr = preSelectedDate.toISOString().split('T')[0];
    setSchedules(prev => {
      const updated = { ...prev };
      planningPosts.forEach(post => {
        const current = updated[post.id];
        if (!current?.date) {
          updated[post.id] = {
            date: dateStr,
            time: current?.time ?? '',
          };
        }
      });
      return updated;
    });
  }, [preSelectedDate, planningPosts]);

  // ==================== KALENDER STATE ====================
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDetailDate, setCalendarDetailDate] = useState<Date | null>(null);
  const [calendarEditMap, setCalendarEditMap] = useState<Record<string, PostSchedule>>({});
  const [calendarStatusList, setCalendarStatusList] = useState<'scheduled' | 'draft' | null>(null);

  // ==================== CHECKLIST STATE ====================
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

  useEffect(() => {
    if (!isOpen) return;
    setChecklistLoaded(false);
    loadChecklist(DEFAULT_TASKS, projectPath)
      .then(items => {
        setChecklistItems(items);
        setChecklistLoaded(true);
      })
      .catch(() => {
        setChecklistItems(
          DEFAULT_TASKS.map((task, index) => ({
            id: `task-${index}`,
            text: task,
            completed: false,
            source: 'default',
          })),
        );
        setChecklistLoaded(true);
      });
  }, [isOpen, projectPath]);

  useEffect(() => {
    if (!checklistLoaded) return;
    saveChecklist(checklistItems, projectPath).catch(() => {});
  }, [checklistItems, checklistLoaded, projectPath]);

  // ==================== PLANEN HANDLERS ====================
  const handleDateChange = (postId: string, date: string) => {
    setSchedules(prev => ({
      ...prev,
      [postId]: { ...(prev[postId] ?? { date: '', time: '' }), date },
    }));
  };

  const handleTimeChange = (postId: string, time: string) => {
    setSchedules(prev => ({
      ...prev,
      [postId]: { ...(prev[postId] ?? { date: '', time: '' }), time },
    }));
  };

  const buildScheduledPostForEdit = (post: PlannerPost, schedule: PostSchedule): ScheduledPost => ({
    id: post.id,
    platform: post.platform,
    title: post.title,
    content: post.content,
    scheduledDate: schedule.date ? new Date(schedule.date) : undefined,
    scheduledTime: schedule.time || undefined,
    status: schedule.date && schedule.time ? 'scheduled' : 'draft',
    characterCount: post.characterCount,
    wordCount: post.wordCount,
    createdAt: new Date(),
  });

  const updateScheduledPost = (postId: string, dateStr: string, timeStr: string) => {
    if (!onScheduledPostsChange) return;
    const updated = scheduledPosts.map((post) => {
      if (post.id !== postId) return post;
      const updatedDate = dateStr ? new Date(dateStr) : undefined;
      const updatedTime = timeStr || undefined;
      return {
        ...post,
        scheduledDate: updatedDate,
        scheduledTime: updatedTime,
        status: (updatedDate && updatedTime ? 'scheduled' : 'draft') as PublishingStatus,
      };
    });
    onScheduledPostsChange(updated);
  };

  const handleSaveSchedule = () => {
    if (!onScheduleSave) return;

    const scheduledPostsData: ScheduledPost[] = planningPosts.map(post => {
      const schedule = schedules[post.id] ?? { date: '', time: '' };
      const scheduledDate = schedule.date ? new Date(schedule.date) : undefined;

      return {
        id: `${post.platform}-${Date.now()}`,
        platform: post.platform,
        title: post.title,
        content: post.content,
        scheduledDate,
        scheduledTime: schedule.time || undefined,
        status: (schedule.date && schedule.time) ? 'scheduled' : 'draft',
        characterCount: post.characterCount,
        wordCount: post.wordCount,
        createdAt: new Date(),
      };
    });

    onScheduleSave(scheduledPostsData);
  };

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const hasAnySchedule = planningPosts.some(post => {
    const schedule = schedules[post.id] ?? { date: '', time: '' };
    return schedule.date && schedule.time;
  });

  // ==================== KALENDER HANDLERS ====================
  const handleExportCalendar = async () => {
    try {
      if (scheduledCount === 0) return;
      if (isTauri()) {
        const filePath = await save({
          defaultPath: 'zenpost-calendar.ics',
          filters: [{ name: 'Calendar', extensions: ['ics'] }],
        });
        if (!filePath) return;
        const icsContent = generateICSFile(scheduledPosts);
        await writeTextFile(filePath, icsContent);
        return;
      }
      downloadICSFile(scheduledPosts);
    } catch (error) {
      console.error('Kalender-Export fehlgeschlagen:', error);
    }
  };

  const getScheduledPostsForDate = (date: Date): ScheduledPost[] => {
    return scheduledPosts.filter(post => {
      if (!post.scheduledDate) return false;
      const postDate = new Date(post.scheduledDate);
      return (
        postDate.getDate() === date.getDate() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const calendarDetailPosts = useMemo(
    () => (calendarDetailDate ? getScheduledPostsForDate(calendarDetailDate) : []),
    [calendarDetailDate, scheduledPosts],
  );

  useEffect(() => {
    if (!calendarDetailDate) return;
    const nextMap: Record<string, PostSchedule> = {};
    calendarDetailPosts.forEach((post) => {
      const dateStr = post.scheduledDate ? new Date(post.scheduledDate).toISOString().split('T')[0] : '';
      nextMap[post.id] = {
        date: dateStr,
        time: post.scheduledTime ?? '',
      };
    });
    setCalendarEditMap(nextMap);
  }, [calendarDetailDate, calendarDetailPosts]);

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Date[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(new Date(year, month, -startingDayOfWeek + i + 1));
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  const isCurrentMonth = (date: Date): boolean => date.getMonth() === currentDate.getMonth();

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // ==================== CHECKLIST HANDLERS ====================
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

  const days = getDaysInMonth(currentDate);

  // ==================== RENDER FUNCTIONS ====================

  const renderPlanenContent = () => (
    <div style={{ padding: '24px' }}>
      {/* Info Box */}
      <div
        style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#1A1A1A',
          borderRadius: '8px',
          border: '1px solid #3A3A3A',
        }}
      >
        <p
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '12px',
            color: '#777',
            lineHeight: '1.6',
            margin: 0,
          }}
        >
          <FontAwesomeIcon icon={faLightbulb} style={{ color: '#AC8E66', marginRight: '8px' }} />
          Plane deine Posts im Voraus. Wähle Datum und Uhrzeit für jede Plattform oder lasse sie leer für "Entwurf"-Status.
        </p>
      </div>

      {/* Manual Add */}
      <div
        style={{
          marginBottom: '16px',
          padding: '16px',
          backgroundColor: '#1A1A1A',
          borderRadius: '8px',
          border: '1px solid #3A3A3A',
        }}
      >
        <h4
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '12px',
            color: '#e5e5e5',
            margin: 0,
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FontAwesomeIcon icon={faCirclePlus} style={{ color: '#AC8E66' }} />
          Neuen Post planen
        </h4>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '10px',
            marginBottom: '10px',
          }}
        >
          <ZenDropdown
            value={newPostPlatform}
            onChange={(value) => setNewPostPlatform(value as SocialPlatform)}
            options={(Object.keys(PLATFORM_INFO) as SocialPlatform[]).map((platform) => ({
              value: platform,
              label: PLATFORM_INFO[platform].name,
            }))}
            fullWidth
            variant="compact"
          />
          <input
            type="text"
            value={newPostTitle}
            onChange={(e) => setNewPostTitle(e.target.value)}
            placeholder="Titel (optional)"
            style={{
              padding: '8px 10px',
              backgroundColor: '#0A0A0A',
              border: '1px solid #3A3A3A',
              borderRadius: '6px',
              color: '#e5e5e5',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
            }}
          />
          <input
            type="text"
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="Kurzer Inhalt (optional)"
            style={{
              padding: '8px 10px',
              backgroundColor: '#0A0A0A',
              border: '1px solid #3A3A3A',
              borderRadius: '6px',
              color: '#e5e5e5',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
            }}
          />
        </div>
        <ZenAddButton
          size="lg"
          onClick={() => {
            const trimmedTitle = newPostTitle.trim();
            const trimmedContent = newPostContent.trim();
            const contentValue = trimmedContent || trimmedTitle || '';
            const wordCount = contentValue ? contentValue.split(/\s+/).filter(Boolean).length : 0;
            setManualPosts(prev => [
              ...prev,
              {
                id: `manual-${Date.now()}`,
                platform: newPostPlatform,
                title: trimmedTitle || PLATFORM_INFO[newPostPlatform].name,
                content: contentValue,
                characterCount: contentValue.length,
                wordCount,
                source: 'manual',
              },
            ]);
            setNewPostTitle('');
            setNewPostContent('');
          }}
        />
      </div>

      {/* Platform Schedule Cards */}
      {planningPosts.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          {planningPosts.map(post => {
            const info = PLATFORM_INFO[post.platform];
            const schedule = schedules[post.id] ?? { date: '', time: '' };

            return (
              <div
                key={post.id}
                style={{
                  padding: '20px',
                  backgroundColor: '#1A1A1A',
                  borderRadius: '12px',
                  border: '1px solid #3A3A3A',
                  position: 'relative',
                }}
              >
                {/* Platform Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '16px',
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{info.emoji}</span>
                  <div>
                    <h4
                      style={{
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '14px',
                        color: '#e5e5e5',
                        margin: 0,
                      }}
                    >
                      {info.name}
                    </h4>
                    <p
                      style={{
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '10px',
                        color: '#777',
                        margin: 0,
                      }}
                    >
                      {post.characterCount} Zeichen
                    </p>
                  </div>
                </div>
                {post.source === 'manual' && (
                  <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                    <ZenCloseButton
                      onClick={() => {
                        setManualPosts(prev => prev.filter(item => item.id !== post.id));
                        setSchedules(prev => {
                          const next = { ...prev };
                          delete next[post.id];
                          return next;
                        });
                      }}
                      size="sm"
                    />
                  </div>
                )}

                {/* Date Input */}
                <div style={{ marginBottom: '12px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '10px',
                      color: '#999',
                      marginBottom: '6px',
                    }}
                  >
                    <FontAwesomeIcon icon={faCalendarDays} style={{ fontSize: '10px' }} />
                    Datum
                  </label>
                  <input
                    type="date"
                    value={schedule.date}
                    onChange={(e) => handleDateChange(post.id, e.target.value)}
                    min={getTodayDate()}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0A0A0A',
                      border: '1px solid #3A3A3A',
                      borderRadius: '6px',
                      color: '#e5e5e5',
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '12px',
                    }}
                  />
                </div>

                {/* Time Input */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '10px',
                      color: '#999',
                      marginBottom: '6px',
                    }}
                  >
                    ⏰ Uhrzeit
                  </label>
                  <input
                    type="time"
                    value={schedule.time}
                    onChange={(e) => handleTimeChange(post.id, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0A0A0A',
                      border: '1px solid #3A3A3A',
                      borderRadius: '6px',
                      color: '#e5e5e5',
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '12px',
                    }}
                  />
                </div>

                {/* Status Badge */}
                {schedule.date && schedule.time && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '6px 12px',
                      backgroundColor: '#AC8E66',
                      borderRadius: '4px',
                      textAlign: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '10px',
                        color: '#0A0A0A',
                        fontWeight: 'bold',
                      }}
                    >
                      ✓ Geplant
                    </span>
                  </div>
                )}

                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
                  <ZenRoughButton
                    label="Weiterbearbeiten"
                    size="small"
                    width={180}
                    height={36}
                    onClick={() => onEditPost?.(buildScheduledPostForEdit(post, schedule))}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            backgroundColor: '#1A1A1A',
            borderRadius: '12px',
            border: '1px dashed #3A3A3A',
            marginBottom: '24px',
          }}
        >
          <p
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '14px',
              color: '#777',
              margin: 0,
            }}
          >
            Keine Posts zum Planen vorhanden.
            <br />
            <span style={{ fontSize: '12px', color: '#555' }}>
              Erstelle Content im Content AI Studio oder nutze "Neuen Post planen".
            </span>
          </p>
        </div>
      )}

      {(scheduledPosts.length > 0) && (
        <div style={{ marginBottom: '24px' }}>
          <h4
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
              color: '#e5e5e5',
              marginBottom: '12px',
            }}
          >
            Geplante Posts
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px',
            }}
          >
            {scheduledPosts
              .filter((post) => post.status === 'scheduled')
              .map((post) => {
                const info = PLATFORM_INFO[post.platform];
                const dateValue = post.scheduledDate ? new Date(post.scheduledDate).toISOString().split('T')[0] : '';
                const timeValue = post.scheduledTime || '';
                return (
                  <div
                    key={post.id}
                    style={{
                      padding: '16px',
                      backgroundColor: '#1A1A1A',
                      borderRadius: '12px',
                      border: '1px solid #3A3A3A',
                      position: 'relative',
                    }}
                  >
                    <div style={{ position: 'absolute', top: '10px', right: '10px', width: '100%' }}>
                      <ZenCloseButton
                        onClick={() => onScheduledPostsChange?.(scheduledPosts.filter(item => item.id !== post.id))}
                        size="sm"
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '22px' }}>{info.emoji}</span>
                      <div>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: '#e5e5e5' }}>
                          {post.title || info.name}
                        </div>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
                          {post.characterCount} Zeichen
                        </div>
                      </div>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'block', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#999', marginBottom: '6px' }}>
                        Datum
                      </label>
                      <input
                        type="date"
                        value={dateValue}
                        onChange={(e) => updateScheduledPost(post.id, e.target.value, timeValue)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          backgroundColor: '#0A0A0A',
                          border: '1px solid #3A3A3A',
                          borderRadius: '6px',
                          color: '#e5e5e5',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '11px',
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'block', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#999', marginBottom: '6px' }}>
                        Uhrzeit
                      </label>
                      <input
                        type="time"
                        value={timeValue}
                        onChange={(e) => updateScheduledPost(post.id, dateValue, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          backgroundColor: '#0A0A0A',
                          border: '1px solid #3A3A3A',
                          borderRadius: '6px',
                          color: '#e5e5e5',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '11px',
                        }}
                      />
                    </div>
                    <div style={{ marginTop: '8px', marginBottom: '8px', textAlign: 'center' }}>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#0A0A0A', backgroundColor: '#AC8E66', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold' }}>
                        ✓ Geplant
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <ZenRoughButton
                        label="Weiterbearbeiten"
                        size="small"
                        width={180}
                        height={36}
                        onClick={() => onEditPost?.(post)}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {(scheduledPosts.length > 0) && (
        <div style={{ marginBottom: '24px' }}>
          <h4
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
              color: '#e5e5e5',
              marginBottom: '12px',
            }}
          >
            Entwürfe
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px',
            }}
          >
            {scheduledPosts
              .filter((post) => post.status === 'draft')
              .map((post) => {
                const info = PLATFORM_INFO[post.platform];
                const dateValue = post.scheduledDate ? new Date(post.scheduledDate).toISOString().split('T')[0] : '';
                const timeValue = post.scheduledTime || '';
                return (
                  <div
                    key={post.id}
                    style={{
                      padding: '16px',
                      backgroundColor: '#1A1A1A',
                      borderRadius: '12px',
                      border: '1px solid #3A3A3A',
                      position: 'relative',
                    }}
                  >
                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                      <ZenCloseButton
                        onClick={() => onScheduledPostsChange?.(scheduledPosts.filter(item => item.id !== post.id))}
                        size="sm"
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '22px' }}>{info.emoji}</span>
                      <div>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: '#e5e5e5' }}>
                          {post.title || info.name}
                        </div>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
                          {post.characterCount} Zeichen
                        </div>
                      </div>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'block', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#999', marginBottom: '6px' }}>
                        Datum
                      </label>
                      <input
                        type="date"
                        value={dateValue}
                        onChange={(e) => updateScheduledPost(post.id, e.target.value, timeValue)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          backgroundColor: '#0A0A0A',
                          border: '1px solid #3A3A3A',
                          borderRadius: '6px',
                          color: '#e5e5e5',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '11px',
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'block', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#999', marginBottom: '6px' }}>
                        Uhrzeit
                      </label>
                      <input
                        type="time"
                        value={timeValue}
                        onChange={(e) => updateScheduledPost(post.id, dateValue, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          backgroundColor: '#0A0A0A',
                          border: '1px solid #3A3A3A',
                          borderRadius: '6px',
                          color: '#e5e5e5',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '11px',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
                      <ZenRoughButton
                        label="Weiterbearbeiten"
                        size="small"
                        width={180}
                        height={36}
                        onClick={() => onEditPost?.(post)}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Save Button */}
      {planningPosts.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ZenRoughButton
            label="Zeitplan speichern"
            icon={<FontAwesomeIcon icon={faSave} />}
            onClick={handleSaveSchedule}
            variant={hasAnySchedule ? 'active' : 'default'}
          />
        </div>
      )}
    </div>
  );

  const renderKalenderContent = () => (
    <div style={{ padding: '24px' }}>
      {/* Stats Row */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          justifyContent: 'center',
        }}
      >
        <button
          type="button"
          onClick={() => {
            setCalendarDetailDate(null);
            setCalendarStatusList(prev => (prev === 'scheduled' ? null : 'scheduled'));
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#0A0A0A',
            borderRadius: '6px',
            border: '1px solid #AC8E66',
            textAlign: 'center',
            cursor: 'pointer',
          }}
          title="Geplante Posts anzeigen"
        >
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '14px', color: '#AC8E66', fontWeight: 'bold' }}>
            {scheduledCount}
          </div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
            Geplant
          </div>
        </button>
        <button
          type="button"
          onClick={() => {
            setCalendarDetailDate(null);
            setCalendarStatusList(prev => (prev === 'draft' ? null : 'draft'));
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#0A0A0A',
            borderRadius: '6px',
            border: '1px solid #3A3A3A',
            textAlign: 'center',
            cursor: 'pointer',
          }}
          title="Entwürfe anzeigen"
        >
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '14px', color: '#999', fontWeight: 'bold' }}>
            {draftCount}
          </div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
            Entwürfe
          </div>
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
        <ZenRoughButton
          label="Kalender exportieren (ICS)"
          icon={<FontAwesomeIcon icon={faDownload} />}
          onClick={handleExportCalendar}
          variant={scheduledCount > 0 ? 'active' : 'default'}
        />
      </div>

      {calendarStatusList && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#0A0A0A',
            borderRadius: '10px',
            border: '1px solid #AC8E66',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '14px', color: '#e5e5e5' }}>
              {calendarStatusList === 'scheduled' ? 'Geplante Posts' : 'Entwürfe'}
            </div>
            <ZenRoughButton
              label="Schließen"
              onClick={() => setCalendarStatusList(null)}
              variant="active"
            />
          </div>
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {scheduledPosts
              .filter((post) => post.status === calendarStatusList)
              .map((post) => {
                const info = PLATFORM_INFO[post.platform];
                const dateLabel = post.scheduledDate
                  ? new Date(post.scheduledDate).toLocaleDateString('de-DE')
                  : 'Kein Datum';
                return (
                  <div
                    key={post.id}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: '#1A1A1A',
                      borderRadius: '8px',
                      border: '1px solid #3A3A3A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FontAwesomeIcon icon={info.icon} style={{ color: '#AC8E66' }} />
                      <div>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: '#e5e5e5' }}>
                          {post.title || info.name}
                        </div>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
                          {dateLabel} · {post.scheduledTime || '--:--'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <ZenRoughButton
                        label="Weiterbearbeiten"
                        onClick={() => onEditPost?.(post)}
                        variant="default"
                      />
                      <ZenRoughButton
                        label="Löschen"
                        onClick={() => {
                          onScheduledPostsChange?.(scheduledPosts.filter(item => item.id !== post.id));
                          setCalendarStatusList(null);
                        }}
                        variant="default"
                      />
                    </div>
                  </div>
                );
              })}
            {scheduledPosts.filter((post) => post.status === calendarStatusList).length === 0 && (
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#777' }}>
                Keine Einträge vorhanden.
              </div>
            )}
          </div>
        </div>
      )}

      {calendarDetailDate && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#0A0A0A',
            borderRadius: '10px',
            border: '1px solid #AC8E66',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '14px', color: '#e5e5e5' }}>
                {calendarDetailDate.toLocaleDateString('de-DE')}
              </div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#777' }}>
                {calendarDetailPosts.length} Posts an diesem Tag
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <ZenRoughButton
                label="Neu planen"
                onClick={() => {
                  onAddPost?.(calendarDetailDate);
                  setActiveTab('planen');
                  setCalendarDetailDate(null);
                }}
                variant="default"
              />
              <ZenRoughButton
                label="Schließen"
                onClick={() => setCalendarDetailDate(null)}
                variant="active"
              />
            </div>
          </div>

          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {calendarDetailPosts.length === 0 && (
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#777' }}>
                Keine Posts an diesem Datum.
              </div>
            )}

            {calendarDetailPosts.map((post) => {
              const info = PLATFORM_INFO[post.platform];
              const edit = calendarEditMap[post.id] ?? { date: '', time: '' };
              return (
                <div
                  key={post.id}
                  style={{
                    padding: '12px',
                    backgroundColor: '#1A1A1A',
                    borderRadius: '8px',
                    border: '1px solid #3A3A3A',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FontAwesomeIcon icon={info.icon} style={{ color: '#AC8E66' }} />
                      <div>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: '#e5e5e5' }}>
                          {post.title || info.name}
                        </div>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
                          {post.content ? post.content.slice(0, 90) : 'Kein Inhalt'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <ZenRoughButton
                        label="Weiterbearbeiten"
                        onClick={() => onEditPost?.(post)}
                        variant="default"
                      />
                      <ZenRoughButton
                        label="Löschen"
                        onClick={() => {
                          onScheduledPostsChange?.(scheduledPosts.filter(item => item.id !== post.id));
                          setCalendarDetailDate(null);
                        }}
                        variant="default"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                    <input
                      type="date"
                      value={edit.date}
                      onChange={(e) => {
                        setCalendarEditMap(prev => ({ ...prev, [post.id]: { ...edit, date: e.target.value } }));
                      }}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: '#0A0A0A',
                        border: '1px solid #3A3A3A',
                        borderRadius: '6px',
                        color: '#e5e5e5',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '11px',
                      }}
                    />
                    <input
                      type="time"
                      value={edit.time}
                      onChange={(e) => {
                        setCalendarEditMap(prev => ({ ...prev, [post.id]: { ...edit, time: e.target.value } }));
                      }}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: '#0A0A0A',
                        border: '1px solid #3A3A3A',
                        borderRadius: '6px',
                        color: '#e5e5e5',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '11px',
                      }}
                    />
                    <ZenRoughButton
                      label="Neu planen"
                      onClick={() => {
                        const updated: ScheduledPost[] = scheduledPosts.map(item => {
                          if (item.id !== post.id) return item;
                          const updatedDate = edit.date ? new Date(edit.date) : undefined;
                          const updatedTime = edit.time || undefined;
                          return {
                            ...item,
                            scheduledDate: updatedDate,
                            scheduledTime: updatedTime,
                            status: (updatedDate && updatedTime ? 'scheduled' : 'draft') as any,
                          };
                        });
                        onScheduledPostsChange?.(updated);
                        setCalendarDetailDate(null);
                      }}
                      variant="active"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Calendar Navigation */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <button
          type="button"
          onClick={goToPreviousMonth}
          style={{
            padding: '6px 12px',
            backgroundColor: '#0A0A0A',
            border: '1px solid #3A3A3A',
            borderRadius: '4px',
            color: '#e5e5e5',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          ← Zurück
        </button>

        <div style={{ textAlign: 'center' }}>
          <h3
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '13px',
              color: '#e5e5e5',
              margin: 0,
            }}
          >
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <button
            type="button"
            onClick={goToToday}
            style={{
              marginTop: '4px',
              padding: '3px 10px',
              backgroundColor: 'transparent',
              border: '1px solid #3A3A3A',
              borderRadius: '3px',
              color: '#999',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '9px',
              cursor: 'pointer',
            }}
          >
            Heute
          </button>
        </div>

        <button
          type="button"
          onClick={goToNextMonth}
          style={{
            padding: '6px 12px',
            backgroundColor: '#0A0A0A',
            border: '1px solid #3A3A3A',
            borderRadius: '4px',
            color: '#e5e5e5',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          Weiter →
        </button>
      </div>

      {/* Day Names */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '3px',
          marginBottom: '6px',
        }}
      >
        {DAY_NAMES.map(day => (
          <div
            key={day}
            style={{
              padding: '4px',
              textAlign: 'center',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '9px',
              color: '#777',
              fontWeight: 'bold',
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '3px',
        }}
      >
        {days.map((date, index) => {
          const postsOnDate = getScheduledPostsForDate(date);
          const isCurrent = isCurrentMonth(date);
          const isTodayDate = isToday(date);
          const hasPosts = postsOnDate.length > 0;

          return (
            <div
              key={index}
              onClick={() => {
                if (!isCurrent) return;
                setCalendarStatusList(null);
                setCalendarDetailDate(prev => {
                  if (prev && prev.toDateString() === date.toDateString()) return null;
                  return date;
                });
              }}
              style={{
                minHeight: '60px',
                padding: '6px',
                backgroundColor: isTodayDate ? '#AC8E66' : '#1A1A1A',
                border: `1px solid ${isTodayDate ? '#AC8E66' : '#3A3A3A'}`,
                borderRadius: '4px',
                opacity: isCurrent ? 1 : 0.3,
                cursor: isCurrent ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Date Number */}
              <div
                style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '11px',
                  color: isTodayDate ? '#0A0A0A' : '#e5e5e5',
                  fontWeight: 'bold',
                  marginBottom: '3px',
                }}
              >
                {date.getDate()}
              </div>

              {/* Posts */}
              {hasPosts && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {postsOnDate.slice(0, 2).map(post => {
                    const info = PLATFORM_INFO[post.platform];
                    return (
                      <div
                        key={post.id}
                        style={{
                          padding: '2px 3px',
                          backgroundColor: '#0A0A0A',
                          borderRadius: '2px',
                          fontSize: '9px',
                          fontFamily: 'IBM Plex Mono, monospace',
                          color: '#AC8E66',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          cursor: 'pointer',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCalendarStatusList(null);
                          setCalendarDetailDate(date);
                        }}
                      >
                        <FontAwesomeIcon icon={info.icon} style={{ fontSize: '8px', color: '#AC8E66' }} />
                        <span style={{ fontSize: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {info.name} · {post.scheduledTime || '--:--'}
                        </span>
                      </div>
                    );
                  })}
                  {postsOnDate.length > 2 && (
                    <div
                      style={{
                        fontSize: '7px',
                        fontFamily: 'IBM Plex Mono, monospace',
                        color: '#777',
                        textAlign: 'center',
                      }}
                    >
                      +{postsOnDate.length - 2}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );

  const renderChecklistContent = () => (
    <div style={{ padding: '24px' }}>
      {/* Progress Overview */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          backgroundColor: '#1A1A1A',
          paddingBottom: '12px',
        }}
      >
        <div
          style={{
            padding: '16px',
            backgroundColor: '#0A0A0A',
            borderRadius: '8px',
            border: '1px solid #AC8E66',
            marginBottom: '20px',
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
                  fontFamily: 'IBM Plex Mono, monospace',
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
                  fontFamily: 'IBM Plex Mono, monospace',
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
                fontFamily: 'IBM Plex Mono, monospace',
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
              backgroundColor: '#1A1A1A',
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
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '16px', color: '#AC8E66', fontWeight: 'bold' }}>
                {scheduledCount}
              </div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
                Geplant
              </div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '16px', color: '#999', fontWeight: 'bold' }}>
                {draftCount}
              </div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
                Entwürfe
              </div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '16px', color: '#e5e5e5', fontWeight: 'bold' }}>
                {scheduledPosts.length}
              </div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
                Gesamt
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Overview */}
      {scheduledPosts.length > 0 && (
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
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '11px',
              color: '#e5e5e5',
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
                  <span style={{ fontSize: '14px' }}>{info.emoji}</span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#e5e5e5' }}>
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
      )}

      {/* Checklist */}
      <div style={{ marginBottom: '16px' }}>
        <h4
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            color: '#e5e5e5',
            margin: 0,
            marginBottom: '10px',
          }}
        >
          <FontAwesomeIcon icon={faClipboardList} style={{ marginRight: '6px',marginTop: '-2px', color: '#AC8E66' , fontSize: '14px' }} /> 
            Deine Aufgaben
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {checklistItems.map((item) => {
            const isCompleted = item.completed;

            return (
              <label
                key={item.id}
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
                  onChange={() => {
                    setChecklistItems(prev =>
                      prev.map(current =>
                        current.id === item.id
                          ? { ...current, completed: !current.completed }
                          : current,
                      ),
                    );
                  }}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer',
                    accentColor: '#AC8E66',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '10px',
                    color: isCompleted ? '#777' : '#e5e5e5',
                    textDecoration: isCompleted ? 'line-through' : 'none',
                    flex: 1,
                  }}
                >
                  {item.text}
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
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            color: '#e5e5e5',
            margin: 0,
            marginBottom: '10px',
          }}
        >
        <span className="inline-flex items-center gap-2">
  <FontAwesomeIcon icon={faCirclePlus} style={{ fontSize: '14px', color: '#AC8E66', marginTop: '-2px', marginRight: '6px' }} />
   Eigene Aufgabe hinzufügen
</span>
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
              fontFamily: 'IBM Plex Mono, monospace',
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
              fontFamily: 'IBM Plex Mono, monospace',
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
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            color: '#e5e5e5',
            margin: 0,
            marginBottom: '10px',
          }}
        >
           <FontAwesomeIcon icon={faDownload} style={{ fontSize: '14px', color: '#AC8E66', marginRight: '6px', marginTop: '-2px' }}   />

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
            label="CSV"
            onClick={async () => {
              const content = formatChecklistAsCsv(checklistItems);
              const filename = 'zenpost-checklist.csv';
              if (isTauri()) {
                const filePath = await save({
                  defaultPath: filename,
                  filters: [{ name: 'CSV', extensions: ['csv'] }],
                });
                if (filePath) await writeTextFile(filePath, content);
              } else if (typeof window !== 'undefined') {
                const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
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
              fontFamily: 'IBM Plex Mono, monospace',
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
          padding: '12px',
          backgroundColor: '#1A1A1A',
          borderRadius: '6px',
          border: '1px solid #3A3A3A',
        }}
      >
        <h4
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            color: '#e5e5e5',
            margin: 0,
            marginBottom: '10px',
          }}
        >
            <FontAwesomeIcon icon={faCircleQuestion}  style={{ fontSize: '14px', color: '#AC8E66', marginRight: '6px' }} />
                     Hilfreiche Ressourcen
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          <ZenRoughButton
            label="Wiki & Dokumentation"
            icon={<FontAwesomeIcon icon={faBook} className="text-[#AC8E66]" />}
            href="https://github.com/THEORIGINALBITTER/zenpost-studio/wiki"
            target="_blank"
            rel="noopener noreferrer"
          />
          
        </div>
      </div>
    </div>
  );

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="large"
      showCloseButton={true}
    >
      <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
        {/* Header */}
        <div style={{ padding: '24px 24px 0 24px' }}>
          <h2 style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '24px',
            color: '#AC8E66',
            marginBottom: '8px',
            textDecoration: 'underline',
            textUnderlineOffset: '4px',
          }}>
            Planen & Organisieren
          </h2>
          <p style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '12px',
            color: '#777',
            marginBottom: '16px',
          }}>
            Plane deine Posts, verwalte deinen Kalender und tracke deinen Fortschritt
          </p>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #AC8E66',
            paddingBottom: '0',
          }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  backgroundColor: activeTab === tab.id ? '#AC8E66' : 'transparent',
                  border: 'none',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '13px',
                  color: activeTab === tab.id ? '#0A0A0A' : '#999',
                  fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                  transition: 'all 0.2s',
                }}
              >
                <FontAwesomeIcon icon={tab.icon} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'planen' && renderPlanenContent()}
          {activeTab === 'kalender' && renderKalenderContent()}
          {activeTab === 'checklist' && renderChecklistContent()}
        </div>
      </div>
    </ZenModal>
  );
}
