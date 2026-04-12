export type PlannerScheduleVisualState = 'none' | 'today' | 'overdue' | 'upcoming';

const toLocalDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseDueTimestamp = (
  scheduledDate?: Date | string,
  scheduledTime?: string,
): number | null => {
  if (!scheduledDate || !scheduledTime) return null;
  const [hh, mm] = String(scheduledTime).split(':');
  const hour = Number(hh);
  const minute = Number(mm);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

  const dateKey =
    scheduledDate instanceof Date
      ? toLocalDateKey(scheduledDate)
      : String(scheduledDate).split('T')[0];

  if (!dateKey) return null;
  const dueTs = new Date(
    `${dateKey}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
  ).getTime();
  if (Number.isNaN(dueTs)) return null;
  return dueTs;
};

export const getPlannerScheduleDueTimestamp = (params: {
  scheduledDate?: Date | string;
  scheduledTime?: string;
}): number | null => {
  const { scheduledDate, scheduledTime } = params;
  return parseDueTimestamp(scheduledDate, scheduledTime);
};

export const getPlannerScheduleVisualState = (params: {
  isScheduled: boolean;
  scheduledDate?: Date | string;
  scheduledTime?: string;
  now?: Date;
}): PlannerScheduleVisualState => {
  const { isScheduled, scheduledDate, scheduledTime, now = new Date() } = params;
  if (!isScheduled) return 'none';

  const dueTs = parseDueTimestamp(scheduledDate, scheduledTime);
  if (dueTs === null) return 'none';

  const nowTs = now.getTime();
  if (dueTs < nowTs) return 'overdue';

  const nowDateKey = toLocalDateKey(now);
  const dueDateKey =
    scheduledDate instanceof Date
      ? toLocalDateKey(scheduledDate)
      : String(scheduledDate).split('T')[0];
  if (dueDateKey === nowDateKey) return 'today';

  return 'upcoming';
};

export const comparePlannerDueDateTimeAsc = (
  a: { scheduledDate?: Date | string; scheduledTime?: string },
  b: { scheduledDate?: Date | string; scheduledTime?: string },
): number => {
  const aTs = getPlannerScheduleDueTimestamp(a);
  const bTs = getPlannerScheduleDueTimestamp(b);
  if (aTs === null && bTs === null) return 0;
  if (aTs === null) return 1;
  if (bTs === null) return -1;
  return aTs - bTs;
};

export const comparePlannerDueDateTimeOverdueLast = (
  a: { isScheduled: boolean; scheduledDate?: Date | string; scheduledTime?: string },
  b: { isScheduled: boolean; scheduledDate?: Date | string; scheduledTime?: string },
  now: Date = new Date(),
): number => {
  const aState = getPlannerScheduleVisualState({ ...a, now });
  const bState = getPlannerScheduleVisualState({ ...b, now });

  const rank = (state: PlannerScheduleVisualState) => {
    if (state === 'overdue') return 2;
    if (state === 'none') return 1;
    return 0;
  };

  const rankDiff = rank(aState) - rank(bState);
  if (rankDiff !== 0) return rankDiff;
  return comparePlannerDueDateTimeAsc(a, b);
};

export const comparePlannerDueDateTimeOverdueFirst = (
  a: { isScheduled: boolean; scheduledDate?: Date | string; scheduledTime?: string },
  b: { isScheduled: boolean; scheduledDate?: Date | string; scheduledTime?: string },
  now: Date = new Date(),
): number => {
  const aState = getPlannerScheduleVisualState({ ...a, now });
  const bState = getPlannerScheduleVisualState({ ...b, now });

  const rank = (state: PlannerScheduleVisualState) => {
    if (state === 'overdue') return 0;
    if (state === 'none') return 2;
    return 1;
  };

  const rankDiff = rank(aState) - rank(bState);
  if (rankDiff !== 0) return rankDiff;
  return comparePlannerDueDateTimeAsc(a, b);
};
