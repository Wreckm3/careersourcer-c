import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/paths";
}

/** Completes Supabase's PKCE OAuth callback without exposing provider credentials. */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const providerError = params.get("error_description") ?? params.get("error");
    if (providerError) {
      setError(providerError === "access_denied" ? "Google sign-in was cancelled." : "Google sign-in could not be completed. Please try again.");
      return;
    }
    const code = params.get("code");
    if (!code) {
      setError("The sign-in link is incomplete or has expired. Please try again.");
      return;
    }
    let active = true;
    supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
      if (!active) return;
      if (exchangeError) {
        setError("Google sign-in could not be completed. Please try again.");
        return;
      }
      navigate(safeNext(params.get("next")), { replace: true });
    });
    return () => { active = false; };
  }, [navigate, params]);

  if (error) {
    return <main className="min-h-screen grid place-items-center px-6"><div className="max-w-md space-y-4 text-center"><h1 className="text-2xl font-bold">Sign-in didn’t finish</h1><p className="text-muted-foreground">{error}</p><Link to={`/auth?next=${encodeURIComponent(safeNext(params.get("next")))}`} className="font-semibold text-accent-blue hover:underline">Back to sign in</Link></div></main>;
  }
  return <main className="min-h-screen grid place-items-center"><div className="flex items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Completing secure sign-in…</div></main>;
}
