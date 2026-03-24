# Prompt Chain Tool

Protected humor-flavor editor for creating, ordering, and testing prompt chains.

## Environment variables

Create `apps/prompt-chain-tool/.env.local` from `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_PIPELINE_API_BASE_URL=https://api.almostcrackd.ai
```

## Access control

- Google login is required.
- The signed-in profile must have `is_superadmin = true` or `is_matrix_admin = true`.

## Local run

```bash
cd apps/prompt-chain-tool
npm install
npm run dev
```
