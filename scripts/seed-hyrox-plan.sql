-- Seed script for the 24-week HYROX training plan.
-- Inserts 120 rows (5 sessions/week x 24 weeks) into hyrox_training_plans.
-- Idempotent: uses ON CONFLICT (user_id, week, day_of_week) DO UPDATE.
-- Assumes user_id = 1 (sarah.dorich@gmail.com in crossfit_users).

INSERT INTO hyrox_training_plans (user_id, week, day_of_week, session_type, title, description, target_pace, target_duration_min, target_stations, phase, phase_number)
VALUES
-- ============================================================
-- PHASE 1: FOUNDATION — Weeks 1-4
-- ============================================================

-- Week 1
(1, 1, 'mon', 'station_skills', 'Station Skills', 'After CF: 3 x 250m SkiErg @ moderate pace (focus on long pulls, leg drive). Rest 45 sec between sets. Then 3 x 10 wall balls — smooth rhythm, no rushing. (~8 min)', NULL, 8, ARRAY['skierg', 'wall_balls'], 'foundation', 1),
(1, 1, 'tue', 'easy_run', 'Easy Run', '25-30 min @ 8:30-9:00/mile. Truly conversational — if you can''t chat, slow down.', '8:30-9:00/mile', 30, NULL, 'foundation', 1),
(1, 1, 'wed', 'station_skills', 'Station Skills', 'After CF: 3 x 50m sled push @ moderate weight (focus on low stance, continuous movement). Then 3 x 50m farmers carry — brisk walk, grip practice. (~8 min)', NULL, 8, ARRAY['sled_push', 'farmers_carry'], 'foundation', 1),
(1, 1, 'thu', 'tempo_run', 'Tempo Run', '8 min easy -> 10 min @ 7:15/mile -> 8 min easy. First time holding a pace — keep it controlled.', '7:15/mile', 26, NULL, 'foundation', 1),
(1, 1, 'sat', 'hyrox_intervals', 'HYROX Intervals', '4 x 1km @ 6:15-6:20/mile. 2 min rest between (walk/jog). Add 20 wall balls between runs 2-3.', '6:15-6:20/mile', 40, NULL, 'foundation', 1),

-- Week 2
(1, 2, 'mon', 'station_skills', 'Station Skills', 'After CF: 3 x 250m SkiErg @ moderate pace (focus on long pulls, leg drive). Rest 45 sec between sets. Then 3 x 10 wall balls — smooth rhythm, no rushing. (~8 min)', NULL, 8, ARRAY['skierg', 'wall_balls'], 'foundation', 1),
(1, 2, 'tue', 'easy_run', 'Easy Run', '25-30 min @ 8:30-9:00/mile. Truly conversational — if you can''t chat, slow down.', '8:30-9:00/mile', 30, NULL, 'foundation', 1),
(1, 2, 'wed', 'station_skills', 'Station Skills', 'After CF: 3 x 50m sled push @ moderate weight (focus on low stance, continuous movement). Then 3 x 50m farmers carry — brisk walk, grip practice. (~8 min)', NULL, 8, ARRAY['sled_push', 'farmers_carry'], 'foundation', 1),
(1, 2, 'thu', 'tempo_run', 'Tempo Run', '8 min easy -> 10 min @ 7:15/mile -> 8 min easy. First time holding a pace — keep it controlled.', '7:15/mile', 26, NULL, 'foundation', 1),
(1, 2, 'sat', 'hyrox_intervals', 'HYROX Intervals', '4 x 1km @ 6:15-6:20/mile. 2 min rest between (walk/jog). Add 20 wall balls between runs 2-3.', '6:15-6:20/mile', 40, NULL, 'foundation', 1),

-- Week 3
(1, 3, 'mon', 'station_skills', 'Station Skills', 'After CF: 1,000m row @ 2:10-2:15/500m pace (smooth, legs-first). Then 3 x 20m sandbag lunges — find a rhythm, practice breathing. (~10 min)', NULL, 10, ARRAY['rowing', 'sandbag_lunges'], 'foundation', 1),
(1, 3, 'tue', 'easy_run', 'Easy Run', '30-35 min @ 8:15-8:30/mile. Still conversational. Add 4-5 strides (20 sec pickups) at the end.', '8:15-8:30/mile', 35, NULL, 'foundation', 1),
(1, 3, 'wed', 'station_skills', 'Station Skills', 'After CF: 3 x 50m sled pull (hand-over-hand technique focus — find your grip). Then 3 x 20m burpee broad jumps — work on pacing, not speed. (~10 min)', NULL, 10, ARRAY['sled_pull', 'burpee_broad_jump'], 'foundation', 1),
(1, 3, 'thu', 'tempo_run', 'Tempo Run', '10 min easy -> 12 min @ 7:00/mile -> 10 min easy. Starting to lock in the tempo feel.', '7:00/mile', 32, NULL, 'foundation', 1),
(1, 3, 'sat', 'hyrox_intervals', 'HYROX Intervals', '5 x 1km @ 6:10-6:15/mile. 90 sec station work between: wall balls (20), row 250m, burpees (8).', '6:10-6:15/mile', 45, NULL, 'foundation', 1),

