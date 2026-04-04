#!/usr/bin/env python3
"""Build a ~100-row sample CSV from the full CFD score export."""

import csv
import re
import random
from collections import Counter, defaultdict
from pathlib import Path

random.seed(42)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC = PROJECT_ROOT / "test_data" / "cfd_score_export_pushpress_20260401.csv"
DST = PROJECT_ROOT / "test_data" / "cfd_sample_100.csv"

# ---------------------------------------------------------------------------
# 1. Parse — handle unescaped inch-mark quotes inside fields
# ---------------------------------------------------------------------------
with open(SRC, "r", encoding="utf-8") as f:
    raw = f.read()

# Replace inch marks like 20" or 24" that appear inside field content (not at
# field boundaries).  Field-boundary quotes are preceded by comma or newline or
# are at position 0, and are followed by comma/newline/EOF.  Inch marks follow
# a digit and are followed by something other than a field delimiter.
# Strategy: replace digit+" patterns that are clearly inch marks with digit+'in'
# We detect inch marks as: digit + " + (not followed by comma, newline, or EOF)
raw_fixed = re.sub(r'(\d)"(?=[^,\r\n])', r'\1in', raw)
# Also handle 24") patterns — quote before closing paren
raw_fixed = re.sub(r'(\d)"(?=\))', r'\1in', raw_fixed)

import io
with io.StringIO(raw_fixed) as f:
    reader = csv.reader(f)
    header = next(reader)
    all_parsed = list(reader)

# Filter to only well-formed rows (5 columns)
rows = [dict(zip(header, r)) for r in all_parsed if len(r) == len(header)]
bad_rows = [r for r in all_parsed if len(r) != len(header)]

print(f"Total rows parsed: {len(rows)} ({len(bad_rows)} malformed rows skipped)")

# ---------------------------------------------------------------------------
# 2. Identify monthly challenges
# ---------------------------------------------------------------------------
def is_monthly_challenge(row):
    desc = row["Workout Description"].strip()
    title = row["Workout Title"].strip()

    # Explicit monthly challenge keywords
    low = desc.lower()
    if "monthly challenge" in low:
        return True
    # March core challenge
    if "complete 5 minutes of core every day" in low:
        return True
    # April push-up challenge
    if "each day, a set number of push-ups will be programmed" in low:
        return True
    # Very short single-movement challenge patterns (e.g. "Max calories on the rower in 3 minutes")
    if len(desc) < 80 and ("max " in low or "monthly" in low or "challenge" in low):
        return True
    # "Day N" titled short entries that are part of a multi-day challenge
    if re.match(r"^Day \d+$", title) and len(desc) < 120:
        return True
    # Daily tracking challenges (water, fruits/veggies, steps, etc.)
    if "every day" in low or "each day" in low:
        return True
    if "log your daily" in low or "keep track of your steps" in low:
        return True
    if "100 ounces of water" in low or "800 grams of fruits" in low:
        return True
    if "consume" in low and "ounces" in low:
        return True
    return False

challenges = [r for r in rows if is_monthly_challenge(r)]
non_challenges = [r for r in rows if not is_monthly_challenge(r)]

print(f"Monthly challenges: {len(challenges)}")
print(f"Non-challenge workouts: {len(non_challenges)}")

# ---------------------------------------------------------------------------
# 3. Classify workout type
# ---------------------------------------------------------------------------
def workout_type(row):
    desc = row["Workout Description"].strip().lower()
    if desc.startswith("for load") or "for load" in desc[:30]:
        return "For load"
    if desc.startswith("for time") or "for time" in desc[:60]:
        return "For time"
    if "amrap" in desc[:30]:
        return "AMRAP"
    if "emom" in desc[:30]:
        return "EMOM"
    if "for reps" in desc[:30] or "tabata" in desc[:40]:
        return "For reps"
    if "every" in desc[:30] and ("min" in desc[:40] or ":" in desc[:30]):
        return "Every X min"
    score = row["Score"].strip()
    if re.match(r"^\d+\s*@\s*\d+", score):
        return "For load"
    if "complete" == score.lower():
        return "Completion"
    return "Other"

# ---------------------------------------------------------------------------
# 4. Build selection
# ---------------------------------------------------------------------------
# Group non-challenges by description for repeat detection
desc_groups = defaultdict(list)
for r in non_challenges:
    desc_groups[r["Workout Description"].strip()].append(r)

# Find descriptions that appear multiple times (repeats)
repeat_descs = {d: rows_ for d, rows_ in desc_groups.items() if len(rows_) > 1}
unique_descs = {d: rows_ for d, rows_ in desc_groups.items() if len(rows_) == 1}

# Classify all non-challenges
type_buckets = defaultdict(list)
for r in non_challenges:
    type_buckets[workout_type(r)].append(r)

print("\nWorkout type distribution (full dataset, non-challenge):")
for t, rs in sorted(type_buckets.items(), key=lambda x: -len(x[1])):
    print(f"  {t}: {len(rs)}")

div_counts = Counter(r["Division"] for r in non_challenges)
print(f"\nDivision distribution (full): {dict(div_counts)}")

# Strategy: pick repeats first, then fill from each type bucket
selected = []
selected_set = set()  # track by (desc, score, date) to avoid exact dupes

def add(row):
    key = (row["Workout Description"].strip(), row["Score"], row["Date Time"])
    if key not in selected_set:
        selected_set.add(key)
        selected.append(row)
        return True
    return False

