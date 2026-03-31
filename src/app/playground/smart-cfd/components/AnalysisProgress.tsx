'use client';

import { useEffect, useState, useCallback } from 'react';

interface AnalysisProgressProps {
  onComplete: () => void;
}

type AnalysisState =
  | { phase: 'starting' }
  | { phase: 'running'; progress: number; processedSoFar: number }
  | { phase: 'complete'; totalProcessed: number }
  | { phase: 'error'; message: string };

export default function AnalysisProgress({ onComplete }: AnalysisProgressProps) {
  const [state, setState] = useState<AnalysisState>({ phase: 'starting' });

  const runAnalysis = useCallback(async () => {
    let totalProcessed = 0;

    try {
      // Chunked processing: keep calling /analyze until done
      while (true) {
        const res = await fetch('/api/smart-cfd/analyze', { method: 'POST' });

        if (!res.ok) {
          const data = await res.json();
          setState({ phase: 'error', message: data.error || 'Analysis failed' });
          return;
        }

        const data = await res.json();
        totalProcessed += data.processed;

        if (data.done) {
          setState({ phase: 'complete', totalProcessed });
          setTimeout(onComplete, 1500);
          return;
        }

        // Update progress from status endpoint for accuracy
        const statusRes = await fetch('/api/smart-cfd/status');
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setState({
            phase: 'running',
            progress: statusData.progress || 0,
            processedSoFar: totalProcessed,
          });
        }
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