-- Week 4
(1, 4, 'mon', 'station_skills', 'Station Skills', 'After CF: 1,000m row @ 2:10-2:15/500m pace (smooth, legs-first). Then 3 x 20m sandbag lunges — find a rhythm, practice breathing. (~10 min)', NULL, 10, ARRAY['rowing', 'sandbag_lunges'], 'foundation', 1),
(1, 4, 'tue', 'easy_run', 'Easy Run', '30-35 min @ 8:15-8:30/mile. Still conversational. Add 4-5 strides (20 sec pickups) at the end.', '8:15-8:30/mile', 35, NULL, 'foundation', 1),
(1, 4, 'wed', 'station_skills', 'Station Skills', 'After CF: 3 x 50m sled pull (hand-over-hand technique focus — find your grip). Then 3 x 20m burpee broad jumps — work on pacing, not speed. (~10 min)', NULL, 10, ARRAY['sled_pull', 'burpee_broad_jump'], 'foundation', 1),
(1, 4, 'thu', 'tempo_run', 'Tempo Run', '10 min easy -> 12 min @ 7:00/mile -> 10 min easy. Starting to lock in the tempo feel.', '7:00/mile', 32, NULL, 'foundation', 1),
(1, 4, 'sat', 'hyrox_intervals', 'HYROX Intervals', '5 x 1km @ 6:10-6:15/mile. 90 sec station work between: wall balls (20), row 250m, burpees (8).', '6:10-6:15/mile', 45, NULL, 'foundation', 1),

-- ============================================================
-- PHASE 2: BASE BUILDING — Weeks 5-8
-- ============================================================

-- Week 5
(1, 5, 'mon', 'station_skills', 'Station Skills', 'After CF: 2 x 500m SkiErg — time each, target < 2:10/500m. Then 2 x 50m sled push @ race weight — continuous, no stops. (~8 min)', NULL, 8, ARRAY['skierg', 'sled_push'], 'base_building', 2),
(1, 5, 'tue', 'easy_run', 'Easy Run', '35-40 min @ 8:00-8:15/mile. Conversational pace. You may notice this feeling easier already.', '8:00-8:15/mile', 40, NULL, 'base_building', 2),
(1, 5, 'wed', 'station_skills', 'Station Skills', 'After CF: 2 x 50m sled pull @ race weight — time each, work on hand-over-hand speed. Then 40 wall balls for time (sets of 20). Record time. (~10 min)', NULL, 10, ARRAY['sled_pull', 'wall_balls'], 'base_building', 2),
(1, 5, 'thu', 'tempo_run', 'Tempo Run', '10 min easy -> 15 min @ 6:50/mile -> 10 min easy. Tempo block is getting real now.', '6:50/mile', 35, NULL, 'base_building', 2),
(1, 5, 'sat', 'hyrox_intervals', 'HYROX Intervals', '6 x 1km @ 6:10-6:15/mile. 90 sec station work between: add sled push (short distance) and sled pull.', '6:10-6:15/mile', 50, NULL, 'base_building', 2),

-- Week 6
(1, 6, 'mon', 'station_skills', 'Station Skills', 'After CF: 2 x 500m SkiErg — time each, target < 2:10/500m. Then 2 x 50m sled push @ race weight — continuous, no stops. (~8 min)', NULL, 8, ARRAY['skierg', 'sled_push'], 'base_building', 2),
(1, 6, 'tue', 'easy_run', 'Easy Run', '35-40 min @ 8:00-8:15/mile. Conversational pace. You may notice this feeling easier already.', '8:00-8:15/mile', 40, NULL, 'base_building', 2),
(1, 6, 'wed', 'station_skills', 'Station Skills', 'After CF: 2 x 50m sled pull @ race weight — time each, work on hand-over-hand speed. Then 40 wall balls for time (sets of 20). Record time. (~10 min)', NULL, 10, ARRAY['sled_pull', 'wall_balls'], 'base_building', 2),
(1, 6, 'thu', 'tempo_run', 'Tempo Run', '10 min easy -> 15 min @ 6:50/mile -> 10 min easy. Tempo block is getting real now.', '6:50/mile', 35, NULL, 'base_building', 2),
(1, 6, 'sat', 'hyrox_intervals', 'HYROX Intervals', '6 x 1km @ 6:10-6:15/mile. 90 sec station work between: add sled push (short distance) and sled pull.', '6:10-6:15/mile', 50, NULL, 'base_building', 2),

