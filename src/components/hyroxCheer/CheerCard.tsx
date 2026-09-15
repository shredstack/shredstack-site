'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './cheer.module.css';
import { ICONS } from './icons';
import { TestPanel } from './TestPanel';
import type { RaceConfig, Segment } from '@/lib/hyroxCheer/races/slc2026';
import {
  formatClock,
  formatDateLong,
  formatDelta,
  formatMinSec,
  formatTimeInputValue,
  getZonedDateParts,
  parseTimeInputValue,
  zonedTimeToInstant,
} from '@/lib/hyroxCheer/time';

interface MarkRecord {
  markedAt: string | null;
  note: string | null;
}

function useSimulatedNow(locked: boolean, searchParams: URLSearchParams): Date {
  const nowParam = locked ? null : searchParams.get('now');
  const lastParamRef = useRef<string | null>(null);
  const baseRef = useRef<{ simBase: number; realBase: number } | null>(null);
  const [, setTick] = useState(0);

  if (nowParam !== lastParamRef.current) {
    lastParamRef.current = nowParam;
    if (nowParam) {
      const seeded = new Date(nowParam).getTime();
      baseRef.current = Number.isNaN(seeded) ? null : { simBase: seeded, realBase: Date.now() };
    } else {
      baseRef.current = null;
    }
  }

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (baseRef.current) {
    return new Date(baseRef.current.simBase + (Date.now() - baseRef.current.realBase));
  }
  return new Date();
}

