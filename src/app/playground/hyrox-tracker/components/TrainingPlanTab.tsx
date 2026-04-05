'use client';

import { useState, useEffect } from 'react';
import {
  getCurrentWeek,
  getSessionTypeLabel,
  isRunSession,
  isStationSession,
  isHyroxSession,
  getDayLabel,
  HYROX_STATIONS,
  type SessionType,
} from '@/lib/hyrox-utils';

interface PlanSession {
  id: number;
  dayOfWeek: string;
  sessionType: string;
  title: string;
  description: string;
  targetPace: string | null;
  targetDurationMin: number | null;
  targetStations: string[] | null;
  completed: boolean;
  sessionLogId: number | null;
  completedAt: string | null;
}

interface Week {
  weekNumber: number;
  sessions: PlanSession[];
}

interface Phase {
  number: number;
  name: string;
  weeks: string;
  dates: string;
  completedSessions: number;
  totalSessions: number;
  weekData: Week[];
}

interface PlanData {
  phases: Phase[];
  overallProgress: { completed: number; total: number; percentage: number };
}

interface StationBenchmarkInput {
  station: string;
  timeMinutes: string;
  timeSeconds: string;
  distance: string;
  isFullDistance: boolean;
  notes: string;
}

interface TrainingPlanTabProps {
  onSessionLogged: () => void;
}

