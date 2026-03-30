import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "omniagent_session";
const TOKEN_KEY = "omniagent_token";  // New: store JWT

type AuthContextValue = {
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;  // Updated signature
  logout: () => void;
  token: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    return !!token;  // Check real JWT exists
  });

  useEffect(() => {
    const sync = () => {
      const token = localStorage.getItem(TOKEN_KEY);
      setIsLoggedIn(!!token);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const value = useMemo(() => ({
    isLoggedIn,
    token: localStorage.getItem(TOKEN_KEY),
    login: async (email: string, password: string) => {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);
      
      try {
        const response = await fetch('http://localhost:8000/auth/signin', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Login failed');
        }
        
        const data = await response.json();
        localStorage.setItem(TOKEN_KEY, data.access_token);
        localStorage.setItem(STORAGE_KEY, "1");  // Keep your flag
        setIsLoggedIn(true);
        toast.success('Welcome back! Your workspace is ready.');
      } catch (error) {
        toast.error('Invalid email or password');
        console.error('Login error:', error);
        throw error;  // Re-throw for handleSubmit catch
      }
    },
    logout: () => {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOKEN_KEY);
      setIsLoggedIn(false);
      toast.success('Logged out');
    },
  }), [isLoggedIn]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}