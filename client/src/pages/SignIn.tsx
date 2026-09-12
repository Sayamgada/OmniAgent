import { type FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitting, setSubmitting] = useState(false);

  const emailValid = EMAIL_RE.test(email.trim());
  const passwordValid = password.length >= 8;
  const canSubmit = emailValid && passwordValid;

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
      await login(email, password);
      navigate("/dashboard");
    } catch {
      // Error already toasted by AuthContext
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
          title="Sign in to OmniAgent"
          subtitle="Access your agent workspaces, execution pipelines, and tools"
          footer={
            <div className="flex flex-wrap items-center justify-center gap-2 text-center text-xs text-muted-foreground">
              <span>Secure isolated workspace</span>
              <span>·</span>
              <span>Encrypted credential storage</span>
            </div>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
                className="text-xs text-muted-foreground transition-colors hover:text-primary"
                onClick={() => toast("Password reset", { description: "Check your email when this flow is connected." })}
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              disabled={!canSubmit || submitting}
              className="h-10 w-full rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Authenticating…
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogle}
              disabled={submitting}
              className="h-10 w-full rounded-lg border-border bg-background/50 text-xs font-medium text-foreground hover:bg-card transition-colors"
            >
              <GoogleIcon className="mr-2 size-4" />
              Continue with Google
            </Button>

            <p className="text-center text-xs text-muted-foreground pt-1">
              Don't have an account?{" "}
              <Link
                to="/sign-up"
                className="font-medium text-primary hover:underline"
              >
                Create workspace
              </Link>
            </p>
          </form>
        </AuthCard>
      </main>
    </AuthPageShell>
  );
};

export default SignIn;
