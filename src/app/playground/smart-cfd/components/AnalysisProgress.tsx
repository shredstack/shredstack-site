'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface AnalysisProgressProps {
  onComplete: () => void;
}

type AnalysisState =
  | { phase: 'starting' }
  | { phase: 'running'; progress: number; processedSoFar: number }
  | { phase: 'complete'; totalProcessed: number }
  | { phase: 'error'; message: string };

// If a single /analyze call takes longer than this, assume it timed out
const REQUEST_TIMEOUT_MS = 65_000;
// Poll /status independently at this interval
const STATUS_POLL_INTERVAL_MS = 3_000;

export default function AnalysisProgress({ onComplete }: AnalysisProgressProps) {
  const [state, setState] = useState<AnalysisState>({ phase: 'starting' });
  const abortRef = useRef(false);
  const totalProcessedRef = useRef(0);

  // Independent status poller — keeps UI updated even while /analyze is in-flight
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/smart-cfd/status');
        if (!res.ok) return;
        const data = await res.json();

        setState((prev) => {
          // Don't overwrite complete or error states
          if (prev.phase === 'complete' || prev.phase === 'error') return prev;

          return {
            phase: 'running',
            progress: data.progress || 0,
            processedSoFar: totalProcessedRef.current,
          };
        });
      } catch {
        // Ignore polling errors — the main loop handles real failures
      }
    }, STATUS_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  const runAnalysis = useCallback(async () => {
    abortRef.current = false;
    totalProcessedRef.current = 0;

    try {
      // Chunked processing: keep calling /analyze until done
      while (!abortRef.current) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        let res: Response;
        try {
          res = await fetch('/api/smart-cfd/analyze', {
            method: 'POST',
            signal: controller.signal,
          });
        } catch (err) {
          clearTimeout(timeout);
          if (err instanceof DOMException && err.name === 'AbortError') {
            // Request timed out — the server may still be processing.
            // Continue the loop so the next call picks up where it left off.
            console.warn('Analyze request timed out, retrying...');
            continue;
          }
          throw err;
        } finally {
          clearTimeout(timeout);
        }

        if (!res.ok) {
          let message = 'Analysis failed';
          const text = await res.text().catch(() => '');
          try {
            const data = JSON.parse(text);
            message = data.error || message;
          } catch {
            // Vercel platform errors (e.g. timeouts) return plain text, not JSON
            if (text) message = text;
          }
          setState({ phase: 'error', message });
          return;
        }

        const data = await res.json();
        totalProcessedRef.current += data.processed;

        if (data.done) {
          setState({ phase: 'complete', totalProcessed: totalProcessedRef.current });
          setTimeout(onComplete, 1500);
          return;
        }

        setState({
          phase: 'running',
          progress: Math.round(
            ((data.total - data.remaining) / data.total) * 100
          ),
          processedSoFar: totalProcessedRef.current,
        });
      }
    } catch (err) {
      setState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Analysis failed',
      });
    }
  }, [onComplete]);

  useEffect(() => {
    runAnalysis();
    return () => {
      abortRef.current = true;
    };
  }, [runAnalysis]);

  return (
    <div className="max-w-xl mx-auto">
      <div className="card p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rainbow-purple to-rainbow-cyan" />

        {state.phase === 'starting' && (
          <div className="text-center">
            <div className="text-4xl mb-4 animate-pulse">🧠</div>
            <h2 className="text-lg font-semibold text-white mb-2">Starting AI analysis...</h2>
            <p className="text-surface-400 text-sm">Preparing your workout data</p>
          </div>
        )}

        {state.phase === 'running' && (
          <div>
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">🧠</div>
              <h2 className="text-lg font-semibold text-white mb-2">Analyzing your workouts...</h2>
              <p className="text-surface-400 text-sm">
                {state.processedSoFar} workouts processed so far
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-surface-700 rounded-full h-3 mb-4">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-accent-500 to-rainbow-cyan transition-all duration-500"
                style={{ width: `${state.progress}%` }}
              />
            </div>
            <p className="text-surface-500 text-sm text-center">{state.progress}%</p>
          </div>
        )}

        {state.phase === 'complete' && (
          <div className="text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-lg font-semibold text-white mb-2">Analysis complete!</h2>
            <p className="text-surface-400 text-sm">
              {state.totalProcessed} workouts analyzed. Loading dashboard...
            </p>
          </div>
        )}

        {state.phase === 'error' && (
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-semibold text-white mb-2">Analysis error</h2>
            <p className="text-red-400 text-sm mb-4">{state.message}</p>
            <button
              onClick={() => {
                setState({ phase: 'starting' });
                runAnalysis();
              }}
              className="px-4 py-2 bg-accent-600 hover:bg-accent-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
