"""
Analyze PushPress CSV score export to understand workout types and scoring patterns.

Classifies every score into format categories (TIME_MMSS, REPS_AT_WEIGHT, ROUNDS_PLUS_REPS,
PLAIN_NUMBER, COMPLETE, EMPTY, OTHER) and cross-references with workout type (for_time, amrap,
for_load, emom, etc.) to understand the full distribution.

Usage:
    python scripts/analyze_pushpress_score_formats.py [path_to_csv]

If no path is given, defaults to test_data/cfd_score_export_pushpress_20260401.csv
"""

import csv
import re
import sys
from collections import defaultdict, Counter
from pathlib import Path

DEFAULT_CSV = Path(__file__).resolve().parent.parent / "test_data" / "cfd_score_export_pushpress_20260401.csv"


def s(val):
    """Safe string for formatting"""
    return str(val) if val else ""


def classify_score(score):
    score = (score or "").strip()
    if not score:
        return "EMPTY"
    if score.lower() == "complete":
        return "COMPLETE"
    if re.match(r'^\d+\s*@\s*[\d.]+$', score):
        return "REPS_AT_WEIGHT"
    if re.match(r'^\d+\s*\+\s*\d+$', score):
        return "ROUNDS_PLUS_REPS"
    if re.match(r'^\d{1,2}:\d{2}$', score):
        return "TIME_MMSS"
    if re.match(r'^\d+:\d{2}:\d{2}$', score):
        return "TIME_HMMSS"
    if re.match(r'^\d+$', score):
        return "PLAIN_NUMBER"
    return "OTHER"


def classify_workout_type(desc):
    d = (desc or "").lower()
    types = []
    if 'for load' in d:
        types.append('FOR_LOAD')
    if 'amrap' in d:
        types.append('AMRAP')
    if 'for time' in d:
        types.append('FOR_TIME')
    if 'for reps' in d:
        types.append('FOR_REPS')
    if 'tabata' in d:
        types.append('TABATA')
    if re.search(r'every\s+\d+:\d+|emom', d):
        types.append('EMOM_INTERVAL')
    if 'for calories' in d or 'for cal' in d:
        types.append('FOR_CALORIES')
    if 'max' in d and ('effort' in d or 'distance' in d or 'cal' in d):
        types.append('MAX_EFFORT')
    if not types:
        types.append('OTHER/UNCLASSIFIED')
    return types


