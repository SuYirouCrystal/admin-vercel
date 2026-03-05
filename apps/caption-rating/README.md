# Caption Creation and Rating App

Simple app for caption entry and caption rating workflows.

## Features

- Reads recent `images` and `captions` rows from Supabase.
- Create a caption row from the UI.
- Submit/update a numeric rating on a caption.

## Environment variables

Create `apps/caption-rating/.env.local` from `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Run locally

```bash
cd apps/caption-rating
npm install
npm run dev
```

Open `http://localhost:3000`.
