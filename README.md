# shredstack-site
ShredStack Sarah's Personal Site

## Setup

Install dependencies:
```bash
npm install
```

Run website locally:
```bash
npm run dev
```

## Neon (postgres database)

Use Vercel's integration with Neon to connect a new postgres database to your shredstack-site Vercel project. The instructions are really good. Once you've pulled your environment variables from Vercel, you should be able to start your local Neon db and apply migrations.

Run Neon locally:
```bash
npm run db:studio
```

Apply migrations:
```bash
npm run db:migrate
```


