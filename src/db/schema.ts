import { pgTable, serial, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';

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

// Type exports for use in application code
export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type NewContactMessage = typeof contactMessages.$inferInsert;
