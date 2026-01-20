# ShredStack Site

## Database Migrations

This project uses [Drizzle ORM](https://orm.drizzle.team/) with Neon PostgreSQL for database management.

### How It Works

- **`src/db/schema.ts`** — The source of truth. Define all tables here using Drizzle's TypeScript API. This file is used by your application code (queries, inserts) and by Drizzle Kit to generate migrations.

- **`drizzle/`** — Generated SQL migration files. When you run `db:generate`, Drizzle reads your schema and creates SQL files here. These get applied to your database and should be committed to git.

You only edit `src/db/schema.ts`. The `drizzle/` folder is generated output.

### Available Commands

```bash
npm run db:generate   # Generate migration files from schema changes
npm run db:migrate    # Run pending migrations against the database
npm run db:push       # Push schema directly (dev only, skips migration files)
npm run db:studio     # Open Drizzle Studio GUI to browse/edit data
```

### Development Workflow

1. **Make schema changes** in `src/db/schema.ts`

2. **Generate a migration**:
   ```bash
   npm run db:generate -- --name describe-your-change
   ```
   This creates a new SQL file in `drizzle/` folder.

3. **Review the generated SQL** in `drizzle/XXXX_describe-your-change.sql`

4. **Apply the migration**:
   ```bash
   npm run db:migrate
   ```

**Quick iteration (dev only)**: Use `npm run db:push` to push schema changes directly without generating migration files. Useful for rapid prototyping, but doesn't create a migration history.

### Production Workflow

1. **Never use `db:push` in production** - always use migrations

2. **Generate migration locally**:
   ```bash
   npm run db:generate -- --name add-user-preferences
   ```

3. **Commit the migration file** to git along with your schema changes

4. **Migrations run automatically on Vercel deploy** via the `vercel-build` script:
   ```bash
   drizzle-kit migrate && next build
   ```

   Make sure `NEON_DATABASE_URL` is set in Vercel environment variables.

### Viewing Data

Run Drizzle Studio to browse your database:
```bash
npm run db:studio
```
Opens a web UI at `https://local.drizzle.studio`

### Migration Files

All migrations live in the `drizzle/` directory:
- `0000_init.sql` - Initial schema (blog_posts, contact_messages)
- `meta/` - Drizzle metadata (don't edit manually)

### Tips

- Always review generated SQL before running migrations
- Back up production data before running destructive migrations
- Test migrations on a staging database first when possible
