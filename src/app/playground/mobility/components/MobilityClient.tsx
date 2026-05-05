'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { MobilitySession } from '@/db/schema';
import {
  CATEGORY_HINT,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  isValidDay,
  type ExerciseWithRelations,
  type MobilityCategory,
  type MobilityDay,
} from '@/lib/mobility/program';

interface Props {
  exercises: ExerciseWithRelations[];
  initialActiveSession: MobilitySession | null;
  initialCompletedExerciseIds: number[];
  suggestedDay: number;
}

export default function MobilityClient({
  exercises,
  initialActiveSession,
  initialCompletedExerciseIds,
  suggestedDay,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedDay, setSelectedDay] = useState<MobilityDay>(
    isValidDay(suggestedDay) ? suggestedDay : 1,
  );
  const [activeSession, setActiveSession] = useState<MobilitySession | null>(
    initialActiveSession,
  );
  const [completed, setCompleted] = useState<Set<number>>(
    new Set(initialCompletedExerciseIds),
  );
  const [openSections, setOpenSections] = useState<Set<MobilityCategory>>(
    new Set(['exercise', 'stretch']),
  );
  const [expandedVideoExerciseId, setExpandedVideoExerciseId] = useState<number | null>(null);
  const [activeVideoIndex, setActiveVideoIndex] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const dayLocked = activeSession ? activeSession.day : null;

  const exercisesByDay = useMemo(() => {
    const groups: Record<MobilityCategory, ExerciseWithRelations[]> = {
      exercise: [],
      stretch: [],
      recovery_at_athlecare: [],
    };
    for (const ex of exercises) {
      const cat = ex.category as MobilityCategory;
      if (!groups[cat]) continue;
      if (cat === 'exercise') {
        // Rotational items only show on days they're assigned to.
        if (!ex.days.includes(selectedDay)) continue;
      }
      groups[cat].push(ex);
    }
    // Sort: rotational items by their per-day orderInDay; non-rotational by orderInDay.
    groups.exercise.sort((a, b) => {
      const ao = a.orderByDay[selectedDay] ?? Number.MAX_SAFE_INTEGER;
      const bo = b.orderByDay[selectedDay] ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return a.id - b.id;
    });
    groups.stretch.sort((a, b) => a.orderInDay - b.orderInDay || a.id - b.id);
    groups.recovery_at_athlecare.sort(
      (a, b) => a.orderInDay - b.orderInDay || a.id - b.id,
    );
    return groups;
  }, [exercises, selectedDay]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }

  function toggleSection(cat: MobilityCategory) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  async function handleSwitchDay(day: MobilityDay) {
    if (day === selectedDay) return;
    if (activeSession && activeSession.day !== day) {
      const ok = window.confirm(
        `You have an active Day ${activeSession.day} session. Switching will discard it. Continue?`,
      );
      if (!ok) return;
      try {
        const res = await fetch('/api/mobility/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ day, force: true }),
        });
        if (!res.ok) throw new Error('Failed to switch day');
        const data = await res.json();
        setActiveSession(data.session);
        setCompleted(new Set());
        setSelectedDay(day);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
      return;
    }
    setSelectedDay(day);
  }

  async function ensureSession(day: MobilityDay): Promise<MobilitySession | null> {
    if (activeSession) return activeSession;
    try {
      const res = await fetch('/api/mobility/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day }),
      });
      if (!res.ok) throw new Error('Failed to start session');
      const data = await res.json();
      setActiveSession(data.session);
      return data.session;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      return null;
    }
  }

  async function handleToggle(exerciseId: number) {
    if (dayLocked !== null && dayLocked !== selectedDay) {
      setError('Active session is on a different day. Switch days first.');
      return;
    }
    const session = await ensureSession(selectedDay);
    if (!session) return;

    const wasCompleted = completed.has(exerciseId);
    const nextCompleted = new Set(completed);
    if (wasCompleted) nextCompleted.delete(exerciseId);
    else nextCompleted.add(exerciseId);
    setCompleted(nextCompleted);

    try {
      const res = await fetch('/api/mobility/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          exerciseId,
          completed: !wasCompleted,
        }),
      });
      if (!res.ok) throw new Error('Failed to update');
    } catch (err) {
      setCompleted(completed);
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  async function handleFinish() {
    if (!activeSession) return;
    if (completed.size === 0) return;
    try {
      const res = await fetch(`/api/mobility/sessions/${activeSession.id}/finish`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to finish session');
      }
      const finishedDay = activeSession.day as MobilityDay;
      const next = ((finishedDay % 3) + 1) as MobilityDay;
      showToast(`Day ${finishedDay} done. Next up: Day ${next}.`);
      setActiveSession(null);
      setCompleted(new Set());
      setSelectedDay(next);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <div className="py-8 md:py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              <span className="text-gradient-rainbow">Mobility & Recovery</span>
            </h1>
            <Link
              href="/playground/mobility/history"
              className="text-sm text-surface-400 hover:text-rainbow-cyan transition-colors"
            >
              History →
            </Link>
          </div>
          <p className="text-surface-400 text-sm md:text-base">
            Athlecare program — Day {selectedDay}
            {activeSession && activeSession.day === selectedDay && (
              <span className="ml-2 text-rainbow-cyan">(in progress)</span>
            )}
          </p>
        </div>

        {/* Day picker */}
        <div className="flex gap-2 mb-6">
          {([1, 2, 3] as MobilityDay[]).map((d) => {
            const isActive = d === selectedDay;
            const isSuggested = d === suggestedDay && !activeSession;
            return (
              <button
                key={d}
                onClick={() => handleSwitchDay(d)}
                className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all border ${
                  isActive
                    ? 'bg-rainbow-cyan/15 border-rainbow-cyan/50 text-rainbow-cyan'
                    : 'bg-surface-800/40 border-surface-700 text-surface-300 hover:border-surface-600'
                }`}
              >
                Day {d}
                {isSuggested && !isActive && (
                  <span className="ml-1.5 text-xs text-rainbow-teal">•</span>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-sm text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-300 hover:text-red-200">
              ✕
            </button>
          </div>
        )}

        {toast && (
          <div className="bg-rainbow-cyan/10 border border-rainbow-cyan/30 rounded-lg p-3 mb-4 text-sm text-rainbow-cyan">
            {toast}
          </div>
        )}

        {/* Sections */}
        <div className="space-y-4">
          {CATEGORY_ORDER.map((cat) => {
            const items = exercisesByDay[cat];
            if (items.length === 0) return null;
            const isOpen = openSections.has(cat);
            const completedInCat = items.filter((ex) => completed.has(ex.id)).length;
            const hint = CATEGORY_HINT[cat];
            return (
              <section
                key={cat}
                className="card p-0 overflow-hidden relative"
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${
                    cat === 'exercise'
                      ? 'from-rainbow-teal to-rainbow-cyan'
                      : cat === 'stretch'
                        ? 'from-rainbow-cyan to-rainbow-purple'
                        : 'from-rainbow-purple to-rainbow-pink'
                  }`}
                />
                <button
                  onClick={() => toggleSection(cat)}
                  className="w-full flex items-center justify-between px-4 py-4 hover:bg-surface-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        {CATEGORY_LABELS[cat]}
                      </h2>
                      {hint && (
                        <p className="text-xs text-surface-500 mt-0.5">{hint}</p>
                      )}
                    </div>
                    <span className="text-sm text-surface-500">
                      {completedInCat}/{items.length}
                    </span>
                  </div>
                  <span className="text-surface-400 text-sm">{isOpen ? '▾' : '▸'}</span>
                </button>

                {isOpen && (
                  <ul className="border-t border-surface-700/60">
                    {items.map((ex) => {
                      const isDone = completed.has(ex.id);
                      const isVideoOpen = expandedVideoExerciseId === ex.id;
                      const hasVideos = ex.videos.length > 0;
                      const activeIdx = Math.min(
                        activeVideoIndex[ex.id] ?? 0,
                        Math.max(0, ex.videos.length - 1),
                      );
                      const activeVideo = hasVideos ? ex.videos[activeIdx] : null;
                      return (
                        <li
                          key={ex.id}
                          className="border-b border-surface-700/40 last:border-b-0"
                        >
                          <div className="flex items-start gap-3 p-4">
                            <button
                              onClick={() => handleToggle(ex.id)}
                              aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
                              className={`flex-shrink-0 w-8 h-8 rounded-md border-2 flex items-center justify-center transition-all ${
                                isDone
                                  ? 'bg-rainbow-green border-rainbow-green text-surface-950'
                                  : 'border-surface-600 hover:border-rainbow-teal/70'
                              }`}
                            >
                              {isDone && (
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  strokeWidth={3}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`text-sm md:text-base font-medium ${
                                    isDone
                                      ? 'text-surface-500 line-through'
                                      : 'text-surface-100'
                                  }`}
                                >
                                  {ex.name}
                                </span>
                                {ex.setsReps && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-surface-800 text-surface-300 border border-surface-700">
                                    {ex.setsReps}
                                  </span>
                                )}
                                {ex.videos.length > 1 && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-rainbow-cyan/10 text-rainbow-cyan border border-rainbow-cyan/30">
                                    {ex.videos.length} videos
                                  </span>
                                )}
                              </div>
                              {ex.notes && (
                                <p className="text-xs text-surface-500 mt-1">{ex.notes}</p>
                              )}
                            </div>

                            {hasVideos ? (
                              <button
                                onClick={() =>
                                  setExpandedVideoExerciseId(isVideoOpen ? null : ex.id)
                                }
                                className="flex-shrink-0 w-14 h-14 rounded-md bg-surface-800 border border-surface-700 hover:border-rainbow-cyan/50 transition-colors flex items-center justify-center text-rainbow-cyan"
                                aria-label={isVideoOpen ? 'Hide video' : 'Show video'}
                              >
                                {isVideoOpen ? '✕' : '▶'}
                              </button>
                            ) : (
                              <div className="flex-shrink-0 w-14 h-14 rounded-md bg-surface-800/50 border border-dashed border-surface-700 flex items-center justify-center text-[10px] text-surface-600 text-center px-1">
                                no video
                              </div>
                            )}
                          </div>

                          {isVideoOpen && activeVideo && (
                            <div className="px-4 pb-4 space-y-2">
                              <video
                                key={activeVideo.id}
                                src={activeVideo.url}
                                controls
                                playsInline
                                className="w-full max-h-[70vh] rounded-md bg-black"
                              />
                              {ex.videos.length > 1 && (
                                <div className="flex flex-wrap gap-2">
                                  {ex.videos.map((v, idx) => {
                                    const isActive = idx === activeIdx;
                                    return (
                                      <button
                                        key={v.id}
                                        onClick={() =>
                                          setActiveVideoIndex((prev) => ({
                                            ...prev,
                                            [ex.id]: idx,
                                          }))
                                        }
                                        className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                                          isActive
                                            ? 'bg-rainbow-cyan/15 border-rainbow-cyan/50 text-rainbow-cyan'
                                            : 'bg-surface-800/40 border-surface-700 text-surface-400 hover:border-surface-600'
                                        }`}
                                      >
                                        {v.label?.trim() || `Video ${idx + 1}`}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>

        {/* Finish button */}
        <div className="mt-6 sticky bottom-4">
          <button
            onClick={handleFinish}
            disabled={!activeSession || completed.size === 0 || isPending}
            className="w-full py-4 rounded-lg font-semibold text-base bg-gradient-to-r from-rainbow-teal to-rainbow-cyan text-surface-950 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-rainbow-cyan/20 hover:shadow-rainbow-cyan/40 transition-shadow"
          >
            Finish Session
            {completed.size > 0 && (
              <span className="ml-2 text-surface-900/70 text-sm font-normal">
                ({completed.size} done)
              </span>
            )}
          </button>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/playground/mobility/admin"
            className="text-xs text-surface-600 hover:text-surface-400 transition-colors"
          >
            Manage videos & exercises
          </Link>
        </div>
      </div>
    </div>
  );
}
