'use client';

import { useState, useEffect } from 'react';
import {
  HYROX_STATIONS,
  SCENARIO_A,
  SCENARIO_B,
  formatTime,
  getDaysUntilRace,
  getCurrentWeek,
  getPhaseForWeek,
  type EstimateResult,
} from '@/lib/hyrox-utils';

interface BenchmarkData {
  current: Record<string, {
    timeSeconds: number;
    recordedAt: string;
    source: string;
    notes: string | null;
  }>;
  history: Record<string, Array<{
    timeSeconds: number;
    recordedAt: string;
    source: string;
  }>>;
  targets: {
    scenarioA: Record<string, number>;
    scenarioB: Record<string, number>;
  };
}

interface PlanProgress {
  overallProgress: { completed: number; total: number; percentage: number };
}

// All stations including run
const ALL_SEGMENTS = [
  { id: 'run_1km', name: 'Run (1km avg)', raceDistance: '8 x 1km' },
  ...HYROX_STATIONS.map(s => ({ id: s.id, name: s.name, raceDistance: s.raceDistance })),
] as const;

export default function DashboardTab() {
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [benchmarks, setBenchmarks] = useState<BenchmarkData | null>(null);
  const [planProgress, setPlanProgress] = useState<PlanProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedStation, setExpandedStation] = useState<string | null>(null);
  const [logStation, setLogStation] = useState<typeof ALL_SEGMENTS[number] | null>(null);

  function fetchAll() {
    return Promise.all([
      fetch('/api/hyrox/estimate').then(r => r.json()),
      fetch('/api/hyrox/benchmarks').then(r => r.json()),
      fetch('/api/hyrox/plan').then(r => r.json()),
    ]).then(([est, bench, plan]) => {
      setEstimate(est);
      setBenchmarks(bench);
      setPlanProgress(plan);
    }).catch(console.error);
  }

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
  }, []);

  function handleBenchmarkSaved() {
    setLogStation(null);
    fetchAll();
  }

  if (loading) {
    return <div className="text-surface-400 animate-pulse py-8">Loading dashboard...</div>;
  }

  if (!estimate) {
    return <div className="text-surface-400 py-8">Failed to load dashboard data.</div>;
  }

  const daysUntilRace = getDaysUntilRace();
  const currentWeek = getCurrentWeek();
  const currentPhase = getPhaseForWeek(currentWeek);

  function getFinishColor(seconds: number): string {
    if (seconds < 3600) return 'text-green-400';
    if (seconds <= 3720) return 'text-yellow-400';
    return 'text-red-400';
  }

  return (
    <div className="space-y-6">
      {/* Estimated Finish Hero Card */}
      <div className="card p-6 text-center">
        <p className="text-sm text-surface-400 mb-1">Estimated Finish Time</p>
        <p className={`text-5xl font-bold ${estimate.isDefault ? 'text-surface-400' : getFinishColor(estimate.estimatedFinishSeconds)}`}>
          {estimate.estimatedFinish}
        </p>
        {estimate.isDefault ? (
          <p className="text-sm text-surface-500 mt-2">
            Log all 9 station benchmarks to see your personalized estimate
          </p>
        ) : (
          <div className="flex items-center justify-center gap-4 mt-3">
            <span className="text-sm px-3 py-1 rounded-full bg-surface-800 text-surface-300">
              vs Scenario A: <span className={estimate.scenarioComparison!.vsA.startsWith('-') ? 'text-green-400' : 'text-red-400'}>
                {estimate.scenarioComparison!.vsA}
              </span>
            </span>
            <span className="text-sm px-3 py-1 rounded-full bg-surface-800 text-surface-300">
              vs Scenario B: <span className={estimate.scenarioComparison!.vsB.startsWith('-') ? 'text-green-400' : 'text-red-400'}>
                {estimate.scenarioComparison!.vsB}
              </span>
            </span>
          </div>
        )}

        {/* Readiness */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="text-sm text-surface-400">
            Readiness: {estimate.readiness.benchmarked}/{estimate.readiness.total} stations benchmarked
          </span>
          {estimate.missingStations.length > 0 && (
            <span className="text-xs text-yellow-400">
              Missing: {estimate.missingStations.map(s =>
                s === 'run_1km' ? 'Run' : HYROX_STATIONS.find(st => st.id === s)?.name || s
              ).join(', ')}
            </span>
          )}
        </div>

        {/* Breakdown — only show when we have real data */}
        {!estimate.isDefault && (
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-surface-800">
            <div>
              <p className="text-xs text-surface-500">Total Run</p>
              <p className="text-lg font-medium text-surface-200">{formatTime(estimate.totalRunSeconds!)}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500">Total Stations</p>
              <p className="text-lg font-medium text-surface-200">{formatTime(estimate.totalStationSeconds!)}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500">Transitions</p>
              <p className="text-lg font-medium text-surface-200">{formatTime(estimate.transitionSeconds)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Station Benchmark Cards */}
      <div>
        <h3 className="text-sm font-medium text-surface-400 mb-3">Station Benchmarks</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ALL_SEGMENTS.map(segment => (
            <StationCard
              key={segment.id}
              stationId={segment.id}
              name={segment.name}
              raceDistance={segment.raceDistance}
              current={benchmarks?.current?.[segment.id] || null}
              targetA={SCENARIO_A[segment.id as keyof typeof SCENARIO_A]}
              targetB={SCENARIO_B[segment.id as keyof typeof SCENARIO_B]}
              history={benchmarks?.history?.[segment.id] || []}
              isExpanded={expandedStation === segment.id}
              onToggle={() => setExpandedStation(expandedStation === segment.id ? null : segment.id)}
              onLogTime={() => setLogStation(segment)}
            />
          ))}
        </div>
      </div>

      {/* Training Summary */}
      <div className="card p-4">
        <h3 className="text-sm font-medium text-surface-400 mb-3">Training Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-surface-500">Sessions</p>
            <p className="text-lg font-medium text-surface-200">
              {planProgress?.overallProgress.completed || 0}/{planProgress?.overallProgress.total || 120}
            </p>
          </div>
          <div>
            <p className="text-xs text-surface-500">Current Phase</p>
            <p className="text-lg font-medium text-surface-200">
              {currentPhase.number}: {currentPhase.name}
            </p>
          </div>
          <div>
            <p className="text-xs text-surface-500">Week</p>
            <p className="text-lg font-medium text-surface-200">{currentWeek}/24</p>
          </div>
          <div>
            <p className="text-xs text-surface-500">Days Until Race</p>
            <p className="text-lg font-medium text-rainbow-orange">{daysUntilRace}</p>
          </div>
        </div>
      </div>

      {/* Log Benchmark Modal */}
      {logStation && (
        <LogBenchmarkModal
          station={logStation}
          onClose={() => setLogStation(null)}
          onSaved={handleBenchmarkSaved}
        />
      )}
    </div>
  );
}

// =====================================================
// Station Benchmark Card
// =====================================================

interface StationCardProps {
  stationId: string;
  name: string;
  raceDistance: string;
  current: { timeSeconds: number; recordedAt: string; source: string; notes: string | null } | null;
  targetA: number;
  targetB: number;
  history: Array<{ timeSeconds: number; recordedAt: string; source: string }>;
  isExpanded: boolean;
  onToggle: () => void;
  onLogTime: () => void;
}

function StationCard({ stationId, name, raceDistance, current, targetA, targetB, history, isExpanded, onToggle, onLogTime }: StationCardProps) {
  const delta = current ? current.timeSeconds - targetA : null;

  function getDeltaColor(): string {
    if (delta === null) return 'text-surface-500';
    if (delta <= 0) return 'text-green-400';
    const gap = targetB - targetA;
    if (delta <= gap) return 'text-yellow-400';
    return 'text-red-400';
  }

  function getTrendArrow(): string {
    if (history.length < 2) return '';
    const recent = history[0].timeSeconds;
    const previous = history[1].timeSeconds;
    if (recent < previous) return '\u2193';
    if (recent > previous) return '\u2191';
    return '\u2192';
  }

  return (
    <div className="card overflow-hidden">
      <div className="p-3">
        <div className="flex items-center justify-between">
          <button onClick={onToggle} className="text-left flex-1 hover:opacity-80 transition-opacity">
            <p className="text-sm font-medium text-surface-200">{name}</p>
            <p className="text-xs text-surface-500">{raceDistance}</p>
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right">
              {current ? (
                <>
                  <p className="text-lg font-bold text-surface-100">
                    {formatTime(current.timeSeconds)}
                    {getTrendArrow() && (
                      <span className={`ml-1 text-sm ${getTrendArrow() === '\u2193' ? 'text-green-400' : 'text-red-400'}`}>
                        {getTrendArrow()}
                      </span>
                    )}
                  </p>
                  <p className={`text-xs ${getDeltaColor()}`}>
                    {delta !== null && delta !== 0 && (
                      <>{delta > 0 ? '+' : '-'}{formatTime(Math.abs(delta))} vs Target A</>
                    )}
                    {delta === 0 && 'At target'}
                  </p>
                </>
              ) : (
                <p className="text-sm text-surface-500 italic">No benchmark</p>
              )}
            </div>
            <button
              onClick={onLogTime}
              className="px-2.5 py-1.5 text-xs bg-rainbow-orange/15 text-rainbow-orange rounded-md hover:bg-rainbow-orange/25 transition-colors whitespace-nowrap"
            >
              Log Time
            </button>
          </div>
        </div>
      </div>

      {/* Expanded history */}
      {isExpanded && (
        <div className="border-t border-surface-800 p-3">
          {history.length > 0 ? (
            <>
              <p className="text-xs text-surface-500 mb-2">History</p>
              <div className="space-y-1">
                {history.slice(0, 10).map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-surface-400">
                      {new Date(h.recordedAt).toLocaleDateString()}
                    </span>
                    <span className="font-medium text-surface-200">
                      {formatTime(h.timeSeconds)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-surface-500">No history yet</p>
          )}
          <div className="mt-2 pt-2 border-t border-surface-800/50 text-xs text-surface-500 flex justify-between">
            <span>Target A: {formatTime(targetA)}</span>
            <span>Target B: {formatTime(targetB)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// Log Benchmark Modal
// =====================================================

interface LogBenchmarkModalProps {
  station: { id: string; name: string; raceDistance: string };
  onClose: () => void;
  onSaved: () => void;
}

function LogBenchmarkModal({ station, onClose, onSaved }: LogBenchmarkModalProps) {
  const [timeMinutes, setTimeMinutes] = useState('');
  const [timeSeconds, setTimeSeconds] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const targetA = SCENARIO_A[station.id as keyof typeof SCENARIO_A];
  const targetB = SCENARIO_B[station.id as keyof typeof SCENARIO_B];

  async function handleSave() {
    const totalSeconds = (parseInt(timeMinutes || '0') * 60) + parseInt(timeSeconds || '0');
    if (totalSeconds <= 0) return;

    setSaving(true);
    try {
      await fetch('/api/hyrox/benchmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          station: station.id,
          timeSeconds: totalSeconds,
          notes: notes || null,
        }),
      });
      onSaved();
    } catch (error) {
      console.error('Save benchmark error:', error);
    } finally {
      setSaving(false);
    }
  }

  // Preview the entered time vs targets
  const previewSeconds = (parseInt(timeMinutes || '0') * 60) + parseInt(timeSeconds || '0');
  const previewDelta = previewSeconds > 0 ? previewSeconds - targetA : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="card p-6 max-w-sm w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-surface-100">{station.name}</h3>
            <p className="text-sm text-surface-500">{station.raceDistance}</p>
          </div>
          <button onClick={onClose} className="text-surface-500 hover:text-surface-200 text-xl">&times;</button>
        </div>

        {/* Target reference */}
        <div className="bg-surface-800/50 rounded-lg p-3 mb-4 text-xs text-surface-400 flex justify-between">
          <span>Target A: {formatTime(targetA)}</span>
          <span>Target B: {formatTime(targetB)}</span>
        </div>

        {/* Time input */}
        <div>
          <label className="block text-sm text-surface-400 mb-2">Time</label>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={timeMinutes}
              onChange={e => setTimeMinutes(e.target.value.replace(/\D/g, ''))}
              placeholder="MM"
              className="w-24 bg-surface-800 border border-surface-700 rounded-lg px-3 py-3 text-surface-200 text-center text-xl"
              autoFocus
            />
            <span className="text-surface-400 text-xl font-bold">:</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={timeSeconds}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '');
                if (val === '' || parseInt(val) <= 59) setTimeSeconds(val);
              }}
              placeholder="SS"
              className="w-24 bg-surface-800 border border-surface-700 rounded-lg px-3 py-3 text-surface-200 text-center text-xl"
            />
            {previewDelta !== null && previewSeconds > 0 && (
              <span className={`text-sm w-full sm:w-auto mt-1 sm:mt-0 sm:ml-2 ${previewDelta <= 0 ? 'text-green-400' : previewDelta <= (targetB - targetA) ? 'text-yellow-400' : 'text-red-400'}`}>
                {previewDelta > 0 ? '+' : '-'}{formatTime(Math.abs(previewDelta))}
              </span>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="mt-4">
          <label className="block text-sm text-surface-400 mb-1">Notes <span className="text-surface-600">(optional)</span></label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="How did it feel?"
            className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-surface-200 text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-surface-400 hover:text-surface-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || previewSeconds <= 0}
            className="px-4 py-2 text-sm bg-rainbow-orange text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Benchmark'}
          </button>
        </div>
      </div>
    </div>
  );
}
