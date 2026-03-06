# Assignment #2: Supabase List Page

This app extends Assignment #1 by reading data from Supabase and rendering it on a list page.

## What it does

- Uses environment variables for Supabase credentials (no hardcoded credentials in app code).
- Reads from a pre-existing table: `dorms`.
- Renders rows on `/list` in a table format.

## Environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

The file includes:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Local run

```bash
cd apps/caption-rating
npm install
npm run dev
```

- Home: `http://localhost:3000`
- List page: `http://localhost:3000/list`

## Deployment (Vercel)

1. Push latest commit to GitHub.
2. Deploy this app root (`apps/caption-rating`) on Vercel.
3. Add both environment variables in Vercel project settings.
4. Disable Deployment Protection in Vercel so Incognito access works.
