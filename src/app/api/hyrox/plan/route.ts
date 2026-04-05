import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { hyroxTrainingPlans, hyroxSessionLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifySession } from '@/lib/smart-cfd-auth';
import { PHASES } from '@/lib/hyrox-utils';
import { seedHyroxPlanForUser } from '@/lib/hyrox-seed';

export async function GET(request: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const phaseFilter = searchParams.get('phase');

    // Fetch all plan sessions for this user
    let planSessions = await db.select()
      .from(hyroxTrainingPlans)
      .where(eq(hyroxTrainingPlans.userId, session.userId));

    // Auto-seed the 24-week plan on first access
    if (planSessions.length === 0) {
      await seedHyroxPlanForUser(session.userId);
      planSessions = await db.select()
        .from(hyroxTrainingPlans)
        .where(eq(hyroxTrainingPlans.userId, session.userId));
    }

    // Fetch all session logs for this user
    const sessionLogs = await db.select()
      .from(hyroxSessionLogs)
      .where(eq(hyroxSessionLogs.userId, session.userId));

    // Index logs by planSessionId for quick lookup
    const logsByPlanId = new Map<number, typeof sessionLogs[0]>();
    for (const log of sessionLogs) {
      if (log.planSessionId) {
        logsByPlanId.set(log.planSessionId, log);
      }
    }

    // Group plan sessions by phase and week
    const phases = PHASES.map(phase => {
      const phaseSessions = planSessions
        .filter(s => s.phaseNumber === phase.number)
        .filter(s => !phaseFilter || phase.number === Number(phaseFilter));

      if (phaseFilter && phase.number !== Number(phaseFilter)) return null;

      // Group by week
      const weekNumbers = [...new Set(phaseSessions.map(s => s.week))].sort((a, b) => a - b);
      const weeks = weekNumbers.map(weekNum => {
        const weekSessions = phaseSessions
          .filter(s => s.week === weekNum)
          .sort((a, b) => {
            const dayOrder = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };
            return (dayOrder[a.dayOfWeek as keyof typeof dayOrder] ?? 7) -
                   (dayOrder[b.dayOfWeek as keyof typeof dayOrder] ?? 7);
          })
          .map(s => {
            const log = logsByPlanId.get(s.id);
            return {
              id: s.id,
              dayOfWeek: s.dayOfWeek,
              sessionType: s.sessionType,
              title: s.title,
              description: s.description,
              targetPace: s.targetPace,
              targetDurationMin: s.targetDurationMin,
              targetStations: s.targetStations,
              completed: !!log,
              sessionLogId: log?.id ?? null,
              completedAt: log?.completedAt ?? null,
            };
          });

        return {
          weekNumber: weekNum,
          sessions: weekSessions,
        };
      });

      const completedCount = phaseSessions.filter(s => logsByPlanId.has(s.id)).length;

      return {
        number: phase.number,
        name: phase.name,
        weeks: phase.weeks,
        dates: phase.dates,
        completedSessions: completedCount,
        totalSessions: phaseSessions.length,
        weekData: weeks,
      };
    }).filter(Boolean);

    const totalCompleted = sessionLogs.filter(l => l.planSessionId).length;
    const totalPlanned = planSessions.length;

    return NextResponse.json({
      phases,
      overallProgress: {
        completed: totalCompleted,
        total: totalPlanned,
        percentage: totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 1000) / 10 : 0,
      },
    });
  } catch (error) {
    console.error('Plan fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch plan' }, { status: 500 });
  }
}
