## Plan

Two changes: a new aurora background animation, and a full auth + cloud-synced progress system.

---

### 1) Gradient Aurora Background

Replace the current floating-orb background with slow, drifting aurora curtains using existing brand colors (blue, purple, emerald).

- Rewrite `src/components/career/AnimatedBackground.tsx`
- 3 large, heavily-blurred conic/linear gradient layers, each on its own slow loop (30–45s) of translate + scale + rotate, with `mix-blend-screen` (dark) / `mix-blend-multiply` (light) for the glow
- 1 subtle horizontal shimmer pass on top
- Opacity ~0.15 light / ~0.22 dark so it never fights content
- Stays site-wide via the existing `fixed inset-0 -z-10` wrapper in `App.tsx`
- Uses framer-motion (already installed) and existing CSS tokens — no new files, no new deps

---

### 2) Authentication + Cloud Sync

Enable Lovable Cloud and add real account signup/login with email + password and Google, plus a `profiles` table and synced progress.

**Backend (Lovable Cloud)**
- Enable Lovable Cloud
- `profiles` table: `id (uuid, FK auth.users)`, `display_name`, `avatar_url`, `created_at` — RLS so users can only read/update their own row
- Trigger `handle_new_user` auto-creates a profile row on signup
- `user_progress` table: `user_id`, `path_id`, `completed_sessions (jsonb)`, `streak`, `last_active`, `updated_at` — RLS scoped to `auth.uid()`
- Google provider note: the user will need to enable Google in Cloud → Users → Providers (I'll show clear instructions and a button)

**Frontend**
- New `/auth` page with two tabs (Sign In / Sign Up): email + password fields, "Continue with Google" button, friendly errors, redirect to `/paths` on success
- New `useAuth` hook: sets up `onAuthStateChange` listener BEFORE `getSession()`, exposes `user`, `session`, `signOut`
- Update `useProgress` to read/write from `user_progress` when logged in, falling back to localStorage when logged out, and migrate localStorage data into the account on first login
- Landing page CTA becomes "Get Started" → `/auth` for logged-out users, "Continue Your Path" for logged-in users
- Profile page shows real display name + email, "Sign out" button, and edit display name
- Add `/auth` route in `App.tsx`

**Out of scope**
- Password reset flow (can add next if wanted)
- Email verification customization (default Cloud emails are used)
- Roles/admin (not needed yet)
