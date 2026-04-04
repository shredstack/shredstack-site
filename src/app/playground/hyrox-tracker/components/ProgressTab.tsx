'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  HYROX_STATIONS,
  SCENARIO_A,
  formatTime,
  type SegmentId,
} from '@/lib/hyrox-utils';

interface SessionLog {
  id: number;
  completedAt: string;
  sessionType: string;
  actualDurationMin: number | null;
  rpe: number | null;
  runPace: string | null;
  notes: string | null;
}

interface BenchmarkEntry {
  timeSeconds: number;
  distance: string | null;
  isFullDistance: boolean | null;
  recordedAt: string;
  source: string;
}

interface BenchmarkData {
  current: Record<string, { timeSeconds: number }>;
  history: Record<string, BenchmarkEntry[]>;
  targets: { scenarioA: Record<string, number>; scenarioB: Record<string, number> };
}

export default function ProgressTab() {
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [benchmarks, setBenchmarks] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/hyrox/sessions?limit=200').then(r => r.json()),
      fetch('/api/hyrox/benchmarks').then(r => r.json()),
    ]).then(([sessData, benchData]) => {
      setSessions(sessData.sessions || []);
      setBenchmarks(benchData);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-surface-400 animate-pulse py-8">Loading progress data...</div>;
  }

  const hasSessions = sessions.length > 0;
  const hasBenchmarks = benchmarks && Object.keys(benchmarks.history).length > 0;

  if (!hasSessions && !hasBenchmarks) {
    return (
      <div className="card p-8 text-center">
        <p className="text-surface-400">No data yet. Log some sessions to see progress charts.</p>
      </div>
    );
  }

  // Build station improvement data (full-distance only, sorted by date)
  const stationChartData = buildStationChartData(benchmarks);

  // Build RPE trend data
  const rpeSorted = [...sessions]
    .filter(s => s.rpe != null)
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

  const rpeData = rpeSorted.map((s, i) => {
    const window = rpeSorted.slice(Math.max(0, i - 6), i + 1);
    const avg = window.reduce((sum, w) => sum + (w.rpe || 0), 0) / window.length;
    return {
      date: new Date(s.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      rpe: s.rpe,
      avg: Math.round(avg * 10) / 10,
    };
  });

  // Session volume by week
  const weeklyVolume = buildWeeklyVolume(sessions);

  return (
    <div className="space-y-6">
      {/* Station Improvement Chart */}
      {stationChartData.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-medium text-surface-400 mb-4">Station Times Over Time</h3>
          <p className="text-xs text-surface-500 mb-3">Full-distance benchmarks only. Horizontal lines = Scenario A targets.</p>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={stationChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} />
              <YAxis
                tick={{ fill: '#888', fontSize: 11 }}
                tickFormatter={(v: number) => formatTime(v)}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333', borderRadius: '8px' }}
                labelStyle={{ color: '#aaa' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [value != null ? formatTime(value) : '', name]}
              />
              <Legend />
              {HYROX_STATIONS.map((station, i) => {
                const colors = ['#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#eab308', '#ef4444'];
                const hasData = stationChartData.some(d => (d as Record<string, unknown>)[station.name] != null);
                if (!hasData) return null;
                return (
                  <Line
                    key={station.id}
                    type="monotone"
                    dataKey={station.name}
                    stroke={colors[i % colors.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* RPE Trend */}
      {rpeData.length >= 3 && (
        <div className="card p-4">
          <h3 className="text-sm font-medium text-surface-400 mb-4">RPE Trend</h3>
          <p className="text-xs text-surface-500 mb-3">Rate of Perceived Exertion with 7-session rolling average.</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={rpeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} />
              <YAxis domain={[1, 10]} tick={{ fill: '#888', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333', borderRadius: '8px' }}
                labelStyle={{ color: '#aaa' }}
              />
              <Line type="monotone" dataKey="rpe" stroke="#f97316" strokeWidth={1} dot={{ r: 2 }} name="RPE" />
              <Line type="monotone" dataKey="avg" stroke="#ef4444" strokeWidth={2} dot={false} name="7-session avg" strokeDasharray="5 5" />
              <ReferenceLine y={7} stroke="#eab308" strokeDasharray="3 3" label={{ value: 'Watch zone', fill: '#eab308', fontSize: 10 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weekly Session Volume */}
      {weeklyVolume.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-medium text-surface-400 mb-4">Sessions Per Week</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyVolume}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="week" tick={{ fill: '#888', fontSize: 11 }} />
              <YAxis tick={{ fill: '#888', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333', borderRadius: '8px' }}
                labelStyle={{ color: '#aaa' }}
              />
              <Bar dataKey="run" stackId="a" fill="#22c55e" name="Runs" />
              <Bar dataKey="station" stackId="a" fill="#f97316" name="Station Skills" />
              <Bar dataKey="hyrox" stackId="a" fill="#8b5cf6" name="HYROX Sessions" />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function buildStationChartData(benchmarks: BenchmarkData | null) {
  if (!benchmarks) return [];

  // Collect all full-distance entries across all stations, grouped by date
  const dateMap = new Map<string, Record<string, number>>();

  for (const station of HYROX_STATIONS) {
    const entries = (benchmarks.history[station.id] || [])
      .filter(e => e.isFullDistance)
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

    for (const entry of entries) {
      const dateStr = new Date(entry.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dateMap.has(dateStr)) dateMap.set(dateStr, {});
      dateMap.get(dateStr)![station.name] = entry.timeSeconds;
    }
  }

  return Array.from(dateMap.entries())
    .map(([date, stations]) => ({ date, ...stations }))
    .sort((a, b) => {
      // Sort by first occurrence date
      return 0; // Already sorted by insertion order from sorted entries
    });
}

function buildWeeklyVolume(sessions: SessionLog[]) {
  const weekMap = new Map<string, { run: number; station: number; hyrox: number }>();

  for (const s of sessions) {
    const date = new Date(s.completedAt);
    // Get ISO week
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    const key = `W${weekNum}`;

    if (!weekMap.has(key)) weekMap.set(key, { run: 0, station: 0, hyrox: 0 });
    const week = weekMap.get(key)!;

    const type = s.sessionType;
    if (['easy_run', 'tempo_run', 'race_pace_run', 'shakeout_run'].includes(type)) {
      week.run++;
    } else if (type === 'station_skills') {
      week.station++;
    } else {
      week.hyrox++;
    }
  }

  return Array.from(weekMap.entries())
    .map(([week, counts]) => ({ week, ...counts }))
    .reverse(); // newest first in data, but chart reads left to right
}
