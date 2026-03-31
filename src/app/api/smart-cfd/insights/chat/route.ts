import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import { smartCfdUsers, smartCfdWorkouts, smartCfdMovements } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { verifySession } from '@/lib/smart-cfd-auth';
import { buildSummaryPrompt } from '@/lib/smart-cfd-insights';

export const maxDuration = 60;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { messages, currentInsights } = body as {
    messages: ChatMessage[];
    currentInsights: string;
  };

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
  }

  // Get user's training data for context
  const workouts = await db
    .select()
    .from(smartCfdWorkouts)
    .where(eq(smartCfdWorkouts.userId, session.userId))
    .orderBy(asc(smartCfdWorkouts.workoutDate));

  const movements = await db
    .select()
    .from(smartCfdMovements)
    .where(eq(smartCfdMovements.userId, session.userId));

  const summaryData = workouts.length > 0 ? buildSummaryPrompt(workouts, movements) : '';

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: `You are a knowledgeable CrossFit coach having a conversation about an athlete's training data. You previously wrote them a training insights report, and now they want to discuss it further.

Be specific, reference real numbers from their data, and keep a supportive but honest tone. Give actionable advice when asked. Keep responses concise (2-4 paragraphs max).

Here is their training data summary:
${summaryData}

Here is the insights report you wrote for them:
${currentInsights}`,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const reply = response.content[0].type === 'text' ? response.content[0].text : '';
  return NextResponse.json({ reply });
}
