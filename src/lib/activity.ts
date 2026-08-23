export type StudyEvent = {
  created_at: string;
  correct: boolean;
  set_id: string | null;
  card_id: string | null;
};

export type DayBucket = { date: string; total: number; correct: number };

// YYYY-MM-DD in the CALLER's local timezone ("en-CA" happens to format in
// ISO order). Deliberately never called during server render — the
// server's timezone usually differs from the browser's and would bucket
// events into the wrong day, so callers compute this client-side only,
// after mount.
export function localDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA");
}

export function bucketByDay(events: StudyEvent[]): Map<string, DayBucket> {
  const map = new Map<string, DayBucket>();
  for (const e of events) {
    const key = localDateKey(e.created_at);
    const existing = map.get(key) ?? { date: key, total: 0, correct: 0 };
    existing.total += 1;
    if (e.correct) existing.correct += 1;
    map.set(key, existing);
  }
  return map;
}

export type TodayStats = {
  studiedCards: number;
  decksStudied: number;
  paceSeconds: number | null; // null = fewer than 2 events today
  accuracyPct: number | null; // null = no events today
  answered: number;
};

export function computeTodayStats(events: StudyEvent[]): TodayStats {
  const todayKey = localDateKey(new Date().toISOString());
  const todays = events.filter((e) => localDateKey(e.created_at) === todayKey);
  const cardIds = new Set(todays.map((e) => e.card_id).filter((id): id is string => !!id));
  const setIds = new Set(todays.map((e) => e.set_id).filter((id): id is string => !!id));
  const correctCount = todays.filter((e) => e.correct).length;

  let paceSeconds: number | null = null;
  if (todays.length >= 2) {
    const times = todays.map((e) => new Date(e.created_at).getTime()).sort((a, b) => a - b);
    const spanMs = times[times.length - 1] - times[0];
    paceSeconds = spanMs / 1000 / (todays.length - 1);
  }

  return {
    studiedCards: cardIds.size,
    decksStudied: setIds.size,
    paceSeconds,
    accuracyPct: todays.length > 0 ? Math.round((correctCount / todays.length) * 100) : null,
    answered: todays.length,
  };
}

export function formatPace(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s/card`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s/card`;
}

// Plain helper (not a component/hook), so the `Date.now()` call inside it
// isn't flagged as an impure call inside render — callers are Server
// Components that just need "N days ago" once per request, not a reactive
// value.
export function lookbackCutoffIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export type DayCell = { key: string; date: Date; bucket: DayBucket | undefined; future: boolean };

function atMidnight(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

// A flat strip of the last `count` days (today last) — used for the
// "Daily" view.
export function buildDayStrip(count: number, buckets: Map<string, DayBucket>): DayCell[] {
  const today = atMidnight(new Date());
  const days: DayCell[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = localDateKey(date.toISOString());
    days.push({ key, date, bucket: buckets.get(key), future: false });
  }
  return days;
}

// A GitHub-style grid: `weeksCount` columns of 7-day (Sun–Sat) weeks,
// ending on the current week — used for the "Weekly" (short horizon) and
// "Yearly" (full ~year horizon) views alike, just with a different
// weeksCount.
export function buildWeekGrid(weeksCount: number, buckets: Map<string, DayBucket>): DayCell[][] {
  const today = atMidnight(new Date());
  const endSunday = new Date(today);
  endSunday.setDate(endSunday.getDate() - endSunday.getDay());
  const startSunday = new Date(endSunday);
  startSunday.setDate(startSunday.getDate() - (weeksCount - 1) * 7);

  const weeks: DayCell[][] = [];
  for (let w = 0; w < weeksCount; w++) {
    const column: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startSunday);
      date.setDate(date.getDate() + w * 7 + d);
      const key = localDateKey(date.toISOString());
      column.push({ key, date, bucket: buckets.get(key), future: date > today });
    }
    weeks.push(column);
  }
  return weeks;
}
