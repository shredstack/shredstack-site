'use client';

import { useEffect, useState } from 'react';
import type { DashboardData } from '../types';
import OverviewTab from './OverviewTab';
import StrengthTab from './StrengthTab';
import MovementsTab from './MovementsTab';
import WorkoutBrowserTab from './WorkoutBrowserTab';
import InsightsTab from './InsightsTab';

const TABS = ['Overview', 'Strength', 'Movements', 'Workouts', 'Insights'] as const;
type TabName = typeof TABS[number];

interface DashboardProps {
  onUploadMore?: () => void;
  onReanalyze?: () => void;
  onSignOut?: () => void;
  email: string;
  readOnly?: boolean;
  dataUrl?: string;
  insightsUrl?: string;
}

export default function Dashboard({ onUploadMore, onReanalyze, onSignOut, email, readOnly, dataUrl, insightsUrl }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabName>('Overview');
  const [resetting, setResetting] = useState(false);
  const [shareStatus, setShareStatus] = useState<{ isPublic: boolean; publicSlug: string | null } | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [gender, setGender] = useState<string | null>(null);

  // Sync gender from data once loaded
  useEffect(() => {
    if (data?.user?.gender) setGender(data.user.gender);
  }, [data]);

  const handleGenderChange = async (newGender: string) => {
    setGender(newGender);
    try {
      await fetch('/api/smart-cfd/gender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender: newGender }),
      });
    } catch {
      // Revert on error
      setGender(data?.user?.gender ?? null);
    }
  };

  useEffect(() => {
    fetch(dataUrl || '/api/smart-cfd/data')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load dashboard data');
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [dataUrl]);

  // Fetch share status for non-readonly dashboards
  useEffect(() => {
    if (readOnly) return;
    fetch('/api/smart-cfd/share')
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data && !data.error) setShareStatus(data);
      })
      .catch(() => {});
  }, [readOnly]);

  const handleToggleShare = async () => {
    setShareLoading(true);
    try {
      const res = await fetch('/api/smart-cfd/share', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to toggle sharing');
      const data = await res.json();
      setShareStatus(data);
    } catch {
      alert('Failed to toggle sharing. Please try again.');
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!shareStatus?.publicSlug) return;
    const url = `${window.location.origin}/playground/smart-cfd/share/${shareStatus.publicSlug}`;
    navigator.clipboard.writeText(url);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleReanalyze = async () => {
    if (!confirm('This will clear all AI analysis and re-process your workouts. Continue?')) return;
    setResetting(true);
    try {
      const res = await fetch('/api/smart-cfd/reset', { method: 'POST' });
      if (!res.ok) throw new Error('Reset failed');
      onReanalyze?.();
    } catch {
      setResetting(false);
      alert('Failed to reset analysis. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-surface-400 text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <p className="text-red-400 mb-4">{error || 'Failed to load data'}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-accent-600 hover:bg-accent-500 text-white text-sm rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">
            <span className="text-gradient-rainbow">CrossFit Smart Insights</span>
          </h1>
          {readOnly ? (
            <p className="text-surface-400 text-sm">
              {data.user.displayName || email}&apos;s training dashboard
            </p>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-surface-400 text-sm">{email}</p>
              <select
                value={gender || ''}
                onChange={(e) => handleGenderChange(e.target.value)}
                className="text-xs bg-surface-800 border border-surface-600 text-surface-300 rounded px-2 py-1"
              >
                <option value="">Set gender</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
              {!gender && <span className="text-yellow-500 text-xs">Required for accurate weight data</span>}
            </div>
          )}
        </div>
        {!readOnly && (
          <div className="flex items-center gap-3 sm:gap-4">
            {shareStatus && (
              <div className="flex items-center gap-2">
                {shareStatus.isPublic && (
                  <button
                    onClick={handleCopyLink}
                    className="text-rainbow-green hover:text-rainbow-cyan text-sm transition-colors"
                  >
                    {copyFeedback ? 'Copied!' : 'Copy link'}
                  </button>
                )}
                <button
                  onClick={handleToggleShare}
                  disabled={shareLoading}
                  className={`text-sm transition-colors disabled:opacity-50 ${
                    shareStatus.isPublic
                      ? 'text-rainbow-green hover:text-red-400'
                      : 'text-surface-400 hover:text-white'
                  }`}
                >
                  {shareLoading ? '...' : shareStatus.isPublic ? 'Public' : 'Share'}
                </button>
              </div>
            )}
            <button
              onClick={onUploadMore}
              className="text-accent-400 hover:text-accent-300 text-sm transition-colors"
            >
              Upload data
            </button>
            <button
              onClick={handleReanalyze}
              disabled={resetting}
              className="text-surface-400 hover:text-white text-sm transition-colors disabled:opacity-50"
            >
              {resetting ? 'Resetting...' : 'Re-analyze all'}
            </button>
            <button
              onClick={onSignOut}
              className="text-surface-400 hover:text-white text-sm transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
        {readOnly && (
          <a
            href="/playground/smart-cfd"
            className="text-accent-400 hover:text-accent-300 text-sm transition-colors"
          >
            Get your own insights
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-surface-700 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap ${
              activeTab === tab
                ? 'text-white'
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-500" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Overview' && <OverviewTab data={data} />}
      {activeTab === 'Strength' && <StrengthTab data={data} />}
      {activeTab === 'Movements' && <MovementsTab data={data} />}
      {activeTab === 'Workouts' && <WorkoutBrowserTab data={data} />}
      {activeTab === 'Insights' && <InsightsTab insightsUrl={insightsUrl} readOnly={readOnly} />}
    </div>
  );
}
