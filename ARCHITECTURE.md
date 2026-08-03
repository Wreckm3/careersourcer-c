# CareerSourcer — Architecture

Phase 1 is complete: premium UI shell, PWA install, subscription
infrastructure, admin role, feature flags, cleaned dead code, tighter
RLS. Later phases plug into the extension points documented here.

---

## Directory map

```
src/
  config/features.ts        # Feature-flag registry (single source of truth)
  lib/tiers.ts              # Subscription plans + tier comparison helpers
  hooks/useAuth.tsx         # Session + user state (onAuthStateChange first)
  hooks/useSubscription.tsx # Effective tier + admin bypass
  hooks/useProgress.tsx     # Local-first progress with cloud sync
  components/PremiumGate.tsx    # Gate any UI by required tier
  components/InstallPWA.tsx     # Guarded PWA install button
  pages/Pricing.tsx             # Public plan comparison
  data/curriculum.ts            # Learning content (rewritten in Phase 2)
```

## Provider tree

```
<AuthProvider>              // session + user
  <SubscriptionProvider>    // reads roles + subscriptions; admin -> visionary
    <ProgressProvider>      // local -> cloud sync, hydration-guarded writes
      <BrowserRouter>       // routes are Suspense-lazy except Landing/Auth
```

## Database (Lovable Cloud)

- `profiles(id, display_name, avatar_url)` — one per user, auto-created.
- `user_roles(user_id, role app_role)` — separate roles table to avoid
  privilege escalation. `has_role(uid, role)` is security-definer.
- `subscriptions(user_id, tier, status, provider, current_period_end, …)` —
  one row per user, auto-created at `free` on signup. Only admins/service
  role can write; users can read their own.
- `project_uploads(...)` — Phase 4 scaffold for Atlas project reviews.
- `pool_profiles`, `user_progress` — existing, now authenticated-scoped.
- Storage bucket `project-uploads` (private) — Phase 4 scaffold.

Access helpers:

- `has_role(uid, 'admin')` — RLS-safe admin check.
- `get_user_tier(uid) -> subscription_tier` — server-side gating; admins
  always resolve to `visionary`.

## Feature flags

`src/config/features.ts` is the single toggle surface. When a feature
graduates to always-on, **delete the flag and its guard** — do not
leave dead branches.

Current flags:
- `subscriptions` ON — pricing page + upgrade UI.
- `pwaInstallPrompt` ON — install button.
- `atlas` OFF — reserved for Phase 4.
- `focusModeEagle` OFF — reserved for Phase 2.
- `projectUploads` OFF — reserved for Phase 4.
- `adminAnalytics` OFF — reserved for Phase 5.

## Premium gating

```tsx
import { PremiumGate } from "@/components/PremiumGate";

<PremiumGate required="creator" featureName="Project reviews">
  <ProjectReviewPanel />
</PremiumGate>
```

Admins bypass automatically. `useSubscription().hasAccess(tier)` is the
programmatic equivalent for logic branches.

Server-side gating uses `get_user_tier(auth.uid())` from RLS or edge
functions — never trust a client-provided tier.

## PWA

Manifest-only installability (per Lovable PWA skill default). No service
worker, no fake offline. If offline app-shell is later needed, add it via
`vite-plugin-pwa` behind a preview/dev guard — do not hand-write a SW.

Icon: `public/icon-{192,512}.png`, apple touch: `public/apple-touch-icon.png`.

## SEO

- `index.html` carries sitewide `<title>`, description, canonical, og:*,
  twitter:*, and Organization JSON-LD.
- Per-route metadata will move to `react-helmet-async` when route-specific
  social previews become worth the client-only tradeoff.
- Sitemap is regenerated on `predev` and `prebuild` from
  `scripts/generate-sitemap.ts` (routes + every category + every branch).

## Enable Payments (Phase 3)

Payments intentionally do NOT connect in Phase 1. To turn them on:

1. Call `enable_stripe_payments` (Lovable's built-in Stripe integration).
2. Add products in Stripe matching the 4 tiers in `src/lib/tiers.ts`.
3. Add a `create-checkout-session` edge function that writes the returned
   `subscription_id` back to `public.subscriptions` (server-side, using the
   service role). The `subscriptions` table already has `provider`,
   `provider_customer_id`, `provider_subscription_id`, and
   `current_period_end` columns waiting for this.
4. Add a Stripe webhook edge function that flips `status` on payment
   success/failure/cancellation. No client changes needed — `useSubscription`
   already reads live from the row.
5. For M-Pesa: add a Daraja STK-push edge function that writes the same
   row on payment confirmation callback. Same shape, `provider = 'mpesa'`.

No client changes should be required to unlock premium features once
`subscriptions.tier` is set correctly.

## Making yourself admin

Run in the SQL editor:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<your-auth-uid>', 'admin')
ON CONFLICT DO NOTHING;
```

Refresh — `useSubscription` will pick it up and `tier` becomes
`visionary` app-wide.

## Extension points reserved for later phases

- **Atlas mentor core**: `src/lib/atlas/` now separates UI, conversation
  orchestration, memory, progress projection, project planning, mocked
  recommendations, personality, subscription capabilities, and transport.
  The chat component remains a thin renderer around the controller.
- **Atlas persistence**: `public.atlas_memories` stores authenticated user
  memory with RLS. Builder has extension points for project memory, roadmap
  persistence, and milestone tracking. Creator and Founder behavior should be
  added through `subscriptionCapabilities.ts`, not direct UI conditionals.
- **Atlas AI upgrades**: `supabase/functions/atlas/` still owns server-side
  auth, tier gating, and the AI Gateway call. It now accepts `atlasContext`
  from the controller so future AI providers can consume the same contract.
- **Focus Mode Eagle (Phase 2)**: `FocusMode.tsx` already renders in
  discrete steps. Add an `IntroAnimation` component gated behind
  `features.focusModeEagle`.
- **Project uploads (Phase 4)**: `project_uploads` + `project-uploads`
  bucket are ready. Gate with `PremiumGate required="creator"` and use
  a signed-URL flow from an edge function.
