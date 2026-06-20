import { useState, useEffect, useRef } from "react";
import type { InputHTMLAttributes } from "react";
import { useNavigate, Link } from "react-router-dom";
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

function mapAuthError(message: string): string {
  const m = message.toLowerCase();
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
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [typingField, setTypingField] = useState<TypingField>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && user) navigate("/paths", { replace: true });
  }, [user, authLoading, navigate]);

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
          toast.error(parsed.error.errors[0].message);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/paths`,
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
          toast.error(parsed.error.errors[0].message);
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
          redirectTo: `${window.location.origin}/reset-password`,
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
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
      extraParams: { prompt: "select_account" },
    });
    if (result.redirected) return;
    if (result.error) {
      toast.error(mapAuthError(result.error.message));
      setLoading(false);
      return;
    }
    navigate("/paths", { replace: true });
    setLoading(false);
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

        {mode !== "forgot" && (
          <>
            <button
              type="button"
              onClick={signInGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors font-medium text-sm mb-5 disabled:opacity-60"
            >
              <GoogleIcon /> Continue with Google
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}
