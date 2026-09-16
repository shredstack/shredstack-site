'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import styles from './cheer.module.css';
import type { RaceConfig } from '@/lib/hyroxCheer/races/slc2026';

interface TestPanelProps {
  race: RaceConfig;
  startInstant: Date;
  totalPlanSeconds: number;
  midpointGoldSeconds: number;
  midpointPlanSeconds: number;
  /** Wipes every mark and note on the shared board. */
  onClearMarks: () => Promise<void> | void;
}

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function TestPanel({
  race,
  startInstant,
  totalPlanSeconds,
  midpointGoldSeconds,
  midpointPlanSeconds,
  onClearMarks,
}: TestPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  function setParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const jumps: { label: string; getNow: () => Date }[] = [
    { label: 'Before start', getNow: () => new Date(startInstant.getTime() - 90 * 60 * 1000) },
    { label: 'At the gun', getNow: () => new Date(startInstant.getTime()) },
    {
      label: 'Mid-race',
      getNow: () => new Date(startInstant.getTime() + (midpointGoldSeconds + 5) * 1000),
    },
    {
      label: `Past the ${race.planLabel} plan`,
      getNow: () => new Date(startInstant.getTime() + (midpointPlanSeconds + 60) * 1000),
    },
    {
      label: 'Finished',
      getNow: () => new Date(startInstant.getTime() + (totalPlanSeconds + 600) * 1000),
    },
  ];

  return (
    <div className={styles.testPanel}>
      <div className={styles.testPanelHeader} onClick={() => setOpen((o) => !o)}>
        <span>Testing (unlocked)</span>
        <span>{open ? '−' : '+'}</span>
      </div>
      {open && (
        <div className={styles.testPanelBody}>
          <label>
            Start override
            <input
              type="datetime-local"
              key={startInstant.getTime()}
              defaultValue={toDatetimeLocalValue(startInstant)}
              onChange={(e) => {
                if (!e.target.value) return;
                const d = new Date(e.target.value);
                if (!Number.isNaN(d.getTime())) setParams({ start: d.toISOString() });
              }}
            />
          </label>
          <label>
            Simulated now
            <input
              type="datetime-local"
              defaultValue={toDatetimeLocalValue(new Date())}
              onChange={(e) => {
                if (!e.target.value) return;
                const d = new Date(e.target.value);
                if (!Number.isNaN(d.getTime())) setParams({ now: d.toISOString() });
              }}
            />
          </label>
          <div className={styles.testJumps}>
            {jumps.map((jump) => (
              <button
                key={jump.label}
                type="button"
                onClick={() => setParams({ now: jump.getNow().toISOString() })}
              >
                {jump.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={async () => {
              if (
                !window.confirm(
                  'Reset the clock overrides AND erase every mark and note on this board for everyone. Continue?'
                )
              ) {
                return;
              }
              setParams({ start: null, now: null });
              await onClearMarks();
            }}
          >
            Reset overrides &amp; clear all marks
          </button>
          <button
            type="button"
            onClick={() => setParams({ start: null, now: null })}
          >
            Reset clock overrides only
          </button>
          <div style={{ fontSize: '0.68rem' }}>
            Race slug: {race.slug} &middot; real start {race.startISO}
          </div>
        </div>
      )}
    </div>
  );
}
