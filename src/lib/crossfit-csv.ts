import { createHash } from 'crypto';

export interface RawWorkoutRow {
  rawTitle: string;
  rawDescription: string;
  rawScore: string;
  rawDivision: string;
  rawNotes: string;
  workoutDate: Date;
}

export interface ProcessedWorkoutRow extends RawWorkoutRow {
  descriptionHash: string;
  isLikelyChallenge: boolean;
}

/**
 * Parse a PushPress score export CSV.
 * Handles multiline quoted fields, BOM, and various line endings.
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  const len = text.length;

  function parseField(): string {
    if (i >= len) return '';
    if (text[i] === '"') {
      i++; // skip opening quote
      let field = '';
      while (i < len) {
        if (text[i] === '"') {
          if (i + 1 < len && text[i + 1] === '"') {
            field += '"';
            i += 2;
          } else {
            i++; // skip closing quote
            break;
          }
        } else {
          field += text[i];
          i++;
        }
      }
      return field;
    } else {
      let field = '';
      while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
        field += text[i];
        i++;
      }
      return field;
    }
  }

  // Skip BOM if present
  if (text.charCodeAt(0) === 0xfeff) i = 1;

  while (i < len) {
    const row: string[] = [];
    while (true) {
      row.push(parseField());
      if (i < len && text[i] === ',') {
        i++; // skip comma
        continue;
      }
      if (i < len && text[i] === '\r') i++;
      if (i < len && text[i] === '\n') i++;
      break;
    }
    if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) {
      rows.push(row);
    }
  }
  return rows;
}

/**
 * Extract structured workout rows from parsed CSV.
 * Expected columns: Workout Title, Workout Description, Score, Division, Date Time
 */
export function extractWorkouts(rows: string[][]): RawWorkoutRow[] {
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());

  const titleIdx = header.findIndex((h) => h.includes('workout title') || h === 'title');
  const descIdx = header.findIndex((h) => h.includes('workout description') || h === 'description');
  const scoreIdx = header.findIndex((h) => h === 'score');
  const divisionIdx = header.findIndex((h) => h === 'division');
  const dateIdx = header.findIndex((h) => h.includes('date'));
  const notesIdx = header.findIndex((h) => h.includes('personal note') || h === 'notes' || h === 'note');

  if (descIdx === -1 || scoreIdx === -1 || dateIdx === -1) {
    throw new Error(
      "Missing required columns. Expected: Workout Title, Workout Description, Score, Division, Date Time"
    );
  }

  const workouts: RawWorkoutRow[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const description = row[descIdx]?.trim();
    const score = row[scoreIdx]?.trim();
    const dateStr = row[dateIdx]?.trim();

    // Skip rows with no description or score
    if (!description || !score) continue;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) continue;

    workouts.push({
      rawTitle: titleIdx >= 0 ? (row[titleIdx]?.trim() || '') : '',
      rawDescription: description,
      rawScore: score,
      rawDivision: divisionIdx >= 0 ? (row[divisionIdx]?.trim() || '') : '',
      rawNotes: notesIdx >= 0 ? (row[notesIdx]?.trim() || '') : '',
      workoutDate: date,
    });
  }

  return workouts;
}

// ---------------------------------------------------------------------------
// Description normalization & hashing
// ---------------------------------------------------------------------------

/**
 * Normalize a workout description for hashing.
 * Goal: two descriptions of the same workout (possibly from different exports
 * with minor formatting differences) should produce the same hash.
 *
 * Steps:
 *   1. Lowercase
 *   2. Collapse all whitespace (newlines, tabs, multi-space) to single space
 *   3. Remove quotes (single and double)
 *   4. Strip unit suffixes from parenthetical weight notations:
 *      "(35/53 lb)" → "(35/53)", "(53 lbs)" → "(53)"
 *      BUT we keep the weight numbers so different Rx weights don't merge.
 *   5. Trim
 */
export function normalizeDescription(desc: string): string {
  let s = desc.toLowerCase();
  s = s.replace(/[\s]+/g, ' ');
  s = s.replace(/['"]/g, '');
  // Strip "lb", "lbs", "in", "kg" after numbers inside parentheses,
  // but keep the numbers themselves
  s = s.replace(/(\d)\s*(lbs?|kg|in)\b/g, '$1');
  return s.trim();
}

/**
 * Compute SHA-256 hash of a normalized description.
 */
export function hashDescription(desc: string): string {
  const normalized = normalizeDescription(desc);
  return createHash('sha256').update(normalized).digest('hex');
}

// ---------------------------------------------------------------------------
// Dedup
// ---------------------------------------------------------------------------

/**
 * Dedup key for CSV-level dedup (within a single upload).
 * Uses date + description hash + score to catch exact duplicate rows.
 */
function csvDedupKey(row: ProcessedWorkoutRow): string {
  const dateStr = row.workoutDate.toISOString().split('T')[0];
  return `${dateStr}|${row.descriptionHash}|${row.rawScore}`;
}

/**
 * Deduplicate within a CSV upload — keeps first occurrence of each
 * (date, descriptionHash, score) triple.
 */
export function dedupCSV(rows: ProcessedWorkoutRow[]): ProcessedWorkoutRow[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = csvDedupKey(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Monthly challenge detection (heuristic)
// ---------------------------------------------------------------------------

const CHALLENGE_PATTERNS = [
  /complete\s+\d+\s+minutes?\s+of\s+.+\s+every\s+day/i,
  /keep\s+track\s+of\s+your\s+.+\s+each\s+day/i,
  /every\s+day\s+in\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i,
  /daily\s+(challenge|goal|habit|tracking)/i,
  /\bmonthly\s+challenge\b/i,
  /accumulation\s+challenge/i,
  /\bsteps?\s+(challenge|tracking|goal)\b/i,
  /\bhydration\s+(challenge|tracking|goal)\b/i,
  /\bnutrition\s+(challenge|tracking|goal)\b/i,
  /\bcore\s+challenge\b/i,
  /\bpush[- ]?ups?\s+challenge\b/i,
];

/**
 * Heuristic check: does this description look like a monthly challenge
 * rather than a real workout?
 */
export function isLikelyMonthlyChallenge(description: string, score: string): boolean {
  // Check description patterns
  for (const pattern of CHALLENGE_PATTERNS) {
    if (pattern.test(description)) return true;
  }

  // Short description with a simple numeric score (e.g., step count "11702")
  // is a strong signal when the description is very short
  if (description.length < 80) {
    const isNumericScore = /^\d+$/.test(score.trim());
    const looksLikeTracking =
      /\b(steps?|minutes?|oz|ounces?|glasses?|servings?|reps?)\b/i.test(description);
    if (isNumericScore && looksLikeTracking) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Full processing pipeline (Stage 1)
// ---------------------------------------------------------------------------

/**
 * Process raw CSV text through Stage 1:
 *   parse → extract → normalize/hash → detect challenges → dedup
 */
export function processCSVUpload(text: string): {
  rows: ProcessedWorkoutRow[];
  totalParsed: number;
  duplicatesRemoved: number;
} {
  const parsed = parseCSV(text);
  const raw = extractWorkouts(parsed);

  const processed: ProcessedWorkoutRow[] = raw.map((row) => ({
    ...row,
    descriptionHash: hashDescription(row.rawDescription),
    isLikelyChallenge: isLikelyMonthlyChallenge(row.rawDescription, row.rawScore),
  }));

  const deduped = dedupCSV(processed);

  return {
    rows: deduped,
    totalParsed: raw.length,
    duplicatesRemoved: raw.length - deduped.length,
  };
}
