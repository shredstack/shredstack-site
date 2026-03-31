import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import { smartCfdUsers, smartCfdWorkouts, smartCfdMovements } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

interface WorkoutRow {
  id: number;
  workoutDate: Date;
  rawDivision: string | null;
  rawNotes: string | null;
  category: string | null;
}

interface MovementRow {
  movementName: string;
  workoutId: number;
  estimatedMaxWeight: number | null;
  isLimitingFactor: boolean | null;
}

export function buildSummaryPrompt(workouts: WorkoutRow[], movements: MovementRow[]): string {
  const dates = workouts.map((w) => w.workoutDate.toISOString().split('T')[0]);
  const rxCount = workouts.filter((w) => w.rawDivision?.toLowerCase() === 'rx').length;
  const scaledCount = workouts.filter((w) => w.rawDivision?.toLowerCase() === 'scaled').length;

  const categories: Record<string, number> = {};
  for (const w of workouts) {
    if (w.category) categories[w.category] = (categories[w.category] || 0) + 1;
  }

  const liftMaxes: Record<string, { max: number; history: { date: string; weight: number }[] }> = {};
  for (const m of movements) {
    if (!m.estimatedMaxWeight) continue;
    const name = m.movementName;
    if (!liftMaxes[name]) liftMaxes[name] = { max: 0, history: [] };
    if (m.estimatedMaxWeight > liftMaxes[name].max) {
      liftMaxes[name].max = m.estimatedMaxWeight;
    }
    const workout = workouts.find((w) => w.id === m.workoutId);
    if (workout) {
      liftMaxes[name].history.push({
        date: workout.workoutDate.toISOString().split('T')[0],
        weight: m.estimatedMaxWeight,
      });
    }
  }

  const limitingFactors: Record<string, number> = {};
  for (const m of movements) {
    if (m.isLimitingFactor) {
      limitingFactors[m.movementName] = (limitingFactors[m.movementName] || 0) + 1;
    }
  }

  const monthlyRx: Record<string, { rx: number; total: number }> = {};
  for (const w of workouts) {
    const div = w.rawDivision?.toLowerCase();
    if (div !== 'rx' && div !== 'scaled') continue;
    const month = w.workoutDate.toISOString().substring(0, 7);
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

  return `Here is a CrossFit athlete's training data summary. Write a personalized insights narrative.

TRAINING PERIOD: ${dates[0]} to ${dates[dates.length - 1]}
TOTAL WORKOUTS: ${workouts.length}
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

ATHLETE'S PERSONAL NOTES (from scaled workouts — these explain what was actually scaled):
${(() => {
  const scaledWithNotes = workouts
    .filter((w) => w.rawDivision?.toLowerCase() === 'scaled' && w.rawNotes?.trim())
    .slice(0, 20);
  if (scaledWithNotes.length === 0) return '  No personal notes available';
  return scaledWithNotes
    .map((w) => `  ${w.workoutDate.toISOString().split('T')[0]}: "${w.rawNotes}"`)
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

export async function generateInsights(userId: number): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const workouts = await db
    .select()
    .from(smartCfdWorkouts)
    .where(eq(smartCfdWorkouts.userId, userId))
    .orderBy(asc(smartCfdWorkouts.workoutDate));

  const movements = await db
    .select()
    .from(smartCfdMovements)
    .where(eq(smartCfdMovements.userId, userId));

  if (workouts.length === 0) throw new Error('No workout data found');

  const summaryPrompt = buildSummaryPrompt(workouts, movements);

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
    .update(smartCfdUsers)
    .set({ cachedInsights: narrative, insightsGeneratedAt: new Date() })
    .where(eq(smartCfdUsers.id, userId));

  return narrative;
}

export async function getCachedInsights(userId: number): Promise<{ narrative: string; generatedAt: Date } | null> {
  const [user] = await db
    .select({ cachedInsights: smartCfdUsers.cachedInsights, insightsGeneratedAt: smartCfdUsers.insightsGeneratedAt })
    .from(smartCfdUsers)
    .where(eq(smartCfdUsers.id, userId))
    .limit(1);

  if (user?.cachedInsights && user?.insightsGeneratedAt) {
    return { narrative: user.cachedInsights, generatedAt: user.insightsGeneratedAt };
  }
  return null;
}
