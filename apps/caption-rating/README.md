# Caption App: Supabase + Pipeline + Ranking UX

This app now supports both:

- Supabase read list page (`/list`) from pre-existing `dorms` table.
- Image upload + caption generation pipeline on `/`.
- Caption creation and caption voting with Google-authenticated writes on `/`.
- A single-page ranking workflow on `/` where users can pick recent captions directly instead of
  manually typing caption IDs.

## Feedback-driven improvements

Recent user testing highlighted four recurring issues:

1. users were not sure what to do first
2. the token requirement felt too technical
3. the status feedback during pipeline execution was weak
4. ranking captions by copying IDs was slow and confusing

The current homepage addresses those points by:

- adding a visible quick-start walkthrough before the pipeline form
- keeping the token/file prerequisites visible near the form inputs
- showing a clearer runtime status tracker during the 4-step pipeline
- surfacing caption creation and rating on the same page
- letting users select a recent caption for rating directly from the list
- making raw JSON a secondary, advanced detail instead of the main result

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

## Caption writes

- Creating a caption now writes to `captions` with the signed-in profile ID in the audit fields.
- Rating now writes to `caption_votes` instead of a stale `captions.rating` column.
- Sign in with Google in the UI before creating captions or submitting votes.

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