-- Week 7
(1, 7, 'mon', 'station_skills', 'Station Skills', 'After CF: 1,000m row for time — target < 4:10. Then 50m sandbag lunges for time — find your sustainable pace. Record both. (~10 min)', NULL, 10, ARRAY['rowing', 'sandbag_lunges'], 'base_building', 2),
(1, 7, 'tue', 'easy_run', 'Easy Run', '40-45 min @ 8:00-8:15/mile. Still conversational. Building that aerobic base.', '8:00-8:15/mile', 45, NULL, 'base_building', 2),
(1, 7, 'wed', 'station_skills', 'Station Skills', 'After CF: 40m burpee broad jumps for time — practice pacing at 1 rep every 12-14 sec. Then 100m farmers carry for time @ race weight. Record both. (~10 min)', NULL, 10, ARRAY['burpee_broad_jump', 'farmers_carry'], 'base_building', 2),
(1, 7, 'thu', 'tempo_run', 'Tempo Run', '10 min easy -> 18 min @ 6:45-6:50/mile -> 10 min easy. Pushing the tempo duration.', '6:45-6:50/mile', 38, NULL, 'base_building', 2),
(1, 7, 'sat', 'hyrox_intervals', 'HYROX Intervals', '7 x 1km @ 6:05-6:15/mile. 75 sec station work: full rotation (wall balls, row, burpee broad jumps, lunges, farmers carry). Practice transitions.', '6:05-6:15/mile', 55, NULL, 'base_building', 2),

-- Week 8
(1, 8, 'mon', 'station_skills', 'Station Skills', 'After CF: 1,000m row for time — target < 4:10. Then 50m sandbag lunges for time — find your sustainable pace. Record both. (~10 min)', NULL, 10, ARRAY['rowing', 'sandbag_lunges'], 'base_building', 2),
(1, 8, 'tue', 'easy_run', 'Easy Run', '40-45 min @ 8:00-8:15/mile. Still conversational. Building that aerobic base.', '8:00-8:15/mile', 45, NULL, 'base_building', 2),
(1, 8, 'wed', 'station_skills', 'Station Skills', 'After CF: 40m burpee broad jumps for time — practice pacing at 1 rep every 12-14 sec. Then 100m farmers carry for time @ race weight. Record both. (~10 min)', NULL, 10, ARRAY['burpee_broad_jump', 'farmers_carry'], 'base_building', 2),
(1, 8, 'thu', 'tempo_run', 'Tempo Run', '10 min easy -> 18 min @ 6:45-6:50/mile -> 10 min easy. Pushing the tempo duration.', '6:45-6:50/mile', 38, NULL, 'base_building', 2),
(1, 8, 'sat', 'hyrox_intervals', 'HYROX Intervals', '7 x 1km @ 6:05-6:15/mile. 75 sec station work: full rotation (wall balls, row, burpee broad jumps, lunges, farmers carry). Practice transitions.', '6:05-6:15/mile', 55, NULL, 'base_building', 2),

-- ============================================================
-- PHASE 3: AEROBIC DEVELOPMENT — Weeks 9-12
-- ============================================================

-- Week 9
(1, 9, 'mon', 'station_skills', 'Station Skills', 'After CF: 1,000m SkiErg for time (target: < 4:00). Then 50m sled push for time @ race weight. Compare to Phase 2 times. (~10 min)', NULL, 10, ARRAY['skierg', 'sled_push'], 'aerobic_dev', 3),
(1, 9, 'tue', 'easy_run', 'Easy Run', '45-50 min @ 7:45-8:00/mile. This pace should feel sustainable and relaxed.', '7:45-8:00/mile', 50, NULL, 'aerobic_dev', 3),
(1, 9, 'wed', 'station_skills', 'Station Skills', 'After CF: 50m sled pull for time @ race weight (your #1 gap — chase improvement here). Then 50 wall balls for time (sets of 25). Record both. (~10 min)', NULL, 10, ARRAY['sled_pull', 'wall_balls'], 'aerobic_dev', 3),
(1, 9, 'thu', 'tempo_run', 'Tempo Run', '10 min easy -> 20 min @ 6:40/mile -> 10 min easy. You''re now holding pace for 20 min — big milestone.', '6:40/mile', 40, NULL, 'aerobic_dev', 3),
(1, 9, 'sat', 'hyrox_intervals', 'HYROX Intervals', '8 x 1km @ 6:05-6:10/mile. 60 sec station work: full HYROX rotation. Time each station — start benchmarking.', '6:05-6:10/mile', 60, NULL, 'aerobic_dev', 3),

