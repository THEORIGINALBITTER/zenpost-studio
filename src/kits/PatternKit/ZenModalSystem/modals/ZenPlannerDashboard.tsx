import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRightToBracket,
  faCalendarDays,
  faCloudArrowDown,
  faFilter,
  faListCheck,
  faImage,
  faClock,
  faCheckCircle,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import type { SocialPlatform } from '../../../../types/scheduling';
import { getPlatformInfo } from './plannerUtils';
import type { PlannerDashboardModel, PlannerOverviewStatusFilter } from './plannerDashboardTypes';

type ZenPlannerDashboardProps = {
  isCloudAvailable: boolean;
  isLoading: boolean;
  error: string | null;
  model: PlannerDashboardModel;
  platformFilter: string | null;
  statusFilter: PlannerOverviewStatusFilter;
  onPlatformFilterChange: (value: string | null) => void;
  onStatusFilterChange: (value: PlannerOverviewStatusFilter) => void;
  onOpenCloudSettings: () => void;
  onOpenPlannerPost: (postId: string) => void;
  onOpenTodoScope: (postId?: string) => void;
};

export function ZenPlannerDashboard({
  isCloudAvailable,
  isLoading,
  error,
  model,
  platformFilter,
  statusFilter,
  onPlatformFilterChange,
  onStatusFilterChange,
  onOpenCloudSettings,
  onOpenPlannerPost,
  onOpenTodoScope,
}: ZenPlannerDashboardProps) {
  const gold = '#AC8E66';
  const fontMono = 'IBM Plex Mono, monospace';
  const cardBg = 'rgba(255,255,255,0.35)';
  const borderColor = 'rgba(172,142,102,0.35)';
  const textMain = '#3a3530';
  const textMuted = '#7a7268';
  const textLight = '#a09888';

  const runQuickAction = (action: PlannerDashboardModel['quickActions'][number]) => {
    if (action.action === 'open-cloud') {
      onOpenCloudSettings();
      return;
    }
    if ((action.action === 'open-draft-post' || action.action === 'open-next-post') && action.targetPostId) {
      onOpenPlannerPost(action.targetPostId);
      return;
    }
    if (action.action === 'open-todo-post') {
      onOpenTodoScope(action.targetPostId);
    }
  };

  const runAttentionAction = (item: PlannerDashboardModel['attentionItems'][number]) => {
    if (item.action === 'open-todo-post') {
      onOpenTodoScope(item.targetPostId);
      return;
    }
    onOpenPlannerPost(item.targetPostId);
  };

  if (!isCloudAvailable) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, padding: '60px 24px', fontFamily: fontMono }}>
        <FontAwesomeIcon icon={faArrowRightToBracket} style={{ fontSize: 32, color: gold }} />
        <div style={{ color: textMuted, fontSize: 12, textAlign: 'center', lineHeight: 2 }}>
          Die globale Übersicht benötigt einen<br />ZenCloud Account.
        </div>
        <button
          onClick={onOpenCloudSettings}
          style={{
            background: 'transparent',
            border: `1px solid ${gold}`,
            borderRadius: 6,
            color: gold,
            fontFamily: fontMono,
            fontSize: 11,
            padding: '8px 20px',
            cursor: 'pointer',
          }}
        >
          ZenCloud einrichten
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '60px 24px', 
      fontFamily: fontMono, color: textMuted, fontSize: 11 }}>
        Lade ZenCloud Daten…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', fontFamily: fontMono, color: '#c0392b', fontSize: 12 }}>
        {error}
      </div>
    );
  }

  if (model.allPosts.length === 0 && model.stats.todoTotal === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '60px 24px', fontFamily: fontMono }}>
        <FontAwesomeIcon icon={faCloudArrowDown} style={{ fontSize: 32, color: textLight }} />
        <div style={{ color: textMuted, fontSize: 11, textAlign: 'center', lineHeight: 2 }}>
          Noch keine Planner-Daten in der Cloud.<br />
          Plane einen Post und er erscheint hier.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', fontFamily: fontMono, background: 'transparent' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10, color: textLight, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {model.lastSyncLabel ? `Letzter Cloud-Sync: ${model.lastSyncLabel}` : 'Cloud-Sync noch ausstehend'}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 18, padding: '14px 16px', border: `1px solid ${borderColor}`, borderRadius: 8, background: cardBg }}>
        {[
          { label: 'Posts gesamt', value: model.stats.totalPosts },
          { label: 'Geplant', value: model.stats.scheduledPosts, color: '#2d7a4f' },
          { label: 'Entwürfe', value: model.stats.draftPosts },
          { label: 'ToDos', value: `${model.stats.todoCompleted}/${model.stats.todoTotal}`, color: model.stats.completionRate === 100 && model.stats.todoTotal > 0 ? '#2d7a4f' : undefined },
        ].map((stat) => (
          <div key={stat.label} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: stat.color ?? textMain, marginBottom: 2 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 9, color: textLight, letterSpacing: '0.06em' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.85fr', gap: 16, marginBottom: 18 }}>
        <div style={{ border: `1px solid ${borderColor}`, borderRadius: 8, background: cardBg, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: textMain, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Braucht Aufmerksamkeit
            </div>
            <span style={{ fontSize: 9, color: textLight }}>{model.attentionItems.length} Einträge</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {model.attentionItems.length === 0 ? (
              <div style={{ fontSize: 10, color: '#2d7a4f', lineHeight: 1.7 }}>
                Keine unmittelbaren Risiken. Alle Posts haben gerade einen sauberen Zustand.
              </div>
            ) : (
              model.attentionItems.map((item) => {
                const info = getPlatformInfo(item.platform);
                const severityColor = item.severity === 'high' ? '#b3422d' : item.severity === 'medium' ? gold : textLight;
                return (
                  <button
                    key={item.id}
                    onClick={() => runAttentionAction(item)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: `1px solid ${borderColor}`,
                      background: 'rgba(255,255,255,0.18)',
                      cursor: 'pointer',
                      fontFamily: fontMono,
                      textAlign: 'left',
                    }}
                    title={item.action === 'open-todo-post' ? 'Post im ToDo-Tab öffnen' : 'Post direkt öffnen'}
                  >
                    <FontAwesomeIcon icon={faTriangleExclamation} style={{ fontSize: 11, color: severityColor, marginTop: 2 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <FontAwesomeIcon icon={info.icon} style={{ fontSize: 11, color: info.color }} />
                        <span style={{ fontSize: 11, color: textMain, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: textMuted, lineHeight: 1.6 }}>{item.detail}</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ border: `1px solid ${borderColor}`, borderRadius: 8, background: cardBg, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: textMain, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
              Workflow Health
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Ohne Bild', value: model.workflowHealth.postsWithoutImage, icon: faImage, color: '#b3422d' },
                { label: 'Entwürfe', value: model.workflowHealth.unscheduledDrafts, icon: faClock, color: gold },
                { label: 'Todo-Risiko', value: model.workflowHealth.postsWithTodoRisk, icon: faListCheck, color: '#8d5f29' },
                { label: 'Stabil', value: model.workflowHealth.healthyPosts, icon: faCheckCircle, color: '#2d7a4f' },
              ].map((item) => (
                <div key={item.label} style={{ borderRadius: 8, border: `1px solid ${borderColor}`, padding: '10px 12px', background: 'rgba(255,255,255,0.16)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <FontAwesomeIcon icon={item.icon} style={{ fontSize: 10, color: item.color }} />
                    <span style={{ fontSize: 9, color: textMuted }}>{item.label}</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 9, color: textLight, lineHeight: 1.7 }}>
              {model.workflowHealth.totalOpenTodos} offene Todos in {model.workflowHealth.openTodoPosts} Posts.
            </div>
          </div>

          <div style={{ border: `1px solid ${borderColor}`, borderRadius: 8, background: cardBg, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: textMain, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
              Schnellaktionen
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {model.quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => runQuickAction(action)}
                  disabled={action.action !== 'open-cloud' && !action.targetPostId}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${borderColor}`,
                    background: 'rgba(255,255,255,0.18)',
                    color: textMain,
                    cursor: action.action !== 'open-cloud' && !action.targetPostId ? 'not-allowed' : 'pointer',
                    fontFamily: fontMono,
                    textAlign: 'left',
                    opacity: action.action !== 'open-cloud' && !action.targetPostId ? 0.55 : 1,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 3 }}>{action.label}</div>
                    <div style={{ fontSize: 9, color: textLight }}>{action.hint}</div>
                  </div>
                  {typeof action.count === 'number' && (
                    <span style={{ fontSize: 10, color: gold, fontWeight: 700 }}>{action.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ border: `1px solid ${borderColor}`, borderRadius: 8, background: cardBg, padding: '14px 16px', marginBottom: 18 }}>
        <div style={{ fontSize: 10, color: textMain, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
          Nächste 7 Tage
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 8 }}>
          {model.nextSevenDays.map((day) => (
            <div key={day.dateKey} style={{ minHeight: 132, borderRadius: 8, border: `1px solid ${borderColor}`, background: 'rgba(255,255,255,0.18)', padding: '10px 8px' }}>
              <div style={{ fontSize: 9, color: textMain, marginBottom: 8, textAlign: 'center', lineHeight: 1.5 }}>
                {day.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {day.posts.length === 0 ? (
                  <div style={{ fontSize: 9, color: textLight, textAlign: 'center', lineHeight: 1.6, paddingTop: 18 }}>
                    Kein Post
                  </div>
                ) : (
                  day.posts.slice(0, 3).map((post) => {
                    const info = getPlatformInfo(post.platform);
                    return (
                      <button
                        key={post.id}
                        onClick={() => onOpenPlannerPost(post.id)}
                        style={{
                          width: '100%',
                          borderRadius: 6,
                          background: `${info.color}12`,
                          border: `1px solid ${info.color}33`,
                          padding: '6px 6px 5px',
                          cursor: 'pointer',
                          fontFamily: fontMono,
                          textAlign: 'left',
                        }}
                        title="Post direkt öffnen"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                          <FontAwesomeIcon icon={info.icon} style={{ fontSize: 8, color: info.color }} />
                          <span style={{ fontSize: 8, color: textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            {post.title || '(kein Titel)'}
                          </span>
                        </div>
                        <div style={{ fontSize: 8, color: textLight }}>
                          {post.schedule?.time || 'ohne Zeit'}
                        </div>
                      </button>
                    );
                  })
                )}
                {day.posts.length > 3 && (
                  <div style={{ fontSize: 8, color: textLight, textAlign: 'center' }}>
                    +{day.posts.length - 3} weitere
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ border: `1px solid ${borderColor}`, borderRadius: 8, background: cardBg, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: textMain, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
          Plattform-Mix
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          {model.platformMix.map((entry) => {
            const info = getPlatformInfo(entry.platform);
            const width = model.stats.totalPosts > 0 ? `${Math.max(10, Math.round((entry.total / model.stats.totalPosts) * 100))}%` : '0%';
            return (
              <div key={entry.platform}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <FontAwesomeIcon icon={info.icon} style={{ fontSize: 10, color: info.color }} />
                  <span style={{ fontSize: 10, color: textMain, flex: 1 }}>{info.name}</span>
                  <span style={{ fontSize: 9, color: textLight }}>{entry.total}</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: 'rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 5 }}>
                  <div style={{ width, height: '100%', borderRadius: 999, background: info.color }} />
                </div>
                <div style={{ fontSize: 8, color: textLight }}>
                  {entry.scheduled} geplant · {entry.drafts} Entwurf
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16, padding: '10px 14px', border: `1px solid ${borderColor}`, borderRadius: 8, background: cardBg }}>
        <FontAwesomeIcon icon={faFilter} style={{ fontSize: 9, color: textLight, marginRight: 4 }} />
        {(['all', 'scheduled', 'draft'] as const).map((status) => (
          <button
            key={status}
            onClick={() => onStatusFilterChange(status)}
            style={{
              fontFamily: fontMono,
              fontSize: 9,
              padding: '4px 12px',
              borderRadius: 4,
              cursor: 'pointer',
              border: 'none',
              background: statusFilter === status ? gold : 'rgba(172,142,102,0.12)',
              color: statusFilter === status ? '#fff' : textMuted,
              fontWeight: statusFilter === status ? 600 : 400,
            }}
          >
            {status === 'all' ? 'Alle' : status === 'scheduled' ? 'Geplant' : 'Entwurf'}
          </button>
        ))}
        {model.availablePlatforms.length > 0 && (
          <>
            <div style={{ width: 1, height: 16, background: borderColor, margin: '0 4px' }} />
            <button
              onClick={() => onPlatformFilterChange(null)}
              style={{
                fontFamily: fontMono,
                fontSize: 9,
                padding: '4px 12px',
                borderRadius: 4,
                cursor: 'pointer',
                border: 'none',
                background: platformFilter === null ? 'rgba(172,142,102,0.2)' : 'transparent',
                color: platformFilter === null ? textMain : textLight,
              }}
            >
              Alle Plattformen
            </button>
            {model.availablePlatforms.map((platform) => {
              const info = getPlatformInfo(platform as SocialPlatform);
              return (
                <button
                  key={platform}
                  onClick={() => onPlatformFilterChange(platformFilter === platform ? null : platform)}
                  style={{
                    fontFamily: fontMono,
                    fontSize: 9,
                    padding: '4px 12px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: platformFilter === platform ? `${info.color}22` : 'transparent',
                    color: platformFilter === platform ? info.color : textLight,
                  }}
                >
                  <FontAwesomeIcon icon={info.icon} style={{ fontSize: 9 }} />
                  {platform}
                </button>
              );
            })}
          </>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {model.filteredPosts.length === 0 && (
          <div style={{ color: textLight, fontSize: 10, textAlign: 'center', padding: '24px 0' }}>
            Keine Posts gefunden.
          </div>
        )}
        {model.filteredPosts.map((post) => {
          const info = getPlatformInfo(post.platform);
          return (
            <div
              key={post.id}
              style={{
                background: cardBg,
                border: `1px solid ${post.isScheduled ? 'rgba(45,122,79,0.3)' : borderColor}`,
                boxShadow: `inset 5px 0 0 ${info.color}`,
                borderRadius: 8,
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FontAwesomeIcon icon={info.icon} style={{ fontSize: 13, color: info.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: textMain, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                  {post.title || '(kein Titel)'}
                </span>
                <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 10, background: post.isScheduled ? 'rgba(45,122,79,0.15)' : 'rgba(172,142,102,0.12)', color: post.isScheduled ? '#2d7a4f' : textMuted, fontWeight: 600 }}>
                  {post.isScheduled ? 'Geplant' : 'Entwurf'}
                </span>
              </div>
              {post.schedule?.date && (
                <div style={{ fontSize: 9, color: textLight, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <FontAwesomeIcon icon={faCalendarDays} style={{ fontSize: 8 }} />
                  {post.schedule.date}{post.schedule.time ? ` · ${post.schedule.time}` : ''}
                </div>
              )}
              <div style={{ fontSize: 10, color: textMuted, lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {post.content || '(kein Inhalt)'}
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 9, color: textLight }}>
                <span>{post.characterCount} Zeichen</span>
                <span>{post.wordCount} Wörter</span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