export function CheerCard({ race, segments }: { race: RaceConfig; segments: Segment[] }) {
  const searchParams = useSearchParams();
  const now = useSimulatedNow(race.locked, searchParams);

  useEffect(() => {
    if (!race.locked) {
      console.warn(`[hyrox-cheer] ${race.slug} is UNLOCKED — test overrides are live for anyone visiting this page.`);
    }
  }, [race.locked, race.slug]);

  const startInstant = useMemo(() => {
    if (!race.locked) {
      const startParam = searchParams.get('start');
      if (startParam) {
        const d = new Date(startParam);
        if (!Number.isNaN(d.getTime())) return d;
      }
    }
    return new Date(race.startISO);
  }, [race, searchParams]);

  const cumulative = useMemo(() => {
    let gold = 0;
    let teal = 0;
    return segments.map((seg) => {
      gold += seg.goldSeconds;
      teal += seg.tealSeconds;
      return { gold, teal };
    });
  }, [segments]);

  const totalGold = cumulative[cumulative.length - 1].gold;
  const totalTeal = cumulative[cumulative.length - 1].teal;
  const midIndex = Math.floor(segments.length / 2);

  const [marks, setMarks] = useState<Record<number, MarkRecord>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});
  const noteTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/hyrox/cheer/${race.slug}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setMarks(data.marks ?? {});
      } catch {
        // keep whatever we last had; degrade quietly
      }
    }
    load();
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [race.slug]);

  async function postMark(segmentIndex: number, payload: { markedAt?: string | null; note?: string | null }) {
    try {
      await fetch(`/api/hyrox/cheer/${race.slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentIndex, ...payload }),
      });
    } catch {
      // fans will still see their own optimistic update; next poll reconciles
    }
  }

  function markNow(i: number) {
    const instant = now;
    setMarks((prev) => ({ ...prev, [i]: { markedAt: instant.toISOString(), note: prev[i]?.note ?? null } }));
    postMark(i, { markedAt: instant.toISOString() });
  }

  function clearAt(i: number) {
    setMarks((prev) => ({ ...prev, [i]: { markedAt: null, note: prev[i]?.note ?? null } }));
    postMark(i, { markedAt: null });
  }

  function handleAtChange(i: number, value: string) {
    if (!value) {
      clearAt(i);
      return;
    }
    const parsed = parseTimeInputValue(value);
    if (!parsed) return;
    const { year, month, day } = getZonedDateParts(startInstant, race.timeZone);
    const instant = zonedTimeToInstant(year, month, day, parsed.hour, parsed.minute, parsed.second, race.timeZone);
    setMarks((prev) => ({ ...prev, [i]: { markedAt: instant.toISOString(), note: prev[i]?.note ?? null } }));
    postMark(i, { markedAt: instant.toISOString() });
  }

  function handleNoteChange(i: number, value: string) {
    setNoteDrafts((prev) => ({ ...prev, [i]: value }));
    clearTimeout(noteTimers.current[i]);
    noteTimers.current[i] = setTimeout(() => {
      setMarks((prev) => ({ ...prev, [i]: { markedAt: prev[i]?.markedAt ?? null, note: value } }));
      postMark(i, { note: value });
    }, 350);
  }

  // Status banner
  const diffSec = (now.getTime() - startInstant.getTime()) / 1000;
  let statusMain: string;
  let statusSub: React.ReactNode;
  let nextIndex: number | null = null;

  if (diffSec < -86400) {
    const days = Math.floor(-diffSec / 86400);
    statusMain = `${days} day${days === 1 ? '' : 's'} until she starts`;
    statusSub = (
      <>
        Wave goes off {formatDateLong(startInstant, race.timeZone)} at{' '}
        <b>{formatClock(startInstant, race.timeZone)}</b> sharp.
      </>
    );
  } else if (diffSec < 0) {
    const s = Math.floor(-diffSec);
    statusMain = `Starts in ${Math.floor(s / 3600)}h ${`${Math.floor(s / 60) % 60}`.padStart(2, '0')}m`;
    statusSub = (
      <>
        Right now it is <span className={styles.statusClock}>{formatClock(now, race.timeZone)}</span>.
      </>
    );
  } else if (diffSec < totalTeal + 900) {
    nextIndex = segments.findIndex((_, i) => diffSec < cumulative[i].teal);
    statusMain = `Race clock ${formatMinSec(diffSec)}`;
    if (nextIndex === -1) {
      statusSub = 'She should be done. Go find her.';
    } else {
      const seg = segments[nextIndex];
      const goldClock = formatClock(new Date(startInstant.getTime() + cumulative[nextIndex].gold * 1000), race.timeZone);
      const tealClock = formatClock(new Date(startInstant.getTime() + cumulative[nextIndex].teal * 1000), race.timeZone);
      statusSub = (
        <>
          Next checkpoint: off the <b>{seg.name}</b> by <b>{goldClock}</b> (gold) or <b>{tealClock}</b> (teal).
        </>
      );
    }
  } else {
    statusMain = 'Race finished';
    statusSub = (
      <>
        Hope she crushed it. Right now it is <span className={styles.statusClock}>{formatClock(now, race.timeZone)}</span>.
      </>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.plate}>
          <ICONS.dino size={46} />
          <div>
            <div className={styles.pre}>Dino Nugget</div>
            <h1 className={styles.h1}>{race.athleteName}</h1>
          </div>
        </div>
        <div className={styles.eventLine}>
          {race.eventLabel}
          <br />
          {formatDateLong(new Date(race.startISO), race.timeZone)} &middot; wave starts{' '}
          <b>{formatClock(new Date(race.startISO), race.timeZone)}</b> sharp
        </div>
      </header>

      <div className={styles.status}>
        <div className={styles.statusMain}>{statusMain}</div>
        <div className={styles.statusSub}>{statusSub}</div>
      </div>

      <div className={styles.key}>
        <span className={styles.keyItem}>
          <i className={styles.swatch} style={{ background: '#E9A13C' }} />
          1:05 &mdash; dream day
        </span>
        <span className={styles.keyItem}>
          <i className={styles.swatch} style={{ background: '#1D7E96' }} />
          1:10 &mdash; still crushing it
        </span>
      </div>

      <ol className={styles.list}>
        {segments.map((seg, i) => {
          const rec = marks[i];
          const markedInstant = rec?.markedAt ? new Date(rec.markedAt) : null;
          const atValue = markedInstant ? formatTimeInputValue(markedInstant, race.timeZone) : '';
          const noteValue = noteDrafts[i] ?? rec?.note ?? '';
          const Icon = ICONS[seg.icon];

          let deltaClass = '';
          let deltaMsg: React.ReactNode = null;
          if (markedInstant) {
            const elapsed = (markedInstant.getTime() - startInstant.getTime()) / 1000;
            const vsGold = elapsed - cumulative[i].gold;
            const vsTeal = elapsed - cumulative[i].teal;
            if (vsGold <= 0) {
              deltaClass = styles.deltaAhead;
              deltaMsg = `Ahead of the gold line by ${formatDelta(-vsGold).slice(1)}. Tell her.`;
            } else if (vsTeal <= 0) {
              deltaClass = styles.deltaOntrack;
              deltaMsg = `Inside the teal line — on for sub 1:10, ${formatDelta(vsGold)} off gold.`;
            } else {
              deltaClass = styles.deltaBehind;
              deltaMsg = `${formatDelta(vsTeal)} past the teal line. Still a race — keep cheering.`;
            }
          }

          return (
            <li key={seg.index} className={`${styles.card} ${i === nextIndex ? styles.cardNow : ''}`}>
              <div className={styles.top}>
                <span className={styles.icon}>
                  <Icon />
                </span>
                <span className={styles.name}>
                  <b>{seg.name}</b>
                  <small>{seg.meta}</small>
                </span>
              </div>
              <div className={styles.targets}>
                <span className={`${styles.chip} ${styles.chipGold}`}>
                  <i>1:05 pace</i>
                  <b>{formatClock(new Date(startInstant.getTime() + cumulative[i].gold * 1000), race.timeZone)}</b>
                  <u>{formatMinSec(cumulative[i].gold)}</u>
                </span>
                <span className={`${styles.chip} ${styles.chipTeal}`}>
                  <i>sub 1:10</i>
                  <b>{formatClock(new Date(startInstant.getTime() + cumulative[i].teal * 1000), race.timeZone)}</b>
                  <u>{formatMinSec(cumulative[i].teal)}</u>
                </span>
              </div>
              <p className={styles.yell}>{seg.yell}</p>
              <div className={styles.log}>
                <button type="button" className={styles.markBtn} onClick={() => markNow(i)}>
                  Mark now
                </button>
                <input
                  className={styles.atInput}
                  type="time"
                  step={1}
                  value={atValue}
                  aria-label={`Actual time for ${seg.name}`}
                  onChange={(e) => handleAtChange(i, e.target.value)}
                />
                <button
                  type="button"
                  className={styles.clearBtn}
                  aria-label={`Clear ${seg.name}`}
                  onClick={() => clearAt(i)}
                >
                  &times;
                </button>
              </div>
              {deltaMsg && <div className={`${styles.delta} ${deltaClass}`}>{deltaMsg}</div>}
              <input
                className={styles.note}
                type="text"
                placeholder="Note (optional)"
                aria-label={`Note for ${seg.name}`}
                value={noteValue}
                onChange={(e) => handleNoteChange(i, e.target.value)}
              />
            </li>
          );
        })}
      </ol>

      <footer className={styles.footer}>
        <p>
          <b>How to use this:</b> each card shows the time of day she should be finishing that
          segment. Tap <b>Mark now</b> the moment she clears it and this page will tell you whether
          she is ahead of the gold line, inside the teal line, or past it.
        </p>
        <p>
          This board is shared &mdash; everyone watching this page sees the same marks and notes,
          live, as people add them. Sarah isn&rsquo;t reading it during the race, so cheer freely.
        </p>
        <p className={styles.fine}>
          Times assume the wave goes off at {formatClock(new Date(race.startISO), race.timeZone)}{' '}
          local. All eight runs are 1&nbsp;km; run targets above are estimated from her overall goal
          paces. Fuel source: 100&#37; dino nugget.
        </p>
        <div className={styles.rail}>
          <ICONS.dino size={18} />
          <ICONS.nugget size={18} />
          <ICONS.ketchup size={18} />
          <ICONS.dino size={18} />
          <ICONS.nugget size={18} />
          <ICONS.dino size={18} />
          <ICONS.nugget size={18} />
        </div>
      </footer>

      {!race.locked && (
        <TestPanel
          race={race}
          startInstant={startInstant}
          totalGoldSeconds={totalGold}
          totalTealSeconds={totalTeal}
          midpointGoldSeconds={cumulative[midIndex].gold}
          midpointTealSeconds={cumulative[midIndex].teal}
        />
      )}
    </div>
  );
}
