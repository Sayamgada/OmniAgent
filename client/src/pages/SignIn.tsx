import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";

import AuthCard from "../components/auth/AuthCard";
import AuthInputField from "../components/auth/AuthInputField";
import AuthPageShell from "../components/auth/AuthPageShell";
import GoogleIcon from "../components/auth/GoogleIcon";
import Navbar from "../components/landing/Navbar";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SignIn = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitting, setSubmitting] = useState(false);

  const emailValid = EMAIL_RE.test(email.trim());
  const passwordValid = password.length >= 8;
  const canSubmit = emailValid && passwordValid;

  // Google sign-in errors arrive from the backend as /sign-in?error=...
  useEffect(() => {
    const err = searchParams.get("error");
    if (err) {
      // fixed id prevents React StrictMode from showing the toast twice in dev
      toast.error(err, { id: "oauth-error" });
      // clear ?error= so a refresh doesn't repeat the toast
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const emailError = useMemo(() => {
    if (!touched.email) return undefined;
    const t = email.trim();
    if (!t) return "Email is required";
    if (!EMAIL_RE.test(t)) return "Enter a valid email address";
    return undefined;
  }, [email, touched.email]);

  const passwordError = useMemo(() => {
    if (!touched.password) return undefined;
    if (!password) return "Password is required";
    if (password.length < 8) return "Use at least 8 characters";
    return undefined;
  }, [password, touched.password]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });

    if (!canSubmit) return;

    setSubmitting(true);

    try {
      await login(email.trim(), password);
      navigate("/dashboard");
    } catch {
      // AuthContext.login already shows the backend's error message as a toast
      // (e.g. "No account found with this email", "Incorrect password").
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = () => {
    window.location.href = "http://localhost:8000/auth/google/login";
  };

  return (
    <AuthPageShell>
      <Navbar variant="auth" />
      <main className="relative mx-auto flex min-h-screen w-full max-w-[1200px] flex-col items-center justify-center px-4 pb-16 pt-24 md:px-6">
        <AuthCard
          title="Access Your AI Workspace"
          subtitle="Continue building and managing your intelligent agents"
          footer={
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center text-[11px] text-muted-foreground">
              <span>Secure and private AI workspace</span>
              <span className="hidden sm:inline">·</span>
              <span>Your agents, your control</span>
            </div>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <AuthInputField
              id="signin-email"
              label="Email Address"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              onBlur={() => setTouched((p) => ({ ...p, email: true }))}
              icon={Mail}
              error={emailError}
              showSuccess={emailValid}
              disabled={submitting}
            />
            <AuthInputField
              id="signin-password"
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              onBlur={() => setTouched((p) => ({ ...p, password: true }))}
              icon={Lock}
              error={passwordError}
              showSuccess={passwordValid}
              disabled={submitting}
            />

            <div className="flex justify-end">
              <button
                type="button"
                className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline cursor-pointer"
                onClick={() =>
                  toast("Password reset", {
                    description:
                      "Check your email when this flow is connected.",
                  })
                }
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              disabled={!canSubmit || submitting}
              className="h-12 w-full rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  <span>Entering…</span>
                </>
              ) : (
                "Enter Workspace"
              )}
            </Button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/70" />
              </div>
              <div className="relative flex justify-center text-[10px] font-mono uppercase tracking-widest">
                <span className="bg-card px-3 text-muted-foreground/70 font-semibold">
                  or
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogle}
              disabled={submitting}
              className="h-12 w-full rounded-xl border border-border/80 bg-background/80 text-foreground font-semibold text-sm transition-all hover:bg-muted/60 hover:border-border shadow-xs flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <GoogleIcon className="size-5" />
              <span>Continue with Google</span>
            </Button>

            <p className="text-center text-sm text-muted-foreground pt-1">
              New to OmniAgent?{" "}
              <Link
                to="/sign-up"
                className="font-semibold text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
              >
                Create your workspace
              </Link>
            </p>
          </form>
        </AuthCard>

        <p className="mt-8 max-w-md text-center text-xs text-muted-foreground/70 font-mono">
          No coding required — describe what you need in plain language.
        </p>
      </main>
    </AuthPageShell>
  );
};

export default SignIn;
