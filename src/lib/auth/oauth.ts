import { supabase } from "@/integrations/supabase/client";

export function authOrigin() {
  if (window.location.hostname === "careersourcer.co.ke") return "https://www.careersourcer.co.ke";
  return window.location.origin;
}

export function safeAuthNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/paths";
}

export async function linkGoogleIdentity(returnTo = "/profile") {
  return supabase.auth.linkIdentity({
    provider: "google",
    options: { redirectTo: `${authOrigin()}/auth/callback?next=${encodeURIComponent(safeAuthNext(returnTo))}` },
  });
}
