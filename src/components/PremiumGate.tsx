import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import { Tier, PLANS } from "@/lib/tiers";
import { useSubscription } from "@/hooks/useSubscription";

interface PremiumGateProps {
  required: Tier;
  /** Content shown when the user has access. */
  children: ReactNode;
  /** Optional feature name for the upgrade prompt. */
  featureName?: string;
  /** Render nothing instead of the upgrade card when access is missing. */
  silent?: boolean;
}

/**
 * Wrap any UI that requires a paid tier. Admin bypass is automatic
 * because `hasAccess` sees admins as `elite`.
 */
export function PremiumGate({ required, children, featureName, silent }: PremiumGateProps) {
  const { hasAccess, loading } = useSubscription();

  if (loading) {
    return <div className="h-24 animate-pulse rounded-xl bg-muted" aria-hidden="true" />;
  }

  if (hasAccess(required)) return <>{children}</>;
  if (silent) return null;

  const plan = PLANS[required];
  return (
    <div className="surface-card p-6 flex flex-col items-start gap-3">
      <div className="flex items-center gap-2 text-primary">
        <Lock className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          {plan.name} plan
        </span>
      </div>
      <h3 className="text-lg font-bold">
        {featureName ? `${featureName} is a ${plan.name} feature` : `Unlock ${plan.name}`}
      </h3>
      <p className="text-sm text-muted-foreground">{plan.tagline}</p>
      <Link
        to="/pricing"
        className="btn-primary-gold mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm"
      >
        <Sparkles className="w-4 h-4" />
        See plans
      </Link>
    </div>
  );
}
