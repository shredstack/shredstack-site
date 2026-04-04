import { pgTable, serial, varchar, text, boolean, timestamp, integer, real, uniqueIndex, doublePrecision, jsonb } from 'drizzle-orm/pg-core';

export const blogPosts = pgTable('blog_posts', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  excerpt: text('excerpt').notNull(),
  content: text('content').notNull(),
  published: boolean('published').default(false),
  tags: text('tags').array().default([]),
  color: varchar('color', { length: 50 }).default('rainbow-cyan'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const contactMessages = pgTable('contact_messages', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  read: boolean('read').default(false),
});

export const cfdDashboards = pgTable('cfd_dashboards', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  data: text('data').notNull(), // JSON string of processed dashboard data
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ============================================================
// CROSSFIT SMART INSIGHTS (v2)
// ============================================================

export const crossfitUsers = pgTable('crossfit_users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  displayName: varchar('display_name', { length: 255 }),
  gender: varchar('gender', { length: 10 }),
  // 'female' | 'male' | null
  lastUploadAt: timestamp('last_upload_at', { withTimezone: true }),
  analysisStatus: varchar('analysis_status', { length: 50 }).default('none'),
  // 'none' | 'pending' | 'analyzing' | 'complete' | 'error'
  analysisProgress: integer('analysis_progress').default(0), // 0-100
  isPublic: boolean('is_public').default(false),
  publicSlug: varchar('public_slug', { length: 50 }).unique(),
  cachedInsights: text('cached_insights'),
  insightsGeneratedAt: timestamp('insights_generated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const crossfitWorkoutCategories = pgTable('crossfit_workout_categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  // e.g., "Heavy Barbell Strength", "Sprint Metcon", "Monthly Challenge"
  parentType: varchar('parent_type', { length: 50 }).notNull(),
  // 'strength' | 'conditioning' | 'skill_gymnastics' | 'other' | 'challenge'
  description: text('description'),
  isMonthlyChallenge: boolean('is_monthly_challenge').default(false),
  isDefault: boolean('is_default').default(false),
  // true for system-seeded categories; false for AI-proposed ones
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const crossfitWorkouts = pgTable('crossfit_workouts', {
  id: serial('id').primaryKey(),

  // Identity — primary dedup/merge key
  descriptionHash: varchar('description_hash', { length: 64 }).notNull(),
  // SHA-256 of normalized description text

  // Raw from CSV (kept for reference)
  rawTitle: text('raw_title'),
  rawDescription: text('raw_description').notNull(),

  // AI-enriched fields
  canonicalTitle: varchar('canonical_title', { length: 255 }),
  titleSource: varchar('title_source', { length: 20 }).default('raw'),
  // 'raw' | 'ai_generated' | 'ai_corrected'

  workoutType: varchar('workout_type', { length: 50 }),
  // 'for_time' | 'amrap' | 'for_load' | 'emom' | 'for_reps' | 'tabata' | 'accessory' | 'other'

  categoryId: integer('category_id').references(() => crossfitWorkoutCategories.id),

  similarityCluster: varchar('similarity_cluster', { length: 100 }),
  aiSummary: text('ai_summary'),

  isMonthlyChallenge: boolean('is_monthly_challenge').default(false),
  // Denormalized flag for quick filtering

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const crossfitMovements = pgTable('crossfit_movements', {
  id: serial('id').primaryKey(),
  canonicalName: varchar('canonical_name', { length: 255 }).unique().notNull(),
  // e.g., "Push Press", "Back Squat", "Pull-Up"
  aliases: text('aliases'),
  // JSON array of known aliases
  movementType: varchar('movement_type', { length: 50 }),
  // 'barbell' | 'dumbbell' | 'kettlebell' | 'gymnastics' | 'bodyweight'
  // | 'monostructural' | 'accessory' | 'other'
  isWeighted: boolean('is_weighted').default(false),
  is1rmApplicable: boolean('is_1rm_applicable').default(true),
  // false for movements where a 1RM is meaningless (carries, runs, wall balls, etc.)
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const crossfitWorkoutMovements = pgTable('crossfit_workout_movements', {
  id: serial('id').primaryKey(),
  workoutId: integer('workout_id').references(() => crossfitWorkouts.id).notNull(),
  movementId: integer('movement_id').references(() => crossfitMovements.id).notNull(),
  prescribedReps: integer('prescribed_reps'),
  prescribedSets: integer('prescribed_sets'),
  prescribedWeight: real('prescribed_weight'), // Rx weight in lbs
  prescribedUnit: varchar('prescribed_unit', { length: 20 }),
  orderInWorkout: integer('order_in_workout'),
});

export const crossfitUserScores = pgTable('crossfit_user_scores', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => crossfitUsers.id).notNull(),
  workoutId: integer('workout_id').references(() => crossfitWorkouts.id).notNull(),
  workoutDate: timestamp('workout_date', { withTimezone: true }).notNull(),

  // Raw from CSV
  rawScore: varchar('raw_score', { length: 500 }).notNull(),
  rawDivision: varchar('raw_division', { length: 50 }),
  rawNotes: text('raw_notes'),

  // AI-enriched
  scoreType: varchar('score_type', { length: 50 }),
  // 'time' | 'rounds_reps' | 'reps' | 'max_weight' | 'sum_of_weights'
  // | 'combined_total' | 'reps_at_fixed_weight' | 'distance' | 'calories'
  // | 'complete' | 'unknown'

  aiScoreInterpretation: text('ai_score_interpretation'),
  // JSON: { total_reps, total_weight, estimated_sets, estimated_max_weight,
  //         confidence, reasoning, score_validated }

  aiAnalysis: text('ai_analysis'),
  // Full JSON blob from LLM for this specific score

  // Deterministic score parser output (Tier 1)
  parsedScoreFormat: varchar('parsed_score_format', { length: 30 }),
  // 'time' | 'rounds_reps' | 'reps_at_weight' | 'plain_number' | 'complete' | 'empty' | 'other'

  parsedScoreData: jsonb('parsed_score_data'),
  // { timeSeconds, rounds, remainderReps, reps, weight, plainNumber,
  //   interpretation: { type, estimatedMaxWeight, e1RM, amrapDecomposition } }

  scoreProcessingTier: varchar('score_processing_tier', { length: 20 }),
  // 'deterministic' | 'haiku' | 'sonnet'

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('crossfit_user_scores_user_workout_date_idx')
    .on(table.userId, table.workoutId, table.workoutDate),
]);

export const crossfitUserMovementPerformance = pgTable('crossfit_user_movement_performance', {
  id: serial('id').primaryKey(),
  userScoreId: integer('user_score_id').references(() => crossfitUserScores.id).notNull(),
  movementId: integer('movement_id').references(() => crossfitMovements.id).notNull(),

  estimatedActualWeight: real('estimated_actual_weight'),
  estimatedMaxWeight: real('estimated_max_weight'),
  estimatedRepsCompleted: integer('estimated_reps_completed'),

  isLimitingFactor: boolean('is_limiting_factor').default(false),
  limitingFactorScore: doublePrecision('limiting_factor_score'),
  // Numeric score combining recency-weighted Rx rate, co-occurrence discount, and frequency

  inferredScalingDetail: text('inferred_scaling_detail'),
  // AI inference of what the user likely did instead of Rx

  confidence: varchar('confidence', { length: 20 }).default('medium'),
  // 'high' | 'medium' | 'low'

  extractionMethod: varchar('extraction_method', { length: 20 }),
  // 'deterministic' | 'llm' | 'audit_corrected'

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Type exports for use in application code
export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type NewContactMessage = typeof contactMessages.$inferInsert;
export type CfdDashboard = typeof cfdDashboards.$inferSelect;
export type NewCfdDashboard = typeof cfdDashboards.$inferInsert;
export type CrossfitUser = typeof crossfitUsers.$inferSelect;
export type CrossfitWorkoutCategory = typeof crossfitWorkoutCategories.$inferSelect;
export type CrossfitWorkout = typeof crossfitWorkouts.$inferSelect;
export type CrossfitMovement = typeof crossfitMovements.$inferSelect;
export type CrossfitWorkoutMovement = typeof crossfitWorkoutMovements.$inferSelect;
export type CrossfitUserScore = typeof crossfitUserScores.$inferSelect;
export type CrossfitUserMovementPerformance = typeof crossfitUserMovementPerformance.$inferSelect;
