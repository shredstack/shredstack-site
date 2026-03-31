export interface RawWorkoutRow {
  rawTitle: string;
  rawDescription: string;
  rawScore: string;
  rawDivision: string;
  rawNotes: string;
  workoutDate: Date;
}

/**
 * Parse a PushPress score export CSV.
 * Handles multiline quoted fields, BOM, and various line endings.
 * Ported from the static CFD dashboard parser.
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

/**
 * Create a dedup key for a workout row.
 * Uses date + first 50 chars of description + score to identify duplicates.
 */
export function dedupKey(row: RawWorkoutRow): string {
  const dateStr = row.workoutDate.toISOString().split('T')[0];
  const descPrefix = row.rawDescription.substring(0, 50);
  return `${dateStr}|${descPrefix}|${row.rawScore}`;
}

/**
 * Deduplicate workout rows, keeping the first occurrence.
 */
export function dedup(rows: RawWorkoutRow[]): RawWorkoutRow[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = dedupKey(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
