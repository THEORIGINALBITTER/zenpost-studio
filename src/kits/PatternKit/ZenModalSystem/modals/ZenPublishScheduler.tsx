import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb, faCalendarDays, faSave, faXmark } from '@fortawesome/free-solid-svg-icons';
import {
  faLinkedinIn,
  faReddit,
  faGithub,
  faDev,
  faMedium,
  faHashnode,
  faTwitter,
} from '@fortawesome/free-brands-svg-icons';
import { ZenModal } from '../components/ZenModal';
import { ZenRoughButton } from '../components/ZenRoughButton';
import type { ScheduledPost, SocialPlatform } from '../../../../types/scheduling';

type PlatformSchedule = { date: string; time: string };
type PlatformSchedules = Record<SocialPlatform, PlatformSchedule>;
type ScheduleOverrides = Partial<Record<SocialPlatform, PlatformSchedule>>;

const createScheduleState = (date: string): PlatformSchedules => ({
  linkedin: { date, time: '' },
  reddit: { date, time: '' },
  github: { date, time: '' },
  devto: { date, time: '' },
  medium: { date, time: '' },
  hashnode: { date, time: '' },
  twitter: { date, time: '' },
});

const mergeSchedules = (base: PlatformSchedules, overrides?: ScheduleOverrides): PlatformSchedules => {
  if (!overrides) {
    return base;
  }

  const merged: PlatformSchedules = { ...base };

  (Object.keys(overrides) as SocialPlatform[]).forEach(platform => {
    const override = overrides[platform];
    if (!override) {
      return;
    }

    merged[platform] = {
      date: override.date || merged[platform].date,
      time: override.time || merged[platform].time,
    };
  });

  return merged;
};

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
  initialSchedules?: ScheduleOverrides;
}

const PLATFORM_INFO: Record<SocialPlatform, { icon: any; name: string; color: string }> = {
  linkedin: { icon: faLinkedinIn, name: 'LinkedIn', color: '#0077B5' },
  reddit: { icon: faReddit, name: 'Reddit', color: '#FF4500' },
  github: { icon: faGithub, name: 'GitHub', color: '#181717' },
  devto: { icon: faDev, name: 'Dev.to', color: '#0A0A0A' },
  medium: { icon: faMedium, name: 'Medium', color: '#00AB6C' },
  hashnode: { icon: faHashnode, name: 'Hashnode', color: '#2962FF' },
  twitter: { icon: faTwitter, name: 'Twitter/X', color: '#1DA1F2' },
};

export function ZenPublishScheduler({
  isOpen,
  onClose,
  posts,
  onScheduleSave,
  preSelectedDate,
  initialSchedules,
}: ZenPublishSchedulerProps) {
  // Format pre-selected date to YYYY-MM-DD if provided
  const initialDate = preSelectedDate
    ? preSelectedDate.toISOString().split('T')[0]
    : '';

  const [schedules, setSchedules] = useState<PlatformSchedules>(() =>
    mergeSchedules(createScheduleState(initialDate), initialSchedules)
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setSchedules(mergeSchedules(createScheduleState(initialDate), initialSchedules));
  }, [isOpen, initialSchedules, initialDate]);

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
      title="Publishing planen"
      size="large"
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '80vh',
        overflow: 'hidden'
      }}>
        {/* Scrollable Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '32px'
        }}>
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
                  <FontAwesomeIcon icon={info.icon} style={{ fontSize: '22px', color: '#AC8E66' }} />
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontFamily: 'monospace',
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
              icon={<FontAwesomeIcon icon={faSave} />}
              onClick={handleSave}
              variant={hasAnySchedule ? 'active' : 'default'}
            />
            <ZenRoughButton
              label="Abbrechen"
              icon={<FontAwesomeIcon icon={faXmark} />}
              onClick={onClose}
              variant="default"
            />
          </div>
        </div>
      </div>
    </ZenModal>
  );
}
