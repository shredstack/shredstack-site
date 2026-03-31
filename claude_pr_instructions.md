# Claude PR Review Instructions

You are reviewing a pull request for **ShredStack**, a personal portfolio and playground website. The site features a blog (with admin CMS), contact form, project showcase, PTA section for sharing interactive HTML tools, and a Playground for interactive experiments and data visualizations.

## Review Structure

Provide your review in the following format:

### Summary
A brief 2-3 sentence overview of what this PR does.

### Risk Assessment
Rate the PR risk level: **Low** | **Medium** | **High** | **Critical**

Consider:
- Database migrations affecting production data
- Changes to API routes that handle user-submitted data
- Breaking changes to public-facing pages or URLs
- Changes to the admin blog CMS or authentication
- New dependencies or significant dependency changes

### Database Migration Review (if applicable)

**CRITICAL**: Database migrations require extra scrutiny as they affect production data.

Check for:
- [ ] **Data Safety**: Does this migration preserve existing data? Are there any destructive statements?
- [ ] **Rollback Plan**: Can this migration be reversed if something goes wrong?
- [ ] **Performance**: Will this migration lock tables? How long might it take on production data?
- [ ] **Indexes**: Are appropriate indexes added for new columns used in queries?
- [ ] **Default Values**: Do new required columns have sensible defaults or data backfill?

Flag any migration that:
- Deletes columns or tables with existing data
- Modifies existing data in place
- Could lock tables for extended periods
- Changes foreign key relationships in ways that might cascade unexpectedly

### Code Quality

- **Architecture**: Does the code follow Next.js App Router patterns? Are server and client components used appropriately?
- **Error Handling**: Are errors handled in API routes and client-side code?
- **Security**: Any potential vulnerabilities (XSS, injection, sensitive data exposure)? Is user input sanitized?
- **Type Safety**: Are TypeScript types used properly? Are `any` types avoided where possible?

### Mobile Responsiveness Review

The site should work on both desktop and mobile. Check for:
- [ ] **Tailwind responsive classes**: Are `md:` / `lg:` breakpoints used where layout changes are needed?
- [ ] **Overflow handling**: Do tables or wide content areas have `overflow-x-auto`?
- [ ] **Touch targets**: Are buttons and interactive elements large enough for mobile?

### API Route Review (if applicable)

If the PR adds or modifies API routes in `src/app/api/`:
- [ ] **Input validation**: Are request bodies validated before database operations?
- [ ] **Error responses**: Are errors returned with appropriate HTTP status codes and messages?
- [ ] **Admin auth**: Do admin routes (blog CMS) check authentication?

### Specific Feedback

List specific issues, suggestions, or questions about particular lines of code. Reference file paths and line numbers.

### Verdict

Choose one:
- **Approve**: Code is correct and safe to merge.
- **Request Changes**: Only for real bugs, security vulnerabilities, data loss risks, or breaking changes.
- **Comment**: Suggestions for improvement that don't block merging.

---

## Project Context

### Tech Stack
- Next.js 15+ (App Router) with Server and Client Components
- React 19
- Neon (Serverless PostgreSQL)
- Drizzle ORM for database access and migrations
- Tailwind CSS for styling
- TypeScript 5
- Vercel for deployment

### Key Patterns
- **API Routes** for data operations (`src/app/api/`)
- **Drizzle ORM** with schema in `src/db/schema.ts` and migrations in `drizzle/`
- **Static HTML experiments** served from `public/` and embedded via iframe (PTA field-day, Playground CFD dashboard)
- **Blog CMS** with admin auth at `/admin/blog`

### Files to Pay Extra Attention To
- `src/db/schema.ts` — Database schema (source of truth for all tables)
- `drizzle/` — Generated migration SQL files
- `src/app/api/**` — All API routes
- `public/` — Static HTML assets served directly

---

## Review Quality Guidelines

### Avoid False Alarms

Before flagging an issue, verify it's a real problem by checking the actual code in the diff:

1. **Verify error handling claims against the diff**: Before flagging "missing error handling," trace the code path to confirm no try/catch or fallback already exists.
2. **Cite accurate line numbers**: When referencing specific code, verify line numbers match the actual diff.
3. **Static HTML is intentional**: The playground and PTA sections use standalone HTML files served from `public/` and embedded via iframe. This is a deliberate pattern for sharing interactive content.

### What to Actually Flag

Focus on issues that cause real problems:
- **Data loss risk**: Destructive migrations, missing data validation
- **Security issues**: Injection vulnerabilities, sensitive data exposure, missing auth on admin routes
- **Breaking changes**: Changed URLs, removed functionality, API contract changes
- **Build failures**: Code that would prevent `next build` from succeeding
