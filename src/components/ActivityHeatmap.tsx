"use client";

import { useEffect, useMemo, useState } from "react";
import {
  bucketByDay,
  buildDayStrip,
  buildWeekGrid,
  computeTodayStats,
  formatPace,
  type DayCell,
  type StudyEvent,
} from "@/lib/activity";
import { SegmentedControl } from "@/components/SegmentedControl";

type View = "daily" | "weekly" | "yearly";

const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "yearly", label: "Yearly" },
];

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function intensityClass(count: number, max: number): string {
  if (count <= 0) return "bg-amber-900/10";
  const ratio = count / Math.max(max, 1);
  if (ratio > 0.75) return "bg-rose-600";
  if (ratio > 0.5) return "bg-rose-500";
  if (ratio > 0.25) return "bg-rose-400";
  return "bg-rose-300";
}

function cellTitle(cell: DayCell): string {
  const dateLabel = cell.date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  if (!cell.bucket) return `${dateLabel} — no answers`;
  return `${dateLabel} — ${cell.bucket.total} answered, ${cell.bucket.correct} correct`;
}

// Mobile-first smaller (a 53-column Yearly grid has no wrap points, so its
// cells must be the tightest on the cramped viewport, not the roomy one).
function Cell({ cell, max }: { cell: DayCell; max: number }) {
  if (cell.future) return <div className="h-2.5 w-2.5 shrink-0 rounded-sm sm:h-3.5 sm:w-3.5" />;
  return (
    <div
      title={cellTitle(cell)}
      className={`h-2.5 w-2.5 shrink-0 rounded-sm transition sm:h-3.5 sm:w-3.5 ${intensityClass(cell.bucket?.total ?? 0, max)}`}
    />
  );
}

// Sparse month labels: only stamp a column when a new month starts within
// it, GitHub-style, so labels don't repeat every column. Kept as a plain
// (non-component) helper — the sequential `lastMonth` tracker it mutates
// while walking the columns wouldn't be safe to mutate directly inside a
// component body under React Compiler's memoization rules.
function computeMonthLabels(weeks: DayCell[][]): string[] {
  let lastMonth = -1;
  return weeks.map((col) => {
    const firstOfMonthDay = col.find((c) => c.date.getDate() <= 7);
    if (!firstOfMonthDay) return "";
    const month = firstOfMonthDay.date.getMonth();
    if (month === lastMonth) return "";
    lastMonth = month;
    return MONTH_LABELS[month];
  });
}

function WeekGrid({ weeks }: { weeks: DayCell[][] }) {
  const max = Math.max(1, ...weeks.flat().map((c) => c.bucket?.total ?? 0));
  const monthLabels = computeMonthLabels(weeks);

  return (
    <div className="min-w-0 overflow-x-auto">
      <div className="inline-flex flex-col gap-1">
        <div className="flex gap-1">
          {monthLabels.map((label, i) => (
            <span key={i} className="w-2.5 shrink-0 text-[10px] text-amber-950/40 sm:w-3.5">
              {label}
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          {weeks.map((col, i) => (
            <div key={i} className="flex shrink-0 flex-col gap-1">
              {col.map((cell) => (
                <Cell key={cell.key} cell={cell} max={max} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DayStrip({ days }: { days: DayCell[] }) {
  const max = Math.max(1, ...days.map((c) => c.bucket?.total ?? 0));
  return (
    <div className="flex flex-wrap gap-1.5">
      {days.map((cell) => (
        <div
          key={cell.key}
          title={cellTitle(cell)}
          className={`h-5 w-5 rounded-md transition ${intensityClass(cell.bucket?.total ?? 0, max)}`}
        />
      ))}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-amber-900/10 bg-surface p-3 text-center">
      <p className="truncate text-base font-semibold tracking-tight sm:text-lg">{value}</p>
      <p className="truncate text-[11px] text-amber-950/50">{label}</p>
    </div>
  );
}

// Client-only: buckets raw events into local-calendar days. Deliberately
// not computed during render (server and browser timezones usually
// differ, which would bucket events into the wrong day and cause a
// hydration mismatch) — this waits for an effect after mount, same pattern
// LearnRunner uses for resuming localStorage-backed state.
export function ActivityHeatmap({ events }: { events: StudyEvent[] }) {
  const [view, setView] = useState<View>("yearly");
  const [ready, setReady] = useState(false);

  // Deliberately deferred to an effect, strictly after the first client
  // render: "today"/local-day bucketing can only be computed correctly
  // once we know the browser's timezone, and the server always renders as
  // if not-yet-ready. Reading that is exactly the "sync with an external
  // system" case useEffect is for; same pattern LearnRunner uses to resume
  // localStorage-backed state without a hydration mismatch.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const buckets = useMemo(() => bucketByDay(events), [events]);
  const today = useMemo(() => computeTodayStats(events), [events]);

  const cells = useMemo(() => {
    if (view === "daily") return { kind: "strip" as const, days: buildDayStrip(30, buckets) };
    if (view === "weekly") return { kind: "grid" as const, weeks: buildWeekGrid(12, buckets) };
    return { kind: "grid" as const, weeks: buildWeekGrid(53, buckets) };
  }, [view, buckets]);

  // Everything below depends on "today"/local-day bucketing, which is only
  // safe to compute and render client-side (see the comment above) — until
  // mount, show a static skeleton with no date-derived values in it at all,
  // so the server-rendered HTML can't disagree with the client's.
  if (!ready) {
    return (
      <div className="min-w-0 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="Studied today" value="—" />
          <StatTile label="Decks today" value="—" />
          <StatTile label="Pace" value="—" />
          <StatTile label="Accuracy today" value="—" />
        </div>
        <div className="h-40 rounded-2xl border border-amber-900/10 bg-surface p-4" />
      </div>
    );
  }

  return (
    <div className="min-w-0 flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Studied today" value={String(today.studiedCards)} />
        <StatTile label="Decks today" value={String(today.decksStudied)} />
        <StatTile label="Pace" value={formatPace(today.paceSeconds)} />
        <StatTile label="Accuracy today" value={today.accuracyPct === null ? "—" : `${today.accuracyPct}%`} />
      </div>

      <div className="min-w-0 rounded-2xl border border-amber-900/10 bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-amber-950/60">Activity</h3>
          <div className="w-full sm:w-48">
            <SegmentedControl options={VIEW_OPTIONS} value={view} onChange={setView} />
          </div>
        </div>
        {cells.kind === "strip" ? <DayStrip days={cells.days} /> : <WeekGrid weeks={cells.weeks} />}
      </div>
    </div>
  );
}
