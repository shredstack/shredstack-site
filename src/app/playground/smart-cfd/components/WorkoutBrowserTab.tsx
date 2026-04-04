'use client';

import { useMemo, useState } from 'react';
import type { DashboardData, DashboardWorkout } from '../types';
import { formatDate } from './date-utils';

interface WorkoutBrowserTabProps {
  data: DashboardData;
  onWorkoutCategoryChange?: (workoutId: number, categoryId: number | null, isMonthlyChallenge?: boolean) => void;
}

export default function WorkoutBrowserTab({ data, onWorkoutCategoryChange }: WorkoutBrowserTabProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const categories = useMemo(
    () => Object.keys(data.summary.categories).sort(),
    [data.summary.categories]
  );

  // Category breakdown for bar chart
  const categoryBreakdown = useMemo(() => {
    const entries = Object.entries(data.summary.categories).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    return entries.map(([name, count]) => ({
      name,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  }, [data.summary.categories]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data.workouts
      .filter((w) => {
        if (w.isMonthlyChallenge) return false;
        if (q && !w.rawDescription.toLowerCase().includes(q) &&
            !w.aiSummary?.toLowerCase().includes(q) &&
            !w.canonicalTitle?.toLowerCase().includes(q) &&
            !w.rawTitle?.toLowerCase().includes(q)) {
          return false;
        }
        if (categoryFilter !== 'all' && w.category !== categoryFilter) return false;
        if (divisionFilter !== 'all' && w.rawDivision?.toLowerCase() !== divisionFilter) return false;
        if (dateFrom && w.workoutDate < dateFrom) return false;
        if (dateTo && w.workoutDate > dateTo) return false;
        return true;
      })
      .sort((a, b) => b.workoutDate.localeCompare(a.workoutDate));
  }, [data.workouts, search, categoryFilter, divisionFilter, dateFrom, dateTo]);

  const expandedWorkout = expandedId !== null
    ? data.workouts.find((w) => w.scoreId === expandedId)
    : null;

  const similarWorkouts = useMemo(() => {
    if (!expandedWorkout?.similarityCluster) return [];
    const clusterIds = data.clusters[expandedWorkout.similarityCluster] || [];
    return data.workouts
      .filter((w) => clusterIds.includes(w.scoreId) && w.scoreId !== expandedWorkout.scoreId)
      .sort((a, b) => b.workoutDate.localeCompare(a.workoutDate));
  }, [expandedWorkout, data.clusters, data.workouts]);

  return (
    <div className="space-y-4">
      {/* Category Breakdown Bar Chart */}
      {categoryBreakdown.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-medium text-surface-400 mb-3">Workout Categories</h3>
          <div className="space-y-2">
            {categoryBreakdown.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setCategoryFilter(categoryFilter === cat.name ? 'all' : cat.name)}
                className={`w-full flex items-center gap-3 text-sm group hover:bg-surface-800/50 rounded-lg px-2 py-1 transition-colors ${
                  categoryFilter === cat.name ? 'bg-surface-800/50' : ''
                }`}
              >
                <span className="text-surface-300 w-40 text-left truncate">{cat.name}</span>
                <div className="flex-1 h-2 bg-surface-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-500 transition-all"
                    style={{ width: `${cat.percent}%` }}
                  />
                </div>
                <span className="text-surface-400 text-xs w-12 text-right">{cat.count}</span>
                <span className="text-surface-500 text-xs w-10 text-right">{cat.percent}%</span>
              </button>
            ))}
          </div>
          {categoryFilter !== 'all' && (
            <button
              onClick={() => setCategoryFilter('all')}
              className="text-accent-400 hover:text-accent-300 text-xs mt-2 transition-colors"
            >
              Clear filter
            </button>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search workouts..."
          className="flex-1 min-w-[200px] px-4 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white placeholder-surface-500 text-sm focus:outline-none focus:border-accent-500"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-surface-300 text-sm focus:outline-none focus:border-accent-500"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={divisionFilter}
          onChange={(e) => setDivisionFilter(e.target.value)}
          className="px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-surface-300 text-sm focus:outline-none focus:border-accent-500"
        >
          <option value="all">All Divisions</option>
          <option value="rx">Rx</option>
          <option value="scaled">Scaled</option>
        </select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-surface-300 text-sm focus:outline-none focus:border-accent-500 [color-scheme:dark]"
            placeholder="From"
          />
          <span className="text-surface-500 text-sm">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-surface-300 text-sm focus:outline-none focus:border-accent-500 [color-scheme:dark]"
            placeholder="To"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-surface-400 hover:text-white text-sm px-1"
              title="Clear dates"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <p className="text-surface-500 text-xs">{filtered.length} workouts</p>

      {/* Workout List */}
      <div className="space-y-2">
        {filtered.slice(0, 50).map((workout) => (
          <WorkoutCard
            key={workout.scoreId}
            workout={workout}
            isExpanded={expandedId === workout.scoreId}
            onToggle={() => setExpandedId(expandedId === workout.scoreId ? null : workout.scoreId)}
            similarWorkouts={expandedId === workout.scoreId ? similarWorkouts : []}
            allCategories={data.allCategories}
            onCategoryChange={onWorkoutCategoryChange}
          />
        ))}
        {filtered.length > 50 && (
          <p className="text-surface-500 text-sm text-center py-4">
            Showing 50 of {filtered.length} workouts. Use search/filters to narrow down.
          </p>
        )}
        {filtered.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-surface-400">No workouts match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkoutCard({
  workout,
  isExpanded,
  onToggle,
  similarWorkouts,
  allCategories,
  onCategoryChange,
}: {
  workout: DashboardWorkout;
  isExpanded: boolean;
  onToggle: () => void;
  similarWorkouts: DashboardWorkout[];
  allCategories: { id: number; name: string }[];
  onCategoryChange?: (workoutId: number, categoryId: number | null, isMonthlyChallenge?: boolean) => void;
}) {
  const divColor = workout.rawDivision?.toLowerCase() === 'rx'
    ? 'text-green-400 bg-green-500/10'
    : workout.rawDivision?.toLowerCase() === 'scaled'
    ? 'text-orange-400 bg-orange-500/10'
    : 'text-surface-400 bg-surface-700';

  return (
    <div className="card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 text-left hover:bg-surface-800/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-surface-500 text-xs">{formatDate(workout.workoutDate)}</span>
              {workout.rawDivision && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${divColor}`}>
                  {workout.rawDivision}
                </span>
              )}
              {workout.category && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent-500/10 text-accent-400">
                  {workout.category}
                </span>
              )}
            </div>
            <p className="text-white text-sm font-medium truncate">
              {workout.canonicalTitle || workout.aiSummary || workout.rawTitle || workout.rawDescription.substring(0, 80)}
            </p>
            <p className="text-surface-400 text-xs mt-1">
              Score: {workout.rawScore}
              {workout.workoutType && <> &middot; {workout.workoutType.replace(/_/g, ' ')}</>}
            </p>
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

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-surface-700 p-4 space-y-4">
          {/* Full Description */}
          <div>
            <h4 className="text-xs text-surface-400 font-medium mb-1">Description</h4>
            <pre className="text-surface-300 text-xs whitespace-pre-wrap font-sans leading-relaxed">
              {workout.rawDescription}
            </pre>
          </div>

          {/* Category Editing */}
          {onCategoryChange && (
            <div className="flex items-center gap-4">
              <div>
                <h4 className="text-xs text-surface-400 font-medium mb-1">Category</h4>
                <select
                  value={workout.categoryId ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    onCategoryChange(workout.workoutId, val ? parseInt(val) : null);
                  }}
                  className="text-xs bg-surface-800 border border-surface-600 text-surface-300 rounded px-2 py-1"
                >
                  <option value="">Uncategorized</option>
                  {allCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <h4 className="text-xs text-surface-400 font-medium mb-1">Monthly Challenge</h4>
                <label className="flex items-center gap-2 text-xs text-surface-300">
                  <input
                    type="checkbox"
                    checked={workout.isMonthlyChallenge ?? false}
                    onChange={(e) => onCategoryChange(workout.workoutId, undefined as unknown as number | null, e.target.checked)}
                    className="rounded border-surface-600 bg-surface-800"
                  />
                  Exclude from insights
                </label>
              </div>
            </div>
          )}

          {/* Personal Notes */}
          {workout.rawNotes && (
            <div>
              <h4 className="text-xs text-surface-400 font-medium mb-1">Personal Notes</h4>
              <div className="bg-surface-800 border border-surface-600 rounded-lg p-3">
                <p className="text-surface-200 text-xs whitespace-pre-wrap leading-relaxed">
                  {workout.rawNotes}
                </p>
              </div>
            </div>
          )}

          {/* Similar Workouts */}
          {similarWorkouts.length > 0 && (
            <div>
              <h4 className="text-xs text-surface-400 font-medium mb-2">
                {similarWorkouts.length} similar workout{similarWorkouts.length !== 1 ? 's' : ''}
                <span className="text-surface-500 ml-1">({workout.similarityCluster})</span>
              </h4>
              <div className="space-y-1.5">
                {similarWorkouts.slice(0, 5).map((sw) => {
                  const swDivColor = sw.rawDivision?.toLowerCase() === 'rx'
                    ? 'text-green-400'
                    : sw.rawDivision?.toLowerCase() === 'scaled'
                    ? 'text-orange-400'
                    : 'text-surface-400';
                  return (
                    <div key={sw.scoreId} className="flex items-center gap-2 text-xs">
                      <span className="text-surface-500 w-20 shrink-0">{formatDate(sw.workoutDate)}</span>
                      <span className="text-surface-300 truncate flex-1">
                        {sw.canonicalTitle || sw.aiSummary || sw.rawTitle || sw.rawDescription.substring(0, 60)}
                      </span>
                      <span className="text-surface-400">{sw.rawScore}</span>
                      <span className={`${swDivColor} w-12 text-right`}>{sw.rawDivision}</span>
                    </div>
                  );
                })}
                {similarWorkouts.length > 5 && (
                  <p className="text-surface-500 text-xs">+{similarWorkouts.length - 5} more</p>
                )}
                {/* Rx progression within this cluster */}
                {(() => {
                  const rxInCluster = similarWorkouts.filter((w) => w.rawDivision?.toLowerCase() === 'rx').length +
                    (workout.rawDivision?.toLowerCase() === 'rx' ? 1 : 0);
                  const totalInCluster = similarWorkouts.length + 1;
                  return (
                    <p className="text-surface-400 text-xs mt-2">
                      Rx rate for this type: {Math.round((rxInCluster / totalInCluster) * 100)}%
                      ({rxInCluster}/{totalInCluster})
                    </p>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
