import { useState } from 'react';
import { ZenModal } from '../components/ZenModal';
import { ZenRoughButton } from '../components/ZenRoughButton';
import type { ScheduledPost, SocialPlatform } from '../../../../types/scheduling';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faLinkedin, faReddit, faGithub, faDev, faMedium, faHashnode, faTwitter } from '@fortawesome/free-brands-svg-icons';
import { faCalendarDays } from '@fortawesome/free-solid-svg-icons';

interface ZenContentCalendarProps {
  isOpen: boolean;
  onClose: () => void;
  scheduledPosts: ScheduledPost[];
  onEditPost?: (post: ScheduledPost) => void;
  onAddPost?: (date: Date) => void;
}

const PLATFORM_INFO: Record<SocialPlatform, { icon: IconDefinition; name: string; color: string }> = {
  linkedin: { icon: faLinkedin, name: 'LinkedIn', color: '#0077B5' },
  reddit: { icon: faReddit, name: 'Reddit', color: '#FF4500' },
  github: { icon: faGithub, name: 'GitHub', color: '#181717' },
  devto: { icon: faDev, name: 'Dev.to', color: '#0A0A0A' },
  medium: { icon: faMedium, name: 'Medium', color: '#00AB6C' },
  hashnode: { icon: faHashnode, name: 'Hashnode', color: '#2962FF' },
  twitter: { icon: faTwitter, name: 'Twitter/X', color: '#1DA1F2' },
};

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const DAY_NAMES = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

export function ZenContentCalendar({ isOpen, onClose, scheduledPosts, onEditPost, onAddPost }: ZenContentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

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

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Date[] = [];

    // Add empty days for previous month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(new Date(year, month, -startingDayOfWeek + i + 1));
    }

    // Add days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    // Add days to complete the grid (6 rows * 7 days = 42 cells)
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

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth();
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const days = getDaysInMonth(currentDate);
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
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FontAwesomeIcon icon={faCalendarDays} />
          Content Kalender
        </h2>

        {/* Stats Row */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '16px',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: '#0A0A0A',
              borderRadius: '6px',
              border: '1px solid #AC8E66',
              textAlign: 'center',
            }}
          >
            <div style={{ fontFamily: 'monospace', fontSize: '14px', color: '#AC8E66', fontWeight: 'bold' }}>
              {scheduledCount}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#777' }}>
              Geplant
            </div>
          </div>
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: '#0A0A0A',
              borderRadius: '6px',
              border: '1px solid #3A3A3A',
              textAlign: 'center',
            }}
          >
            <div style={{ fontFamily: 'monospace', fontSize: '14px', color: '#999', fontWeight: 'bold' }}>
              {draftCount}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#777' }}>
              Entwürfe
            </div>
          </div>
        </div>

        {/* Calendar Navigation */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            onClick={goToPreviousMonth}
            style={{
              padding: '6px 12px',
              backgroundColor: '#0A0A0A',
              border: '1px solid #3A3A3A',
              borderRadius: '4px',
              color: '#e5e5e5',
              fontFamily: 'monospace',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            ← Zurück
          </button>

          <div style={{ textAlign: 'center' }}>
            <h3
              style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                color: '#e5e5e5',
                margin: 0,
              }}
            >
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <button
              onClick={goToToday}
              style={{
                marginTop: '4px',
                padding: '3px 10px',
                backgroundColor: 'transparent',
                border: '1px solid #3A3A3A',
                borderRadius: '3px',
                color: '#999',
                fontFamily: 'monospace',
                fontSize: '9px',
                cursor: 'pointer',
              }}
            >
              Heute
            </button>
          </div>

          <button
            onClick={goToNextMonth}
            style={{
              padding: '6px 12px',
              backgroundColor: '#0A0A0A',
              border: '1px solid #3A3A3A',
              borderRadius: '4px',
              color: '#e5e5e5',
              fontFamily: 'monospace',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Weiter →
          </button>
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
                fontFamily: 'monospace',
                fontSize: '9px',
                color: '#777',
                fontWeight: 'bold',
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid - Compact */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '3px',
            marginBottom: '16px',
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
                onClick={() => isCurrent && onAddPost?.(date)}
                style={{
                  minHeight: '45px',
                  padding: '4px',
                  backgroundColor: isTodayDate ? '#AC8E66' : '#1A1A1A',
                  border: `1px solid ${isTodayDate ? '#AC8E66' : '#3A3A3A'}`,
                  borderRadius: '4px',
                  opacity: isCurrent ? 1 : 0.3,
                  position: 'relative',
                  cursor: isCurrent && onAddPost ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (isCurrent && onAddPost) {
                    e.currentTarget.style.backgroundColor = isTodayDate ? '#C9A576' : '#2A2A2A';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isCurrent && onAddPost) {
                    e.currentTarget.style.backgroundColor = isTodayDate ? '#AC8E66' : '#1A1A1A';
                  }
                }}
              >
                {/* Date Number */}
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    color: isTodayDate ? '#0A0A0A' : '#e5e5e5',
                    fontWeight: 'bold',
                    marginBottom: '3px',
                  }}
                >
                  {date.getDate()}
                </div>

                {/* Posts - Compact */}
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
                            fontSize: '8px',
                            fontFamily: 'monospace',
                            color: '#AC8E66',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            cursor: onEditPost ? 'pointer' : 'default',
                          }}
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent date click
                            onEditPost?.(post);
                          }}
                        >
                          <FontAwesomeIcon icon={info.icon} style={{ fontSize: '8px', color: '#AC8E66' }} />
                          <span style={{ fontSize: '7px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {post.scheduledTime}
                          </span>
                        </div>
                      );
                    })}
                    {postsOnDate.length > 2 && (
                      <div
                        style={{
                          fontSize: '7px',
                          fontFamily: 'monospace',
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

        {/* Close Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
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
