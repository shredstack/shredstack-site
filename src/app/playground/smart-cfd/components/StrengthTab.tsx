'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatShortDate as formatDate } from './date-utils';
import type { DashboardData, StrengthPR } from '../types';

interface StrengthTabProps {
  data: DashboardData;
}

export default function StrengthTab({ data }: StrengthTabProps) {
  const { strengthPRs } = data;
  const lifts = Object.entries(strengthPRs).sort(
    (a, b) => b[1].estimatedMax - a[1].estimatedMax
  );

  if (lifts.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-4xl mb-4">🏋️</div>
        <h3 className="text-lg font-semibold text-white mb-2">No strength data yet</h3>
        <p className="text-surface-400 text-sm">
          Once your workouts are analyzed, corrected lift PRs will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-surface-400 text-sm">
        Estimated maxes are corrected from raw PushPress scores. The AI interprets set schemes and sum-of-weights scoring to estimate what you actually lifted.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {lifts.map(([name, pr]) => (
          <StrengthCard key={name} name={name} pr={pr} />
        ))}
      </div>
    </div>
  );
}

function StrengthCard({ name, pr }: { name: string; pr: StrengthPR }) {
  const confidenceColor =
    pr.confidence === 'high' ? 'text-green-400' :
    pr.confidence === 'medium' ? 'text-yellow-400' :
    'text-red-400';

  // Determine verification label based on extraction method and e1RM source
  const isTested = pr.e1rmSource === 'tested' || pr.extractionMethod === 'deterministic' || pr.extractionMethod === 'audit_corrected';
  const verificationLabel = isTested ? 'Tested 1RM' : 'Estimated 1RM';
  const verificationColor = isTested ? 'text-green-400' : 'text-yellow-400';

  const chartData = pr.history.map((h) => ({
    date: formatDate(h.date),
    weight: h.weight,
  }));

  return (
    <div className="card p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-500 to-rainbow-cyan" />

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-surface-400 uppercase tracking-wider">{name}</h3>
          <div className="text-3xl font-bold text-white mt-1">~{Math.round(pr.estimatedMax)} lbs</div>
          <div className="text-surface-400 text-xs mt-1 flex items-center gap-2">
            <span className={verificationColor}>{verificationLabel}</span>
            <span className={confidenceColor}>
              ({pr.confidence} confidence)
            </span>
          </div>
        </div>
      </div>

      {/* Projected 1RM */}
      {pr.projected1RM && (
        <div className="bg-accent-500/10 border border-accent-500/20 border-dashed rounded-lg p-3 mb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-accent-400 text-lg font-semibold">~{pr.projected1RM} lbs</span>
            <span className="text-accent-400/70 text-xs">Projected 1RM</span>
          </div>
          <p className="text-accent-400/60 text-xs mt-1">
            Based on {pr.projectedFrom} — test to confirm!
          </p>
        </div>
      )}

      {/* Best logged + e1RM source */}
      {pr.bestWeight && (
        <div className="text-surface-300 text-sm mb-3">
          <span>Best logged: {pr.bestReps ? `${pr.bestReps} @ ` : ''}~{Math.round(pr.bestWeight)} lbs</span>
          {pr.e1rmSource && pr.e1rmSource !== 'tested' && (
            <span className="text-surface-500 text-xs ml-2">({pr.e1rmSource})</span>
          )}
        </div>
      )}

      {/* Raw score misinterpretation warning */}
      {pr.rawScoreMisinterpretation && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
          <p className="text-yellow-400 text-xs">
            ⚠️ {pr.rawScoreMisinterpretation}
          </p>
        </div>
      )}

      {/* Progression chart */}
      {chartData.length > 1 && (
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#8888a0', fontSize: 10 }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#8888a0', fontSize: 10 }}
                tickLine={false}
                width={35}
                domain={['dataMin - 10', 'dataMax + 10']}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a26', border: '1px solid #2a2a3a', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#e8e8f0' }}
                itemStyle={{ color: '#6366f1' }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                name="Weight (lbs)"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ fill: '#6366f1', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex justify-between text-surface-500 text-xs mt-1">
            <span>{chartData[0].date}</span>
            <span>{chartData[chartData.length - 1].date}</span>
          </div>
        </div>
      )}

      {chartData.length <= 1 && (
        <p className="text-surface-500 text-xs mt-2">Only 1 data point — more sessions will show a trend</p>
      )}
    </div>
  );
}
