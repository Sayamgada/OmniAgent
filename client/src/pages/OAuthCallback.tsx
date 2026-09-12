import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

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

    } catch {
      toast.error("Authentication error.");
      navigate("/sign-in");
    }
  }, [searchParams, navigate, loginWithToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-medium">Completing authentication…</p>
      </div>
    </div>
  );
}
