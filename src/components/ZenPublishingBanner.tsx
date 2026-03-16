import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faChevronUp,
  faChevronDown,
  faPaperPlane,
  faCheck,
  faForwardStep,
} from '@fortawesome/free-solid-svg-icons';
import {
  faLinkedin,
  faTwitter,
  faReddit,
  faDev,
  faMedium,
  faGithub,
} from '@fortawesome/free-brands-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { ScheduledPost } from '../types/scheduling';
import type { PostResult } from '../services/socialMediaService';
import { platformLabel } from '../services/publishingEngine';

// ─── Platform icons ───────────────────────────────────────────────────────────

const PLATFORM_ICON: Record<string, IconDefinition> = {
  linkedin: faLinkedin,
  twitter: faTwitter,
  reddit: faReddit,
  devto: faDev,
  medium: faMedium,
  github: faGithub,
};

const PLATFORM_COLOR: Record<string, string> = {
  linkedin: '#0077B5',
  twitter: '#1DA1F2',
  reddit: '#FF4500',
  devto: '#aaa',
  medium: '#00AB6C',
  github: '#ccc',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatScheduledTime(post: ScheduledPost): string {
  if (!post.scheduledDate) return '';
  const d = new Date(post.scheduledDate);
  const dateStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  return post.scheduledTime ? `${dateStr} ${post.scheduledTime}` : dateStr;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ZenPublishingBannerProps {
  duePosts: ScheduledPost[];
  publishing: Set<string>;
  results: Map<string, PostResult>;
  onPublish: (post: ScheduledPost) => void;
  onSkip: (postId: string) => void;
}

export function ZenPublishingBanner({
  duePosts,
  publishing,
  results,
  onPublish,
  onSkip,
}: ZenPublishingBannerProps) {
  const [expanded, setExpanded] = useState(false);

  if (duePosts.length === 0 && results.size === 0) return null;

  const visiblePosts = duePosts;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9800,
        fontFamily: 'IBM Plex Mono, monospace',
      }}
    >
      {/* Expanded list */}
      {expanded && visiblePosts.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(0deg, #111 0%, #1a1a1a 100%)',
            borderTop: '1px solid #2a2a2a',
            borderLeft: '1px solid #2a2a2a',
            borderRight: '1px solid #2a2a2a',
            maxHeight: '320px',
            overflowY: 'auto',
            padding: '8px 0',
          }}
        >
          {visiblePosts.map((post) => {
            const isPublishing = publishing.has(post.id);
            const result = results.get(post.id);

            return (
              <div
                key={post.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 16px',
                  borderBottom: '1px solid #222',
                  background: result?.success
                    ? 'rgba(34,197,94,0.06)'
                    : result
                    ? 'rgba(239,68,68,0.06)'
                    : 'transparent',
                }}
              >
                {/* Platform icon */}
                <FontAwesomeIcon
                  icon={PLATFORM_ICON[post.platform] ?? faPaperPlane}
                  style={{
                    color: PLATFORM_COLOR[post.platform] ?? '#AC8E66',
                    fontSize: '16px',
                    flexShrink: 0,
                  }}
                />

                {/* Post info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#ddd',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {post.title || '(kein Titel)'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                    {platformLabel(post.platform)} · {formatScheduledTime(post)}
                  </div>
                  {result && !result.success && (
                    <div style={{ fontSize: '10px', color: '#f87171', marginTop: '3px' }}>
                      {result.error}
                    </div>
                  )}
                  {result?.success && result.url && (
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '10px', color: '#4ade80', marginTop: '3px', display: 'block' }}
                    >
                      {result.url}
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {result?.success ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#4ade80', fontSize: '12px' }}>
                      <FontAwesomeIcon icon={faCheck} />
                      <span>Veröffentlicht</span>
                    </div>
                  ) : isPublishing ? (
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #AC8E66',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                  ) : (
                    <>
                      <button
                        onClick={() => onPublish(post)}
                        style={{
                          background: '#AC8E66',
                          color: '#0a0a0a',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontFamily: 'IBM Plex Mono, monospace',
                        }}
                      >
                        <FontAwesomeIcon icon={faPaperPlane} style={{ fontSize: '10px' }} />
                        Posten
                      </button>
                      <button
                        onClick={() => onSkip(post.id)}
                        title="Überspringen (auf Entwurf setzen)"
                        style={{
                          background: 'transparent',
                          color: '#555',
                          border: '1px solid #333',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontFamily: 'IBM Plex Mono, monospace',
                        }}
                      >
                        <FontAwesomeIcon icon={faForwardStep} style={{ fontSize: '10px' }} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Collapsed bar */}
      <div
        style={{
          background: 'linear-gradient(90deg, #0f0f0f 0%, #161616 100%)',
          borderTop: '1px solid #AC8E66',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '0 16px',
          height: '40px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Pulsing dot */}
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#AC8E66',
            flexShrink: 0,
            animation: 'zen-pulse 2s ease-in-out infinite',
          }}
        />

        <FontAwesomeIcon icon={faBell} style={{ color: '#AC8E66', fontSize: '12px' }} />

        <span style={{ color: '#AC8E66', fontSize: '12px', flex: 1 }}>
          {visiblePosts.length === 1
            ? `1 Post bereit zur Veröffentlichung`
            : `${visiblePosts.length} Posts bereit zur Veröffentlichung`}
        </span>

        {/* Summary of platforms */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {visiblePosts.slice(0, 5).map((p) => (
            <FontAwesomeIcon
              key={p.id}
              icon={PLATFORM_ICON[p.platform] ?? faPaperPlane}
              style={{ color: PLATFORM_COLOR[p.platform] ?? '#AC8E66', fontSize: '13px' }}
            />
          ))}
          {visiblePosts.length > 5 && (
            <span style={{ color: '#555', fontSize: '11px' }}>+{visiblePosts.length - 5}</span>
          )}
        </div>

        <FontAwesomeIcon
          icon={expanded ? faChevronDown : faChevronUp}
          style={{ color: '#555', fontSize: '11px', marginLeft: '4px' }}
        />
      </div>

      <style>{`
        @keyframes zen-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