-- Week 10
(1, 10, 'mon', 'station_skills', 'Station Skills', 'After CF: 1,000m SkiErg for time (target: < 4:00). Then 50m sled push for time @ race weight. Compare to Phase 2 times. (~10 min)', NULL, 10, ARRAY['skierg', 'sled_push'], 'aerobic_dev', 3),
(1, 10, 'tue', 'easy_run', 'Easy Run', '45-50 min @ 7:45-8:00/mile. This pace should feel sustainable and relaxed.', '7:45-8:00/mile', 50, NULL, 'aerobic_dev', 3),
(1, 10, 'wed', 'station_skills', 'Station Skills', 'After CF: 50m sled pull for time @ race weight (your #1 gap — chase improvement here). Then 50 wall balls for time (sets of 25). Record both. (~10 min)', NULL, 10, ARRAY['sled_pull', 'wall_balls'], 'aerobic_dev', 3),
(1, 10, 'thu', 'tempo_run', 'Tempo Run', '10 min easy -> 20 min @ 6:40/mile -> 10 min easy. You''re now holding pace for 20 min — big milestone.', '6:40/mile', 40, NULL, 'aerobic_dev', 3),
(1, 10, 'sat', 'hyrox_intervals', 'HYROX Intervals', '8 x 1km @ 6:05-6:10/mile. 60 sec station work: full HYROX rotation. Time each station — start benchmarking.', '6:05-6:10/mile', 60, NULL, 'aerobic_dev', 3),

-- Week 11
(1, 11, 'mon', 'station_skills', 'Station Skills', 'After CF: 1,000m row for time (target: < 4:00). Then 100m sandbag lunges for time — full race distance. Record time. (~10 min)', NULL, 10, ARRAY['rowing', 'sandbag_lunges'], 'aerobic_dev', 3),
(1, 11, 'tue', 'easy_run', 'Easy Run', '50-55 min @ 7:45-8:00/mile. Notice how your "easy" pace keeps getting faster at the same effort.', '7:45-8:00/mile', 55, NULL, 'aerobic_dev', 3),
(1, 11, 'wed', 'station_skills', 'Station Skills', 'After CF: 80m burpee broad jumps for time — full race distance (target: < 3:30). Then 200m farmers carry for time @ race weight. Big benchmark day. (~10 min)', NULL, 10, ARRAY['burpee_broad_jump', 'farmers_carry'], 'aerobic_dev', 3),
(1, 11, 'thu', 'tempo_run', 'Tempo Run', '10 min easy -> 22 min @ 6:30-6:40/mile -> 10 min easy. Getting close to race pace tempo.', '6:30-6:40/mile', 42, NULL, 'aerobic_dev', 3),
(1, 11, 'sat', 'hyrox_simulation', 'HYROX Simulation', '8 x 1km @ 6:00-6:10/mile. Full station work between each run at target times. Practice transitions (15-20 sec).', '6:00-6:10/mile', 65, NULL, 'aerobic_dev', 3),

-- Week 12
(1, 12, 'mon', 'station_skills', 'Station Skills', 'After CF: 1,000m row for time (target: < 4:00). Then 100m sandbag lunges for time — full race distance. Record time. (~10 min)', NULL, 10, ARRAY['rowing', 'sandbag_lunges'], 'aerobic_dev', 3),
(1, 12, 'tue', 'easy_run', 'Easy Run', '50-55 min @ 7:45-8:00/mile. Notice how your "easy" pace keeps getting faster at the same effort.', '7:45-8:00/mile', 55, NULL, 'aerobic_dev', 3),
(1, 12, 'wed', 'station_skills', 'Station Skills', 'After CF: 80m burpee broad jumps for time — full race distance (target: < 3:30). Then 200m farmers carry for time @ race weight. Big benchmark day. (~10 min)', NULL, 10, ARRAY['burpee_broad_jump', 'farmers_carry'], 'aerobic_dev', 3),
(1, 12, 'thu', 'tempo_run', 'Tempo Run', '10 min easy -> 22 min @ 6:30-6:40/mile -> 10 min easy. Getting close to race pace tempo.', '6:30-6:40/mile', 42, NULL, 'aerobic_dev', 3),
(1, 12, 'sat', 'hyrox_simulation', 'HYROX Simulation', '8 x 1km @ 6:00-6:10/mile. Full station work between each run at target times. Practice transitions (15-20 sec).', '6:00-6:10/mile', 65, NULL, 'aerobic_dev', 3),

