import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
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
        navigate("/new-agent");
      }, 100);

    } catch (e) {
      toast.error("Authentication error.");
      navigate("/sign-in");
    }
  }, [searchParams, navigate, loginWithToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-600 dark:text-gray-300">Completing sign in...</p>
      </div>
    </div>
  );
}