# A. Pick some repeat groups (all entries from ~8-10 repeat descriptions)
repeat_desc_list = list(repeat_descs.keys())
random.shuffle(repeat_desc_list)
repeat_count = 0
for desc in repeat_desc_list:
    if repeat_count >= 10:
        break
    group = repeat_descs[desc]
    # Only include if group size is 2-4 (manageable)
    if 2 <= len(group) <= 4:
        for r in group:
            add(r)
        repeat_count += 1

print(f"\nSelected {len(selected)} rows from {repeat_count} repeat groups")

# B. Ensure we have strength/load entries with "N @ W" patterns
load_rows = [r for r in non_challenges if re.match(r"^\d+\s*@\s*\d+", r["Score"].strip())]
random.shuffle(load_rows)
load_added = 0
for r in load_rows:
    if load_added >= 10:
        break
    if add(r):
        load_added += 1

# C. Ensure Scaled entries
scaled_rows = [r for r in non_challenges if r["Division"].strip() == "Scaled"]
random.shuffle(scaled_rows)
scaled_added = 0
for r in scaled_rows:
    if scaled_added >= 15:
        break
    if add(r):
        scaled_added += 1

# D. Fill remaining from each type to get good coverage, targeting ~98 non-challenge
target = 98
type_targets = {}
remaining_types = list(type_buckets.keys())
per_type = max(1, (target - len(selected)) // max(len(remaining_types), 1))

for t in remaining_types:
    available = [r for r in type_buckets[t] if (r["Workout Description"].strip(), r["Score"], r["Date Time"]) not in selected_set]
    random.shuffle(available)
    added = 0
    for r in available:
        if len(selected) >= target:
            break
        if add(r):
            added += 1
            if added >= per_type + 3:
                break

# If still under target, add more from largest buckets
if len(selected) < target:
    all_remaining = [r for r in non_challenges if (r["Workout Description"].strip(), r["Score"], r["Date Time"]) not in selected_set]
    random.shuffle(all_remaining)
    for r in all_remaining:
        if len(selected) >= target:
            break
        add(r)

print(f"Non-challenge selected: {len(selected)}")

# E. Add exactly 2 monthly challenges
random.shuffle(challenges)
challenge_selected = []
# Pick 2 distinct challenge types if possible
ch_types_seen = set()
for r in challenges:
    desc_short = r["Workout Description"].strip()[:50]
    if desc_short not in ch_types_seen and len(challenge_selected) < 2:
        challenge_selected.append(r)
        ch_types_seen.add(desc_short)
if len(challenge_selected) < 2:
    for r in challenges:
        if r not in challenge_selected and len(challenge_selected) < 2:
            challenge_selected.append(r)

selected.extend(challenge_selected)

# ---------------------------------------------------------------------------
# 5. Sort by date and write
# ---------------------------------------------------------------------------
def parse_date(d):
    """Parse 'M/D/YYYY H:M AM/PM' loosely."""
    try:
        parts = d.strip().split()
        date_part = parts[0]
        m, d_, y = date_part.split("/")
        return (int(y), int(m), int(d_))
    except:
        return (0, 0, 0)

selected.sort(key=lambda r: parse_date(r["Date Time"]), reverse=True)

with open(DST, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=header)
    writer.writeheader()
    writer.writerows(selected)

# ---------------------------------------------------------------------------
# 6. Print stats
# ---------------------------------------------------------------------------
print(f"\n{'='*60}")
print(f"SAMPLE STATS")
print(f"{'='*60}")
print(f"Total rows written: {len(selected)}")

type_counts = Counter(workout_type(r) for r in selected)
print(f"\nWorkout type breakdown:")
for t, c in type_counts.most_common():
    print(f"  {t}: {c}")

div_counts = Counter(r["Division"].strip() for r in selected)
print(f"\nDivision breakdown:")
for d, c in div_counts.most_common():
    print(f"  {d}: {c}")

dates = [parse_date(r["Date Time"]) for r in selected]
dates_valid = [d for d in dates if d[0] > 0]
if dates_valid:
    mn = min(dates_valid)
    mx = max(dates_valid)
    print(f"\nDate range: {mn[1]}/{mn[2]}/{mn[0]} - {mx[1]}/{mx[2]}/{mx[0]}")

# Count repeats in sample
sample_descs = Counter(r["Workout Description"].strip() for r in selected)
repeat_in_sample = {d: c for d, c in sample_descs.items() if c > 1}
print(f"\nRepeat workouts: {len(repeat_in_sample)} descriptions appearing multiple times ({sum(c for c in repeat_in_sample.values())} total rows)")

challenge_count = sum(1 for r in selected if is_monthly_challenge(r))
print(f"Monthly challenges included: {challenge_count}")

# Show score patterns
score_patterns = Counter()
for r in selected:
    s = r["Score"].strip()
    if re.match(r"^\d+\s*@\s*\d+", s):
        score_patterns["N @ W (strength)"] += 1
    elif re.match(r"^\d+:\d+", s):
        score_patterns["Time (M:SS)"] += 1
    elif re.match(r"^\d+\s*\+\s*\d+", s):
        score_patterns["Rounds+reps"] += 1
    elif s.lower() == "complete":
        score_patterns["Complete"] += 1
    elif re.match(r"^\d+$", s):
        score_patterns["Numeric"] += 1
    else:
        score_patterns[f"Other ({s[:20]})"] += 1
print(f"\nScore pattern breakdown:")
for p, c in score_patterns.most_common():
    print(f"  {p}: {c}")
