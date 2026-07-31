/**
 * Feature flags.
 *
 * Toggle features on/off without touching component code. Keep flags
 * small, boolean, and named after the feature — not the implementation.
 *
 * Rules:
 *  - A flag OFF must fail closed (feature hidden / gated / no-op).
 *  - When a flag graduates to always-on, delete the flag AND the guard.
 *  - Environment overrides can be added via `import.meta.env.VITE_FLAG_*`
 *    when a real need appears; keep the default here as source of truth.
 */

export interface FeatureFlags {
  /** Show pricing page + upgrade CTAs. Infra ships in Phase 1, checkout in Phase 3. */
  subscriptions: boolean;
  /** Show "Install app" button when browser reports the prompt is available. */
  pwaInstallPrompt: boolean;
  /** Atlas AI mentor (Phase 4). Off until AI service + tier gating is live. */
  atlas: boolean;
  /** Eagle focus-mode intro animation (Phase 3). Pure SVG, reduced-motion aware. */
  focusModeEagle: boolean;
  /** Allow users to upload project artifacts for review (Phase 4). */
  projectUploads: boolean;
  /** Admin analytics dashboard (Phase 5). */
  adminAnalytics: boolean;
}

export const features: FeatureFlags = {
  subscriptions: true,
  pwaInstallPrompt: true,
  atlas: false,
  focusModeEagle: false,
  projectUploads: false,
  adminAnalytics: false,
};

export const isEnabled = (flag: keyof FeatureFlags) => features[flag] === true;
