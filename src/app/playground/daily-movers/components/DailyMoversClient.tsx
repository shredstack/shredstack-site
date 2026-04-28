'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CORE_ROUTINE,
  CORE_SCHEME,
  STRETCH_ROUTINE,
  STRETCH_SCHEME,
  WEEKDAYS,
  type Slot,
  type TrainingBlock,
  getCycleWeekFor,
  getProgramForWeek,
  getTrainingBlock,
  isoMondayOf,
  isoSundayOf,
  weekdayDatesOf,
} from '@/lib/daily-movers/program';

interface DailyMoversClientProps {
  email: string;
}

interface SessionRow {
  id: number;
  loggedDate: string;
  cycleWeek: number;
  slot: Slot;
  completedAt: string;
  notes: string | null;
}

interface Stats {
  currentStreak: number;
  longestStreak: number;
  thisWeekCount: number;
  thisWeekTarget: number;
  totalSessions: number;
  currentCycleWeek: 1 | 2 | 3 | 4;
}

const SLOT_LABELS: Record<Slot, string> = {
  training: 'Training',
  core: 'Core',
  stretch: 'Stretch',
};

const STORAGE_KEY = 'daily-movers-overrides-v1';

interface Overrides {
  // key format: `${cycleWeek}-${dayIdx}` (e.g. "1-0" = week 1, Mon)
  training: Record<string, string[]>;
  core: string[] | null;
  stretch: string[] | null;
}

const EMPTY_OVERRIDES: Overrides = { training: {}, core: null, stretch: null };

type EditTarget =
  | { kind: 'training'; week: 1 | 2 | 3 | 4; dayIdx: 0 | 1 | 2 | 3 }
  | { kind: 'core' }
  | { kind: 'stretch' };

function todayWeekdayIndex(): 0 | 1 | 2 | 3 {
  const day = new Date().getUTCDay(); // Sun=0..Sat=6
  const idx = (day + 6) % 7; // Mon=0..Sun=6
  return (idx <= 3 ? idx : 0) as 0 | 1 | 2 | 3;
}

function trainingKey(week: 1 | 2 | 3 | 4, dayIdx: 0 | 1 | 2 | 3): string {
  return `${week}-${dayIdx}`;
}

