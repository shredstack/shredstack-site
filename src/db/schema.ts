import { pgTable, serial, varchar, text, boolean, timestamp, integer, real } from 'drizzle-orm/pg-core';

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
// SMART CFD INSIGHTS
// ============================================================

export const smartCfdUsers = pgTable('smart_cfd_users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  displayName: varchar('display_name', { length: 255 }),
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

export const smartCfdWorkouts = pgTable('smart_cfd_workouts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => smartCfdUsers.id).notNull(),

  // Raw from CSV
  rawTitle: text('raw_title'),
  rawDescription: text('raw_description').notNull(),
  rawScore: varchar('raw_score', { length: 500 }).notNull(),
  rawDivision: varchar('raw_division', { length: 50 }),
  rawNotes: text('raw_notes'),
  workoutDate: timestamp('workout_date', { withTimezone: true }).notNull(),

  // AI-enriched fields
  workoutType: varchar('workout_type', { length: 50 }),
  scoreType: varchar('score_type', { length: 50 }),
  category: varchar('category', { length: 100 }),
  similarityCluster: varchar('similarity_cluster', { length: 100 }),
  aiSummary: text('ai_summary'),
  aiAnalysis: text('ai_analysis'), // Full JSON blob from LLM

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const smartCfdMovements = pgTable('smart_cfd_movements', {
  id: serial('id').primaryKey(),
  workoutId: integer('workout_id').references(() => smartCfdWorkouts.id).notNull(),
  userId: integer('user_id').references(() => smartCfdUsers.id).notNull(),

  movementName: varchar('movement_name', { length: 255 }).notNull(),
  prescribedReps: integer('prescribed_reps'),
  prescribedWeight: real('prescribed_weight'),
  prescribedUnit: varchar('prescribed_unit', { length: 20 }),

  estimatedActualWeight: real('estimated_actual_weight'),
  estimatedMaxWeight: real('estimated_max_weight'),
  estimatedRepsCompleted: integer('estimated_reps_completed'),

  isLimitingFactor: boolean('is_limiting_factor').default(false),
  confidence: varchar('confidence', { length: 20 }).default('medium'),
});

// Type exports for use in application code
export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type NewContactMessage = typeof contactMessages.$inferInsert;
export type CfdDashboard = typeof cfdDashboards.$inferSelect;
export type NewCfdDashboard = typeof cfdDashboards.$inferInsert;
export type SmartCfdUser = typeof smartCfdUsers.$inferSelect;
export type SmartCfdWorkout = typeof smartCfdWorkouts.$inferSelect;
export type SmartCfdMovement = typeof smartCfdMovements.$inferSelect;
