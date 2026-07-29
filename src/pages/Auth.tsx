import { useState, useEffect, useRef } from "react";
import type { InputHTMLAttributes } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const signUpSchema = z.object({
  displayName: z.string().trim().min(1, "Name is required").max(60),
  email: z.string().trim().email("Please enter a valid email").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
});

const signInSchema = z.object({
  email: z.string().trim().email("Please enter a valid email").max(255),
  password: z.string().min(1, "Password is required").max(72),
});

type Mode = "signin" | "signup" | "forgot";
type TypingField = "name" | "email" | "password" | null;

const getAuthOrigin = () => {
  if (window.location.hostname === "careersourcer.co.ke") return "https://www.careersourcer.co.ke";
  return window.location.origin;
};

const usesLovableOAuthProxy = () => {
  const host = window.location.hostname;
  return host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com");
};

function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("not_found") || m.includes("/~auth/initiate") || m.includes("/~oauth/initiate"))
    return "Google sign-in is temporarily unavailable. Please refresh and try again, or use email and password.";
  if (m.includes("unsupported provider") || m.includes("provider") && m.includes("disabled"))
    return "Google sign-in is not enabled yet. Please try email and password while we finish setup.";
  if (m.includes("popup was blocked"))
    return "Your browser blocked the Google sign-in window. Allow popups for this site and try again.";
  if (m.includes("cancelled")) return "Google sign-in was cancelled.";
  if (m.includes("invalid login credentials"))
    return "Wrong email or password. If you signed up with Google, use 'Continue with Google' or reset your password.";
  if (m.includes("email not confirmed"))
    return "Please confirm your email before signing in.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "An account with this email already exists. Try signing in instead.";
  if (m.includes("password should be at least"))
    return "Password must be at least 8 characters.";
  if (m.includes("weak_password") || m.includes("pwned") || m.includes("compromised"))
    return "This password has been found in a data breach. Please choose a stronger one.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Please wait a moment and try again.";
  if (m.includes("network")) return "Network error. Check your connection and retry.";
  return message;
}

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get("next");
  const nextPath =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/paths";
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [typingField, setTypingField] = useState<TypingField>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && user) navigate(nextPath, { replace: true });
  }, [user, authLoading, navigate, nextPath]);

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, []);

  const updateTypingField = (field: Exclude<TypingField, null>, value: string, setter: (next: string) => void) => {
    setter(value);
    setTypingField(field);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTypingField(null), 700);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const parsed = signUpSchema.safeParse({ displayName, email, password });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${getAuthOrigin()}${nextPath}`,
            data: { display_name: parsed.data.displayName },
          },
        });
        if (error) {
          toast.error(mapAuthError(error.message));
          return;
        }
        if (data.session) {
          toast.success("Account created. Welcome!");
        } else {
          toast.success("Account created. Check your email to confirm, then sign in.");
          setMode("signin");
        }
      } else if (mode === "signin") {
        const parsed = signInSchema.safeParse({ email, password });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) {
          toast.error(mapAuthError(error.message));
          return;
        }
      } else {
        // forgot password
        const emailParse = z.string().trim().email().safeParse(email);
        if (!emailParse.success) {
          toast.error("Please enter a valid email");
          return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(emailParse.data, {
          redirectTo: `${getAuthOrigin()}/reset-password`,
        });
        if (error) {
          toast.error(mapAuthError(error.message));
          return;
        }
        toast.success("If an account exists, a reset link is on its way.");
        setMode("signin");
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const signInGoogle = async () => {
    setLoading(true);
    try {
      const authOrigin = getAuthOrigin();

      if (usesLovableOAuthProxy()) {
        const result = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: authOrigin,
          extraParams: { prompt: "select_account" },
        });
        if (result.redirected) return;
        if (result.error) {
          console.error("Google sign-in failed", result.error);
          toast.error(mapAuthError(result.error.message));
          setLoading(false);
          return;
        }
        navigate("/paths", { replace: true });
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${authOrigin}/paths`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        console.error("Google sign-in provider failed", error);
        toast.error(mapAuthError(error.message));
        return;
      }
    } catch (error) {
      console.error("Google sign-in crashed", error);
      toast.error(mapAuthError(error instanceof Error ? error.message : "Google sign-in failed"));
    } finally {
      setLoading(false);
    }
  };

  const heading =
    mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password";
  const subheading =
    mode === "signin"
      ? "Sign in to continue your path."
      : mode === "signup"
      ? "Save your progress across devices."
      : "We'll email you a secure reset link.";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <Link
        to="/"
        className="absolute top-5 left-5 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <h1 className="text-3xl font-black tracking-tight text-center mb-2">{heading}</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">{subheading}</p>


        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === "signup" && (
            <TypingInput
              type="text"
              placeholder="Display name"
              value={displayName}
              onChange={(value) => updateTypingField("name", value, setDisplayName)}
              autoComplete="name"
              isTyping={typingField === "name"}
              required
            />
          )}
          <TypingInput
            type="email"
            placeholder="Email"
            value={email}
            onChange={(value) => updateTypingField("email", value, setEmail)}
            autoComplete="email"
            isTyping={typingField === "email"}
            required
          />
          {mode !== "forgot" && (
            <TypingInput
              type="password"
              placeholder={mode === "signup" ? "Password (min 8 chars)" : "Password"}
              value={password}
              onChange={(value) => updateTypingField("password", value, setPassword)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              isTyping={typingField === "password"}
              required
            />
          )}

          {mode === "signin" && (
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="self-end text-xs text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </button>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            className="mt-2 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent-blue text-primary-foreground font-semibold disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "signin" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
          </motion.button>
        </form>

        <p className="text-sm text-center text-muted-foreground mt-6">
          {mode === "signin" && (
            <>
              New here?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="text-accent-blue font-semibold hover:underline"
              >
                Create account
              </button>
            </>
          )}
          {mode === "signup" && (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="text-accent-blue font-semibold hover:underline"
              >
                Sign in
              </button>
            </>
          )}
          {mode === "forgot" && (
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="text-accent-blue font-semibold hover:underline"
            >
              Back to sign in
            </button>
          )}
        </p>
      </motion.div>
    </div>
  );
}

type TypingInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  isTyping: boolean;
  onChange: (value: string) => void;
};

function TypingInput({ isTyping, onChange, className = "", ...props }: TypingInputProps) {
  return (
    <label className="relative block">
      <input
        {...props}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full px-4 py-3 pr-14 rounded-xl border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-blue/40 ${className}`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-1 transition-opacity ${
          isTyping ? "opacity-100" : "opacity-0"
        }`}
      >
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="h-1.5 w-1.5 rounded-full bg-accent-blue animate-bounce"
            style={{ animationDelay: `${dot * 120}ms` }}
          />
        ))}
      </span>
    </label>
  );
}

