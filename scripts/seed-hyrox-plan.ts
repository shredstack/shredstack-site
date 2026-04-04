/**
 * Seed script for the 24-week HYROX training plan.
 * Inserts 120 rows (5 sessions/week x 24 weeks) + 1 race day into hyrox_training_plans.
 * Idempotent: uses upsert on (user_id, week, day_of_week).
 *
 * Usage: npx tsx scripts/seed-hyrox-plan.ts
 * Requires: NEON_DATABASE_URL env var
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and } from 'drizzle-orm';
import * as schema from '../src/db/schema';

const sql = neon(process.env.NEON_DATABASE_URL!);
const db = drizzle(sql, { schema });

interface PlanSession {
  week: number;
  dayOfWeek: string;
  type: string;
  title: string;
  description: string;
  targetPace?: string;
  durationMin?: number;
  targetStations?: string[];
  phase: string;
  phaseNumber: number;
}

const PLAN: PlanSession[] = [
  // ============================================================
  // PHASE 1: FOUNDATION — Weeks 1-4
  // ============================================================

  // Week 1
  { week: 1, dayOfWeek: 'mon', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 3 x 250m SkiErg @ moderate pace (focus on long pulls, leg drive). Rest 45 sec between sets. Then 3 x 10 wall balls — smooth rhythm, no rushing. (~8 min)',
    targetStations: ['skierg', 'wall_balls'], durationMin: 8, phase: 'foundation', phaseNumber: 1 },
  { week: 1, dayOfWeek: 'tue', type: 'easy_run', title: 'Easy Run',
    description: '25-30 min @ 8:30-9:00/mile. Truly conversational — if you can\'t chat, slow down.',
    targetPace: '8:30-9:00/mile', durationMin: 30, phase: 'foundation', phaseNumber: 1 },
  { week: 1, dayOfWeek: 'wed', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 3 x 50m sled push @ moderate weight (focus on low stance, continuous movement). Then 3 x 50m farmers carry — brisk walk, grip practice. (~8 min)',
    targetStations: ['sled_push', 'farmers_carry'], durationMin: 8, phase: 'foundation', phaseNumber: 1 },
  { week: 1, dayOfWeek: 'thu', type: 'tempo_run', title: 'Tempo Run',
    description: '8 min easy -> 10 min @ 7:15/mile -> 8 min easy. First time holding a pace — keep it controlled.',
    targetPace: '7:15/mile', durationMin: 26, phase: 'foundation', phaseNumber: 1 },
  { week: 1, dayOfWeek: 'sat', type: 'hyrox_intervals', title: 'HYROX Intervals',
    description: '4 x 1km @ 6:15-6:20/mile. 2 min rest between (walk/jog). Add 20 wall balls between runs 2-3.',
    targetPace: '6:15-6:20/mile', durationMin: 40, phase: 'foundation', phaseNumber: 1 },

  // Week 2 (same as week 1 per plan — weeks 1-2 block)
  { week: 2, dayOfWeek: 'mon', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 3 x 250m SkiErg @ moderate pace (focus on long pulls, leg drive). Rest 45 sec between sets. Then 3 x 10 wall balls — smooth rhythm, no rushing. (~8 min)',
    targetStations: ['skierg', 'wall_balls'], durationMin: 8, phase: 'foundation', phaseNumber: 1 },
  { week: 2, dayOfWeek: 'tue', type: 'easy_run', title: 'Easy Run',
    description: '25-30 min @ 8:30-9:00/mile. Truly conversational — if you can\'t chat, slow down.',
    targetPace: '8:30-9:00/mile', durationMin: 30, phase: 'foundation', phaseNumber: 1 },
  { week: 2, dayOfWeek: 'wed', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 3 x 50m sled push @ moderate weight (focus on low stance, continuous movement). Then 3 x 50m farmers carry — brisk walk, grip practice. (~8 min)',
    targetStations: ['sled_push', 'farmers_carry'], durationMin: 8, phase: 'foundation', phaseNumber: 1 },
  { week: 2, dayOfWeek: 'thu', type: 'tempo_run', title: 'Tempo Run',
    description: '8 min easy -> 10 min @ 7:15/mile -> 8 min easy. First time holding a pace — keep it controlled.',
    targetPace: '7:15/mile', durationMin: 26, phase: 'foundation', phaseNumber: 1 },
  { week: 2, dayOfWeek: 'sat', type: 'hyrox_intervals', title: 'HYROX Intervals',
    description: '4 x 1km @ 6:15-6:20/mile. 2 min rest between (walk/jog). Add 20 wall balls between runs 2-3.',
    targetPace: '6:15-6:20/mile', durationMin: 40, phase: 'foundation', phaseNumber: 1 },

  // Week 3
  { week: 3, dayOfWeek: 'mon', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 1,000m row @ 2:10-2:15/500m pace (smooth, legs-first). Then 3 x 20m sandbag lunges — find a rhythm, practice breathing. (~10 min)',
    targetStations: ['rowing', 'sandbag_lunges'], durationMin: 10, phase: 'foundation', phaseNumber: 1 },
  { week: 3, dayOfWeek: 'tue', type: 'easy_run', title: 'Easy Run',
    description: '30-35 min @ 8:15-8:30/mile. Still conversational. Add 4-5 strides (20 sec pickups) at the end.',
    targetPace: '8:15-8:30/mile', durationMin: 35, phase: 'foundation', phaseNumber: 1 },
  { week: 3, dayOfWeek: 'wed', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 3 x 50m sled pull (hand-over-hand technique focus — find your grip). Then 3 x 20m burpee broad jumps — work on pacing, not speed. (~10 min)',
    targetStations: ['sled_pull', 'burpee_broad_jump'], durationMin: 10, phase: 'foundation', phaseNumber: 1 },
  { week: 3, dayOfWeek: 'thu', type: 'tempo_run', title: 'Tempo Run',
    description: '10 min easy -> 12 min @ 7:00/mile -> 10 min easy. Starting to lock in the tempo feel.',
    targetPace: '7:00/mile', durationMin: 32, phase: 'foundation', phaseNumber: 1 },
  { week: 3, dayOfWeek: 'sat', type: 'hyrox_intervals', title: 'HYROX Intervals',
    description: '5 x 1km @ 6:10-6:15/mile. 90 sec station work between: wall balls (20), row 250m, burpees (8).',
    targetPace: '6:10-6:15/mile', durationMin: 45, phase: 'foundation', phaseNumber: 1 },

  // Week 4 (same as week 3 per plan — weeks 3-4 block)
  { week: 4, dayOfWeek: 'mon', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 1,000m row @ 2:10-2:15/500m pace (smooth, legs-first). Then 3 x 20m sandbag lunges — find a rhythm, practice breathing. (~10 min)',
    targetStations: ['rowing', 'sandbag_lunges'], durationMin: 10, phase: 'foundation', phaseNumber: 1 },
  { week: 4, dayOfWeek: 'tue', type: 'easy_run', title: 'Easy Run',
    description: '30-35 min @ 8:15-8:30/mile. Still conversational. Add 4-5 strides (20 sec pickups) at the end.',
    targetPace: '8:15-8:30/mile', durationMin: 35, phase: 'foundation', phaseNumber: 1 },
  { week: 4, dayOfWeek: 'wed', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 3 x 50m sled pull (hand-over-hand technique focus — find your grip). Then 3 x 20m burpee broad jumps — work on pacing, not speed. (~10 min)',
    targetStations: ['sled_pull', 'burpee_broad_jump'], durationMin: 10, phase: 'foundation', phaseNumber: 1 },
  { week: 4, dayOfWeek: 'thu', type: 'tempo_run', title: 'Tempo Run',
    description: '10 min easy -> 12 min @ 7:00/mile -> 10 min easy. Starting to lock in the tempo feel.',
    targetPace: '7:00/mile', durationMin: 32, phase: 'foundation', phaseNumber: 1 },
  { week: 4, dayOfWeek: 'sat', type: 'hyrox_intervals', title: 'HYROX Intervals',
    description: '5 x 1km @ 6:10-6:15/mile. 90 sec station work between: wall balls (20), row 250m, burpees (8).',
    targetPace: '6:10-6:15/mile', durationMin: 45, phase: 'foundation', phaseNumber: 1 },

  // ============================================================
  // PHASE 2: BASE BUILDING — Weeks 5-8
  // ============================================================

  // Week 5
  { week: 5, dayOfWeek: 'mon', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 2 x 500m SkiErg — time each, target < 2:10/500m. Then 2 x 50m sled push @ race weight — continuous, no stops. (~8 min)',
    targetStations: ['skierg', 'sled_push'], durationMin: 8, phase: 'base_building', phaseNumber: 2 },
  { week: 5, dayOfWeek: 'tue', type: 'easy_run', title: 'Easy Run',
    description: '35-40 min @ 8:00-8:15/mile. Conversational pace. You may notice this feeling easier already.',
    targetPace: '8:00-8:15/mile', durationMin: 40, phase: 'base_building', phaseNumber: 2 },
  { week: 5, dayOfWeek: 'wed', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 2 x 50m sled pull @ race weight — time each, work on hand-over-hand speed. Then 40 wall balls for time (sets of 20). Record time. (~10 min)',
    targetStations: ['sled_pull', 'wall_balls'], durationMin: 10, phase: 'base_building', phaseNumber: 2 },
  { week: 5, dayOfWeek: 'thu', type: 'tempo_run', title: 'Tempo Run',
    description: '10 min easy -> 15 min @ 6:50/mile -> 10 min easy. Tempo block is getting real now.',
    targetPace: '6:50/mile', durationMin: 35, phase: 'base_building', phaseNumber: 2 },
  { week: 5, dayOfWeek: 'sat', type: 'hyrox_intervals', title: 'HYROX Intervals',
    description: '6 x 1km @ 6:10-6:15/mile. 90 sec station work between: add sled push (short distance) and sled pull.',
    targetPace: '6:10-6:15/mile', durationMin: 50, phase: 'base_building', phaseNumber: 2 },

  // Week 6 (same as week 5)
  { week: 6, dayOfWeek: 'mon', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 2 x 500m SkiErg — time each, target < 2:10/500m. Then 2 x 50m sled push @ race weight — continuous, no stops. (~8 min)',
    targetStations: ['skierg', 'sled_push'], durationMin: 8, phase: 'base_building', phaseNumber: 2 },
  { week: 6, dayOfWeek: 'tue', type: 'easy_run', title: 'Easy Run',
    description: '35-40 min @ 8:00-8:15/mile. Conversational pace. You may notice this feeling easier already.',
    targetPace: '8:00-8:15/mile', durationMin: 40, phase: 'base_building', phaseNumber: 2 },
  { week: 6, dayOfWeek: 'wed', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 2 x 50m sled pull @ race weight — time each, work on hand-over-hand speed. Then 40 wall balls for time (sets of 20). Record time. (~10 min)',
    targetStations: ['sled_pull', 'wall_balls'], durationMin: 10, phase: 'base_building', phaseNumber: 2 },
  { week: 6, dayOfWeek: 'thu', type: 'tempo_run', title: 'Tempo Run',
    description: '10 min easy -> 15 min @ 6:50/mile -> 10 min easy. Tempo block is getting real now.',
    targetPace: '6:50/mile', durationMin: 35, phase: 'base_building', phaseNumber: 2 },
  { week: 6, dayOfWeek: 'sat', type: 'hyrox_intervals', title: 'HYROX Intervals',
    description: '6 x 1km @ 6:10-6:15/mile. 90 sec station work between: add sled push (short distance) and sled pull.',
    targetPace: '6:10-6:15/mile', durationMin: 50, phase: 'base_building', phaseNumber: 2 },

  // Week 7
  { week: 7, dayOfWeek: 'mon', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 1,000m row for time — target < 4:10. Then 50m sandbag lunges for time — find your sustainable pace. Record both. (~10 min)',
    targetStations: ['rowing', 'sandbag_lunges'], durationMin: 10, phase: 'base_building', phaseNumber: 2 },
  { week: 7, dayOfWeek: 'tue', type: 'easy_run', title: 'Easy Run',
    description: '40-45 min @ 8:00-8:15/mile. Still conversational. Building that aerobic base.',
    targetPace: '8:00-8:15/mile', durationMin: 45, phase: 'base_building', phaseNumber: 2 },
  { week: 7, dayOfWeek: 'wed', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 40m burpee broad jumps for time — practice pacing at 1 rep every 12-14 sec. Then 100m farmers carry for time @ race weight. Record both. (~10 min)',
    targetStations: ['burpee_broad_jump', 'farmers_carry'], durationMin: 10, phase: 'base_building', phaseNumber: 2 },
  { week: 7, dayOfWeek: 'thu', type: 'tempo_run', title: 'Tempo Run',
    description: '10 min easy -> 18 min @ 6:45-6:50/mile -> 10 min easy. Pushing the tempo duration.',
    targetPace: '6:45-6:50/mile', durationMin: 38, phase: 'base_building', phaseNumber: 2 },
  { week: 7, dayOfWeek: 'sat', type: 'hyrox_intervals', title: 'HYROX Intervals',
    description: '7 x 1km @ 6:05-6:15/mile. 75 sec station work: full rotation (wall balls, row, burpee broad jumps, lunges, farmers carry). Practice transitions.',
    targetPace: '6:05-6:15/mile', durationMin: 55, phase: 'base_building', phaseNumber: 2 },

  // Week 8 (same as week 7)
  { week: 8, dayOfWeek: 'mon', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 1,000m row for time — target < 4:10. Then 50m sandbag lunges for time — find your sustainable pace. Record both. (~10 min)',
    targetStations: ['rowing', 'sandbag_lunges'], durationMin: 10, phase: 'base_building', phaseNumber: 2 },
  { week: 8, dayOfWeek: 'tue', type: 'easy_run', title: 'Easy Run',
    description: '40-45 min @ 8:00-8:15/mile. Still conversational. Building that aerobic base.',
    targetPace: '8:00-8:15/mile', durationMin: 45, phase: 'base_building', phaseNumber: 2 },
  { week: 8, dayOfWeek: 'wed', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 40m burpee broad jumps for time — practice pacing at 1 rep every 12-14 sec. Then 100m farmers carry for time @ race weight. Record both. (~10 min)',
    targetStations: ['burpee_broad_jump', 'farmers_carry'], durationMin: 10, phase: 'base_building', phaseNumber: 2 },
  { week: 8, dayOfWeek: 'thu', type: 'tempo_run', title: 'Tempo Run',
    description: '10 min easy -> 18 min @ 6:45-6:50/mile -> 10 min easy. Pushing the tempo duration.',
    targetPace: '6:45-6:50/mile', durationMin: 38, phase: 'base_building', phaseNumber: 2 },
  { week: 8, dayOfWeek: 'sat', type: 'hyrox_intervals', title: 'HYROX Intervals',
    description: '7 x 1km @ 6:05-6:15/mile. 75 sec station work: full rotation (wall balls, row, burpee broad jumps, lunges, farmers carry). Practice transitions.',
    targetPace: '6:05-6:15/mile', durationMin: 55, phase: 'base_building', phaseNumber: 2 },

  // ============================================================
  // PHASE 3: AEROBIC DEVELOPMENT — Weeks 9-12
  // ============================================================

  // Week 9
  { week: 9, dayOfWeek: 'mon', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 1,000m SkiErg for time (target: < 4:00). Then 50m sled push for time @ race weight. Compare to Phase 2 times. (~10 min)',
    targetStations: ['skierg', 'sled_push'], durationMin: 10, phase: 'aerobic_dev', phaseNumber: 3 },
  { week: 9, dayOfWeek: 'tue', type: 'easy_run', title: 'Easy Run',
    description: '45-50 min @ 7:45-8:00/mile. This pace should feel sustainable and relaxed.',
    targetPace: '7:45-8:00/mile', durationMin: 50, phase: 'aerobic_dev', phaseNumber: 3 },
  { week: 9, dayOfWeek: 'wed', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 50m sled pull for time @ race weight (your #1 gap — chase improvement here). Then 50 wall balls for time (sets of 25). Record both. (~10 min)',
    targetStations: ['sled_pull', 'wall_balls'], durationMin: 10, phase: 'aerobic_dev', phaseNumber: 3 },
  { week: 9, dayOfWeek: 'thu', type: 'tempo_run', title: 'Tempo Run',
    description: '10 min easy -> 20 min @ 6:40/mile -> 10 min easy. You\'re now holding pace for 20 min — big milestone.',
    targetPace: '6:40/mile', durationMin: 40, phase: 'aerobic_dev', phaseNumber: 3 },
  { week: 9, dayOfWeek: 'sat', type: 'hyrox_intervals', title: 'HYROX Intervals',
    description: '8 x 1km @ 6:05-6:10/mile. 60 sec station work: full HYROX rotation. Time each station — start benchmarking.',
    targetPace: '6:05-6:10/mile', durationMin: 60, phase: 'aerobic_dev', phaseNumber: 3 },

  // Week 10 (same as week 9)
  { week: 10, dayOfWeek: 'mon', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 1,000m SkiErg for time (target: < 4:00). Then 50m sled push for time @ race weight. Compare to Phase 2 times. (~10 min)',
    targetStations: ['skierg', 'sled_push'], durationMin: 10, phase: 'aerobic_dev', phaseNumber: 3 },
  { week: 10, dayOfWeek: 'tue', type: 'easy_run', title: 'Easy Run',
    description: '45-50 min @ 7:45-8:00/mile. This pace should feel sustainable and relaxed.',
    targetPace: '7:45-8:00/mile', durationMin: 50, phase: 'aerobic_dev', phaseNumber: 3 },
  { week: 10, dayOfWeek: 'wed', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 50m sled pull for time @ race weight (your #1 gap — chase improvement here). Then 50 wall balls for time (sets of 25). Record both. (~10 min)',
    targetStations: ['sled_pull', 'wall_balls'], durationMin: 10, phase: 'aerobic_dev', phaseNumber: 3 },
  { week: 10, dayOfWeek: 'thu', type: 'tempo_run', title: 'Tempo Run',
    description: '10 min easy -> 20 min @ 6:40/mile -> 10 min easy. You\'re now holding pace for 20 min — big milestone.',
    targetPace: '6:40/mile', durationMin: 40, phase: 'aerobic_dev', phaseNumber: 3 },
  { week: 10, dayOfWeek: 'sat', type: 'hyrox_intervals', title: 'HYROX Intervals',
    description: '8 x 1km @ 6:05-6:10/mile. 60 sec station work: full HYROX rotation. Time each station — start benchmarking.',
    targetPace: '6:05-6:10/mile', durationMin: 60, phase: 'aerobic_dev', phaseNumber: 3 },

  // Week 11
  { week: 11, dayOfWeek: 'mon', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 1,000m row for time (target: < 4:00). Then 100m sandbag lunges for time — full race distance. Record time. (~10 min)',
    targetStations: ['rowing', 'sandbag_lunges'], durationMin: 10, phase: 'aerobic_dev', phaseNumber: 3 },
  { week: 11, dayOfWeek: 'tue', type: 'easy_run', title: 'Easy Run',
    description: '50-55 min @ 7:45-8:00/mile. Notice how your "easy" pace keeps getting faster at the same effort.',
    targetPace: '7:45-8:00/mile', durationMin: 55, phase: 'aerobic_dev', phaseNumber: 3 },
  { week: 11, dayOfWeek: 'wed', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 80m burpee broad jumps for time — full race distance (target: < 3:30). Then 200m farmers carry for time @ race weight. Big benchmark day. (~10 min)',
    targetStations: ['burpee_broad_jump', 'farmers_carry'], durationMin: 10, phase: 'aerobic_dev', phaseNumber: 3 },
  { week: 11, dayOfWeek: 'thu', type: 'tempo_run', title: 'Tempo Run',
    description: '10 min easy -> 22 min @ 6:30-6:40/mile -> 10 min easy. Getting close to race pace tempo.',
    targetPace: '6:30-6:40/mile', durationMin: 42, phase: 'aerobic_dev', phaseNumber: 3 },
  { week: 11, dayOfWeek: 'sat', type: 'hyrox_simulation', title: 'HYROX Simulation',
    description: '8 x 1km @ 6:00-6:10/mile. Full station work between each run at target times. Practice transitions (15-20 sec).',
    targetPace: '6:00-6:10/mile', durationMin: 65, phase: 'aerobic_dev', phaseNumber: 3 },

  // Week 12 (same as week 11)
  { week: 12, dayOfWeek: 'mon', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 1,000m row for time (target: < 4:00). Then 100m sandbag lunges for time — full race distance. Record time. (~10 min)',
    targetStations: ['rowing', 'sandbag_lunges'], durationMin: 10, phase: 'aerobic_dev', phaseNumber: 3 },
  { week: 12, dayOfWeek: 'tue', type: 'easy_run', title: 'Easy Run',
    description: '50-55 min @ 7:45-8:00/mile. Notice how your "easy" pace keeps getting faster at the same effort.',
    targetPace: '7:45-8:00/mile', durationMin: 55, phase: 'aerobic_dev', phaseNumber: 3 },
  { week: 12, dayOfWeek: 'wed', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 80m burpee broad jumps for time — full race distance (target: < 3:30). Then 200m farmers carry for time @ race weight. Big benchmark day. (~10 min)',
    targetStations: ['burpee_broad_jump', 'farmers_carry'], durationMin: 10, phase: 'aerobic_dev', phaseNumber: 3 },
  { week: 12, dayOfWeek: 'thu', type: 'tempo_run', title: 'Tempo Run',
    description: '10 min easy -> 22 min @ 6:30-6:40/mile -> 10 min easy. Getting close to race pace tempo.',
    targetPace: '6:30-6:40/mile', durationMin: 42, phase: 'aerobic_dev', phaseNumber: 3 },
  { week: 12, dayOfWeek: 'sat', type: 'hyrox_simulation', title: 'HYROX Simulation',
    description: '8 x 1km @ 6:00-6:10/mile. Full station work between each run at target times. Practice transitions (15-20 sec).',
    targetPace: '6:00-6:10/mile', durationMin: 65, phase: 'aerobic_dev', phaseNumber: 3 },

  // ============================================================
  // PHASE 4: THRESHOLD PUSH — Weeks 13-16
  // ============================================================

  // Week 13
  { week: 13, dayOfWeek: 'mon', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 50m sled pull for time — target Scenario A (1:30-2:00). Then 50m sled push for time — target (1:30-2:00). Chase those targets. (~8 min)',
    targetStations: ['sled_pull', 'sled_push'], durationMin: 8, phase: 'threshold_push', phaseNumber: 4 },
  { week: 13, dayOfWeek: 'tue', type: 'easy_run', title: 'Easy Run',
    description: '50-55 min @ 7:30-7:45/mile. This used to be your 5K pace. Let that sink in.',
    targetPace: '7:30-7:45/mile', durationMin: 55, phase: 'threshold_push', phaseNumber: 4 },
  { week: 13, dayOfWeek: 'wed', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 100 wall balls for time (sets of 25, target: < 3:30). Then 1,000m SkiErg for time (target: < 3:45). Full race distances, Scenario A times. (~10 min)',
    targetStations: ['wall_balls', 'skierg'], durationMin: 10, phase: 'threshold_push', phaseNumber: 4 },
  { week: 13, dayOfWeek: 'thu', type: 'tempo_run', title: 'Tempo Run',
    description: '10 min easy -> 25 min @ 6:20-6:30/mile -> 10 min easy. This IS your race pace. Get comfortable here.',
    targetPace: '6:20-6:30/mile', durationMin: 45, phase: 'threshold_push', phaseNumber: 4 },
  { week: 13, dayOfWeek: 'sat', type: 'hyrox_simulation', title: 'HYROX Simulation',
    description: '8 x 1km @ 5:55-6:05/mile. Full station simulations between. Target Scenario A station times. Time everything.',
    targetPace: '5:55-6:05/mile', durationMin: 70, phase: 'threshold_push', phaseNumber: 4 },

  // Week 14 (same as week 13)
  { week: 14, dayOfWeek: 'mon', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 50m sled pull for time — target Scenario A (1:30-2:00). Then 50m sled push for time — target (1:30-2:00). Chase those targets. (~8 min)',
    targetStations: ['sled_pull', 'sled_push'], durationMin: 8, phase: 'threshold_push', phaseNumber: 4 },
  { week: 14, dayOfWeek: 'tue', type: 'easy_run', title: 'Easy Run',
    description: '50-55 min @ 7:30-7:45/mile. This used to be your 5K pace. Let that sink in.',
    targetPace: '7:30-7:45/mile', durationMin: 55, phase: 'threshold_push', phaseNumber: 4 },
  { week: 14, dayOfWeek: 'wed', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 100 wall balls for time (sets of 25, target: < 3:30). Then 1,000m SkiErg for time (target: < 3:45). Full race distances, Scenario A times. (~10 min)',
    targetStations: ['wall_balls', 'skierg'], durationMin: 10, phase: 'threshold_push', phaseNumber: 4 },
  { week: 14, dayOfWeek: 'thu', type: 'tempo_run', title: 'Tempo Run',
    description: '10 min easy -> 25 min @ 6:20-6:30/mile -> 10 min easy. This IS your race pace. Get comfortable here.',
    targetPace: '6:20-6:30/mile', durationMin: 45, phase: 'threshold_push', phaseNumber: 4 },
  { week: 14, dayOfWeek: 'sat', type: 'hyrox_simulation', title: 'HYROX Simulation',
    description: '8 x 1km @ 5:55-6:05/mile. Full station simulations between. Target Scenario A station times. Time everything.',
    targetPace: '5:55-6:05/mile', durationMin: 70, phase: 'threshold_push', phaseNumber: 4 },

  // Week 15
  { week: 15, dayOfWeek: 'mon', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 80m burpee broad jumps for time (target: < 3:00). Then 100m sandbag lunges for time (target: < 3:00). Your two biggest gaps — grind these down. (~10 min)',
    targetStations: ['burpee_broad_jump', 'sandbag_lunges'], durationMin: 10, phase: 'threshold_push', phaseNumber: 4 },
  { week: 15, dayOfWeek: 'tue', type: 'easy_run', title: 'Easy Run',
    description: '55-60 min @ 7:30-7:45/mile. Peak easy run volume. Monitor how you feel — back off if needed.',
    targetPace: '7:30-7:45/mile', durationMin: 60, phase: 'threshold_push', phaseNumber: 4 },
  { week: 15, dayOfWeek: 'wed', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 1,000m row for time (target: < 3:45). Then 200m farmers carry for time (target: < 1:45). Grip endurance is key — no putting them down. (~8 min)',
    targetStations: ['rowing', 'farmers_carry'], durationMin: 8, phase: 'threshold_push', phaseNumber: 4 },
  { week: 15, dayOfWeek: 'thu', type: 'tempo_run', title: 'Tempo Run',
    description: '10 min easy -> 25 min @ 6:20/mile -> 10 min easy. Race pace should feel like 70-75% effort now.',
    targetPace: '6:20/mile', durationMin: 45, phase: 'threshold_push', phaseNumber: 4 },
  { week: 15, dayOfWeek: 'sat', type: 'hyrox_simulation', title: 'HYROX Simulation',
    description: 'Full 8 x 1km @ 6:00-6:10/mile. Full station simulations. Focus on weak stations: sled pull, burpee broad jumps, sandbag lunges.',
    targetPace: '6:00-6:10/mile', durationMin: 70, phase: 'threshold_push', phaseNumber: 4 },

  // Week 16 (same as week 15)
  { week: 16, dayOfWeek: 'mon', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 80m burpee broad jumps for time (target: < 3:00). Then 100m sandbag lunges for time (target: < 3:00). Your two biggest gaps — grind these down. (~10 min)',
    targetStations: ['burpee_broad_jump', 'sandbag_lunges'], durationMin: 10, phase: 'threshold_push', phaseNumber: 4 },
  { week: 16, dayOfWeek: 'tue', type: 'easy_run', title: 'Easy Run',
    description: '55-60 min @ 7:30-7:45/mile. Peak easy run volume. Monitor how you feel — back off if needed.',
    targetPace: '7:30-7:45/mile', durationMin: 60, phase: 'threshold_push', phaseNumber: 4 },
  { week: 16, dayOfWeek: 'wed', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 1,000m row for time (target: < 3:45). Then 200m farmers carry for time (target: < 1:45). Grip endurance is key — no putting them down. (~8 min)',
    targetStations: ['rowing', 'farmers_carry'], durationMin: 8, phase: 'threshold_push', phaseNumber: 4 },
  { week: 16, dayOfWeek: 'thu', type: 'tempo_run', title: 'Tempo Run',
    description: '10 min easy -> 25 min @ 6:20/mile -> 10 min easy. Race pace should feel like 70-75% effort now.',
    targetPace: '6:20/mile', durationMin: 45, phase: 'threshold_push', phaseNumber: 4 },
  { week: 16, dayOfWeek: 'sat', type: 'hyrox_simulation', title: 'HYROX Simulation',
    description: 'Full 8 x 1km @ 6:00-6:10/mile. Full station simulations. Focus on weak stations: sled pull, burpee broad jumps, sandbag lunges.',
    targetPace: '6:00-6:10/mile', durationMin: 70, phase: 'threshold_push', phaseNumber: 4 },

  // ============================================================
  // PHASE 5: RACE SPECIFICITY — Weeks 17-20
  // ============================================================

  // Week 17
  { week: 17, dayOfWeek: 'mon', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: Pick your 2 weakest stations. Do each at full race distance for time. Compare to Scenario A targets. Log improvements. (~10 min)',
    targetStations: [], durationMin: 10, phase: 'race_specificity', phaseNumber: 5 },
  { week: 17, dayOfWeek: 'tue', type: 'easy_run', title: 'Easy Run',
    description: '50-55 min @ 7:30-7:45/mile. Maintain volume but don\'t increase. Quality over quantity now.',
    targetPace: '7:30-7:45/mile', durationMin: 55, phase: 'race_specificity', phaseNumber: 5 },
  { week: 17, dayOfWeek: 'wed', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: Pick 2 different stations from Monday. Full race distance for time. By now you should have recent benchmarks for all 8 stations. (~10 min)',
    targetStations: [], durationMin: 10, phase: 'race_specificity', phaseNumber: 5 },
  { week: 17, dayOfWeek: 'thu', type: 'race_pace_run', title: 'Race Pace Run',
    description: '10 min easy -> 25 min @ 6:20/mile -> 10 min easy. Should feel like a training run, not a race effort.',
    targetPace: '6:20/mile', durationMin: 45, phase: 'race_specificity', phaseNumber: 5 },
  { week: 17, dayOfWeek: 'sat', type: 'hyrox_simulation', title: 'HYROX Simulation',
    description: '8 x 1km + all 8 stations at race weights/distances. Rehearse transitions. Compare to Scenario A/B.',
    targetPace: '6:00-6:10/mile', durationMin: 75, phase: 'race_specificity', phaseNumber: 5 },

  // Week 18
  { week: 18, dayOfWeek: 'mon', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: Pick your 2 weakest stations. Do each at full race distance for time. Compare to Scenario A targets. Log improvements. (~10 min)',
    targetStations: [], durationMin: 10, phase: 'race_specificity', phaseNumber: 5 },
  { week: 18, dayOfWeek: 'tue', type: 'easy_run', title: 'Easy Run',
    description: '50-55 min @ 7:30-7:45/mile. Maintain volume but don\'t increase. Quality over quantity now.',
    targetPace: '7:30-7:45/mile', durationMin: 55, phase: 'race_specificity', phaseNumber: 5 },
  { week: 18, dayOfWeek: 'wed', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: Pick 2 different stations from Monday. Full race distance for time. By now you should have recent benchmarks for all 8 stations. (~10 min)',
    targetStations: [], durationMin: 10, phase: 'race_specificity', phaseNumber: 5 },
  { week: 18, dayOfWeek: 'thu', type: 'race_pace_run', title: 'Race Pace Run',
    description: '10 min easy -> 25 min @ 6:20/mile -> 10 min easy. Should feel like a training run, not a race effort.',
    targetPace: '6:20/mile', durationMin: 45, phase: 'race_specificity', phaseNumber: 5 },
  { week: 18, dayOfWeek: 'sat', type: 'full_hyrox_sim', title: 'Full HYROX Sim',
    description: 'FULL RACE SIMULATION. 8 x 1km + all 8 stations at race weights/distances. Time everything. Compare to Scenario A/B. First dress rehearsal.',
    targetPace: '6:00-6:10/mile', durationMin: 80, phase: 'race_specificity', phaseNumber: 5 },

  // Week 19
  { week: 19, dayOfWeek: 'mon', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: Sled pull + burpee broad jumps at full race distance. These are your make-or-break stations. Final push for improvement before taper. (~10 min)',
    targetStations: ['sled_pull', 'burpee_broad_jump'], durationMin: 10, phase: 'race_specificity', phaseNumber: 5 },
  { week: 19, dayOfWeek: 'tue', type: 'easy_run', title: 'Easy Run',
    description: '45-50 min @ 7:30-7:45/mile. Slight volume reduction as intensity is high.',
    targetPace: '7:30-7:45/mile', durationMin: 50, phase: 'race_specificity', phaseNumber: 5 },
  { week: 19, dayOfWeek: 'wed', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: Wall balls (100 reps for time) + SkiErg (1,000m for time). Final station benchmarks before taper. Record everything. (~10 min)',
    targetStations: ['wall_balls', 'skierg'], durationMin: 10, phase: 'race_specificity', phaseNumber: 5 },
  { week: 19, dayOfWeek: 'thu', type: 'race_pace_run', title: 'Race Pace Run',
    description: '10 min easy -> 20 min @ 6:15-6:20/mile -> 10 min easy. Slightly faster than race pace — building a gear above.',
    targetPace: '6:15-6:20/mile', durationMin: 40, phase: 'race_specificity', phaseNumber: 5 },
  { week: 19, dayOfWeek: 'sat', type: 'hyrox_simulation', title: 'HYROX Simulation',
    description: '8 x 1km + all 8 stations. Rehearse race day with focus on transitions and pacing.',
    targetPace: '6:00-6:10/mile', durationMin: 75, phase: 'race_specificity', phaseNumber: 5 },

  // Week 20
  { week: 20, dayOfWeek: 'mon', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: Sled pull + burpee broad jumps at full race distance. These are your make-or-break stations. Final push for improvement before taper. (~10 min)',
    targetStations: ['sled_pull', 'burpee_broad_jump'], durationMin: 10, phase: 'race_specificity', phaseNumber: 5 },
  { week: 20, dayOfWeek: 'tue', type: 'easy_run', title: 'Easy Run',
    description: '45-50 min @ 7:30-7:45/mile. Slight volume reduction as intensity is high.',
    targetPace: '7:30-7:45/mile', durationMin: 50, phase: 'race_specificity', phaseNumber: 5 },
  { week: 20, dayOfWeek: 'wed', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: Wall balls (100 reps for time) + SkiErg (1,000m for time). Final station benchmarks before taper. Record everything. (~10 min)',
    targetStations: ['wall_balls', 'skierg'], durationMin: 10, phase: 'race_specificity', phaseNumber: 5 },
  { week: 20, dayOfWeek: 'thu', type: 'race_pace_run', title: 'Race Pace Run',
    description: '10 min easy -> 20 min @ 6:15-6:20/mile -> 10 min easy. Slightly faster than race pace — building a gear above.',
    targetPace: '6:15-6:20/mile', durationMin: 40, phase: 'race_specificity', phaseNumber: 5 },
  { week: 20, dayOfWeek: 'sat', type: 'full_hyrox_sim', title: 'Full HYROX Sim',
    description: 'SECOND FULL SIM. 8 x 1km + all 8 stations. Race day dress rehearsal. Wear race kit, practice nutrition/hydration. Final benchmark.',
    targetPace: '6:00-6:10/mile', durationMin: 80, phase: 'race_specificity', phaseNumber: 5 },

  // ============================================================
  // PHASE 6: PEAK & TAPER — Weeks 21-24
  // ============================================================

  // Week 21
  { week: 21, dayOfWeek: 'mon', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 500m SkiErg + 25m sled push + 25 wall balls. Half distances, race intensity. Stay sharp, don\'t drain. (~5 min)',
    targetStations: ['skierg', 'sled_push', 'wall_balls'], durationMin: 5, phase: 'peak_taper', phaseNumber: 6 },
  { week: 21, dayOfWeek: 'tue', type: 'easy_run', title: 'Easy Run',
    description: '35-40 min @ 7:45-8:00/mile. Volume is down 30%. Legs start feeling springy.',
    targetPace: '7:45-8:00/mile', durationMin: 40, phase: 'peak_taper', phaseNumber: 6 },
  { week: 21, dayOfWeek: 'wed', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 25m sled pull + 40m burpee broad jumps + 50m sandbag lunges. Half distances only. Quick and crisp. (~5 min)',
    targetStations: ['sled_pull', 'burpee_broad_jump', 'sandbag_lunges'], durationMin: 5, phase: 'peak_taper', phaseNumber: 6 },
  { week: 21, dayOfWeek: 'thu', type: 'race_pace_run', title: 'Race Pace Sharpener',
    description: '10 min easy -> 15 min @ 6:20/mile -> 10 min easy. Short and sharp. Remind your body what race pace feels like.',
    targetPace: '6:20/mile', durationMin: 35, phase: 'peak_taper', phaseNumber: 6 },
  { week: 21, dayOfWeek: 'sat', type: 'station_tuneup', title: 'Station Tune-Up',
    description: '4 x 1km @ 6:15-6:20/mile. 4 stations only (your weakest). Short, crisp, confident. No full sims.',
    targetPace: '6:15-6:20/mile', durationMin: 40, phase: 'peak_taper', phaseNumber: 6 },

  // Week 22 (same as week 21)
  { week: 22, dayOfWeek: 'mon', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 500m SkiErg + 25m sled push + 25 wall balls. Half distances, race intensity. Stay sharp, don\'t drain. (~5 min)',
    targetStations: ['skierg', 'sled_push', 'wall_balls'], durationMin: 5, phase: 'peak_taper', phaseNumber: 6 },
  { week: 22, dayOfWeek: 'tue', type: 'easy_run', title: 'Easy Run',
    description: '35-40 min @ 7:45-8:00/mile. Volume is down 30%. Legs start feeling springy.',
    targetPace: '7:45-8:00/mile', durationMin: 40, phase: 'peak_taper', phaseNumber: 6 },
  { week: 22, dayOfWeek: 'wed', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 25m sled pull + 40m burpee broad jumps + 50m sandbag lunges. Half distances only. Quick and crisp. (~5 min)',
    targetStations: ['sled_pull', 'burpee_broad_jump', 'sandbag_lunges'], durationMin: 5, phase: 'peak_taper', phaseNumber: 6 },
  { week: 22, dayOfWeek: 'thu', type: 'race_pace_run', title: 'Race Pace Sharpener',
    description: '10 min easy -> 15 min @ 6:20/mile -> 10 min easy. Short and sharp. Remind your body what race pace feels like.',
    targetPace: '6:20/mile', durationMin: 35, phase: 'peak_taper', phaseNumber: 6 },
  { week: 22, dayOfWeek: 'sat', type: 'station_tuneup', title: 'Station Tune-Up',
    description: '4 x 1km @ 6:15-6:20/mile. 4 stations only (your weakest). Short, crisp, confident. No full sims.',
    targetPace: '6:15-6:20/mile', durationMin: 40, phase: 'peak_taper', phaseNumber: 6 },

  // Week 23
  { week: 23, dayOfWeek: 'mon', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 250m SkiErg + 500m row + 15 wall balls. Light, just keep the patterns fresh. This is maintenance, not training. (~5 min)',
    targetStations: ['skierg', 'rowing', 'wall_balls'], durationMin: 5, phase: 'peak_taper', phaseNumber: 6 },
  { week: 23, dayOfWeek: 'tue', type: 'shakeout_run', title: 'Shakeout Run',
    description: '20-25 min @ 8:00-8:15/mile. Loose and easy. Strides at the end (4 x 15 sec).',
    targetPace: '8:00-8:15/mile', durationMin: 25, phase: 'peak_taper', phaseNumber: 6 },
  { week: 23, dayOfWeek: 'wed', type: 'station_skills', title: 'Station Skills',
    description: 'Last station day before race. 10 wall balls, 10m sled push, 10m sled pull. Just move through the patterns. Visualize race day. (~3 min)',
    targetStations: ['wall_balls', 'sled_push', 'sled_pull'], durationMin: 3, phase: 'peak_taper', phaseNumber: 6 },
  { week: 23, dayOfWeek: 'thu', type: 'activation', title: 'Activation',
    description: '15 min easy jog. 3 x 200m @ race pace with full recovery. 10-15 wall balls, short row. Just wake the body up.',
    targetPace: '6:20/mile', durationMin: 25, phase: 'peak_taper', phaseNumber: 6 },
  { week: 23, dayOfWeek: 'sat', type: 'station_tuneup', title: 'Station Tune-Up',
    description: '3 x 1km @ 6:20/mile. 2-3 stations at half distance. Easy and confident. Trust the taper.',
    targetPace: '6:20/mile', durationMin: 30, phase: 'peak_taper', phaseNumber: 6 },

  // Week 24 (race week)
  { week: 24, dayOfWeek: 'mon', type: 'station_skills', title: 'Station Skills',
    description: 'After CF: 250m SkiErg + 500m row + 15 wall balls. Light, just keep the patterns fresh. This is maintenance, not training. (~5 min)',
    targetStations: ['skierg', 'rowing', 'wall_balls'], durationMin: 5, phase: 'peak_taper', phaseNumber: 6 },
  { week: 24, dayOfWeek: 'tue', type: 'shakeout_run', title: 'Shakeout Run',
    description: '20-25 min @ 8:00-8:15/mile. Loose and easy. Strides at the end (4 x 15 sec).',
    targetPace: '8:00-8:15/mile', durationMin: 25, phase: 'peak_taper', phaseNumber: 6 },
  { week: 24, dayOfWeek: 'wed', type: 'station_skills', title: 'Station Skills',
    description: 'Last station day before race. 10 wall balls, 10m sled push, 10m sled pull. Just move through the patterns. Visualize race day. (~3 min)',
    targetStations: ['wall_balls', 'sled_push', 'sled_pull'], durationMin: 3, phase: 'peak_taper', phaseNumber: 6 },
  { week: 24, dayOfWeek: 'thu', type: 'activation', title: 'Activation',
    description: '15 min easy jog. 3 x 200m @ race pace with full recovery. 10-15 wall balls, short row. Just wake the body up.',
    targetPace: '6:20/mile', durationMin: 25, phase: 'peak_taper', phaseNumber: 6 },
  { week: 24, dayOfWeek: 'fri', type: 'race_day', title: 'RACE DAY',
    description: 'September 18, 2026. Execute the plan. Sub-60 is yours.',
    durationMin: 60, phase: 'peak_taper', phaseNumber: 6 },
];

async function seed() {
  // Find or prompt for user
  const users = await db.select().from(schema.crossfitUsers).limit(1);
  if (users.length === 0) {
    console.error('No crossfit_users found. Please ensure a user exists first.');
    process.exit(1);
  }
  const userId = users[0].id;
  console.log(`Seeding plan for user ${userId} (${users[0].email})`);

  let inserted = 0;
  let updated = 0;

  for (const session of PLAN) {
    // Check if row already exists (upsert)
    const existing = await db.select()
      .from(schema.hyroxTrainingPlans)
      .where(
        and(
          eq(schema.hyroxTrainingPlans.userId, userId),
          eq(schema.hyroxTrainingPlans.week, session.week),
          eq(schema.hyroxTrainingPlans.dayOfWeek, session.dayOfWeek),
        )
      );

    if (existing.length > 0) {
      await db.update(schema.hyroxTrainingPlans)
        .set({
          sessionType: session.type,
          title: session.title,
          description: session.description,
          targetPace: session.targetPace || null,
          targetDurationMin: session.durationMin || null,
          targetStations: session.targetStations || null,
          phase: session.phase,
          phaseNumber: session.phaseNumber,
        })
        .where(eq(schema.hyroxTrainingPlans.id, existing[0].id));
      updated++;
    } else {
      await db.insert(schema.hyroxTrainingPlans).values({
        userId,
        week: session.week,
        dayOfWeek: session.dayOfWeek,
        sessionType: session.type,
        title: session.title,
        description: session.description,
        targetPace: session.targetPace || null,
        targetDurationMin: session.durationMin || null,
        targetStations: session.targetStations || null,
        phase: session.phase,
        phaseNumber: session.phaseNumber,
      });
      inserted++;
    }
  }

  console.log(`Done! Inserted: ${inserted}, Updated: ${updated}, Total: ${PLAN.length}`);
}

seed().catch(console.error);
