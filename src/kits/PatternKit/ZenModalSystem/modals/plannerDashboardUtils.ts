import type { ChecklistItem } from '../../../../utils/checklistStorage';
import type { ScheduledPost, SocialPlatform } from '../../../../types/scheduling';
import type { PlannerPost, ScheduleMap } from './plannerTypes';
import type {
  PlannerDashboardAttentionItem,
  PlannerDashboardDayBucket,
  PlannerDashboardModel,
  PlannerDashboardPlatformMixItem,
  PlannerDashboardPost,
  PlannerDashboardQuickAction,
  PlannerOverviewStatusFilter,
} from './plannerDashboardTypes';

type BuildPlannerDashboardModelArgs = {
  scheduledPosts: ScheduledPost[];
  manualPosts: PlannerPost[];
  schedules: ScheduleMap;
  checklistItems: ChecklistItem[];
  lastCloudSyncAt: string | null;
  platformFilter: string | null;
  statusFilter: PlannerOverviewStatusFilter;
};

const toDateTimeKey = (post: PlannerDashboardPost) => {
  const date = post.schedule?.date ?? '9999-99-99';
  const time = post.schedule?.time ?? '99:99';
  return `${date}T${time}`;
};

const sortPostsForOverview = (a: PlannerDashboardPost, b: PlannerDashboardPost) => {
  if (a.isScheduled && !b.isScheduled) return -1;
  if (!a.isScheduled && b.isScheduled) return 1;
  return toDateTimeKey(a).localeCompare(toDateTimeKey(b));
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildNextSevenDays = (posts: PlannerDashboardPost[]): PlannerDashboardDayBucket[] => {
  const today = new Date();
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index);
    const dateKey = toDateKey(date);
    return {
      dateKey,
      label: date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }),
      posts: [] as PlannerDashboardPost[],
    };
  });

  const bucketMap = new Map(buckets.map((bucket) => [bucket.dateKey, bucket]));
  posts
    .filter((post) => post.isScheduled && post.schedule?.date)
    .sort(sortPostsForOverview)
    .forEach((post) => {
      const bucket = bucketMap.get(post.schedule!.date);
      if (bucket) bucket.posts.push(post);
    });

  return buckets;
};

const buildAttentionItems = (
  posts: PlannerDashboardPost[],
  checklistItems: ChecklistItem[],
): PlannerDashboardAttentionItem[] => {
  const openTodosByPost = new Map<string, number>();
  checklistItems.forEach((item) => {
    if (!item.postId || item.completed) return;
    openTodosByPost.set(item.postId, (openTodosByPost.get(item.postId) ?? 0) + 1);
  });

  const items: PlannerDashboardAttentionItem[] = [];

  posts.forEach((post) => {
    if (!post.imageUrl?.trim()) {
      items.push({
        id: `${post.id}-image`,
        platform: post.platform,
        title: post.title || 'Ohne Titel',
        detail: 'Titelbild fehlt noch.',
        severity: 'high',
        kind: 'missing-image',
        targetPostId: post.id,
        action: 'open-post',
      });
    }

    if (!post.isScheduled) {
      items.push({
        id: `${post.id}-draft`,
        platform: post.platform,
        title: post.title || 'Ohne Titel',
        detail: 'Noch nicht terminiert.',
        severity: 'medium',
        kind: 'draft',
        targetPostId: post.id,
        action: 'open-post',
      });
    }

    const openTodos = openTodosByPost.get(post.id) ?? 0;
    if (openTodos >= 3) {
      items.push({
        id: `${post.id}-todos`,
        platform: post.platform,
        title: post.title || 'Ohne Titel',
        detail: `${openTodos} offene Todos blockieren den Post.`,
        severity: openTodos >= 5 ? 'high' : 'low',
        kind: 'todo-risk',
        targetPostId: post.id,
        action: 'open-todo-post',
      });
    }
  });

  return items.sort((a, b) => {
    const severityRank = { high: 0, medium: 1, low: 2 };
    return severityRank[a.severity] - severityRank[b.severity];
  });
};

