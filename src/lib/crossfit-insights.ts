import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import {
  crossfitUsers,
  crossfitWorkouts,
  crossfitUserScores,
  crossfitMovements,
  crossfitUserMovementPerformance,
  crossfitWorkoutCategories,
} from '@/db/schema';
import { eq, asc, and, gte, lte } from 'drizzle-orm';

interface ScoreWithWorkout {
  scoreId: number;
  workoutId: number;
  workoutDate: Date;
  rawDivision: string | null;
  rawNotes: string | null;
  rawScore: string;
  categoryName: string | null;
  canonicalTitle: string | null;
  isMonthlyChallenge: boolean;
}

interface PerformanceRow {
  canonicalName: string;
  estimatedMaxWeight: number | null;
  isLimitingFactor: boolean | null;
  scoreId: number;
}

export function buildSummaryPrompt(
  scores: ScoreWithWorkout[],
  performance: PerformanceRow[],
  dateFrom?: string,
  dateTo?: string
): string {
  // Filter to non-challenge scores
  const realScores = scores.filter((s) => !s.isMonthlyChallenge);

  // Optional date filtering
  let filtered = realScores;
  if (dateFrom) filtered = filtered.filter((s) => s.workoutDate.toISOString().split('T')[0] >= dateFrom);
  if (dateTo) filtered = filtered.filter((s) => s.workoutDate.toISOString().split('T')[0] <= dateTo);

  const dates = filtered.map((s) => s.workoutDate.toISOString().split('T')[0]);
  const rxCount = filtered.filter((s) => s.rawDivision?.toLowerCase() === 'rx').length;
  const scaledCount = filtered.filter((s) => s.rawDivision?.toLowerCase() === 'scaled').length;

  const categories: Record<string, number> = {};
  for (const s of filtered) {
    if (s.categoryName) categories[s.categoryName] = (categories[s.categoryName] || 0) + 1;
  }

  // Build lift data from performance records
  const scoreIdSet = new Set(filtered.map((s) => s.scoreId));
  const filteredPerf = performance.filter((p) => scoreIdSet.has(p.scoreId));

  const liftMaxes: Record<string, { max: number; history: { date: string; weight: number }[] }> = {};
  for (const p of filteredPerf) {
    if (!p.estimatedMaxWeight) continue;
    const name = p.canonicalName;
    if (!liftMaxes[name]) liftMaxes[name] = { max: 0, history: [] };
    if (p.estimatedMaxWeight > liftMaxes[name].max) {
      liftMaxes[name].max = p.estimatedMaxWeight;
    }
    const score = filtered.find((s) => s.scoreId === p.scoreId);
    if (score) {
      liftMaxes[name].history.push({
        date: score.workoutDate.toISOString().split('T')[0],
        weight: p.estimatedMaxWeight,
      });
    }
  }

  const limitingFactors: Record<string, number> = {};
  for (const p of filteredPerf) {
    if (p.isLimitingFactor) {
      limitingFactors[p.canonicalName] = (limitingFactors[p.canonicalName] || 0) + 1;
    }
  }

  const monthlyRx: Record<string, { rx: number; total: number }> = {};
  for (const s of filtered) {
    const div = s.rawDivision?.toLowerCase();
    if (div !== 'rx' && div !== 'scaled') continue;
    const month = s.workoutDate.toISOString().substring(0, 7);
    if (!monthlyRx[month]) monthlyRx[month] = { rx: 0, total: 0 };
    monthlyRx[month].total++;
    if (div === 'rx') monthlyRx[month].rx++;
  }
  const rxTrend = Object.entries(monthlyRx)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, { rx, total }]) => `${month}: ${Math.round((rx / total) * 100)}% Rx (${rx}/${total})`);

  const liftProgressions: Record<string, string> = {};
  for (const [name, data] of Object.entries(liftMaxes)) {
    if (data.history.length < 2) continue;
    const sorted = data.history.sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    liftProgressions[name] = `${first.date}: ~${Math.round(first.weight)} lbs → ${last.date}: ~${Math.round(last.weight)} lbs (est. max: ~${Math.round(data.max)} lbs)`;
  }

  // Repeat workouts
  const workoutCounts: Record<number, { title: string; count: number }> = {};
  for (const s of filtered) {
    if (!workoutCounts[s.workoutId]) {
      workoutCounts[s.workoutId] = { title: s.canonicalTitle || 'Untitled', count: 0 };
    }
    workoutCounts[s.workoutId].count++;
  }
  const repeats = Object.entries(workoutCounts)
    .filter(([, v]) => v.count > 1)
    .map(([, v]) => `${v.title}: done ${v.count} times`);

  return `Here is a CrossFit athlete's training data summary. Write a personalized insights narrative.

TRAINING PERIOD: ${dates[0] || 'N/A'} to ${dates[dates.length - 1] || 'N/A'}${dateFrom || dateTo ? ` (filtered: ${dateFrom || 'start'} to ${dateTo || 'now'})` : ''}
TOTAL WORKOUT SCORES: ${filtered.length}
RX: ${rxCount} | SCALED: ${scaledCount} | RX RATE: ${rxCount + scaledCount > 0 ? Math.round((rxCount / (rxCount + scaledCount)) * 100) : 0}%

CATEGORY BREAKDOWN:
${Object.entries(categories).sort((a, b) => b[1] - a[1]).map(([c, n]) => `  ${c}: ${n}`).join('\n')}

MONTHLY RX RATE TREND:
${rxTrend.join('\n')}

LIFT PROGRESSIONS:
${Object.entries(liftProgressions).map(([name, prog]) => `  ${name}: ${prog}`).join('\n') || '  No multi-session lift data'}

TOP LIMITING FACTORS (movements causing scaling):
${Object.entries(limitingFactors).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([m, n]) => `  ${m}: limiting in ${n} workouts`).join('\n') || '  None identified'}

TOP ESTIMATED MAXES:
${Object.entries(liftMaxes).sort((a, b) => b[1].max - a[1].max).slice(0, 10).map(([name, d]) => `  ${name}: ~${Math.round(d.max)} lbs`).join('\n') || '  None'}

REPEAT WORKOUTS:
${repeats.length > 0 ? repeats.join('\n') : '  No repeat workouts found yet'}

ATHLETE'S PERSONAL NOTES (from scaled workouts):
${(() => {
  const scaledWithNotes = filtered
    .filter((s) => s.rawDivision?.toLowerCase() === 'scaled' && s.rawNotes?.trim())
    .slice(0, 20);
  if (scaledWithNotes.length === 0) return '  No personal notes available';
  return scaledWithNotes
    .map((s) => `  ${s.workoutDate.toISOString().split('T')[0]}: "${s.rawNotes}"`)
    .join('\n');
})()}`;
}