-- ============================================================
-- PHASE 4: THRESHOLD PUSH — Weeks 13-16
-- ============================================================

-- Week 13
(1, 13, 'mon', 'station_skills', 'Station Skills', 'After CF: 50m sled pull for time — target Scenario A (1:30-2:00). Then 50m sled push for time — target (1:30-2:00). Chase those targets. (~8 min)', NULL, 8, ARRAY['sled_pull', 'sled_push'], 'threshold_push', 4),
(1, 13, 'tue', 'easy_run', 'Easy Run', '50-55 min @ 7:30-7:45/mile. This used to be your 5K pace. Let that sink in.', '7:30-7:45/mile', 55, NULL, 'threshold_push', 4),
(1, 13, 'wed', 'station_skills', 'Station Skills', 'After CF: 100 wall balls for time (sets of 25, target: < 3:30). Then 1,000m SkiErg for time (target: < 3:45). Full race distances, Scenario A times. (~10 min)', NULL, 10, ARRAY['wall_balls', 'skierg'], 'threshold_push', 4),
(1, 13, 'thu', 'tempo_run', 'Tempo Run', '10 min easy -> 25 min @ 6:20-6:30/mile -> 10 min easy. This IS your race pace. Get comfortable here.', '6:20-6:30/mile', 45, NULL, 'threshold_push', 4),
(1, 13, 'sat', 'hyrox_simulation', 'HYROX Simulation', '8 x 1km @ 5:55-6:05/mile. Full station simulations between. Target Scenario A station times. Time everything.', '5:55-6:05/mile', 70, NULL, 'threshold_push', 4),

-- Week 14
(1, 14, 'mon', 'station_skills', 'Station Skills', 'After CF: 50m sled pull for time — target Scenario A (1:30-2:00). Then 50m sled push for time — target (1:30-2:00). Chase those targets. (~8 min)', NULL, 8, ARRAY['sled_pull', 'sled_push'], 'threshold_push', 4),
(1, 14, 'tue', 'easy_run', 'Easy Run', '50-55 min @ 7:30-7:45/mile. This used to be your 5K pace. Let that sink in.', '7:30-7:45/mile', 55, NULL, 'threshold_push', 4),
(1, 14, 'wed', 'station_skills', 'Station Skills', 'After CF: 100 wall balls for time (sets of 25, target: < 3:30). Then 1,000m SkiErg for time (target: < 3:45). Full race distances, Scenario A times. (~10 min)', NULL, 10, ARRAY['wall_balls', 'skierg'], 'threshold_push', 4),
(1, 14, 'thu', 'tempo_run', 'Tempo Run', '10 min easy -> 25 min @ 6:20-6:30/mile -> 10 min easy. This IS your race pace. Get comfortable here.', '6:20-6:30/mile', 45, NULL, 'threshold_push', 4),
(1, 14, 'sat', 'hyrox_simulation', 'HYROX Simulation', '8 x 1km @ 5:55-6:05/mile. Full station simulations between. Target Scenario A station times. Time everything.', '5:55-6:05/mile', 70, NULL, 'threshold_push', 4),

-- Week 15
(1, 15, 'mon', 'station_skills', 'Station Skills', 'After CF: 80m burpee broad jumps for time (target: < 3:00). Then 100m sandbag lunges for time (target: < 3:00). Your two biggest gaps — grind these down. (~10 min)', NULL, 10, ARRAY['burpee_broad_jump', 'sandbag_lunges'], 'threshold_push', 4),
(1, 15, 'tue', 'easy_run', 'Easy Run', '55-60 min @ 7:30-7:45/mile. Peak easy run volume. Monitor how you feel — back off if needed.', '7:30-7:45/mile', 60, NULL, 'threshold_push', 4),
(1, 15, 'wed', 'station_skills', 'Station Skills', 'After CF: 1,000m row for time (target: < 3:45). Then 200m farmers carry for time (target: < 1:45). Grip endurance is key — no putting them down. (~8 min)', NULL, 8, ARRAY['rowing', 'farmers_carry'], 'threshold_push', 4),
(1, 15, 'thu', 'tempo_run', 'Tempo Run', '10 min easy -> 25 min @ 6:20/mile -> 10 min easy. Race pace should feel like 70-75% effort now.', '6:20/mile', 45, NULL, 'threshold_push', 4),
(1, 15, 'sat', 'hyrox_simulation', 'HYROX Simulation', 'Full 8 x 1km @ 6:00-6:10/mile. Full station simulations. Focus on weak stations: sled pull, burpee broad jumps, sandbag lunges.', '6:00-6:10/mile', 70, NULL, 'threshold_push', 4),