export default function TrainingPlanTab({ onSessionLogged }: TrainingPlanTabProps) {
  const [data, setData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());
  const [selectedSession, setSelectedSession] = useState<PlanSession | null>(null);
  const [showModal, setShowModal] = useState(false);
  const currentWeek = getCurrentWeek();

  useEffect(() => {
    fetchPlan();
  }, []);

  // All phases collapsed by default — user expands what they need

  async function fetchPlan() {
    try {
      const res = await fetch('/api/hyrox/plan');
      if (res.ok) {
        const planData = await res.json();
        setData(planData);
      }
    } catch (error) {
      console.error('Failed to fetch plan:', error);
    } finally {
      setLoading(false);
    }
  }

  function togglePhase(phaseNum: number) {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseNum)) {
        next.delete(phaseNum);
      } else {
        next.add(phaseNum);
      }
      return next;
    });
  }

  function getSessionIcon(type: string): string {
    if (isRunSession(type as SessionType)) return '\u{1F3C3}';
    if (isStationSession(type as SessionType)) return '\u{1F3CB}\uFE0F';
    if (isHyroxSession(type as SessionType)) return '\u{1F525}';
    if (type === 'race_day') return '\u{1F3C1}';
    if (type === 'activation') return '\u26A1';
    return '\u{1F4AA}';
  }

  function getPhaseColor(phaseNum: number): string {
    const colors = [
      'text-rainbow-green',
      'text-rainbow-cyan',
      'text-rainbow-blue',
      'text-rainbow-purple',
      'text-rainbow-pink',
      'text-rainbow-orange',
    ];
    return colors[(phaseNum - 1) % colors.length];
  }

  function getPhaseBgColor(phaseNum: number): string {
    const colors = [
      'bg-rainbow-green/10',
      'bg-rainbow-cyan/10',
      'bg-rainbow-blue/10',
      'bg-rainbow-purple/10',
      'bg-rainbow-pink/10',
      'bg-rainbow-orange/10',
    ];
    return colors[(phaseNum - 1) % colors.length];
  }

  if (loading) {
    return <div className="text-surface-400 animate-pulse py-8">Loading training plan...</div>;
  }

  if (!data || data.phases.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-surface-400">No training plan found. Run the seed script to populate the plan.</p>
        <code className="text-sm text-surface-500 mt-2 block">npx tsx scripts/seed-hyrox-plan.ts</code>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-surface-400">Overall Progress</span>
          <span className="text-sm font-medium text-surface-200">
            {data.overallProgress.completed}/{data.overallProgress.total} sessions ({data.overallProgress.percentage}%)
          </span>
        </div>
        <div className="w-full bg-surface-800 rounded-full h-2">
          <div
            className="bg-rainbow-orange rounded-full h-2 transition-all duration-500"
            style={{ width: `${data.overallProgress.percentage}%` }}
          />
        </div>
      </div>

      {/* Phases */}
      {data.phases.map(phase => (
        <div key={phase.number} className="card overflow-hidden">
          {/* Phase Header */}
          <button
            onClick={() => togglePhase(phase.number)}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className={`text-lg font-bold ${getPhaseColor(phase.number)}`}>
                Phase {phase.number}
              </span>
              <span className="text-surface-200 font-medium">{phase.name}</span>
              <span className="text-surface-500 text-sm">{phase.dates}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-surface-400">
                {phase.completedSessions}/{phase.totalSessions}
              </span>
              <div className="w-24 bg-surface-800 rounded-full h-1.5">
                <div
                  className={`${getPhaseBgColor(phase.number).replace('/10', '')} rounded-full h-1.5 transition-all`}
                  style={{ width: `${phase.totalSessions > 0 ? (phase.completedSessions / phase.totalSessions) * 100 : 0}%` }}
                />
              </div>
              <span className="text-surface-500 text-sm">
                {expandedPhases.has(phase.number) ? '\u25B2' : '\u25BC'}
              </span>
            </div>
          </button>

          {/* Phase Content */}
          {expandedPhases.has(phase.number) && (
            <div className="border-t border-surface-800">
              {phase.weekData.map(week => (
                <div key={week.weekNumber} className="border-b border-surface-800/50 last:border-b-0">
                  {/* Week Header */}
                  <div className={`px-4 py-2 bg-surface-800/30 flex items-center gap-2 ${
                    week.weekNumber === currentWeek ? 'border-l-2 border-rainbow-orange' : ''
                  }`}>
                    <span className="text-sm font-medium text-surface-300">
                      Week {week.weekNumber}
                    </span>
                    {week.weekNumber === currentWeek && (
                      <span className="text-xs px-2 py-0.5 bg-rainbow-orange/20 text-rainbow-orange rounded-full">
                        Current
                      </span>
                    )}
                    <span className="text-xs text-surface-500 ml-auto">
                      {week.sessions.filter(s => s.completed).length}/{week.sessions.length} done
                    </span>
                  </div>

                  {/* Sessions */}
                  <div className="divide-y divide-surface-800/30">
                    {week.sessions.map(session => (
                      <button
                        key={session.id}
                        onClick={() => {
                          setSelectedSession(session);
                          setShowModal(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-800/30 transition-colors text-left"
                      >
                        {/* Completion indicator */}
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          session.completed
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-surface-800 text-surface-600'
                        }`}>
                          {session.completed ? '\u2713' : ''}
                        </div>

                        {/* Day */}
                        <span className="text-xs text-surface-500 w-8 flex-shrink-0">
                          {session.dayOfWeek.toUpperCase()}
                        </span>

                        {/* Icon + Title */}
                        <span className="text-sm mr-1">{getSessionIcon(session.sessionType)}</span>
                        <span className={`text-sm font-medium flex-1 ${
                          session.completed ? 'text-surface-400' : 'text-surface-200'
                        }`}>
                          {session.title}
                        </span>

                        {/* Target pace or stations */}
                        {session.targetPace && (
                          <span className="text-xs text-surface-500 hidden sm:block">
                            {session.targetPace}
                          </span>
                        )}
                        {session.targetStations && session.targetStations.length > 0 && (
                          <span className="text-xs text-rainbow-orange/70 hidden sm:block">
                            {session.targetStations.length} stations
                          </span>
                        )}

                        {/* Duration */}
                        {session.targetDurationMin && (
                          <span className="text-xs text-surface-600">
                            ~{session.targetDurationMin}m
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Session Log Modal */}
      {showModal && selectedSession && (
        <SessionLogModal
          session={selectedSession}
          onClose={() => {
            setShowModal(false);
            setSelectedSession(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setSelectedSession(null);
            fetchPlan();
            onSessionLogged();
          }}
          onDeleted={() => {
            setShowModal(false);
            setSelectedSession(null);
            fetchPlan();
            onSessionLogged();
          }}
        />
      )}
    </div>
  );
}

// =====================================================
// Session Log Modal (inline)
// =====================================================

interface SessionLogModalProps {
  session: PlanSession;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

function SessionLogModal({ session, onClose, onSaved, onDeleted }: SessionLogModalProps) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Form state
  const [completedAt, setCompletedAt] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [durationMin, setDurationMin] = useState(
    session.targetDurationMin?.toString() || ''
  );
  const [rpe, setRpe] = useState('5');
  const [runPace, setRunPace] = useState('');
  const [notes, setNotes] = useState('');
  const [showStations, setShowStations] = useState(
    isStationSession(session.sessionType as SessionType) ||
    isHyroxSession(session.sessionType as SessionType)
  );

  // Station benchmark inputs
  const [stationInputs, setStationInputs] = useState<StationBenchmarkInput[]>(() => {
    const stations = session.targetStations || [];
    return stations.map(s => ({
      station: s,
      timeMinutes: '',
      timeSeconds: '',
      distance: HYROX_STATIONS.find(st => st.id === s)?.raceDistance || '',
      isFullDistance: true,
      notes: '',
    }));
  });

  const isEditing = session.completed && session.sessionLogId;

  function updateStationInput(index: number, field: keyof StationBenchmarkInput, value: string | boolean) {
    setStationInputs(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addStationInput() {
    setStationInputs(prev => [...prev, {
      station: '',
      timeMinutes: '',
      timeSeconds: '',
      distance: '',
      isFullDistance: true,
      notes: '',
    }]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Build station benchmarks from inputs
      const stationBenchmarks = stationInputs
        .filter(s => s.station && (s.timeMinutes || s.timeSeconds))
        .map(s => ({
          station: s.station,
          timeSeconds: (parseInt(s.timeMinutes || '0') * 60) + parseInt(s.timeSeconds || '0'),
          distance: s.distance || null,
          isFullDistance: s.isFullDistance,
          notes: s.notes || null,
        }));

      if (isEditing) {
        // Update existing
        await fetch(`/api/hyrox/sessions/${session.sessionLogId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            completedAt: new Date(completedAt).toISOString(),
            actualDurationMin: durationMin ? parseInt(durationMin) : null,
            rpe: rpe ? parseInt(rpe) : null,
            runPace: runPace || null,
            notes: notes || null,
          }),
        });
      } else {
        // Create new
        await fetch('/api/hyrox/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planSessionId: session.id,
            completedAt: new Date(completedAt).toISOString(),
            sessionType: session.sessionType,
            actualDurationMin: durationMin ? parseInt(durationMin) : null,
            rpe: rpe ? parseInt(rpe) : null,
            runPace: runPace || null,
            notes: notes || null,
            stationBenchmarks: stationBenchmarks.length > 0 ? stationBenchmarks : undefined,
          }),
        });
      }

      onSaved();
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!session.sessionLogId) return;
    setDeleting(true);
    try {
      await fetch(`/api/hyrox/sessions/${session.sessionLogId}`, { method: 'DELETE' });
      onDeleted();
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="card p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-surface-100">
              {getSessionIcon(session.sessionType)} {session.title}
            </h3>
            <p className="text-sm text-surface-500">
              {getDayLabel(session.dayOfWeek)} &middot; {getSessionTypeLabel(session.sessionType as SessionType)}
            </p>
          </div>
          <button onClick={onClose} className="text-surface-500 hover:text-surface-200 text-xl">&times;</button>
        </div>

        {/* Plan Description */}
        <div className="bg-surface-800/50 rounded-lg p-3 mb-4">
          <p className="text-sm text-surface-300">{session.description}</p>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm text-surface-400 mb-1">Date</label>
            <input
              type="date"
              value={completedAt}
              onChange={e => setCompletedAt(e.target.value)}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-surface-200 text-sm"
            />
          </div>

          {/* Duration + RPE row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-surface-400 mb-1">Duration (min)</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={durationMin}
                onChange={e => setDurationMin(e.target.value.replace(/\D/g, ''))}
                placeholder={session.targetDurationMin?.toString() || ''}
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-surface-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-surface-400 mb-1">RPE (1-10)</label>
              <input
                type="range"
                min="1"
                max="10"
                value={rpe}
                onChange={e => setRpe(e.target.value)}
                className="w-full mt-2"
              />
              <div className="text-center text-sm text-surface-300">{rpe}/10</div>
            </div>
          </div>

          {/* Run Pace (for run sessions) */}
          {(isRunSession(session.sessionType as SessionType) || isHyroxSession(session.sessionType as SessionType)) && (
            <div>
              <label className="block text-sm text-surface-400 mb-1">Run Pace</label>
              <input
                type="text"
                value={runPace}
                onChange={e => setRunPace(e.target.value)}
                placeholder={session.targetPace || 'e.g. 6:25/mile'}
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-surface-200 text-sm"
              />
            </div>
          )}

          {/* Station Benchmarks */}
          {showStations && stationInputs.length > 0 && (
            <div>
              <label className="block text-sm text-surface-400 mb-2">Station Times</label>
              <div className="space-y-3">
                {stationInputs.map((input, i) => (
                  <div key={i} className="bg-surface-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      {input.station ? (
                        <span className="text-sm font-medium text-rainbow-orange">
                          {HYROX_STATIONS.find(s => s.id === input.station)?.name || input.station}
                        </span>
                      ) : (
                        <select
                          value={input.station}
                          onChange={e => updateStationInput(i, 'station', e.target.value)}
                          className="bg-surface-700 border border-surface-600 rounded px-2 py-1 text-sm text-surface-200"
                        >
                          <option value="">Select station</option>
                          {HYROX_STATIONS.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                          <option value="run_1km">Run (1km)</option>
                        </select>
                      )}
                      <label className="flex items-center gap-1 ml-auto text-xs text-surface-500">
                        <input
                          type="checkbox"
                          checked={input.isFullDistance}
                          onChange={e => updateStationInput(i, 'isFullDistance', e.target.checked)}
                          className="rounded"
                        />
                        Full distance
                      </label>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={input.timeMinutes}
                        onChange={e => updateStationInput(i, 'timeMinutes', e.target.value.replace(/\D/g, ''))}
                        placeholder="MM"
                        className="w-20 bg-surface-700 border border-surface-600 rounded px-2 py-2.5 text-base text-surface-200 text-center"
                      />
                      <span className="text-surface-500">:</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={input.timeSeconds}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (val === '' || parseInt(val) <= 59) updateStationInput(i, 'timeSeconds', val);
                        }}
                        placeholder="SS"
                        className="w-20 bg-surface-700 border border-surface-600 rounded px-2 py-2.5 text-base text-surface-200 text-center"
                      />
                      {!input.isFullDistance && (
                        <input
                          type="text"
                          value={input.distance}
                          onChange={e => updateStationInput(i, 'distance', e.target.value)}
                          placeholder="Distance"
                          className="flex-1 bg-surface-700 border border-surface-600 rounded px-2 py-1 text-sm text-surface-200"
                        />
                      )}
                    </div>
                  </div>
                ))}
                <button
                  onClick={addStationInput}
                  className="text-xs text-rainbow-orange hover:text-rainbow-orange/80 transition-colors"
                >
                  + Add station
                </button>
              </div>
            </div>
          )}

          {/* Toggle station logging for HYROX sessions */}
          {isHyroxSession(session.sessionType as SessionType) && !showStations && (
            <button
              onClick={() => setShowStations(true)}
              className="text-sm text-rainbow-orange hover:text-rainbow-orange/80 transition-colors"
            >
              + Log station times
            </button>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm text-surface-400 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="How did it feel? Any observations..."
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-surface-200 text-sm resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-surface-800">
          {isEditing ? (
            <div>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-400">Delete this log?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-sm text-red-400 hover:text-red-300 font-medium"
                  >
                    {deleting ? 'Deleting...' : 'Yes, delete'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-sm text-surface-500 hover:text-surface-300"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-sm text-red-500/70 hover:text-red-400 transition-colors"
                >
                  Delete log
                </button>
              )}
            </div>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-surface-400 hover:text-surface-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-rainbow-orange text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Update' : 'Mark Complete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getSessionIcon(type: string): string {
  if (isRunSession(type as SessionType)) return '\u{1F3C3}';
  if (isStationSession(type as SessionType)) return '\u{1F3CB}\uFE0F';
  if (isHyroxSession(type as SessionType)) return '\u{1F525}';
  if (type === 'race_day') return '\u{1F3C1}';
  if (type === 'activation') return '\u26A1';
  return '\u{1F4AA}';
}
