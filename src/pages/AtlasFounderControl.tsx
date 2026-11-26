import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatMicroKes, parseFounderSnapshot, type FounderSnapshot } from "@/lib/atlas/founderControls";

export default function AtlasFounderControl() {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-6 text-sm">Checking your session…</p>;
  if (!user) return <Link to="/auth" className="p-6 underline">Sign in</Link>;
  return <FounderConsole key={user.id} />;
}

function FounderConsole() {
  const [snapshot, setSnapshot] = useState<FounderSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pausing, setPausing] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setSnapshot(null);
    setError(null);
    void (async () => {
      try {
        const result = await supabase.rpc("atlas_founder_control_snapshot");
        if (result.error) throw result.error;
        const parsed = parseFounderSnapshot(result.data);
        if (active) setSnapshot(parsed);
      } catch {
        if (active) setError("Operator access is unavailable or the snapshot could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [revision]);

  const pause = async () => {
    if (!snapshot || snapshot.emergency_shutdown || pausing || loading || confirmation !== "PAUSE") return;
    setPausing(true);
    setError(null);
    try {
      const result = await supabase.rpc("atlas_founder_pause_generation");
      if (result.error || result.data !== true) throw new Error("Pause could not be confirmed");
      setSnapshot(null);
      setConfirmation("");
      setRevision((value) => value + 1);
    } catch {
      setSnapshot(null);
      setError("Pause was not confirmed. Refresh to verify the server state.");
    } finally {
      setPausing(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-4xl space-y-5 px-4 py-8 text-foreground sm:px-6">
      <Link to="/atlas" className="text-sm text-muted-foreground underline">Back to Atlas</Link>
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Atlas Founder Control Centre</h1>
        <p className="text-sm text-muted-foreground">Operational estimates and emergency controls. Separate server-verified operator permission is required.</p>
      </header>
      <Button variant="outline" disabled={loading || pausing} onClick={() => { setConfirmation(""); setRevision((value) => value + 1); }}>Refresh snapshot</Button>
      {loading && <p role="status" className="text-sm">Loading the authorized snapshot…</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!loading && snapshot && (
        <>
          <section className="space-y-2 rounded-xl border border-border p-4">
            <h2 className="font-semibold">Generation reservation status</h2>
            <p className="text-sm font-medium">{snapshot.emergency_shutdown ? "Paused by financial controls" : "Emergency pause is not set"}</p>
            <p className="text-xs text-muted-foreground">This is not a provider availability or billing check. In-flight requests may still finish after a pause.</p>
            {snapshot.last_pause_at && <p className="text-xs text-muted-foreground">Last recorded pause: {new Date(snapshot.last_pause_at).toLocaleString()}</p>}
          </section>
          <section className="grid gap-3 sm:grid-cols-2" aria-label="Atlas operational estimates">
            {([
              ["Today: accounted budget", snapshot.daily_accounted_micro_kes],
              ["Global daily reservation limit", snapshot.global_daily_budget_micro_kes],
              ["Individual daily reservation limit", snapshot.individual_daily_budget_micro_kes],
              ["Month: accounted budget", snapshot.monthly_accounted_micro_kes],
              ["Month: token-priced usage (not invoiced)", snapshot.monthly_priced_micro_kes],
              ["Month: legacy estimates", snapshot.monthly_legacy_estimate_micro_kes],
              ["Outstanding held or uncertain (all ages)", snapshot.outstanding_micro_kes],
            ] as const).map(([label, amount]) => (
              <div key={label} className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 break-words text-xl font-semibold">{formatMicroKes(amount)}</p>
              </div>
            ))}
          </section>
          <section className="space-y-2 rounded-xl border border-border p-4 text-sm">
            <h2 className="font-semibold">Requests and reconciliation</h2>
            <p>Requests this month: {snapshot.monthly_requests}</p>
            <p>Failed this month: {snapshot.monthly_failed_count}</p>
            <p>Settled credits this month: {snapshot.monthly_settled_credits}</p>
            <p>Unresolved reserved requests: {snapshot.reserved_count}</p>
            <p>Uncertain requests: {snapshot.uncertain_count}</p>
            <p>Reservation overruns this month: {snapshot.monthly_overrun_count}</p>
            <p className="text-xs text-muted-foreground">Snapshot: {new Date(snapshot.captured_at).toLocaleString()} · Accounting boundary: {snapshot.timezone}. Token-priced amounts use reported usage and the rate snapshot saved before dispatch. Legacy estimates and held reservations are separate. No amount is invoice-reconciled or represents profit. Outstanding amounts may overlap with monthly amounts. Monthly reporting is not a monthly cap.</p>
          </section>
          {!snapshot.emergency_shutdown && (
            <section className="space-y-3 rounded-xl border border-destructive/50 p-4">
              <h2 className="font-semibold">Emergency pause</h2>
              <p className="text-sm text-muted-foreground">Stop new Atlas reservations. Existing saved learning and already reserved requests are unaffected. Restoring generation requires a trusted database administrator after reviewing the financial configuration.</p>
              <label className="block text-sm">Type PAUSE to confirm
                <input className="mt-1 block w-full max-w-xs rounded-md border border-border bg-background p-2" autoComplete="off" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
              </label>
              <Button variant="destructive" disabled={confirmation !== "PAUSE" || pausing} onClick={() => void pause()}>{pausing ? "Requesting pause…" : "Pause new Atlas reservations"}</Button>
            </section>
          )}
        </>
      )}
    </main>
  );
}
