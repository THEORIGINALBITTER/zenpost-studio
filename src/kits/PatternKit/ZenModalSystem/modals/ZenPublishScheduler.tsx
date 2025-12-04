import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb } from '@fortawesome/free-solid-svg-icons';
import { ZenModal } from '../components/ZenModal';
import { ZenRoughButton } from '../components/ZenRoughButton';
import type { ScheduledPost, SocialPlatform } from '../../../../types/scheduling';

interface ZenPublishSchedulerProps {
  isOpen: boolean;
  onClose: () => void;
  posts: Array<{
    platform: SocialPlatform;
    title: string;
    content: string;
    characterCount: number;
    wordCount: number;
  }>;
  onScheduleSave: (scheduledPosts: ScheduledPost[]) => void;
  preSelectedDate?: Date; // Optional pre-selected date from calendar
}

const PLATFORM_INFO: Record<SocialPlatform, { emoji: string; name: string; color: string }> = {
  linkedin: { emoji: '💼', name: 'LinkedIn', color: '#0077B5' },
  reddit: { emoji: '🤖', name: 'Reddit', color: '#FF4500' },
  github: { emoji: '⚙️', name: 'GitHub', color: '#181717' },
  devto: { emoji: '👨‍💻', name: 'Dev.to', color: '#0A0A0A' },
  medium: { emoji: '📝', name: 'Medium', color: '#00AB6C' },
  hashnode: { emoji: '🔷', name: 'Hashnode', color: '#2962FF' },
};

export function ZenPublishScheduler({ isOpen, onClose, posts, onScheduleSave, preSelectedDate }: ZenPublishSchedulerProps) {
  // Format pre-selected date to YYYY-MM-DD if provided
  const initialDate = preSelectedDate
    ? preSelectedDate.toISOString().split('T')[0]
    : '';

  const [schedules, setSchedules] = useState<Record<SocialPlatform, { date: string; time: string }>>({
    linkedin: { date: initialDate, time: '' },
    reddit: { date: initialDate, time: '' },
    github: { date: initialDate, time: '' },
    devto: { date: initialDate, time: '' },
    medium: { date: initialDate, time: '' },
    hashnode: { date: initialDate, time: '' },
  });

  // Update all date fields when preSelectedDate changes
  useEffect(() => {
    if (preSelectedDate) {
      const dateStr = preSelectedDate.toISOString().split('T')[0];
      setSchedules(prev => {
        const updated: Record<SocialPlatform, { date: string; time: string }> = {} as any;
        (Object.keys(prev) as SocialPlatform[]).forEach(platform => {
          updated[platform] = { ...prev[platform], date: dateStr };
        });
        return updated;
      });
    }
  }, [preSelectedDate]);

  const handleDateChange = (platform: SocialPlatform, date: string) => {
    setSchedules(prev => ({
      ...prev,
      [platform]: { ...prev[platform], date },
    }));
  };

  const handleTimeChange = (platform: SocialPlatform, time: string) => {
    setSchedules(prev => ({
      ...prev,
      [platform]: { ...prev[platform], time },
    }));
  };

  const handleSave = () => {
    const scheduledPosts: ScheduledPost[] = posts.map(post => {
      const schedule = schedules[post.platform];
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

    onScheduleSave(scheduledPosts);
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const hasAnySchedule = posts.some(post => {
    const schedule = schedules[post.platform];
    return schedule.date && schedule.time;
  });

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      title="📅 Publishing planen"
      size="large"
    >
      <div style={{ padding: '32px' }}>
        {/* Info Box */}
        <div
          style={{
            marginBottom: '32px',
            padding: '16px',
            backgroundColor: '#1A1A1A',
            borderRadius: '8px',
            border: '1px solid #3A3A3A',
          }}
        >
          <p
            style={{
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#777',
              lineHeight: '1.6',
            }}
          >
            <FontAwesomeIcon icon={faLightbulb} style={{ color: '#AC8E66', marginRight: '6px' }} />
            Plane deine Posts im Voraus. Wähle Datum und Uhrzeit für jede Plattform oder lasse sie leer für "Entwurf"-Status.
          </p>
        </div>

        {/* Platform Schedule Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          {posts.map(post => {
            const info = PLATFORM_INFO[post.platform];
            const schedule = schedules[post.platform];

            return (
              <div
                key={post.platform}
                style={{
                  padding: '20px',
                  backgroundColor: '#1A1A1A',
                  borderRadius: '12px',
                  border: '1px solid #3A3A3A',
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
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        color: '#e5e5e5',
                        margin: 0,
                      }}
                    >
                      {info.name}
                    </h4>
                    <p
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '10px',
                        color: '#777',
                        margin: 0,
                      }}
                    >
                      {post.characterCount} Zeichen
                    </p>
                  </div>
                </div>

                {/* Date Input */}
                <div style={{ marginBottom: '12px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontFamily: 'monospace',
                      fontSize: '10px',
                      color: '#999',
                      marginBottom: '6px',
                    }}
                  >
                    📅 Datum
                  </label>
                  <input
                    type="date"
                    value={schedule.date}
                    onChange={(e) => handleDateChange(post.platform, e.target.value)}
                    min={getTodayDate()}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0A0A0A',
                      border: '1px solid #3A3A3A',
                      borderRadius: '6px',
                      color: '#e5e5e5',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                    }}
                  />
                </div>

                {/* Time Input */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontFamily: 'monospace',
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
                    onChange={(e) => handleTimeChange(post.platform, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0A0A0A',
                      border: '1px solid #3A3A3A',
                      borderRadius: '6px',
                      color: '#e5e5e5',
                      fontFamily: 'monospace',
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
                        fontFamily: 'monospace',
                        fontSize: '10px',
                        color: '#0A0A0A',
                        fontWeight: 'bold',
                      }}
                    >
                      ✓ Geplant
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <ZenRoughButton
            label="Zeitplan speichern"
            icon="💾"
            onClick={handleSave}
            variant={hasAnySchedule ? 'active' : 'default'}
          />
          <ZenRoughButton
            label="Abbrechen"
            icon="❌"
            onClick={onClose}
            variant="default"
          />
        </div>
      </div>
    </ZenModal>
  );
}
