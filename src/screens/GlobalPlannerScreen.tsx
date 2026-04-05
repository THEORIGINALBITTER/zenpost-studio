import { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faClipboardList,
  faSpinner,
  faCloudArrowDown,
  faCircleCheck,
  faCircle,
  faTag,
  faArrowRightToBracket,
  faFilter,
  faChevronDown,
  faChevronRight,
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
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { isCloudPlannerAvailable, loadPlannerFromCloud } from '../services/cloudPlannerService';
import type { PlannerStorage } from '../kits/PatternKit/ZenModalSystem/modals/plannerTypes';

const gold = '#AC8E66';
const fontMono = 'IBM Plex Mono, monospace';

const PLATFORM_ICONS: Record<string, IconDefinition> = {
  linkedin: faLinkedin,
  reddit: faReddit,
  github: faGithub,
  devto: faDev,
  medium: faMedium,
  hashnode: faHashnode,
  twitter: faTwitter,
};

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: '#0077B5',
  reddit: '#FF4500',
  github: '#e0ddd6',
  devto: '#e0ddd6',
  medium: '#00AB6C',
  hashnode: '#2962FF',
  twitter: '#1DA1F2',
};

type TabType = 'posts' | 'todos';

export function GlobalPlannerScreen() {
  const [tab, setTab] = useState<TabType>('posts');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PlannerStorage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'draft'>('all');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const isLoggedIn = isCloudPlannerAvailable();

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadPlannerFromCloud()
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        setError('Cloud-Daten konnten nicht geladen werden.');
        setLoading(false);
      });
  }, [isLoggedIn]);

  const allPosts = useMemo(() => {
    if (!data) return [];
    return data.manualPosts.map((post) => {
      const schedule = data.schedules[post.id];
      const isScheduled = !!(schedule?.date && schedule?.time);
      return { ...post, schedule, isScheduled };
    });
  }, [data]);

  const filteredPosts = useMemo(() => {
    return allPosts
      .filter((p) => !platformFilter || p.platform === platformFilter)
      .filter((p) => {
        if (statusFilter === 'scheduled') return p.isScheduled;
        if (statusFilter === 'draft') return !p.isScheduled;
        return true;
      })
      .sort((a, b) => {
        // Scheduled first, then by date
        if (a.isScheduled && !b.isScheduled) return -1;
        if (!a.isScheduled && b.isScheduled) return 1;
        const aDate = a.schedule?.date ?? '';
        const bDate = b.schedule?.date ?? '';
        return aDate.localeCompare(bDate);
      });
  }, [allPosts, platformFilter, statusFilter]);

  const todosByPost = useMemo(() => {
    if (!data) return [];
    const postMap = new Map(data.manualPosts.map((p) => [p.id, p]));
    const groups: Array<{ postId: string | null; postTitle: string; items: typeof data.checklistItems }> = [];
    const seen = new Set<string | null>();

    data.checklistItems.forEach((item) => {
      const key = item.postId ?? null;
      if (!seen.has(key)) {
        seen.add(key);
        const post = key ? postMap.get(key) : null;
        groups.push({
          postId: key,
          postTitle: post?.title || (key ? `Post ${key.slice(0, 8)}` : 'Allgemein'),
          items: [],
        });
      }
      const group = groups.find((g) => g.postId === key);
      group?.items.push(item);
    });

    return groups;
  }, [data]);

  const completedCount = useMemo(
    () => data?.checklistItems.filter((i) => i.completed).length ?? 0,
    [data],
  );
  const totalCount = data?.checklistItems.length ?? 0;

  const availablePlatforms = useMemo(
    () => [...new Set(allPosts.map((p) => p.platform))],
    [allPosts],
  );

  const scheduledCount = allPosts.filter((p) => p.isScheduled).length;
  const draftCount = allPosts.filter((p) => !p.isScheduled).length;

  const toggleSection = (id: string) =>
    setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }));

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, fontFamily: fontMono }}>
        <FontAwesomeIcon icon={faArrowRightToBracket} style={{ fontSize: 28, color: '#444' }} />
        <div style={{ color: '#666', fontSize: 12, textAlign: 'center', lineHeight: 1.8 }}>
          Global Planner benötigt einen<br />ZenCloud Account.
        </div>
        <button
          className="zen-gold-btn"
          onClick={() => window.dispatchEvent(new CustomEvent('zenpost:open-settings', { detail: { tab: 'cloud' } }))}
          style={{ padding: '7px 18px', fontSize: 11 }}
        >
          ZenCloud einrichten
        </button>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, fontFamily: fontMono, color: '#555', fontSize: 12 }}>
        <FontAwesomeIcon icon={faSpinner} spin />
        <span>Lade Cloud-Planner…</span>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: fontMono, color: '#e07070', fontSize: 12 }}>
        {error}
      </div>
    );
  }

  // ── No data ────────────────────────────────────────────────────────────────
  if (!data || (data.manualPosts.length === 0 && data.checklistItems.length === 0)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, fontFamily: fontMono }}>
        <FontAwesomeIcon icon={faCloudArrowDown} style={{ fontSize: 28, color: '#333' }} />
        <div style={{ color: '#555', fontSize: 11, textAlign: 'center', lineHeight: 1.8 }}>
          Noch keine Planner-Daten in der Cloud.<br />
          Öffne den Planner in einem Projekt und plane einen Post.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0f0f0f', fontFamily: fontMono }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #1e1e1e' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: gold, fontWeight: 600, letterSpacing: '0.06em' }}>
            Global Planner
          </span>
          <span style={{ fontSize: 10, color: '#444' }}>
            {allPosts.length} Posts · {scheduledCount} geplant · {draftCount} Entwürfe
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {([
            { id: 'posts', label: 'Posts', icon: faCalendarDays },
            { id: 'todos', label: 'ToDo', icon: faClipboardList },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: tab === t.id ? `2px solid ${gold}` : '2px solid transparent',
                color: tab === t.id ? gold : '#555',
                fontFamily: fontMono,
                fontSize: 10,
                fontWeight: tab === t.id ? 600 : 400,
                padding: '8px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                letterSpacing: '0.05em',
              }}
            >
              <FontAwesomeIcon icon={t.icon} style={{ fontSize: 9 }} />
              {t.label}
              {t.id === 'todos' && totalCount > 0 && (
                <span style={{
                  background: completedCount === totalCount ? '#2a3a2a' : '#2a2a1a',
                  color: completedCount === totalCount ? '#4caf50' : gold,
                  borderRadius: 10,
                  padding: '1px 6px',
                  fontSize: 9,
                }}>
                  {completedCount}/{totalCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Posts Tab ──────────────────────────────────────────────────────── */}
      {tab === 'posts' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Filter bar */}
          <div style={{ padding: '12px 24px', borderBottom: '1px solid #1a1a1a', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <FontAwesomeIcon icon={faFilter} style={{ fontSize: 9, color: '#444' }} />
            {/* Status filter */}
            {(['all', 'scheduled', 'draft'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  fontFamily: fontMono, fontSize: 9,
                  padding: '3px 10px', borderRadius: 4, cursor: 'pointer', border: 'none',
                  background: statusFilter === s ? gold : '#1e1e1e',
                  color: statusFilter === s ? '#0a0a0a' : '#666',
                }}
              >
                {s === 'all' ? 'Alle' : s === 'scheduled' ? 'Geplant' : 'Entwurf'}
              </button>
            ))}
            <div style={{ width: 1, height: 14, background: '#2a2a2a' }} />
            {/* Platform filter */}
            <button
              onClick={() => setPlatformFilter(null)}
              style={{
                fontFamily: fontMono, fontSize: 9,
                padding: '3px 10px', borderRadius: 4, cursor: 'pointer', border: 'none',
                background: platformFilter === null ? '#2a2a2a' : 'transparent',
                color: platformFilter === null ? '#ccc' : '#555',
              }}
            >
              Alle Plattformen
            </button>
            {availablePlatforms.map((platform) => {
              const icon = PLATFORM_ICONS[platform];
              const color = PLATFORM_COLORS[platform] ?? '#888';
              return (
                <button
                  key={platform}
                  onClick={() => setPlatformFilter(platformFilter === platform ? null : platform)}
                  style={{
                    fontFamily: fontMono, fontSize: 9,
                    padding: '3px 10px', borderRadius: 4, cursor: 'pointer', border: 'none',
                    background: platformFilter === platform ? `${color}22` : 'transparent',
                    color: platformFilter === platform ? color : '#555',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  {icon && <FontAwesomeIcon icon={icon} style={{ fontSize: 9 }} />}
                  {platform}
                </button>
              );
            })}
          </div>

          {/* Post list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredPosts.length === 0 && (
              <div style={{ color: '#444', fontSize: 10, textAlign: 'center', marginTop: 40 }}>
                Keine Posts gefunden.
              </div>
            )}
            {filteredPosts.map((post) => {
              const icon = PLATFORM_ICONS[post.platform];
              const color = PLATFORM_COLORS[post.platform] ?? '#888';
              return (
                <div
                  key={post.id}
                  style={{
                    background: '#141414',
                    border: `1px solid ${post.isScheduled ? '#2a3a2a' : '#1e1e1e'}`,
                    borderLeft: `3px solid ${post.isScheduled ? '#4caf5088' : '#333'}`,
                    borderRadius: 8,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  {/* Top row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {icon && (
                      <FontAwesomeIcon icon={icon} style={{ fontSize: 12, color, flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: 11, color: '#d0cbb8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {post.title || '(kein Titel)'}
                    </span>
                    <span style={{
                      fontSize: 9, padding: '2px 7px', borderRadius: 10,
                      background: post.isScheduled ? '#1a2e1a' : '#1e1e1e',
                      color: post.isScheduled ? '#4caf50' : '#666',
                    }}>
                      {post.isScheduled ? 'Geplant' : 'Entwurf'}
                    </span>
                  </div>
                  {/* Schedule info */}
                  {post.schedule?.date && (
                    <div style={{ fontSize: 9, color: '#555', display: 'flex', gap: 8 }}>
                      <FontAwesomeIcon icon={faCalendarDays} style={{ fontSize: 8 }} />
                      {post.schedule.date}
                      {post.schedule.time && ` · ${post.schedule.time}`}
                    </div>
                  )}
                  {/* Content preview */}
                  <div style={{ fontSize: 9, color: '#4a4a4a', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {post.content || '(kein Inhalt)'}
                  </div>
                  {/* Meta */}
                  <div style={{ display: 'flex', gap: 10, fontSize: 9, color: '#333' }}>
                    <span>{post.characterCount} Zeichen</span>
                    <span>{post.wordCount} Wörter</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ToDo Tab ───────────────────────────────────────────────────────── */}
      {tab === 'todos' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Progress bar */}
          {totalCount > 0 && (
            <div style={{ padding: '12px 24px', borderBottom: '1px solid #1a1a1a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#555', marginBottom: 6 }}>
                <span>Fortschritt</span>
                <span style={{ color: completedCount === totalCount ? '#4caf50' : gold }}>
                  {completedCount} / {totalCount} erledigt
                </span>
              </div>
              <div style={{ height: 3, background: '#1e1e1e', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                  background: completedCount === totalCount ? '#4caf50' : gold,
                  borderRadius: 2,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {todosByPost.length === 0 && (
              <div style={{ color: '#444', fontSize: 10, textAlign: 'center', marginTop: 40 }}>
                Keine Todos gefunden.
              </div>
            )}
            {todosByPost.map((group) => {
              const groupId = group.postId ?? 'global';
              const isCollapsed = collapsedSections[groupId] ?? false;
              const groupCompleted = group.items.filter((i) => i.completed).length;

              return (
                <div key={groupId}>
                  {/* Section header */}
                  <button
                    onClick={() => toggleSection(groupId)}
                    style={{
                      width: '100%', background: 'transparent', border: 'none',
                      display: 'flex', alignItems: 'center', gap: 8,
                      cursor: 'pointer', padding: '4px 0', marginBottom: isCollapsed ? 0 : 6,
                    }}
                  >
                    <FontAwesomeIcon
                      icon={isCollapsed ? faChevronRight : faChevronDown}
                      style={{ fontSize: 8, color: '#444' }}
                    />
                    <FontAwesomeIcon icon={faTag} style={{ fontSize: 9, color: '#333' }} />
                    <span style={{ fontSize: 10, color: '#888', flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {group.postTitle}
                    </span>
                    <span style={{ fontSize: 9, color: groupCompleted === group.items.length ? '#4caf50' : '#444' }}>
                      {groupCompleted}/{group.items.length}
                    </span>
                  </button>

                  {/* Items */}
                  {!isCollapsed && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 20 }}>
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}
                        >
                          <FontAwesomeIcon
                            icon={item.completed ? faCircleCheck : faCircle}
                            style={{ fontSize: 10, color: item.completed ? '#4caf50' : '#333', marginTop: 1, flexShrink: 0 }}
                          />
                          <span style={{
                            fontSize: 10, color: item.completed ? '#444' : '#999',
                            textDecoration: item.completed ? 'line-through' : 'none',
                            lineHeight: 1.5,
                          }}>
                            {item.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
