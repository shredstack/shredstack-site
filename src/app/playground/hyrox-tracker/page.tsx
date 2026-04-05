'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import HyroxTracker from './components/HyroxTracker';

type SessionState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; userId: number; email: string };

type LoginStatus = 'idle' | 'sending' | 'sent' | 'error';

function HyroxTrackerContent() {
  const [session, setSession] = useState<SessionState>({ status: 'loading' });
  const [email, setEmail] = useState('');
  const [loginStatus, setLoginStatus] = useState<LoginStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    // Show error from magic link redirect (e.g. expired link)
    const error = searchParams.get('error');
    if (error === 'invalid-token') {
      setErrorMessage('That link has expired or is invalid. Please request a new one.');
    } else if (error === 'missing-token') {
      setErrorMessage('Invalid sign-in link. Please request a new one.');
    }

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
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginStatus('sending');
    setErrorMessage('');

    try {
      const res = await fetch('/api/smart-cfd/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirectTo: '/playground/hyrox-tracker' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send sign-in link');
      }

      setLoginStatus('sent');
    } catch (err) {
      setLoginStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  if (session.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-surface-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  if (session.status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-surface-200 mb-2">HYROX Training Tracker</h2>
          <p className="text-surface-400 text-sm mb-6">
            Sign in with your email to access your training plan and benchmarks.
          </p>

          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-sm text-red-400">
              {errorMessage}
            </div>
          )}

          {loginStatus === 'sent' ? (
            <div className="space-y-3">
              <div className="bg-rainbow-orange/10 border border-rainbow-orange/20 rounded-lg p-4">
                <p className="text-rainbow-orange font-medium">Check your email</p>
                <p className="text-surface-400 text-sm mt-1">
                  We sent a sign-in link to <span className="text-surface-200">{email}</span>.
                  It expires in 15 minutes.
                </p>
              </div>
              <button
                onClick={() => { setLoginStatus('idle'); setEmail(''); }}
                className="text-sm text-surface-500 hover:text-surface-300 transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-surface-200 text-sm placeholder:text-surface-600 focus:outline-none focus:border-rainbow-orange/50 focus:ring-1 focus:ring-rainbow-orange/20"
              />
              <button
                type="submit"
                disabled={loginStatus === 'sending' || !email}
                className="w-full px-6 py-3 bg-rainbow-orange text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
              >
                {loginStatus === 'sending' ? 'Sending...' : 'Send Sign-In Link'}
              </button>
            </form>
          )}
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
