import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type AuthOauth = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

function oauthClient(): AuthOauth {
  // Beta namespace on @supabase/supabase-js; typed locally.
  return (supabase.auth as unknown as { oauth: AuthOauth }).oauth;
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.replace("/auth?next=" + encodeURIComponent(next));
        return;
      }
      const { data, error } = await oauthClient().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message ?? "Could not load authorization request.");
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauthClient().approveAuthorization(authorizationId)
      : await oauthClient().denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message ?? "Could not complete request.");
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Authorization error</h1>
          <p className="text-muted-foreground">{error}</p>
          <Link to="/" className="text-accent-blue font-semibold hover:underline">
            Back to CareerSourcer
          </Link>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  const clientName = details.client?.name ?? "an app";
  const redirectUri = details.client?.redirect_uri ?? details.redirect_uri;
  const scopes: string[] = Array.isArray(details.scopes)
    ? details.scopes
    : typeof details.scope === "string"
    ? details.scope.split(" ").filter(Boolean)
    : [];

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight mb-2">
          Connect {clientName} to CareerSourcer
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          This lets {clientName} use CareerSourcer as you — reading your progress and pool profile,
          and updating your pool profile on your behalf.
        </p>

        {redirectUri && (
          <div className="text-xs text-muted-foreground mb-4 break-all">
            Redirect: <code>{redirectUri}</code>
          </div>
        )}

        {scopes.length > 0 && (
          <ul className="text-sm mb-6 space-y-1">
            {scopes.map((s) => (
              <li key={s} className="text-foreground">
                • {s}
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-muted-foreground mb-6">
          This does not bypass CareerSourcer's row-level security — {clientName} only sees what you
          can see.
        </p>

        <div className="flex gap-3">
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 px-4 py-3 rounded-xl border border-border text-foreground font-semibold disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent-blue text-primary-foreground font-semibold disabled:opacity-60"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Approve
          </button>
        </div>
      </div>
    </main>
  );
}
