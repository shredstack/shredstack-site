'use client';

import { useMemo, useState } from 'react';
import type { DashboardData, DashboardMovement, DashboardWorkout } from '../types';

interface MovementsTabProps {
  data: DashboardData;
  onMovementCategoryChange?: (movementId: number, category: string) => void;
}

interface MovementStats {
  name: string;
  movementId: number;
  movementCategory: string | null;
  totalAppearances: number;
  rxCount: number;
  scaledCount: number;
  scaledRate: number;
  limitingFactorCount: number;
  limitingFactorScore: number;
  estimatedMaxWeight: number | null;
  avgWeight: number | null;
}

const MOVEMENT_CATEGORIES = [
  'barbell', 'dumbbell', 'kettlebell', 'gymnastics',
  'bodyweight', 'monostructural', 'accessory', 'other',
];

export default function MovementsTab({ data, onMovementCategoryChange }: MovementsTabProps) {
  const [sortBy, setSortBy] = useState<'appearances' | 'scaledRate' | 'limitingFactor'>('appearances');

  const { movementStats, limitingFactors, rxRate } = useMemo(() => {
    const scoreMap = new Map<number, DashboardWorkout>();
    for (const w of data.workouts) {
      scoreMap.set(w.scoreId, w);
    }

    const byName = new Map<string, DashboardMovement[]>();
    for (const m of data.movements) {
      const key = m.movementName;
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key)!.push(m);
    }

    const totalRxWorkouts = data.summary.rxCount;
    const totalScaledWorkouts = data.summary.scaledCount;
    const totalRated = totalRxWorkouts + totalScaledWorkouts;
    const currentRxRate = totalRated > 0 ? (totalRxWorkouts / totalRated) * 100 : 0;

    const stats: MovementStats[] = [];

    for (const [name, movements] of byName) {
      let rxCount = 0;
      let scaledCount = 0;
      let limitingFactorCount = 0;
      let totalLimitingScore = 0;
      const weights: number[] = [];
      let maxWeight: number | null = null;

      for (const m of movements) {
        const score = scoreMap.get(m.userScoreId);
        if (!score) continue;

        const div = score.rawDivision?.toLowerCase();
        if (div === 'rx') rxCount++;
        else if (div === 'scaled') scaledCount++;

        if (m.isLimitingFactor) limitingFactorCount++;
        if (m.limitingFactorScore) totalLimitingScore += m.limitingFactorScore;
        if (m.estimatedMaxWeight) {
          weights.push(m.estimatedMaxWeight);
          if (maxWeight === null || m.estimatedMaxWeight > maxWeight) {
            maxWeight = m.estimatedMaxWeight;
          }
        } else if (m.estimatedActualWeight) {
          weights.push(m.estimatedActualWeight);
        }
      }

      const total = rxCount + scaledCount;
      stats.push({
        name,
        movementId: movements[0].movementId,
        movementCategory: movements[0].movementCategory,
        totalAppearances: movements.length,
        rxCount,
        scaledCount,
        scaledRate: total > 0 ? (scaledCount / total) * 100 : 0,
        limitingFactorCount,
        limitingFactorScore: totalLimitingScore,
        estimatedMaxWeight: maxWeight,
        avgWeight: weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : null,
      });
    }

    // Sort
    stats.sort((a, b) => {
      if (sortBy === 'scaledRate') return b.scaledRate - a.scaledRate;
      if (sortBy === 'limitingFactor') return b.limitingFactorScore - a.limitingFactorScore;
      return b.totalAppearances - a.totalAppearances;
    });

    // Top limiting factors by score (not raw count)
    const limiting = stats
      .filter((s) => s.limitingFactorScore > 0)
      .sort((a, b) => b.limitingFactorScore - a.limitingFactorScore)
      .slice(0, 5);

    return { movementStats: stats, limitingFactors: limiting, rxRate: currentRxRate };
  }, [data, sortBy]);

  // Find the max limiting factor score for relative bar display
  const maxLimitingScore = useMemo(
    () => Math.max(...movementStats.map((s) => s.limitingFactorScore), 1),
    [movementStats]
  );

  if (movementStats.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-4xl mb-4">🏃</div>
        <h3 className="text-lg font-semibold text-white mb-2">No movement data yet</h3>
        <p className="text-surface-400 text-sm">Movement analysis will appear here after AI processing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Limiting Factor Analysis */}
      <div>
        <h3 className="text-sm font-medium text-surface-400 mb-4">Biggest Limiting Factors</h3>
        {limitingFactors.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {limitingFactors.map((lf) => (
              <LimitingFactorCard
                key={lf.name}
                stat={lf}
                maxScore={maxLimitingScore}
                totalScaled={data.summary.scaledCount}
              />
            ))}
          </div>
        ) : (
          <p className="text-surface-400 text-sm">
            No clear limiting factors detected — you may be Rx&apos;ing most movements consistently.
          </p>
        )}
      </div>

      {/* All Movements Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-surface-400">All Movements ({movementStats.length})</h3>
          <div className="flex gap-2">
            {[
              { key: 'appearances' as const, label: 'Frequency' },
              { key: 'scaledRate' as const, label: 'Scaled %' },
              { key: 'limitingFactor' as const, label: 'Limiting Factor' },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  sortBy === opt.key
                    ? 'bg-accent-600 text-white'
                    : 'bg-surface-700 text-surface-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-700">
                  <th className="text-left text-xs text-surface-400 font-medium p-3">Movement</th>
                  <th className="text-center text-xs text-surface-400 font-medium p-3">Category</th>
                  <th className="text-center text-xs text-surface-400 font-medium p-3">Count</th>
                  <th className="text-center text-xs text-surface-400 font-medium p-3">Rx</th>
                  <th className="text-center text-xs text-surface-400 font-medium p-3">Scaled</th>
                  <th className="text-center text-xs text-surface-400 font-medium p-3">Scaled %</th>
                  <th className="text-center text-xs text-surface-400 font-medium p-3">Limiting Score</th>
                  <th className="text-right text-xs text-surface-400 font-medium p-3">Est. Max</th>
                </tr>
              </thead>
              <tbody>
                {movementStats.map((stat) => (
                  <tr key={stat.name} className="border-b border-surface-800 hover:bg-surface-800/50">
                    <td className="p-3 text-sm text-white font-medium">{stat.name}</td>
                    <td className="p-3 text-center">
                      {onMovementCategoryChange ? (
                        <select
                          value={stat.movementCategory || 'other'}
                          onChange={(e) => onMovementCategoryChange(stat.movementId, e.target.value)}
                          className="text-xs bg-surface-800 border border-surface-600 text-surface-300 rounded px-1.5 py-0.5"
                        >
                          {MOVEMENT_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-surface-400 text-xs">{stat.movementCategory || '-'}</span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-surface-300 text-center">{stat.totalAppearances}</td>
                    <td className="p-3 text-sm text-green-400 text-center">{stat.rxCount || '-'}</td>
                    <td className="p-3 text-sm text-orange-400 text-center">{stat.scaledCount || '-'}</td>
                    <td className="p-3 text-center">
                      {stat.rxCount + stat.scaledCount > 0 ? (
                        <ScaledBar rate={stat.scaledRate} />
                      ) : (
                        <span className="text-surface-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {stat.limitingFactorScore > 0 ? (
                        <LimitingBar score={stat.limitingFactorScore} maxScore={maxLimitingScore} />
                      ) : (
                        <span className="text-surface-600">-</span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-surface-300 text-right">
                      {stat.estimatedMaxWeight ? `~${Math.round(stat.estimatedMaxWeight)} lbs` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function LimitingFactorCard({ stat, maxScore, totalScaled }: { stat: MovementStats; maxScore: number; totalScaled: number }) {
  const relativeScore = maxScore > 0 ? Math.round((stat.limitingFactorScore / maxScore) * 100) : 0;

  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-500" />
      <h4 className="text-white font-semibold mb-2">{stat.name}</h4>
      <div className="space-y-1.5 text-sm">
        <p className="text-surface-300">
          Appears in <span className="text-white">{stat.totalAppearances}</span> workouts
          {stat.scaledCount > 0 && (
            <> &middot; Scaled in <span className="text-orange-400">{stat.scaledCount}</span> ({Math.round(stat.scaledRate)}%)</>
          )}
        </p>
        {/* Limiting factor score bar */}
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-surface-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500"
                style={{ width: `${relativeScore}%` }}
              />
            </div>
            <span className="text-red-400 text-xs font-medium w-8 text-right">{relativeScore}%</span>
          </div>
          <p className="text-surface-500 text-xs mt-1">Limiting factor score (relative)</p>
        </div>
        {stat.limitingFactorCount > 0 && (
          <p className="text-surface-400 text-xs mt-2">
            Mastering this could move ~{stat.limitingFactorCount} workout{stat.limitingFactorCount !== 1 ? 's' : ''} from Scaled to Rx
          </p>
        )}
      </div>
    </div>
  );
}

function LimitingBar({ score, maxScore }: { score: number; maxScore: number }) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const color = pct > 70 ? 'bg-red-500' : pct > 40 ? 'bg-orange-500' : 'bg-yellow-500';
  return (
    <div className="flex items-center gap-2 justify-center">
      <div className="w-16 h-1.5 bg-surface-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-surface-400 text-xs w-8">{pct}%</span>
    </div>
  );
}

function ScaledBar({ rate }: { rate: number }) {
  const color = rate > 70 ? 'bg-red-500' : rate > 40 ? 'bg-orange-500' : 'bg-yellow-500';
  return (
    <div className="flex items-center gap-2 justify-center">
      <div className="w-16 h-1.5 bg-surface-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${rate}%` }} />
      </div>
      <span className="text-surface-400 text-xs w-8">{Math.round(rate)}%</span>
    </div>
  );
}
