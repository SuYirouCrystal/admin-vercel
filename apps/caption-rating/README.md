# Caption App: Supabase + Pipeline

This app now supports both:

- Supabase read list page (`/list`) from pre-existing `dorms` table.
- Image upload + caption generation pipeline on `/`.

## Pipeline flow implemented

The home page executes the required sequence:

1. `POST /pipeline/generate-presigned-url`
2. `PUT` image bytes to returned `presignedUrl`
3. `POST /pipeline/upload-image-from-url`
4. `POST /pipeline/generate-captions`

Base URL:

- `https://api.almostcrackd.ai`

## Environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_PIPELINE_API_BASE_URL`

## JWT token

The pipeline form requires a valid JWT access token entered in the UI.
Every API request sends:

```http
Authorization: Bearer <token>
```

## Local run

```bash
cd apps/caption-rating
npm install
npm run dev
```

- Pipeline page: `http://localhost:3000`
- Supabase list page: `http://localhost:3000/list`

## Deploy to Vercel

1. Push latest commit to GitHub.
2. Deploy `apps/caption-rating` on Vercel.
3. Configure all env vars in Vercel project settings.
4. Disable Deployment Protection to test in Incognito.
