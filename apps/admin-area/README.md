# Admin Area App

Superadmin-only control center for the Supabase-backed dataset.

## Implemented requirements

- Dashboard with creative operational stats (`/admin`):
  - profile/superadmin counts
  - image/caption totals
  - caption coverage meter
  - busiest upload day
  - top uploaders and top caption writers
- Users/profiles: `READ` only (`/admin/profiles`)
- Images: `CREATE/READ/UPDATE/DELETE` (`/admin/images`)
- Captions: `READ` only (`/admin/captions`)
- Every admin route is behind a Google login wall.
- Only users with `profiles.is_superadmin = true` can access admin pages/actions.

## Security model

1. `proxy.ts` protects `/admin/*` and redirects unauthenticated users to `/login`.
2. `requireSuperadmin()` is enforced in admin layout and server actions.
3. Server actions use `SUPABASE_SERVICE_ROLE_KEY` only after superadmin verification.
4. Login uses Supabase Google OAuth, then `/auth/callback` exchanges the auth code for a server session.

No RLS policies are changed by this app.

## Environment variables

Create `apps/admin-area/.env.local` from `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## One-time superadmin bootstrap (lockout answer)

Question: if admin access requires `profiles.is_superadmin = true`, how do you avoid locking yourself out?

Answer: use tools that bypass client RLS checks for one-time bootstrap, without altering policies.

Recommended path (Supabase SQL editor):

```sql
-- If your profile row exists:
update profiles
set is_superadmin = true
where id = '<your-auth-user-id>';

-- If your profile row does not exist yet, insert one first:
insert into profiles (id, is_superadmin)
values ('<your-auth-user-id>', true)
on conflict (id) do update set is_superadmin = excluded.is_superadmin;
```

This updates data only. It does not enable/disable/update any RLS policy.

## Run locally

```bash
cd apps/admin-area
npm install
npm run dev
```

Open `http://localhost:3000/login`.
