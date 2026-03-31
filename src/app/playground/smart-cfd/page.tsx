'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SmartCfdLogin from './components/SmartCfdLogin';
import CsvUpload from './components/CsvUpload';
import AnalysisProgress from './components/AnalysisProgress';
import Dashboard from './components/Dashboard';

type SessionState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; userId: number; email: string };

type AppView =
  | { view: 'loading' }
  | { view: 'upload' }
  | { view: 'uploaded'; newWorkoutCount: number; totalWorkoutCount: number; duplicatesSkipped: number }
  | { view: 'analyzing' }
  | { view: 'dashboard' };

function SmartCfdContent() {
  const [session, setSession] = useState<SessionState>({ status: 'loading' });
  const [appView, setAppView] = useState<AppView>({ view: 'loading' });
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  useEffect(() => {
    fetch('/api/smart-cfd/auth/session')
      .then((res) => {
        if (!res.ok) return { authenticated: false };
        return res.json();
      })
      .then(async (data) => {
        if (data.authenticated) {
          setSession({ status: 'authenticated', userId: data.userId, email: data.email });
          // Check if user already has analyzed data
          const statusRes = await fetch('/api/smart-cfd/status');
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.status === 'complete') {
              setAppView({ view: 'dashboard' });
              return;
            }
            if (statusData.status === 'analyzing' || statusData.status === 'pending') {
              setAppView({ view: 'analyzing' });
              return;
            }
          }
          setAppView({ view: 'upload' });
        } else {
          setSession({ status: 'unauthenticated' });
        }
      })
      .catch(() => setSession({ status: 'unauthenticated' }));
  }, []);

  if (session.status === 'loading' || (session.status === 'authenticated' && appView.view === 'loading')) {
    return (
      <div className="py-16">
        <div className="section-container">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-surface-400 text-lg">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (session.status === 'unauthenticated') {
    return <SmartCfdLogin error={error} />;
  }

  const handleSignOut = async () => {
    await fetch('/api/smart-cfd/auth/logout', { method: 'POST' });
    setSession({ status: 'unauthenticated' });
  };

  // Dashboard gets its own header
  if (appView.view === 'dashboard') {
    return (
      <div className="py-16">
        <div className="section-container">
          <Dashboard
            email={session.email}
            onUploadMore={() => setAppView({ view: 'upload' })}
            onReanalyze={() => setAppView({ view: 'analyzing' })}
            onSignOut={handleSignOut}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="py-16">
      <div className="section-container">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              <span className="text-gradient-rainbow">Smart CFD Insights</span>
            </h1>
            <p className="text-surface-400">Signed in as {session.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-surface-400 hover:text-white text-sm transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* Upload View */}
        {appView.view === 'upload' && (
          <CsvUpload
            onUploadComplete={(result) =>
              setAppView({
                view: 'uploaded',
                ...result,
              })
            }
          />
        )}

        {/* Post-Upload Confirmation */}
        {appView.view === 'uploaded' && (
          <div className="max-w-xl mx-auto">
            <div className="card p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rainbow-green to-rainbow-cyan" />
              <div className="text-4xl mb-4">✅</div>
              <h2 className="text-xl font-semibold text-white mb-4">Data uploaded</h2>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="card p-4">
                  <div className="text-2xl font-bold text-white">{appView.newWorkoutCount}</div>
                  <div className="text-surface-400 text-xs mt-1">New workouts</div>
                </div>
                <div className="card p-4">
                  <div className="text-2xl font-bold text-white">{appView.totalWorkoutCount}</div>
                  <div className="text-surface-400 text-xs mt-1">Total stored</div>
                </div>
                <div className="card p-4">
                  <div className="text-2xl font-bold text-surface-400">{appView.duplicatesSkipped}</div>
                  <div className="text-surface-400 text-xs mt-1">Duplicates skipped</div>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setAppView({ view: 'upload' })}
                  className="px-4 py-2 text-surface-400 hover:text-white text-sm transition-colors"
                >
                  Upload another CSV
                </button>
                <button
                  onClick={() => setAppView({ view: 'analyzing' })}
                  className="px-6 py-2 bg-accent-600 hover:bg-accent-500 text-white font-medium rounded-lg text-sm transition-colors"
                >
                  Run AI Analysis
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Analyzing View */}
        {appView.view === 'analyzing' && (
          <AnalysisProgress
            onComplete={() => setAppView({ view: 'dashboard' })}
          />
        )}
      </div>
    </div>
  );
}

export default function SmartCfdPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16">
          <div className="section-container">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-surface-400 text-lg">Loading...</div>
            </div>
          </div>
        </div>
      }
    >
      <SmartCfdContent />
    </Suspense>
  );
}
