'use client';

import { useState, useEffect } from 'react';
import TrainingPlanTab from './TrainingPlanTab';
import DashboardTab from './DashboardTab';
import ProgressTab from './ProgressTab';
import { getDaysUntilRace, getCurrentWeek, getPhaseForWeek } from '@/lib/hyrox-utils';

const TABS = ['Plan', 'Dashboard', 'Progress'] as const;
type TabName = typeof TABS[number];

interface HyroxTrackerProps {
  email: string;
}

export default function HyroxTracker({ email }: HyroxTrackerProps) {
  const [activeTab, setActiveTab] = useState<TabName>('Plan');
  const [refreshKey, setRefreshKey] = useState(0);

  const daysUntilRace = getDaysUntilRace();
  const currentWeek = getCurrentWeek();
  const currentPhase = getPhaseForWeek(currentWeek);

  const handleSessionLogged = () => {
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Header */}
      <div className="section-container py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-surface-100">
              HYROX Training Tracker
            </h1>
            <p className="text-surface-400 text-sm mt-1">
              Phase {currentPhase.number}: {currentPhase.name} &middot; Week {currentWeek}/24 &middot;{' '}
              <span className="text-rainbow-orange font-medium">{daysUntilRace} days until race</span>
            </p>
          </div>
          <div className="text-sm text-surface-500">
            {email}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-surface-800 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-rainbow-orange text-rainbow-orange'
                  : 'border-transparent text-surface-400 hover:text-surface-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="section-container pb-12">
        {activeTab === 'Plan' && (
          <TrainingPlanTab
            key={`plan-${refreshKey}`}
            onSessionLogged={handleSessionLogged}
          />
        )}
        {activeTab === 'Dashboard' && (
          <DashboardTab key={`dashboard-${refreshKey}`} />
        )}
        {activeTab === 'Progress' && (
          <ProgressTab key={`progress-${refreshKey}`} />
        )}
      </div>
    </div>
  );
}
