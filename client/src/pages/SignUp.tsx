import { type FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Lock, Mail, UserRound } from "lucide-react";
import { toast } from "sonner";

import AuthCard from "../components/auth/AuthCard";
import AuthInputField from "../components/auth/AuthInputField";
import AuthPageShell from "../components/auth/AuthPageShell";
import GoogleIcon from "../components/auth/GoogleIcon";
import Navbar from "../components/landing/Navbar";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SignUp = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ fullName: false, email: false, password: false });
  const [submitting, setSubmitting] = useState(false);

  const nameValid = fullName.trim().length >= 2;
  const emailValid = EMAIL_RE.test(email.trim());
  const passwordValid = password.length >= 8;
  const canSubmit = nameValid && emailValid && passwordValid;

  const nameError = useMemo(() => {
    if (!touched.fullName) return undefined;
    if (fullName.trim().length < 2) return "Enter your full name";
    return undefined;
  }, [fullName, touched.fullName]);

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
    setTouched({ fullName: true, email: true, password: true });

    if (!canSubmit) return;

    setSubmitting(true);

    try {
      const response = await fetch('http://localhost:8000/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          full_name: fullName.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.detail || 'Signup failed');
        return;
      }

      toast.success('Workspace created!');

      // Auto-login new user
      await login(email.trim(), password);
      navigate('/new-agent');

    } catch (error) {
      toast.error('Signup failed. Try again.');
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
          title="Create Your AI Workspace"
          subtitle="Start building custom AI agents tailored to your needs"
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
              id="signup-name"
              label="Full Name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={setFullName}
              onBlur={() => setTouched((p) => ({ ...p, fullName: true }))}
              icon={UserRound}
              error={nameError}
              showSuccess={nameValid}
              disabled={submitting}
            />
            <AuthInputField
              id="signup-email"
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
              id="signup-password"
              label="Password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              onBlur={() => setTouched((p) => ({ ...p, password: true }))}
              icon={Lock}
              error={passwordError}
              showSuccess={passwordValid}
              disabled={submitting}
            />

            <Button
              type="submit"
              disabled={!canSubmit || submitting}
              className="h-12 w-full rounded-xl bg-[#007BFF] text-base font-semibold text-white shadow-[0_0_28px_hsl(211_100%_50%_/_0.35)] transition-all hover:bg-[#007BFF]/90 hover:shadow-[0_0_36px_hsl(211_100%_50%_/_0.45)] disabled:shadow-none"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Initializing…
                </>
              ) : (
                "Initialize Workspace"
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
              Already have a workspace?{" "}
              <Link
                to="/sign-in"
                className="font-medium text-[#007BFF] underline-offset-4 transition-colors hover:text-[#007BFF]/90 hover:underline"
              >
                Access it here
              </Link>
            </p>
          </form>
        </AuthCard>

        <p className="mt-10 max-w-md text-center text-xs text-muted-foreground/80">No coding required — describe what you need in plain language.</p>
      </main>
    </AuthPageShell>
  );
};

export default SignUp;