-- Week 16
(1, 16, 'mon', 'station_skills', 'Station Skills', 'After CF: 80m burpee broad jumps for time (target: < 3:00). Then 100m sandbag lunges for time (target: < 3:00). Your two biggest gaps — grind these down. (~10 min)', NULL, 10, ARRAY['burpee_broad_jump', 'sandbag_lunges'], 'threshold_push', 4),
(1, 16, 'tue', 'easy_run', 'Easy Run', '55-60 min @ 7:30-7:45/mile. Peak easy run volume. Monitor how you feel — back off if needed.', '7:30-7:45/mile', 60, NULL, 'threshold_push', 4),
(1, 16, 'wed', 'station_skills', 'Station Skills', 'After CF: 1,000m row for time (target: < 3:45). Then 200m farmers carry for time (target: < 1:45). Grip endurance is key — no putting them down. (~8 min)', NULL, 8, ARRAY['rowing', 'farmers_carry'], 'threshold_push', 4),
(1, 16, 'thu', 'tempo_run', 'Tempo Run', '10 min easy -> 25 min @ 6:20/mile -> 10 min easy. Race pace should feel like 70-75% effort now.', '6:20/mile', 45, NULL, 'threshold_push', 4),
(1, 16, 'sat', 'hyrox_simulation', 'HYROX Simulation', 'Full 8 x 1km @ 6:00-6:10/mile. Full station simulations. Focus on weak stations: sled pull, burpee broad jumps, sandbag lunges.', '6:00-6:10/mile', 70, NULL, 'threshold_push', 4),

-- ============================================================
-- PHASE 5: RACE SPECIFICITY — Weeks 17-20
-- ============================================================

-- Week 17
(1, 17, 'mon', 'station_skills', 'Station Skills', 'After CF: Pick your 2 weakest stations. Do each at full race distance for time. Compare to Scenario A targets. Log improvements. (~10 min)', NULL, 10, ARRAY[]::text[], 'race_specificity', 5),
(1, 17, 'tue', 'easy_run', 'Easy Run', '50-55 min @ 7:30-7:45/mile. Maintain volume but don''t increase. Quality over quantity now.', '7:30-7:45/mile', 55, NULL, 'race_specificity', 5),
(1, 17, 'wed', 'station_skills', 'Station Skills', 'After CF: Pick 2 different stations from Monday. Full race distance for time. By now you should have recent benchmarks for all 8 stations. (~10 min)', NULL, 10, ARRAY[]::text[], 'race_specificity', 5),
(1, 17, 'thu', 'race_pace_run', 'Race Pace Run', '10 min easy -> 25 min @ 6:20/mile -> 10 min easy. Should feel like a training run, not a race effort.', '6:20/mile', 45, NULL, 'race_specificity', 5),
(1, 17, 'sat', 'hyrox_simulation', 'HYROX Simulation', '8 x 1km + all 8 stations at race weights/distances. Rehearse transitions. Compare to Scenario A/B.', '6:00-6:10/mile', 75, NULL, 'race_specificity', 5),

-- Week 18
(1, 18, 'mon', 'station_skills', 'Station Skills', 'After CF: Pick your 2 weakest stations. Do each at full race distance for time. Compare to Scenario A targets. Log improvements. (~10 min)', NULL, 10, ARRAY[]::text[], 'race_specificity', 5),
(1, 18, 'tue', 'easy_run', 'Easy Run', '50-55 min @ 7:30-7:45/mile. Maintain volume but don''t increase. Quality over quantity now.', '7:30-7:45/mile', 55, NULL, 'race_specificity', 5),
(1, 18, 'wed', 'station_skills', 'Station Skills', 'After CF: Pick 2 different stations from Monday. Full race distance for time. By now you should have recent benchmarks for all 8 stations. (~10 min)', NULL, 10, ARRAY[]::text[], 'race_specificity', 5),
(1, 18, 'thu', 'race_pace_run', 'Race Pace Run', '10 min easy -> 25 min @ 6:20/mile -> 10 min easy. Should feel like a training run, not a race effort.', '6:20/mile', 45, NULL, 'race_specificity', 5),
(1, 18, 'sat', 'full_hyrox_sim', 'Full HYROX Sim', 'FULL RACE SIMULATION. 8 x 1km + all 8 stations at race weights/distances. Time everything. Compare to Scenario A/B. First dress rehearsal.', '6:00-6:10/mile', 80, NULL, 'race_specificity', 5),

