'use client';

import { Suspense, useEffect, useState } from 'react';
import HyroxTracker from './components/HyroxTracker';

type SessionState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; userId: number; email: string };

function HyroxTrackerContent() {
  const [session, setSession] = useState<SessionState>({ status: 'loading' });

  useEffect(() => {
    fetch('/api/smart-cfd/auth/session')
      .then((res) => {
        if (!res.ok) return { authenticated: false };
        return res.json();
      })
      .then((data) => {
        if (data.authenticated) {
          setSession({ status: 'authenticated', userId: data.userId, email: data.email });
        } else {
          setSession({ status: 'unauthenticated' });
        }
      })
      .catch(() => setSession({ status: 'unauthenticated' }));
  }, []);

  if (session.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-surface-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  if (session.status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-surface-200 mb-4">HYROX Training Tracker</h2>
          <p className="text-surface-400 mb-6">
            Sign in via Smart CFD Insights to access the HYROX tracker.
          </p>
          <a
            href="/playground/smart-cfd"
            className="inline-block px-6 py-3 bg-rainbow-orange text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return <HyroxTracker email={session.email} />;
}

export default function HyroxTrackerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-surface-400 animate-pulse">Loading...</div>
      </div>
    }>
      <HyroxTrackerContent />
    </Suspense>
  );
}
