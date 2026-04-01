'use client';

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import type { DashboardData } from '../types';

const COLORS = [
  '#6366f1', '#22d68a', '#f97316', '#eab308', '#ec4899',
  '#8b5cf6', '#06b6d4', '#10b981', '#f43f5e', '#a855f7',
];

interface OverviewTabProps {
  data: DashboardData;
}

export default function OverviewTab({ data }: OverviewTabProps) {
  const { summary, workouts } = data;

  // Category donut data
  const categoryData = Object.entries(summary.categories)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  // Monthly workout frequency
  const monthlyFrequency = getMonthlyFrequency(workouts);

  // Monthly Rx rate
  const monthlyRxRate = getMonthlyRxRate(workouts);

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Scores" value={summary.totalScores} sub={`${summary.uniqueWorkouts} unique workouts`} />
        <StatCard
          label="Rx Rate"
          value={`${summary.rxCount + summary.scaledCount > 0
            ? Math.round((summary.rxCount / (summary.rxCount + summary.scaledCount)) * 100)
            : 0}%`}
          sub={`${summary.rxCount} Rx / ${summary.scaledCount} Scaled`}
        />
        <StatCard
          label="Date Range"
          value={summary.dateRange.length === 2
            ? `${formatShortDate(summary.dateRange[0])} - ${formatShortDate(summary.dateRange[1])}`
            : 'N/A'}
        />
        <StatCard
          label="Repeat Workouts"
          value={summary.repeatWorkouts}
          sub="done more than once"
        />
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Rx Rate Over Time */}
        <div className="card p-6">
          <h3 className="text-sm font-medium text-surface-400 mb-4">Rx Rate Over Time</h3>
          {monthlyRxRate.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyRxRate}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                <XAxis dataKey="month" tick={{ fill: '#8888a0', fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: '#8888a0', fontSize: 11 }} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a26', border: '1px solid #2a2a3a', borderRadius: '8px' }}
                  labelStyle={{ color: '#e8e8f0' }}
                  itemStyle={{ color: '#22d68a' }}
                />
                <Area
                  type="monotone"
                  dataKey="rxRate"
                  name="Rx %"
                  stroke="#22d68a"
                  fill="#22d68a"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-surface-500 text-sm">Not enough data for trend</p>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="card p-6">
          <h3 className="text-sm font-medium text-surface-400 mb-4">Category Breakdown</h3>
          {categoryData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a26', border: '1px solid #2a2a3a', borderRadius: '8px' }}
                    labelStyle={{ color: '#e8e8f0' }}
                    itemStyle={{ color: '#60a5fa' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {categoryData.slice(0, 6).map((cat, idx) => (
                  <div key={cat.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-surface-300 truncate">{cat.name}</span>
                    <span className="text-surface-500 ml-auto">{cat.value}</span>
                  </div>
                ))}
                {categoryData.length > 6 && (
                  <div className="text-surface-500 text-xs">+{categoryData.length - 6} more</div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-surface-500 text-sm">No categories assigned yet</p>
          )}
        </div>
      </div>

      {/* Workout Frequency */}
      <div className="card p-6">
        <h3 className="text-sm font-medium text-surface-400 mb-4">Workout Frequency</h3>
        {monthlyFrequency.length > 1 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyFrequency}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis dataKey="month" tick={{ fill: '#8888a0', fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: '#8888a0', fontSize: 11 }} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a26', border: '1px solid #2a2a3a', borderRadius: '8px' }}
                labelStyle={{ color: '#e8e8f0' }}
                itemStyle={{ color: '#6366f1' }}
              />
              <Area
                type="monotone"
                dataKey="count"
                name="Workouts"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-surface-500 text-sm">Not enough data for trend</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-surface-400 text-xs mb-1">{label}</div>
      <div className="text-xl font-bold text-white">{value}</div>
      {sub && <div className="text-surface-500 text-xs mt-1">{sub}</div>}
    </div>
  );
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function getMonthlyFrequency(workouts: DashboardData['workouts']) {
  const months: Record<string, number> = {};
  for (const w of workouts) {
    if (w.isMonthlyChallenge) continue;
    const month = w.workoutDate.substring(0, 7); // YYYY-MM
    months[month] = (months[month] || 0) + 1;
  }
  return Object.entries(months)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({
      month: formatMonthLabel(month),
      count,
    }));
}

function getMonthlyRxRate(workouts: DashboardData['workouts']) {
  const months: Record<string, { rx: number; total: number }> = {};
  for (const w of workouts) {
    if (w.isMonthlyChallenge) continue;
    const div = w.rawDivision?.toLowerCase();
    if (div !== 'rx' && div !== 'scaled') continue;
    const month = w.workoutDate.substring(0, 7);
    if (!months[month]) months[month] = { rx: 0, total: 0 };
    months[month].total++;
    if (div === 'rx') months[month].rx++;
  }
  return Object.entries(months)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, { rx, total }]) => ({
      month: formatMonthLabel(month),
      rxRate: Math.round((rx / total) * 100),
    }));
}

function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(month) - 1]} '${year.slice(2)}`;
}