export default function DailyMoversClient({ email }: DailyMoversClientProps) {
  const today = useMemo(() => new Date(), []);
  const initialCycleWeek = getCycleWeekFor(today);
  const weekDates = useMemo(() => weekdayDatesOf(today), [today]);
  const weekStart = useMemo(() => isoMondayOf(today), [today]);
  const weekEnd = useMemo(() => isoSundayOf(today), [today]);

  const [selectedCycleWeek, setSelectedCycleWeek] = useState<1 | 2 | 3 | 4>(initialCycleWeek);
  const [selectedDayIdx, setSelectedDayIdx] = useState<0 | 1 | 2 | 3>(todayWeekdayIndex());
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [overrides, setOverrides] = useState<Overrides>(EMPTY_OVERRIDES);
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [draftText, setDraftText] = useState('');

  const selectedDate = weekDates[selectedDayIdx];
  const programWeek = getProgramForWeek(selectedCycleWeek);
  const trainingBlock = getTrainingBlock(selectedCycleWeek, selectedDayIdx);

  // Load overrides from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Defensive: only adopt fields we recognize.
        setOverrides({
          training: parsed.training && typeof parsed.training === 'object' ? parsed.training : {},
          core: Array.isArray(parsed.core) ? parsed.core : null,
          stretch: Array.isArray(parsed.stretch) ? parsed.stretch : null,
        });
      }
    } catch {
      // ignore — fall back to defaults
    }
  }, []);

  const persistOverrides = useCallback((next: Overrides) => {
    setOverrides(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      setToast('Could not save edit — browser storage unavailable');
    }
  }, []);

  const resolveExercises = useCallback(
    (slot: Slot, week: 1 | 2 | 3 | 4, dayIdx: 0 | 1 | 2 | 3): string[] => {
      if (slot === 'training') {
        const key = trainingKey(week, dayIdx);
        return overrides.training[key] ?? [...getTrainingBlock(week, dayIdx).exercises];
      }
      if (slot === 'core') return overrides.core ?? [...CORE_ROUTINE];
      return overrides.stretch ?? [...STRETCH_ROUTINE];
    },
    [overrides],
  );

  const loadAll = useCallback(async () => {
    try {
      const [sessionsRes, statsRes] = await Promise.all([
        fetch(`/api/daily-movers/sessions?start=${weekStart}&end=${weekEnd}`),
        fetch('/api/daily-movers/stats'),
      ]);
      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(data.sessions);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const sessionByKey = useMemo(() => {
    const map = new Map<string, SessionRow>();
    for (const s of sessions) {
      map.set(`${s.loggedDate}::${s.slot}`, s);
    }
    return map;
  }, [sessions]);

  function isLogged(date: string, slot: Slot): boolean {
    return sessionByKey.has(`${date}::${slot}`);
  }

  async function logSession(date: string, slot: Slot) {
    const cycleWeek = getCycleWeekFor(new Date(`${date}T00:00:00Z`));
    const optimisticId = -Date.now();
    const optimistic: SessionRow = {
      id: optimisticId,
      loggedDate: date,
      cycleWeek,
      slot,
      completedAt: new Date().toISOString(),
      notes: null,
    };
    setSessions((prev) => [...prev.filter((s) => !(s.loggedDate === date && s.slot === slot)), optimistic]);

    try {
      const res = await fetch('/api/daily-movers/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loggedDate: date, cycleWeek, slot }),
      });
      if (!res.ok) throw new Error('Failed to log');
      const data = await res.json();
      setSessions((prev) => [...prev.filter((s) => s.id !== optimisticId), data.session]);
      fetch('/api/daily-movers/stats').then((r) => {
        if (r.ok) r.json().then(setStats);
      });
    } catch {
      setSessions((prev) => prev.filter((s) => s.id !== optimisticId));
      setToast('Could not save — please try again');
    }
  }

  async function unlogSession(date: string, slot: Slot) {
    const existing = sessionByKey.get(`${date}::${slot}`);
    if (!existing) return;
    setSessions((prev) => prev.filter((s) => s.id !== existing.id));

    try {
      const res = await fetch(`/api/daily-movers/sessions/${existing.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      fetch('/api/daily-movers/stats').then((r) => {
        if (r.ok) r.json().then(setStats);
      });
    } catch {
      setSessions((prev) => [...prev, existing]);
      setToast('Could not undo — please try again');
    }
  }

  async function toggle(date: string, slot: Slot) {
    if (isLogged(date, slot)) {
      await unlogSession(date, slot);
    } else {
      await logSession(date, slot);
    }
  }

  async function resetAllLogs() {
    setResetting(true);
    try {
      const wide = await fetch('/api/daily-movers/sessions?start=2020-01-01&end=2999-12-31');
      if (wide.ok) {
        const data: { sessions: SessionRow[] } = await wide.json();
        await Promise.all(
          data.sessions.map((s) =>
            fetch(`/api/daily-movers/sessions/${s.id}`, { method: 'DELETE' }),
          ),
        );
      }
      await loadAll();
      setShowResetConfirm(false);
      setToast('All logs reset');
    } catch {
      setToast('Reset failed — please try again');
    } finally {
      setResetting(false);
    }
  }

  function openEdit(target: EditTarget) {
    let exercises: string[];
    if (target.kind === 'training') {
      exercises = resolveExercises('training', target.week, target.dayIdx);
    } else if (target.kind === 'core') {
      exercises = resolveExercises('core', selectedCycleWeek, selectedDayIdx);
    } else {
      exercises = resolveExercises('stretch', selectedCycleWeek, selectedDayIdx);
    }
    setDraftText(exercises.join('\n'));
    setEditing(target);
  }

  function saveEdit() {
    if (!editing) return;
    const lines = draftText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setToast('Add at least one exercise before saving');
      return;
    }
    const next: Overrides = { ...overrides, training: { ...overrides.training } };
    if (editing.kind === 'training') {
      next.training[trainingKey(editing.week, editing.dayIdx)] = lines;
    } else if (editing.kind === 'core') {
      next.core = lines;
    } else {
      next.stretch = lines;
    }
    persistOverrides(next);
    setEditing(null);
    setToast('Saved');
  }

  function resetEdit() {
    if (!editing) return;
    const next: Overrides = { ...overrides, training: { ...overrides.training } };
    if (editing.kind === 'training') {
      delete next.training[trainingKey(editing.week, editing.dayIdx)];
    } else if (editing.kind === 'core') {
      next.core = null;
    } else {
      next.stretch = null;
    }
    persistOverrides(next);
    setEditing(null);
    setToast('Reset to default');
  }

  function isCustomized(target: EditTarget): boolean {
    if (target.kind === 'training') return overrides.training[trainingKey(target.week, target.dayIdx)] !== undefined;
    if (target.kind === 'core') return overrides.core !== null;
    return overrides.stretch !== null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-surface-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  const trainingExercises = resolveExercises('training', selectedCycleWeek, selectedDayIdx);
  const coreExercises = resolveExercises('core', selectedCycleWeek, selectedDayIdx);
  const stretchExercises = resolveExercises('stretch', selectedCycleWeek, selectedDayIdx);

  return (
    <div className="min-h-screen bg-surface-950">
      <div className="section-container py-6 space-y-8">
        <Header
          email={email}
          today={today}
          selectedCycleWeek={selectedCycleWeek}
          onCycleWeekChange={setSelectedCycleWeek}
          selectedDayIdx={selectedDayIdx}
          onDayIdxChange={setSelectedDayIdx}
          phase={programWeek.phase}
        />

        {stats && <StatCards stats={stats} />}

        <DayCards
          date={selectedDate}
          dayLabel={WEEKDAYS[selectedDayIdx]}
          block={trainingBlock}
          trainingExercises={trainingExercises}
          coreExercises={coreExercises}
          stretchExercises={stretchExercises}
          trainingCustomized={overrides.training[trainingKey(selectedCycleWeek, selectedDayIdx)] !== undefined}
          coreCustomized={overrides.core !== null}
          stretchCustomized={overrides.stretch !== null}
          isLogged={isLogged}
          onToggle={toggle}
          onEditTraining={() => openEdit({ kind: 'training', week: selectedCycleWeek, dayIdx: selectedDayIdx })}
          onEditCore={() => openEdit({ kind: 'core' })}
          onEditStretch={() => openEdit({ kind: 'stretch' })}
        />

        <WeekGrid
          weekDates={weekDates}
          cycleWeek={selectedCycleWeek}
          isLogged={isLogged}
          onToggle={toggle}
          todayDate={weekDates[todayWeekdayIndex()]}
        />

        <div className="flex justify-end">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="text-xs text-surface-600 hover:text-surface-400 transition-colors"
          >
            Reset all logs
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-800 border border-surface-700 text-surface-200 text-sm px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-surface-100 mb-2">Reset all logs?</h3>
            <p className="text-sm text-surface-400 mb-6">
              This soft-deletes every session you&apos;ve logged. They won&apos;t appear in stats or the week grid.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={resetting}
                className="px-4 py-2 text-sm text-surface-300 hover:text-surface-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={resetAllLogs}
                disabled={resetting}
                className="px-4 py-2 text-sm bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-lg transition-colors disabled:opacity-50"
              >
                {resetting ? 'Resetting...' : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <EditModal
          target={editing}
          draftText={draftText}
          onChangeText={setDraftText}
          onCancel={() => setEditing(null)}
          onSave={saveEdit}
          onReset={resetEdit}
          customized={isCustomized(editing)}
        />
      )}
    </div>
  );
}

function Header({
  email,
  today,
  selectedCycleWeek,
  onCycleWeekChange,
  selectedDayIdx,
  onDayIdxChange,
  phase,
}: {
  email: string;
  today: Date;
  selectedCycleWeek: 1 | 2 | 3 | 4;
  onCycleWeekChange: (w: 1 | 2 | 3 | 4) => void;
  selectedDayIdx: 0 | 1 | 2 | 3;
  onDayIdxChange: (d: 0 | 1 | 2 | 3) => void;
  phase: string;
}) {
  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Daily Movers</h1>
          <p className="text-surface-400 text-sm mt-1">
            {dateLabel} &middot; <span className="text-rainbow-cyan font-medium">Week {selectedCycleWeek}</span> &middot; {phase} &middot; HYROX prep
          </p>
        </div>
        <div className="text-sm text-surface-500">{email}</div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1">
          <span className="text-xs text-surface-500 mr-2">Week</span>
          {([1, 2, 3, 4] as const).map((w) => (
            <button
              key={w}
              onClick={() => onCycleWeekChange(w)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                selectedCycleWeek === w
                  ? 'bg-rainbow-cyan text-white font-medium'
                  : 'bg-surface-800 text-surface-300 hover:bg-surface-700'
              }`}
            >
              {w}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-surface-500 mr-2">Day</span>
          {WEEKDAYS.map((label, idx) => (
            <button
              key={label}
              onClick={() => onDayIdxChange(idx as 0 | 1 | 2 | 3)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                selectedDayIdx === idx
                  ? 'bg-rainbow-purple text-white font-medium'
                  : 'bg-surface-800 text-surface-300 hover:bg-surface-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCards({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard label="This week" value={`${stats.thisWeekCount} / ${stats.thisWeekTarget}`} accentClass="bg-rainbow-cyan" />
      <StatCard label="Current streak" value={`${stats.currentStreak} day${stats.currentStreak === 1 ? '' : 's'}`} accentClass="bg-rainbow-orange" />
      <StatCard label="Total sessions" value={String(stats.totalSessions)} accentClass="bg-rainbow-purple" />
      <StatCard label="Cycle week" value={`Week ${stats.currentCycleWeek}`} accentClass="bg-rainbow-green" />
    </div>
  );
}

function StatCard({ label, value, accentClass }: { label: string; value: string; accentClass: string }) {
  return (
    <div className="card p-4 relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accentClass}`} />
      <div className="text-xs text-surface-500 uppercase tracking-wide">{label}</div>
      <div className="text-xl font-bold text-surface-100 mt-1">{value}</div>
    </div>
  );
}

function DayCards({
  date,
  dayLabel,
  block,
  trainingExercises,
  coreExercises,
  stretchExercises,
  trainingCustomized,
  coreCustomized,
  stretchCustomized,
  isLogged,
  onToggle,
  onEditTraining,
  onEditCore,
  onEditStretch,
}: {
  date: string;
  dayLabel: string;
  block: TrainingBlock;
  trainingExercises: string[];
  coreExercises: string[];
  stretchExercises: string[];
  trainingCustomized: boolean;
  coreCustomized: boolean;
  stretchCustomized: boolean;
  isLogged: (date: string, slot: Slot) => boolean;
  onToggle: (date: string, slot: Slot) => void;
  onEditTraining: () => void;
  onEditCore: () => void;
  onEditStretch: () => void;
}) {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <BlockCard
        title={`${dayLabel} — Training`}
        subtitle={block.theme}
        meta={`${block.scheme} · HYROX: ${block.hyroxFocus}`}
        items={trainingExercises}
        customized={trainingCustomized}
        done={isLogged(date, 'training')}
        onToggle={() => onToggle(date, 'training')}
        onEdit={onEditTraining}
      />
      <BlockCard
        title="Core"
        subtitle="Office core circuit"
        meta={CORE_SCHEME}
        items={coreExercises}
        customized={coreCustomized}
        optional
        done={isLogged(date, 'core')}
        onToggle={() => onToggle(date, 'core')}
        onEdit={onEditCore}
      />
      <BlockCard
        title="Stretch"
        subtitle="Same routine every day"
        meta={STRETCH_SCHEME}
        items={stretchExercises}
        customized={stretchCustomized}
        done={isLogged(date, 'stretch')}
        onToggle={() => onToggle(date, 'stretch')}
        onEdit={onEditStretch}
      />
    </div>
  );
}

function BlockCard({
  title,
  subtitle,
  meta,
  items,
  customized,
  optional,
  done,
  onToggle,
  onEdit,
}: {
  title: string;
  subtitle: string;
  meta?: string;
  items: string[];
  customized?: boolean;
  optional?: boolean;
  done: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  return (
    <div className={`card p-5 flex flex-col ${done ? 'border-rainbow-green/40' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-surface-100">{title}</h3>
            {optional && (
              <span className="text-[10px] uppercase tracking-wide text-surface-500 bg-surface-800 px-1.5 py-0.5 rounded">
                optional
              </span>
            )}
            {customized && (
              <span className="text-[10px] uppercase tracking-wide text-rainbow-orange bg-rainbow-orange/10 px-1.5 py-0.5 rounded">
                edited
              </span>
            )}
          </div>
          <p className="text-sm text-surface-300 mt-0.5">{subtitle}</p>
          {meta && <p className="text-xs text-surface-500 mt-1">{meta}</p>}
        </div>
        <button
          onClick={onEdit}
          className="text-xs text-surface-500 hover:text-surface-300 transition-colors flex-shrink-0"
          aria-label={`Edit ${title}`}
        >
          Edit
        </button>
      </div>
      <ul className="space-y-1.5 text-sm text-surface-300 flex-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-surface-600">·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onToggle}
        className={`mt-4 px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
          done
            ? 'bg-rainbow-green/20 text-rainbow-green hover:bg-rainbow-green/30'
            : 'bg-surface-800 text-surface-300 hover:bg-surface-700'
        }`}
      >
        {done ? '✓ Done' : 'Mark complete'}
      </button>
    </div>
  );
}

function WeekGrid({
  weekDates,
  cycleWeek,
  isLogged,
  onToggle,
  todayDate,
}: {
  weekDates: readonly [string, string, string, string];
  cycleWeek: 1 | 2 | 3 | 4;
  isLogged: (date: string, slot: Slot) => boolean;
  onToggle: (date: string, slot: Slot) => void;
  todayDate: string;
}) {
  const slots: Slot[] = ['training', 'core', 'stretch'];

  return (
    <div className="card p-5">
      <h3 className="text-base font-semibold text-surface-100 mb-1">Week at a glance</h3>
      <p className="text-xs text-surface-500 mb-4">Each day&apos;s training is themed to a different HYROX station. Core is optional.</p>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-xs text-surface-500 font-medium pb-2 pr-4"></th>
              {WEEKDAYS.map((label, idx) => {
                const isToday = weekDates[idx] === todayDate;
                const block = getTrainingBlock(cycleWeek, idx as 0 | 1 | 2 | 3);
                return (
                  <th
                    key={label}
                    className="text-center text-xs font-medium pb-2 px-2"
                  >
                    <div className={isToday ? 'text-rainbow-cyan' : 'text-surface-300'}>
                      {label}
                    </div>
                    <div className="text-[10px] text-surface-500 font-normal mt-0.5 normal-case">
                      {block.theme}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot}>
                <td className="text-xs text-surface-400 pr-4 py-2 whitespace-nowrap">
                  {SLOT_LABELS[slot]}
                  {slot === 'core' && <span className="text-surface-600 ml-1">(opt)</span>}
                </td>
                {weekDates.map((date) => {
                  const done = isLogged(date, slot);
                  return (
                    <td key={date} className="px-1 py-1 text-center">
                      <button
                        onClick={() => onToggle(date, slot)}
                        className={`w-9 h-9 rounded-lg text-sm transition-colors ${
                          done
                            ? 'bg-rainbow-green/30 text-rainbow-green hover:bg-rainbow-green/40'
                            : 'bg-surface-800 text-surface-600 hover:bg-surface-700'
                        }`}
                        aria-label={`${SLOT_LABELS[slot]} on ${date}`}
                      >
                        {done ? '✓' : '·'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditModal({
  target,
  draftText,
  onChangeText,
  onCancel,
  onSave,
  onReset,
  customized,
}: {
  target: EditTarget;
  draftText: string;
  onChangeText: (s: string) => void;
  onCancel: () => void;
  onSave: () => void;
  onReset: () => void;
  customized: boolean;
}) {
  const titleParts: string[] = [];
  if (target.kind === 'training') {
    titleParts.push(`Edit ${WEEKDAYS[target.dayIdx]} Week ${target.week} training`);
  } else if (target.kind === 'core') {
    titleParts.push('Edit core routine');
  } else {
    titleParts.push('Edit stretch routine');
  }
  const title = titleParts.join(' ');

  const scopeNote =
    target.kind === 'training'
      ? `Applies to Week ${target.week} ${WEEKDAYS[target.dayIdx]} only. Other days unaffected.`
      : target.kind === 'core'
      ? 'Applies every day.'
      : 'Applies every day.';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-50">
      <div className="card p-6 max-w-lg w-full">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-surface-100">{title}</h3>
            <p className="text-xs text-surface-500 mt-1">{scopeNote}</p>
          </div>
          {customized && (
            <span className="text-[10px] uppercase tracking-wide text-rainbow-orange bg-rainbow-orange/10 px-1.5 py-0.5 rounded">
              edited
            </span>
          )}
        </div>

        <label className="block text-xs text-surface-400 mb-2">
          One exercise per line. Edits save to your browser.
        </label>
        <textarea
          value={draftText}
          onChange={(e) => onChangeText(e.target.value)}
          rows={10}
          className="w-full bg-surface-900 border border-surface-700 rounded-lg p-3 text-sm text-surface-200 font-mono focus:outline-none focus:border-rainbow-cyan/50 focus:ring-1 focus:ring-rainbow-cyan/20"
          placeholder="10 DB strict press&#10;12 banded face pulls&#10;8 push-ups"
          spellCheck={false}
        />

        <div className="flex flex-wrap gap-3 justify-end mt-5">
          {customized && (
            <button
              onClick={onReset}
              className="px-4 py-2 text-sm text-surface-400 hover:text-surface-200 transition-colors mr-auto"
            >
              Reset to default
            </button>
          )}
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-surface-300 hover:text-surface-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 text-sm bg-rainbow-cyan/20 text-rainbow-cyan hover:bg-rainbow-cyan/30 rounded-lg font-medium transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
