import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useSiteTheme } from "../context/ThemeContext";

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const { landingTheme } = useSiteTheme();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      toast.error("Authentication failed. No token provided.");
      navigate("/sign-in");
      return;
    }

    try {
      loginWithToken(token);
      toast.success("Successfully logged in with Google!");
      
      // Navigate to the protected route
      setTimeout(() => {
        navigate("/dashboard");
      }, 100);

    } catch (e) {
      toast.error("Authentication error.");
      navigate("/sign-in");
    }
  }, [searchParams, navigate, loginWithToken]);

  return (
    <div className={`min-h-screen flex items-center justify-center ${landingTheme} bg-background text-foreground transition-colors duration-300`}>
      <div className="flex flex-col items-center gap-4">
        <div className="size-9 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-muted-foreground font-mono">Completing sign in…</p>
      </div>
    </div>
  );
}
