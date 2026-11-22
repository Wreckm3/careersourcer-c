import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // An auth event that arrives after the initial request is newer than the
    // initial request result. Do not let that stale result restore an old
    // account after sign-out or account switching.
    let authEventVersion = 0;

    const applySession = (nextSession: Session | null) => {
      if (!active) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    };

    // Set up the listener before asking for the initial session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      authEventVersion += 1;
      applySession(newSession);
    });

    // Only the first settled source may set the initial state. In particular,
    // a delayed getSession() result must not overwrite a later auth event.
    void supabase.auth.getSession()
      .then(({ data: { session: existing } }) => {
        if (authEventVersion === 0) applySession(existing);
      })
      .catch(() => {
        if (authEventVersion === 0) applySession(null);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ user, session, loading, signOut }),
    [user, session, loading, signOut]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