def main():
    csv_path = sys.argv[1] if len(sys.argv) > 1 else str(DEFAULT_CSV)

    rows = []
    with open(csv_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    print(f"Total rows: {len(rows)}")
    print(f"Columns: {list(rows[0].keys())}")
    print()

    classified = []
    for row in rows:
        score = s(row.get('Score', ''))
        desc = s(row.get('Workout Description', ''))
        title = s(row.get('Workout Title', ''))
        division = s(row.get('Division', ''))
        date = s(row.get('Date Time', ''))
        fmt = classify_score(score)
        classified.append({
            'title': title, 'description': desc, 'score': score,
            'division': division, 'date': date, 'format': fmt,
        })

    # --- Distribution ---
    fmt_counts = Counter(r['format'] for r in classified)
    print("=" * 80)
    print("SCORE FORMAT DISTRIBUTION")
    print("=" * 80)
    for fmt, count in fmt_counts.most_common():
        pct = count / len(classified) * 100
        print(f"  {fmt:25s}  {count:5d}  ({pct:.1f}%)")
    print()

    # --- Examples per format ---
    print("=" * 80)
    print("EXAMPLES PER SCORE FORMAT")
    print("=" * 80)
    for fmt, _ in fmt_counts.most_common():
        print(f"\n--- {fmt} ({fmt_counts[fmt]} rows) ---")
        examples = [r for r in classified if r['format'] == fmt]
        seen = set()
        shown = 0
        for ex in examples:
            key = (ex['score'], ex['description'][:80])
            if key in seen:
                continue
            seen.add(key)
            desc_short = ex['description'].replace('\n', ' ').strip()[:120]
            print(f"  Score: {ex['score']:20s}  Div: {ex['division']:8s}  Date: {ex['date']}")
            print(f"    Title: {ex['title']}")
            print(f"    Desc:  {desc_short}")
            shown += 1
            if shown >= 6:
                break

    # --- Workout type classification ---
    print()
    print("=" * 80)
    print("WORKOUT TYPE ANALYSIS (based on description keywords)")
    print("=" * 80)

    wtype_scores = defaultdict(list)
    for r in classified:
        for wt in classify_workout_type(r['description']):
            wtype_scores[wt].append(r)

    for wt in sorted(wtype_scores.keys(), key=lambda k: -len(wtype_scores[k])):
        entries = wtype_scores[wt]
        print(f"\n--- {wt} ({len(entries)} rows) ---")
        score_fmts = Counter(r['format'] for r in entries)
        print(f"  Score format breakdown: {dict(score_fmts)}")
        seen = set()
        shown = 0
        for ex in entries:
            key = (ex['score'], ex['description'][:60])
            if key in seen:
                continue
            seen.add(key)
            desc_short = ex['description'].replace('\n', ' ').strip()[:100]
            print(f"    Score: {ex['score']:20s}  Fmt: {ex['format']:20s}  Div: {ex['division']}")
            print(f"      Desc: {desc_short}")
            shown += 1
            if shown >= 8:
                remaining = len(set((r['score'], r['description'][:60]) for r in entries)) - shown
                if remaining > 0:
                    print(f"    ... and ~{remaining} more unique entries")
                break

    # --- FOR LOAD deep dive ---
    print()
    print("=" * 80)
    print("FOR LOAD DEEP DIVE")
    print("=" * 80)
    load_rows = [r for r in classified if 'for load' in r['description'].lower()]
    print(f"Total 'for load' rows: {len(load_rows)}")

    rep_scheme_pattern = re.compile(r'(\d+(?:-\d+)+)')
    rep_schemes = defaultdict(list)
    for r in load_rows:
        matches = rep_scheme_pattern.findall(r['description'])
        scheme = matches[0] if matches else 'no_scheme'
        rep_schemes[scheme].append(r)

    print(f"Unique rep schemes: {len(rep_schemes)}")
    for scheme in sorted(rep_schemes.keys(), key=lambda k: -len(rep_schemes[k])):
        entries = rep_schemes[scheme]
        print(f"\n  Scheme: {scheme}  ({len(entries)} rows)")
        fmts = Counter(r['format'] for r in entries)
        print(f"    Score formats: {dict(fmts)}")
        seen = set()
        for ex in entries:
            if ex['score'] in seen:
                continue
            seen.add(ex['score'])
            lines = [l.strip() for l in ex['description'].split('\n') if l.strip()]
            movement = lines[1] if len(lines) > 1 else "?"
            print(f"    Score: {ex['score']:20s}  Movement: {movement}")
            if len(seen) >= 4:
                break

    # --- AMRAP deep dive ---
    print()
    print("=" * 80)
    print("AMRAP DEEP DIVE")
    print("=" * 80)
    amrap_rows = [r for r in classified if 'amrap' in r['description'].lower()]
    print(f"Total AMRAP rows: {len(amrap_rows)}")
    print(f"Score formats: {dict(Counter(r['format'] for r in amrap_rows))}")

    amrap_dur = re.compile(r'amrap\s+(\d+)', re.I)
    durations = []
    for r in amrap_rows:
        m = amrap_dur.search(r['description'])
        if m:
            durations.append(int(m.group(1)))
    if durations:
        print(f"AMRAP durations (minutes): min={min(durations)}, max={max(durations)}, median={sorted(durations)[len(durations)//2]}")

    print("\nExamples:")
    seen = set()
    for ex in amrap_rows:
        key = (ex['score'], ex['description'][:60])
        if key in seen:
            continue
        seen.add(key)
        desc_short = ex['description'].replace('\n', ' ').strip()[:100]
        print(f"  Score: {ex['score']:20s}  Fmt: {ex['format']}")
        print(f"    Desc: {desc_short}")
        if len(seen) >= 10:
            break

    # --- FOR TIME deep dive ---
    print()
    print("=" * 80)
    print("FOR TIME DEEP DIVE")
    print("=" * 80)
    ft_rows = [r for r in classified if 'for time' in r['description'].lower()]
    print(f"Total 'for time' rows: {len(ft_rows)}")
    ft_fmts = Counter(r['format'] for r in ft_rows)
    print(f"Score formats: {dict(ft_fmts)}")

    print("\nNon-TIME scores in 'for time' workouts (time-capped or unusual):")
    seen = set()
    for ex in ft_rows:
        if ex['format'] not in ('TIME_MMSS', 'TIME_HMMSS'):
            key = (ex['score'], ex['description'][:60])
            if key in seen:
                continue
            seen.add(key)
            desc_short = ex['description'].replace('\n', ' ').strip()[:120]
            print(f"  Score: {ex['score']:20s}  Fmt: {ex['format']}")
            print(f"    Desc: {desc_short}")
            if len(seen) >= 10:
                break

    # --- Time cap analysis ---
    print()
    print("=" * 80)
    print("TIME CAP ANALYSIS")
    print("=" * 80)
    timecap_rows = [r for r in classified if 'time cap' in r['description'].lower()]
    print(f"Rows mentioning time cap: {len(timecap_rows)}")
    tc_fmts = Counter(r['format'] for r in timecap_rows)
    print(f"Score formats: {dict(tc_fmts)}")

    tc_pat = re.compile(r'time\s*cap:?\s*(\d+)\s*min', re.I)
    tc_values = []
    for r in timecap_rows:
        m = tc_pat.search(r['description'])
        if m:
            tc_values.append(int(m.group(1)))
    if tc_values:
        print(f"Time cap values (min): {sorted(set(tc_values))}")

    print("\nTime-capped workouts with PLAIN_NUMBER scores (didn't finish in time):")
    for ex in timecap_rows:
        if ex['format'] == 'PLAIN_NUMBER':
            desc_short = ex['description'].replace('\n', ' ').strip()[:120]
            tc_match = tc_pat.search(ex['description'])
            tc_val = tc_match.group(1) if tc_match else "?"
            print(f"  Score: {ex['score']:10s}  TimeCap: {tc_val} min")
            print(f"    Desc: {desc_short}")

    # --- OTHER / unusual scores ---
    print()
    print("=" * 80)
    print("ALL 'OTHER' (UNCLASSIFIED) SCORE FORMATS")
    print("=" * 80)
    other_rows = [r for r in classified if r['format'] == 'OTHER']
    print(f"Total: {len(other_rows)}")
    for ex in other_rows:
        desc_short = ex['description'].replace('\n', ' ').strip()[:100]
        print(f"  Score: {repr(ex['score']):30s}  Div: {ex['division']:8s}  Date: {ex['date']}")
        print(f"    Title: {ex['title']}")
        print(f"    Desc: {desc_short}")

    # --- COMPLETE scores ---
    print()
    print("=" * 80)
    print("COMPLETE SCORES")
    print("=" * 80)
    complete_rows = [r for r in classified if r['format'] == 'COMPLETE']
    print(f"Total: {len(complete_rows)}")
    seen = set()
    for ex in complete_rows:
        key = ex['description'][:80]
        if key in seen:
            continue
        seen.add(key)
        desc_short = ex['description'].replace('\n', ' ').strip()[:120]
        print(f"  Title: {ex['title']:30s}  Div: {ex['division']}")
        print(f"    Desc: {desc_short}")
        if len(seen) >= 10:
            break

    # --- EMPTY scores ---
    print()
    print("=" * 80)
    print("EMPTY SCORES")
    print("=" * 80)
    empty_rows = [r for r in classified if r['format'] == 'EMPTY']
    print(f"Total: {len(empty_rows)}")
    seen = set()
    for ex in empty_rows:
        key = ex['description'][:80]
        if key in seen:
            continue
        seen.add(key)
        desc_short = ex['description'].replace('\n', ' ').strip()[:100]
        print(f"  Title: {ex['title']:30s}  Div: {ex['division']}")
        print(f"    Desc: {desc_short}")
        if len(seen) >= 8:
            break

    # --- All unique score values ---
    print()
    print("=" * 80)
    print("ALL UNIQUE SCORE VALUES")
    print("=" * 80)
    unique_scores = sorted(set(r['score'] for r in classified), key=lambda x: (classify_score(x), x))
    print(f"Total unique score values: {len(unique_scores)}")
    for fmt_name in ['COMPLETE', 'EMPTY', 'OTHER', 'PLAIN_NUMBER', 'REPS_AT_WEIGHT', 'ROUNDS_PLUS_REPS', 'TIME_MMSS']:
        vals = sorted(set(r['score'] for r in classified if r['format'] == fmt_name))
        print(f"\n  {fmt_name} ({len(vals)} unique values):")
        if len(vals) <= 30:
            for v in vals:
                count = sum(1 for r in classified if r['score'] == v)
                print(f"    {repr(v):25s}  (x{count})")
        else:
            for v in vals[:15]:
                count = sum(1 for r in classified if r['score'] == v)
                print(f"    {repr(v):25s}  (x{count})")
            print(f"    ... ({len(vals) - 30} more) ...")
            for v in vals[-15:]:
                count = sum(1 for r in classified if r['score'] == v)
                print(f"    {repr(v):25s}  (x{count})")

    # --- PLAIN_NUMBER analysis ---
    print()
    print("=" * 80)
    print("PLAIN NUMBER SCORES - Non-challenge workout examples")
    print("=" * 80)
    plain_rows = [r for r in classified if r['format'] == 'PLAIN_NUMBER']
    challenge_kw = ['complete 5 minutes', 'push-ups will be programmed']
    non_challenge = [r for r in plain_rows if not any(kw in r['description'].lower() for kw in challenge_kw)]
    challenge = [r for r in plain_rows if any(kw in r['description'].lower() for kw in challenge_kw)]
    print(f"Total plain number: {len(plain_rows)}")
    print(f"  Daily challenges: {len(challenge)}")
    print(f"  Workout scores: {len(non_challenge)}")

    print("\nNon-challenge plain number scores:")
    seen = set()
    for ex in non_challenge:
        key = (ex['score'], ex['description'][:60])
        if key in seen:
            continue
        seen.add(key)
        desc_short = ex['description'].replace('\n', ' ').strip()[:120]
        wtypes = classify_workout_type(ex['description'])
        print(f"  Score: {ex['score']:10s}  WType: {','.join(wtypes):20s}  Div: {ex['division']}")
        print(f"    Desc: {desc_short}")
        if len(seen) >= 20:
            break

    # --- Division ---
    print()
    print("=" * 80)
    print("DIVISION DISTRIBUTION")
    print("=" * 80)
    for div, count in Counter(r['division'] for r in classified).most_common():
        print(f"  {div:15s}  {count}")

    # --- Date range ---
    print()
    print("=" * 80)
    print("DATE RANGE & VOLUME")
    print("=" * 80)
    dates = sorted(set(r['date'] for r in classified if r['date']))
    print(f"Unique dates: {len(dates)}")
    print(f"Earliest: {dates[0] if dates else 'N/A'}")
    print(f"Latest:   {dates[-1] if dates else 'N/A'}")

    # --- REPS_AT_WEIGHT detail ---
    print()
    print("=" * 80)
    print("REPS @ WEIGHT - ALL UNIQUE SCORES")
    print("=" * 80)
    raw_scores = sorted(set(r['score'] for r in classified if r['format'] == 'REPS_AT_WEIGHT'))
    print(f"Unique values: {len(raw_scores)}")
    for v in raw_scores:
        count = sum(1 for r in classified if r['score'] == v)
        sample = next(r for r in classified if r['score'] == v)
        desc_short = sample['description'].replace('\n', ' ').strip()[:80]
        print(f"  {v:20s}  (x{count})  {desc_short}")


if __name__ == '__main__':
    main()
