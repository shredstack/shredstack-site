'use client';

import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatShortDate } from './date-utils';
import type { DashboardData, RepeatWorkoutProgression } from '../types';

interface ProgressionsTabProps {
  data: DashboardData;
}

type ScoreTypeFilter = 'all' | 'for_time' | 'amrap' | 'for_load';
type ImprovementFilter = 'all' | 'scaled_to_rx' | 'time_improvement' | 'rounds_improvement' | 'weight_improvement';

export default function ProgressionsTab({ data }: ProgressionsTabProps) {
  const [scoreTypeFilter, setScoreTypeFilter] = useState<ScoreTypeFilter>('all');
  const [improvementFilter, setImprovementFilter] = useState<ImprovementFilter>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const progressions = data.repeatWorkoutProgressions;

  const filtered = useMemo(() => {
    return progressions.filter((p) => {
      if (scoreTypeFilter !== 'all' && p.scoreType !== scoreTypeFilter) return false;
      if (improvementFilter !== 'all') {
        if (!p.improvement || p.improvement.type !== improvementFilter) return false;
      }
      return true;
    });
  }, [progressions, scoreTypeFilter, improvementFilter]);

  const topImproved = useMemo(
    () => filtered.filter((p) => p.improvement).slice(0, 5),
    [filtered]
  );

  if (progressions.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-white mb-2">No repeat workouts yet</h3>
        <p className="text-surface-400 text-sm">Progression tracking appears once you&apos;ve done a workout more than once.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Improved */}
      {topImproved.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-surface-400 mb-4">Most Improved</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topImproved.map((prog) => (
              <ProgressionHighlightCard key={prog.workoutId} progression={prog} />
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={scoreTypeFilter}
          onChange={(e) => setScoreTypeFilter(e.target.value as ScoreTypeFilter)}
          className="px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-surface-300 text-sm focus:outline-none focus:border-accent-500"
        >
          <option value="all">All Types</option>
          <option value="for_time">For Time</option>
          <option value="amrap">AMRAP</option>
          <option value="for_load">For Load</option>
        </select>
        <select
          value={improvementFilter}
          onChange={(e) => setImprovementFilter(e.target.value as ImprovementFilter)}
          className="px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-surface-300 text-sm focus:outline-none focus:border-accent-500"
        >
          <option value="all">All Improvements</option>
          <option value="scaled_to_rx">Scaled → Rx</option>
          <option value="time_improvement">Time PR</option>
          <option value="rounds_improvement">Rounds PR</option>
          <option value="weight_improvement">Weight PR</option>
        </select>
        <span className="text-surface-500 text-xs self-center">{filtered.length} repeat workouts</span>
      </div>

      {/* All Progressions */}
      <div className="space-y-3">
        {filtered.map((prog) => (
          <ProgressionCard
            key={prog.workoutId}
            progression={prog}
            isExpanded={expandedId === prog.workoutId}
            onToggle={() => setExpandedId(expandedId === prog.workoutId ? null : prog.workoutId)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-surface-400">No progressions match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProgressionHighlightCard({ progression }: { progression: RepeatWorkoutProgression }) {
  const improvementColor =
    progression.improvement?.type === 'scaled_to_rx' ? 'from-green-500 to-emerald-500' :
    progression.improvement?.type === 'time_improvement' ? 'from-blue-500 to-cyan-500' :
    progression.improvement?.type === 'weight_improvement' ? 'from-purple-500 to-pink-500' :
    'from-accent-500 to-rainbow-cyan';

  return (
    <div className="card p-5 relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${improvementColor}`} />
      <h4 className="text-white font-semibold mb-2 truncate">{progression.title}</h4>
      <div className="space-y-1.5">
        {progression.scores.map((s, idx) => {
          const isLast = idx === progression.scores.length - 1;
          const divColor = s.division?.toLowerCase() === 'rx'
            ? 'text-green-400' : s.division?.toLowerCase() === 'scaled'
            ? 'text-orange-400' : 'text-surface-400';
          return (
            <div key={s.date} className="flex items-center gap-2 text-xs">
              <span className="text-surface-500 w-20 shrink-0">{formatShortDate(s.date)}</span>
              <span className="text-surface-300">{s.score}</span>
              <span className={divColor}>{s.division}</span>
              {isLast && progression.improvement?.type === 'scaled_to_rx' && (
                <span className="ml-auto text-green-400">🎉</span>
              )}
            </div>
          );
        })}
      </div>
      {progression.improvement && (
        <div className="mt-3 pt-2 border-t border-surface-700">
          <span className="text-xs font-medium text-accent-400">{progression.improvement.summary}</span>
        </div>
      )}
    </div>
  );
}

function ProgressionCard({
  progression,
  isExpanded,
  onToggle,
}: {
  progression: RepeatWorkoutProgression;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const divFirst = progression.scores[0]?.division?.toLowerCase();
  const divLast = progression.scores[progression.scores.length - 1]?.division?.toLowerCase();

  const typeLabel =
    progression.scoreType === 'for_time' ? 'For Time' :
    progression.scoreType === 'amrap' ? 'AMRAP' :
    progression.scoreType === 'for_load' ? 'For Load' : null;

  // Build chart data for workouts with 3+ attempts
  const chartData = useMemo(() => {
    if (progression.scores.length < 3) return null;

    if (progression.scoreType === 'for_time') {
      const points = progression.scores
        .filter((s) => s.parsedTime)
        .map((s) => ({ date: formatShortDate(s.date), value: s.parsedTime! }));
      return points.length >= 3 ? { data: points, label: 'Time (sec)', invert: true } : null;
    }
    if (progression.scoreType === 'amrap') {
      const points = progression.scores
        .filter((s) => s.parsedRounds)
        .map((s) => ({ date: formatShortDate(s.date), value: s.parsedRounds! }));
      return points.length >= 3 ? { data: points, label: 'Rounds+Reps', invert: false } : null;
    }
    if (progression.scoreType === 'for_load') {
      const points = progression.scores
        .filter((s) => s.parsedWeight)
        .map((s) => ({ date: formatShortDate(s.date), value: s.parsedWeight! }));
      return points.length >= 3 ? { data: points, label: 'Weight (lbs)', invert: false } : null;
    }
    return null;
  }, [progression]);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 text-left hover:bg-surface-800/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white text-sm font-medium truncate">{progression.title}</span>
              <span className="text-surface-500 text-xs">{progression.scores.length} attempts</span>
              {typeLabel && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-700 text-surface-400">{typeLabel}</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-surface-500">
                {progression.scores[0].date} → {progression.scores[progression.scores.length - 1].date}
              </span>
              {progression.improvement && (
                <span className={`font-medium ${
                  progression.improvement.type === 'scaled_to_rx' ? 'text-green-400' : 'text-accent-400'
                }`}>
                  {progression.improvement.summary}
                </span>
              )}
            </div>
          </div>
          <svg
            className={`w-4 h-4 text-surface-500 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-surface-700 p-4 space-y-4">
          {/* Attempt timeline */}
          <div className="space-y-2">
            {progression.scores.map((s, idx) => {
              const divColor = s.division?.toLowerCase() === 'rx'
                ? 'text-green-400 bg-green-500/10'
                : s.division?.toLowerCase() === 'scaled'
                ? 'text-orange-400 bg-orange-500/10'
                : 'text-surface-400 bg-surface-700';
              return (
                <div key={s.date} className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-surface-700 flex items-center justify-center text-xs text-surface-400">
                    {idx + 1}
                  </div>
                  <span className="text-surface-400 w-24 shrink-0">{formatShortDate(s.date)}</span>
                  <span className="text-white font-medium">{s.score}</span>
                  {s.division && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${divColor}`}>{s.division}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Chart for 3+ attempts */}
          {chartData && (
            <div className="mt-4">
              <h4 className="text-xs text-surface-400 font-medium mb-2">{chartData.label} Over Time</h4>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={chartData.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                  <XAxis dataKey="date" tick={{ fill: '#8888a0', fontSize: 10 }} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#8888a0', fontSize: 10 }}
                    tickLine={false}
                    width={40}
                    reversed={chartData.invert}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a26', border: '1px solid #2a2a3a', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#e8e8f0' }}
                    itemStyle={{ color: '#6366f1' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={chartData.label}
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ fill: '#6366f1', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