export const INSIGHTS_SYSTEM_PROMPT = `You are a knowledgeable CrossFit coach writing a personalized training insights report. Be specific, reference real numbers from the data, and keep a supportive but honest tone.

Write 4-6 short sections using these headers (use markdown ## for headers):
1. "Training Overview" — volume, consistency, training style summary
2. "Strength Progress" — lift progressions, corrected PRs, notable gains
3. "Rx vs Scaled Trends" — how their Rx rate has changed over time, what's driving it
4. "Your Biggest Unlock" — the #1 limiting factor and what improving it would mean
5. "What's Working" — positive patterns worth continuing
6. "Suggestions" — 1-2 specific, actionable recommendations

Keep each section to 2-4 sentences. Be concise. Use approximate numbers ("~195 lbs") not false precision. Don't be generic — reference their actual movements, categories, and numbers.`;

async function loadUserData(userId: number): Promise<{
  scores: ScoreWithWorkout[];
  performance: PerformanceRow[];
}> {
  // Join scores with workouts and categories
  const rawScores = await db
    .select({
      scoreId: crossfitUserScores.id,
      workoutId: crossfitUserScores.workoutId,
      workoutDate: crossfitUserScores.workoutDate,
      rawDivision: crossfitUserScores.rawDivision,
      rawNotes: crossfitUserScores.rawNotes,
      rawScore: crossfitUserScores.rawScore,
      categoryId: crossfitWorkouts.categoryId,
      canonicalTitle: crossfitWorkouts.canonicalTitle,
      isMonthlyChallenge: crossfitWorkouts.isMonthlyChallenge,
    })
    .from(crossfitUserScores)
    .innerJoin(crossfitWorkouts, eq(crossfitUserScores.workoutId, crossfitWorkouts.id))
    .where(eq(crossfitUserScores.userId, userId))
    .orderBy(asc(crossfitUserScores.workoutDate));

  // Get category names
  const categoryIds = [...new Set(rawScores.map((s) => s.categoryId).filter(Boolean))] as number[];
  const categoryNames = new Map<number, string>();
  if (categoryIds.length > 0) {
    const cats = await db
      .select({ id: crossfitWorkoutCategories.id, name: crossfitWorkoutCategories.name })
      .from(crossfitWorkoutCategories);
    for (const c of cats) categoryNames.set(c.id, c.name);
  }

  const scores: ScoreWithWorkout[] = rawScores.map((s) => ({
    ...s,
    isMonthlyChallenge: s.isMonthlyChallenge ?? false,
    categoryName: s.categoryId ? categoryNames.get(s.categoryId) || null : null,
  }));

  // Get movement performance
  const scoreIds = scores.map((s) => s.scoreId);
  let performance: PerformanceRow[] = [];
  if (scoreIds.length > 0) {
    const raw = await db
      .select({
        canonicalName: crossfitMovements.canonicalName,
        estimatedMaxWeight: crossfitUserMovementPerformance.estimatedMaxWeight,
        isLimitingFactor: crossfitUserMovementPerformance.isLimitingFactor,
        scoreId: crossfitUserMovementPerformance.userScoreId,
      })
      .from(crossfitUserMovementPerformance)
      .innerJoin(crossfitMovements, eq(crossfitUserMovementPerformance.movementId, crossfitMovements.id));

    performance = raw.filter((p) => scoreIds.includes(p.scoreId));
  }

  return { scores, performance };
}

export async function generateInsights(
  userId: number,
  dateFrom?: string,
  dateTo?: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const { scores, performance } = await loadUserData(userId);
  if (scores.length === 0) throw new Error('No workout data found');

  const summaryPrompt = buildSummaryPrompt(scores, performance, dateFrom, dateTo);

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: INSIGHTS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: summaryPrompt }],
  });

  const narrative = response.content[0].type === 'text' ? response.content[0].text : '';

  // Cache the insights
  await db
    .update(crossfitUsers)
    .set({ cachedInsights: narrative, insightsGeneratedAt: new Date() })
    .where(eq(crossfitUsers.id, userId));

  return narrative;
}

export async function getCachedInsights(userId: number): Promise<{ narrative: string; generatedAt: Date } | null> {
  const [user] = await db
    .select({ cachedInsights: crossfitUsers.cachedInsights, insightsGeneratedAt: crossfitUsers.insightsGeneratedAt })
    .from(crossfitUsers)
    .where(eq(crossfitUsers.id, userId))
    .limit(1);

  if (user?.cachedInsights && user?.insightsGeneratedAt) {
    return { narrative: user.cachedInsights, generatedAt: user.insightsGeneratedAt };
  }
  return null;
}

// Re-export for chat route
export { loadUserData };
