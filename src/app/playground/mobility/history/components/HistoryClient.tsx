'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { MobilityCompletion, MobilityExercise, MobilitySession } from '@/db/schema';

interface Props {
  sessions: MobilitySession[];
  exercises: MobilityExercise[];
  completions: MobilityCompletion[];
}

type CellState = 'empty' | 'partial' | 'complete';

const DAYS_TO_SHOW = 60;

export default function HistoryClient({ sessions, exercises, completions }: Props) {
  const [expandedSessionId, setExpandedSessionId] = useState<number | null>(null);

  // Items grouped by day. Day-rotational items appear under their day; non-rotational
  // (day === null) items appear on every session day.
  const exercisesForDay = useMemo(() => {
    const map = new Map<number, MobilityExercise[]>();
    const dailyItems = exercises.filter((ex) => ex.day === null);
    for (const day of [1, 2, 3]) {
      const dayItems = exercises.filter((ex) => ex.day === day);
      map.set(day, [...dayItems, ...dailyItems]);
    }
    return map;
  }, [exercises]);

  const completionsBySession = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const c of completions) {
      const list = map.get(c.sessionId) ?? [];
      list.push(c.exerciseId);
      map.set(c.sessionId, list);
    }
    return map;
  }, [completions]);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, MobilitySession[]>();
    for (const s of sessions) {
      const list = map.get(s.sessionDate) ?? [];
      list.push(s);
      map.set(s.sessionDate, list);
    }
    return map;
  }, [sessions]);

  const heatmapDays = useMemo(() => {
    const days: { date: string; state: CellState; sessions: MobilitySession[] }[] = [];
    const today = new Date();
    for (let i = DAYS_TO_SHOW - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = isoDate(d);
      const sList = sessionsByDate.get(iso) ?? [];
      let state: CellState = 'empty';
      if (sList.length > 0) {
        state = sList.some((s) => s.completedAt !== null) ? 'complete' : 'partial';
      }
      days.push({ date: iso, state, sessions: sList });
    }
    return days;
  }, [sessionsByDate]);

  const monthlyStreak = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return sessions.filter((s) => {
      if (!s.completedAt) return false;
      const d = new Date(s.completedAt);
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;
  }, [sessions]);

  return (
    <div className="py-8 md:py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">
              <span className="text-gradient-rainbow">Mobility History</span>
            </h1>
            <p className="text-surface-400 text-sm mt-1">
              🔥 {monthlyStreak} {monthlyStreak === 1 ? 'session' : 'sessions'} this month
            </p>
          </div>
          <Link
            href="/playground/mobility"
            className="text-sm text-surface-400 hover:text-rainbow-cyan transition-colors"
          >
            ← Back
          </Link>
        </div>

        {/* Heatmap */}
        <section className="card p-4 mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rainbow-teal to-rainbow-cyan" />
          <h2 className="text-sm font-semibold text-surface-300 mb-3">Last 60 days</h2>
          <div className="grid grid-cols-[repeat(30,_minmax(0,_1fr))] sm:grid-cols-[repeat(60,_minmax(0,_1fr))] gap-1">
            {heatmapDays.map((d) => (
              <div
                key={d.date}
                title={`${d.date}${d.sessions.length ? ` — ${d.state}` : ''}`}
                className={`aspect-square rounded-sm ${cellClass(d.state)}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3 text-xs text-surface-500">
            <Legend color="bg-surface-800" label="None" />
            <Legend color="bg-rainbow-orange/60" label="Started" />
            <Legend color="bg-rainbow-green/80" label="Completed" />
          </div>
        </section>

        {/* List */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Sessions</h2>
          {sessions.length === 0 ? (
            <div className="card p-6 text-center text-surface-500 text-sm">
              No sessions yet. Get started on the{' '}
              <Link href="/playground/mobility" className="text-rainbow-cyan hover:underline">
                mobility page
              </Link>
              .
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => {
                const dayExercises = exercisesForDay.get(s.day) ?? [];
                const doneIds = new Set(completionsBySession.get(s.id) ?? []);
                const total = dayExercises.length;
                const done = dayExercises.filter((ex) => doneIds.has(ex.id)).length;
                const pct = total === 0 ? 0 : Math.round((done / total) * 100);
                const isComplete = s.completedAt !== null;
                const isExpanded = expandedSessionId === s.id;
                const duration = s.completedAt
                  ? formatDuration(new Date(s.startedAt), new Date(s.completedAt))
                  : null;

                return (
                  <div
                    key={s.id}
                    className="card overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setExpandedSessionId(isExpanded ? null : s.id)
                      }
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-800/30 transition-colors text-left"
                    >
                      <div
                        className={`w-2 h-10 rounded-full flex-shrink-0 ${
                          isComplete ? 'bg-rainbow-green' : 'bg-rainbow-orange'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-surface-100 font-medium">
                          {formatDate(s.sessionDate)} — Day {s.day}
                          {!isComplete && (
                            <span className="ml-2 text-xs text-rainbow-orange">
                              not finished
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-surface-500 mt-0.5">
                          {done}/{total} exercises ({pct}%)
                          {duration && <span className="ml-2">· {duration}</span>}
                        </div>
                      </div>
                      <span className="text-surface-500 text-sm">
                        {isExpanded ? '▾' : '▸'}
                      </span>
                    </button>
                    {isExpanded && (
                      <ul className="border-t border-surface-700/50 px-4 py-3 space-y-1">
                        {dayExercises.map((ex) => {
                          const isDone = doneIds.has(ex.id);
                          return (
                            <li
                              key={ex.id}
                              className="flex items-center gap-2 text-xs"
                            >
                              <span
                                className={
                                  isDone
                                    ? 'text-rainbow-green'
                                    : 'text-surface-600'
                                }
                              >
                                {isDone ? '✓' : '○'}
                              </span>
                              <span
                                className={
                                  isDone
                                    ? 'text-surface-200'
                                    : 'text-surface-500 line-through'
                                }
                              >
                                {ex.name}
                              </span>
                              {ex.setsReps && (
                                <span className="text-surface-600">· {ex.setsReps}</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`w-3 h-3 rounded-sm ${color}`} />
      {label}
    </span>
  );
}

function cellClass(state: CellState): string {
  if (state === 'complete') return 'bg-rainbow-green/80';
  if (state === 'partial') return 'bg-rainbow-orange/60';
  return 'bg-surface-800';
}

function isoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatDuration(start: Date, end: Date): string {
  const ms = end.getTime() - start.getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  return `${hours}h ${remMin}m`;
}