export const buildPlannerDashboardModel = ({
  scheduledPosts,
  manualPosts,
  schedules,
  checklistItems,
  lastCloudSyncAt,
  platformFilter,
  statusFilter,
}: BuildPlannerDashboardModelArgs): PlannerDashboardModel => {
  const seen = new Set<string>();
  const allPosts: PlannerDashboardPost[] = [];

  scheduledPosts.forEach((post) => {
    seen.add(post.id);
    let dateStr = '';
    if (post.scheduledDate) {
      const date = post.scheduledDate;
      dateStr = date instanceof Date ? date.toISOString().split('T')[0] : String(date).split('T')[0];
    }
    allPosts.push({
      id: post.id,
      platform: post.platform,
      title: post.title,
      subtitle: post.subtitle,
      imageUrl: post.imageUrl,
      content: post.content,
      characterCount: post.characterCount,
      wordCount: post.wordCount,
      schedule: { date: dateStr, time: post.scheduledTime ?? '' },
      isScheduled: post.status === 'scheduled',
    });
  });

  manualPosts.forEach((post) => {
    if (seen.has(post.id)) return;
    seen.add(post.id);
    const schedule = schedules[post.id];
    allPosts.push({
      id: post.id,
      platform: post.platform,
      title: post.title,
      subtitle: post.subtitle,
      imageUrl: post.imageUrl,
      content: post.content,
      characterCount: post.characterCount,
      wordCount: post.wordCount,
      schedule,
      isScheduled: !!(schedule?.date && schedule?.time),
    });
  });

  const availablePlatforms = [...new Set(allPosts.map((post) => post.platform))] as SocialPlatform[];

  const filteredPosts = allPosts
    .filter((post) => !platformFilter || post.platform === platformFilter)
    .filter((post) => {
      if (statusFilter === 'scheduled') return post.isScheduled;
      if (statusFilter === 'draft') return !post.isScheduled;
      return true;
    })
    .sort(sortPostsForOverview);

  const scheduledCount = allPosts.filter((post) => post.isScheduled).length;
  const draftCount = allPosts.length - scheduledCount;
  const todoCompleted = checklistItems.filter((item) => item.completed).length;
  const todoTotal = checklistItems.length;

  const platformMix = availablePlatforms
    .map((platform) => {
      const platformPosts = allPosts.filter((post) => post.platform === platform);
      return {
        platform,
        total: platformPosts.length,
        scheduled: platformPosts.filter((post) => post.isScheduled).length,
        drafts: platformPosts.filter((post) => !post.isScheduled).length,
      } satisfies PlannerDashboardPlatformMixItem;
    })
    .sort((a, b) => b.total - a.total);

  const openTodosByPost = new Map<string, number>();
  checklistItems.forEach((item) => {
    if (!item.postId || item.completed) return;
    openTodosByPost.set(item.postId, (openTodosByPost.get(item.postId) ?? 0) + 1);
  });

  const postsWithoutImage = allPosts.filter((post) => !post.imageUrl?.trim()).length;
  const unscheduledDrafts = allPosts.filter((post) => !post.isScheduled).length;
  const postsWithTodoRisk = allPosts.filter((post) => (openTodosByPost.get(post.id) ?? 0) >= 3).length;
  const openTodoPosts = allPosts.filter((post) => (openTodosByPost.get(post.id) ?? 0) > 0).length;
  const totalOpenTodos = checklistItems.filter((item) => !item.completed).length;
  const healthyPosts = allPosts.filter((post) => {
    const openTodos = openTodosByPost.get(post.id) ?? 0;
    return post.isScheduled && !!post.imageUrl?.trim() && openTodos < 3;
  }).length;

  const firstDraftPost = allPosts
    .filter((post) => !post.isScheduled)
    .sort(sortPostsForOverview)[0];
  const nextScheduledPost = allPosts
    .filter((post) => post.isScheduled && post.schedule?.date)
    .sort(sortPostsForOverview)[0];
  const todoRiskPost = allPosts
    .filter((post) => (openTodosByPost.get(post.id) ?? 0) >= 3)
    .sort(sortPostsForOverview)[0]
    ?? allPosts.filter((post) => (openTodosByPost.get(post.id) ?? 0) > 0).sort(sortPostsForOverview)[0];

  const quickActions: PlannerDashboardQuickAction[] = [
    {
      id: 'draft-open',
      label: 'Entwurf öffnen',
      hint: firstDraftPost ? `${firstDraftPost.title || 'Ohne Titel'} direkt weiterbearbeiten.` : 'Kein Entwurf vorhanden.',
      count: unscheduledDrafts,
      targetPostId: firstDraftPost?.id,
      action: 'open-draft-post',
    },
    {
      id: 'scheduled-open',
      label: 'Nächsten Post öffnen',
      hint: nextScheduledPost ? `${nextScheduledPost.title || 'Ohne Titel'} direkt prüfen.` : 'Kein geplanter Post vorhanden.',
      count: scheduledCount,
      targetPostId: nextScheduledPost?.id,
      action: 'open-next-post',
    },
    {
      id: 'todo-open',
      label: 'Todo-Blocker öffnen',
      hint: todoRiskPost ? `${todoRiskPost.title || 'Ohne Titel'} im ToDo-Tab fokussieren.` : 'Keine offenen Todo-Blocker.',
      count: totalOpenTodos,
      targetPostId: todoRiskPost?.id,
      action: 'open-todo-post',
    },
    {
      id: 'cloud',
      label: 'Cloud prüfen',
      hint: 'Öffnet ZenCloud Einstellungen.',
      action: 'open-cloud',
    },
  ];

  return {
    allPosts,
    filteredPosts,
    availablePlatforms,
    stats: {
      totalPosts: allPosts.length,
      scheduledPosts: scheduledCount,
      draftPosts: draftCount,
      todoCompleted,
      todoTotal,
      completionRate: todoTotal > 0 ? Math.round((todoCompleted / todoTotal) * 100) : 0,
    },
    platformMix,
    nextSevenDays: buildNextSevenDays(allPosts),
    workflowHealth: {
      postsWithoutImage,
      unscheduledDrafts,
      postsWithTodoRisk,
      openTodoPosts,
      totalOpenTodos,
      healthyPosts,
    },
    quickActions,
    attentionItems: buildAttentionItems(allPosts, checklistItems).slice(0, 6),
    lastSyncLabel: lastCloudSyncAt ? new Date(lastCloudSyncAt).toLocaleString('de-DE') : null,
  };
};