-- Week 19
(1, 19, 'mon', 'station_skills', 'Station Skills', 'After CF: Sled pull + burpee broad jumps at full race distance. These are your make-or-break stations. Final push for improvement before taper. (~10 min)', NULL, 10, ARRAY['sled_pull', 'burpee_broad_jump'], 'race_specificity', 5),
(1, 19, 'tue', 'easy_run', 'Easy Run', '45-50 min @ 7:30-7:45/mile. Slight volume reduction as intensity is high.', '7:30-7:45/mile', 50, NULL, 'race_specificity', 5),
(1, 19, 'wed', 'station_skills', 'Station Skills', 'After CF: Wall balls (100 reps for time) + SkiErg (1,000m for time). Final station benchmarks before taper. Record everything. (~10 min)', NULL, 10, ARRAY['wall_balls', 'skierg'], 'race_specificity', 5),
(1, 19, 'thu', 'race_pace_run', 'Race Pace Run', '10 min easy -> 20 min @ 6:15-6:20/mile -> 10 min easy. Slightly faster than race pace — building a gear above.', '6:15-6:20/mile', 40, NULL, 'race_specificity', 5),
(1, 19, 'sat', 'hyrox_simulation', 'HYROX Simulation', '8 x 1km + all 8 stations. Rehearse race day with focus on transitions and pacing.', '6:00-6:10/mile', 75, NULL, 'race_specificity', 5),

-- Week 20
(1, 20, 'mon', 'station_skills', 'Station Skills', 'After CF: Sled pull + burpee broad jumps at full race distance. These are your make-or-break stations. Final push for improvement before taper. (~10 min)', NULL, 10, ARRAY['sled_pull', 'burpee_broad_jump'], 'race_specificity', 5),
(1, 20, 'tue', 'easy_run', 'Easy Run', '45-50 min @ 7:30-7:45/mile. Slight volume reduction as intensity is high.', '7:30-7:45/mile', 50, NULL, 'race_specificity', 5),
(1, 20, 'wed', 'station_skills', 'Station Skills', 'After CF: Wall balls (100 reps for time) + SkiErg (1,000m for time). Final station benchmarks before taper. Record everything. (~10 min)', NULL, 10, ARRAY['wall_balls', 'skierg'], 'race_specificity', 5),
(1, 20, 'thu', 'race_pace_run', 'Race Pace Run', '10 min easy -> 20 min @ 6:15-6:20/mile -> 10 min easy. Slightly faster than race pace — building a gear above.', '6:15-6:20/mile', 40, NULL, 'race_specificity', 5),
(1, 20, 'sat', 'full_hyrox_sim', 'Full HYROX Sim', 'SECOND FULL SIM. 8 x 1km + all 8 stations. Race day dress rehearsal. Wear race kit, practice nutrition/hydration. Final benchmark.', '6:00-6:10/mile', 80, NULL, 'race_specificity', 5),

-- ============================================================
-- PHASE 6: PEAK & TAPER — Weeks 21-24
-- ============================================================

-- Week 21
(1, 21, 'mon', 'station_skills', 'Station Skills', 'After CF: 500m SkiErg + 25m sled push + 25 wall balls. Half distances, race intensity. Stay sharp, don''t drain. (~5 min)', NULL, 5, ARRAY['skierg', 'sled_push', 'wall_balls'], 'peak_taper', 6),
(1, 21, 'tue', 'easy_run', 'Easy Run', '35-40 min @ 7:45-8:00/mile. Volume is down 30%. Legs start feeling springy.', '7:45-8:00/mile', 40, NULL, 'peak_taper', 6),
(1, 21, 'wed', 'station_skills', 'Station Skills', 'After CF: 25m sled pull + 40m burpee broad jumps + 50m sandbag lunges. Half distances only. Quick and crisp. (~5 min)', NULL, 5, ARRAY['sled_pull', 'burpee_broad_jump', 'sandbag_lunges'], 'peak_taper', 6),
(1, 21, 'thu', 'race_pace_run', 'Race Pace Sharpener', '10 min easy -> 15 min @ 6:20/mile -> 10 min easy. Short and sharp. Remind your body what race pace feels like.', '6:20/mile', 35, NULL, 'peak_taper', 6),
(1, 21, 'sat', 'station_tuneup', 'Station Tune-Up', '4 x 1km @ 6:15-6:20/mile. 4 stations only (your weakest). Short, crisp, confident. No full sims.', '6:15-6:20/mile', 40, NULL, 'peak_taper', 6),

