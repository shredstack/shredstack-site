'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SmartCfdLogin({ error }: { error: string | null }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMessage('');

    try {
      const res = await fetch('/api/smart-cfd/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send magic link');
      }

      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <div className="py-16">
      <div className="section-container">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/playground"
              className="text-surface-400 hover:text-white text-sm transition-colors inline-flex items-center mb-6"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              Playground
            </Link>
            <h1 className="text-3xl font-bold text-white mb-3">
              <span className="text-gradient-rainbow">Smart CFD Insights</span>
            </h1>
            <p className="text-surface-400">
              AI-powered analysis of your CrossFit workout data. Sign in with your email to get started.
            </p>
          </div>

          {/* Error from URL params (expired/invalid token) */}
          {error && (
            <div className="card p-4 mb-6 border-red-500/30">
              <p className="text-red-400 text-sm">
                {error === 'invalid-token'
                  ? 'This link has expired or is invalid. Please request a new one.'
                  : error === 'missing-token'
                  ? 'Invalid sign-in link. Please request a new one.'
                  : 'Something went wrong. Please try again.'}
              </p>
            </div>
          )}

          {/* Login Card */}
          <div className="card p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rainbow-purple to-rainbow-cyan" />

            {status === 'sent' ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-4">✉️</div>
                <h2 className="text-lg font-semibold text-white mb-2">Check your email</h2>
                <p className="text-surface-400 text-sm mb-4">
                  We sent a sign-in link to <span className="text-white">{email}</span>
                </p>
                <p className="text-surface-500 text-xs">The link expires in 15 minutes.</p>
                <button
                  onClick={() => { setStatus('idle'); setEmail(''); }}
                  className="mt-6 text-accent-400 hover:text-accent-300 text-sm transition-colors"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <label htmlFor="email" className="block text-sm font-medium text-surface-300 mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-lg text-white placeholder-surface-500 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-colors"
                />

                {status === 'error' && (
                  <p className="mt-2 text-red-400 text-sm">{errorMessage}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="mt-4 w-full py-3 bg-accent-600 hover:bg-accent-500 disabled:bg-accent-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  {status === 'sending' ? 'Sending...' : 'Send magic link'}
                </button>
              </form>
            )}
          </div>

          {/* Info */}
          <p className="mt-6 text-surface-500 text-xs text-center">
            No password needed — we&apos;ll email you a secure sign-in link.
          </p>
        </div>
      </div>
    </div>
  );
}
