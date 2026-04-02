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
import { useAuth } from '../context/AuthContext'; 

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
    await login(email, password);  // Now calls backend!
    navigate('/new-agent');  // Your success redirect
  } catch (error) {
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
                className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-[#007BFF] hover:underline"
                onClick={() => toast("Password reset", { description: "Check your email when this flow is connected." })}
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              disabled={!canSubmit || submitting}
              className="h-12 w-full rounded-xl bg-[#007BFF] text-base font-semibold text-white shadow-[0_0_28px_hsl(211_100%_50%_/_0.35)] transition-all hover:bg-[#007BFF]/90 hover:shadow-[0_0_36px_hsl(211_100%_50%_/_0.45)] disabled:shadow-none"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Entering…
                </>
              ) : (
                "Enter Workspace"
              )}
            </Button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#2A2A2A]" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-[#1E1E1E]/95 px-3 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogle}
              disabled={submitting}
              className="h-12 w-full rounded-xl border-[#2A2A2A] bg-[#1E1E1E]/50 text-[#F5F5F5] transition-all hover:border-[#007BFF]/40 hover:bg-[#1E1E1E] hover:shadow-[0_0_20px_hsl(211_100%_50%_/_0.12)]"
            >
              <GoogleIcon className="size-5" />
              Continue with Google
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              New to OmniAgent?{" "}
              <Link
                to="/sign-up"
                className="font-medium text-[#007BFF] underline-offset-4 transition-colors hover:text-[#007BFF]/90 hover:underline"
              >
                Create your workspace
              </Link>
            </p>
          </form>
        </AuthCard>

        <p className="mt-10 max-w-md text-center text-xs text-muted-foreground/80">No coding required — describe what you need in plain language.</p>
      </main>
    </AuthPageShell>
  );
};

export default SignIn;