-- Week 22
(1, 22, 'mon', 'station_skills', 'Station Skills', 'After CF: 500m SkiErg + 25m sled push + 25 wall balls. Half distances, race intensity. Stay sharp, don''t drain. (~5 min)', NULL, 5, ARRAY['skierg', 'sled_push', 'wall_balls'], 'peak_taper', 6),
(1, 22, 'tue', 'easy_run', 'Easy Run', '35-40 min @ 7:45-8:00/mile. Volume is down 30%. Legs start feeling springy.', '7:45-8:00/mile', 40, NULL, 'peak_taper', 6),
(1, 22, 'wed', 'station_skills', 'Station Skills', 'After CF: 25m sled pull + 40m burpee broad jumps + 50m sandbag lunges. Half distances only. Quick and crisp. (~5 min)', NULL, 5, ARRAY['sled_pull', 'burpee_broad_jump', 'sandbag_lunges'], 'peak_taper', 6),
(1, 22, 'thu', 'race_pace_run', 'Race Pace Sharpener', '10 min easy -> 15 min @ 6:20/mile -> 10 min easy. Short and sharp. Remind your body what race pace feels like.', '6:20/mile', 35, NULL, 'peak_taper', 6),
(1, 22, 'sat', 'station_tuneup', 'Station Tune-Up', '4 x 1km @ 6:15-6:20/mile. 4 stations only (your weakest). Short, crisp, confident. No full sims.', '6:15-6:20/mile', 40, NULL, 'peak_taper', 6),

-- Week 23
(1, 23, 'mon', 'station_skills', 'Station Skills', 'After CF: 250m SkiErg + 500m row + 15 wall balls. Light, just keep the patterns fresh. This is maintenance, not training. (~5 min)', NULL, 5, ARRAY['skierg', 'rowing', 'wall_balls'], 'peak_taper', 6),
(1, 23, 'tue', 'shakeout_run', 'Shakeout Run', '20-25 min @ 8:00-8:15/mile. Loose and easy. Strides at the end (4 x 15 sec).', '8:00-8:15/mile', 25, NULL, 'peak_taper', 6),
(1, 23, 'wed', 'station_skills', 'Station Skills', 'Last station day before race. 10 wall balls, 10m sled push, 10m sled pull. Just move through the patterns. Visualize race day. (~3 min)', NULL, 3, ARRAY['wall_balls', 'sled_push', 'sled_pull'], 'peak_taper', 6),
(1, 23, 'thu', 'activation', 'Activation', '15 min easy jog. 3 x 200m @ race pace with full recovery. 10-15 wall balls, short row. Just wake the body up.', '6:20/mile', 25, NULL, 'peak_taper', 6),
(1, 23, 'sat', 'station_tuneup', 'Station Tune-Up', '3 x 1km @ 6:20/mile. 2-3 stations at half distance. Easy and confident. Trust the taper.', '6:20/mile', 30, NULL, 'peak_taper', 6),

-- Week 24 (race week)
(1, 24, 'mon', 'station_skills', 'Station Skills', 'After CF: 250m SkiErg + 500m row + 15 wall balls. Light, just keep the patterns fresh. This is maintenance, not training. (~5 min)', NULL, 5, ARRAY['skierg', 'rowing', 'wall_balls'], 'peak_taper', 6),
(1, 24, 'tue', 'shakeout_run', 'Shakeout Run', '20-25 min @ 8:00-8:15/mile. Loose and easy. Strides at the end (4 x 15 sec).', '8:00-8:15/mile', 25, NULL, 'peak_taper', 6),
(1, 24, 'wed', 'station_skills', 'Station Skills', 'Last station day before race. 10 wall balls, 10m sled push, 10m sled pull. Just move through the patterns. Visualize race day. (~3 min)', NULL, 3, ARRAY['wall_balls', 'sled_push', 'sled_pull'], 'peak_taper', 6),
(1, 24, 'thu', 'activation', 'Activation', '15 min easy jog. 3 x 200m @ race pace with full recovery. 10-15 wall balls, short row. Just wake the body up.', '6:20/mile', 25, NULL, 'peak_taper', 6),
(1, 24, 'fri', 'race_day', 'RACE DAY', 'September 18, 2026. Execute the plan. Sub-60 is yours.', NULL, 60, NULL, 'peak_taper', 6)

ON CONFLICT (user_id, week, day_of_week) DO UPDATE SET
  session_type = EXCLUDED.session_type,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  target_pace = EXCLUDED.target_pace,
  target_duration_min = EXCLUDED.target_duration_min,
  target_stations = EXCLUDED.target_stations,
  phase = EXCLUDED.phase,
  phase_number = EXCLUDED.phase_number;
