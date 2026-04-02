import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "omniagent_session";
const TOKEN_KEY = "omniagent_token";  // New: store JWT
const USER_KEY = "omniagent_user";   // optional user payload cache

type User = {
  id?: string;
  email?: string;
  [key: string]: any;
};

type AuthContextValue = {
  isLoggedIn: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;  // Updated signature
  loginWithToken: (token: string) => void;
  logout: () => void;
  token: string | null;
};
const AuthContext = createContext<AuthContextValue | null>(null);

const getStoredUser = (): User | null => {
  const stored = localStorage.getItem(USER_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  // As fallback, decode JWT if available (optional dependency: jwt-decode)
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.sub ?? payload.user_id,
        email: payload.email,
        ...payload,
      };
    } catch {
      return null;
    }
  }
  return null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const session = localStorage.getItem(STORAGE_KEY);
    return !!token || session === "1";
  });

  const [user, setUser] = useState<User | null>(() => getStoredUser());

  useEffect(() => {
    const sync = () => {
      const token = localStorage.getItem(TOKEN_KEY);
      const session = localStorage.getItem(STORAGE_KEY);
      setIsLoggedIn(!!token || session === "1");
      setUser(getStoredUser());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const value = useMemo(() => ({
    isLoggedIn,
    user,
    token: localStorage.getItem(TOKEN_KEY),
    loginWithToken: (token: string) => {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(STORAGE_KEY, "1");

      const decoded = (() => {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return {
            id: payload.sub ?? payload.user_id,
            email: payload.email ?? payload.sub,
            ...payload,
          };
        } catch {
          return null;
        }
      })();

      if (decoded) {
        localStorage.setItem(USER_KEY, JSON.stringify(decoded));
      }

      setIsLoggedIn(true);
      setUser(decoded);
    },
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

        const decoded = (() => {
          try {
            const payload = JSON.parse(atob(data.access_token.split('.')[1]));
            return {
              id: payload.sub ?? payload.user_id,
              email: payload.email ?? email,
              ...payload,
            };
          } catch {
            return { email };
          }
        })();

        localStorage.setItem(USER_KEY, JSON.stringify(decoded));

        setIsLoggedIn(true);
        setUser(decoded);
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
      localStorage.removeItem(USER_KEY);
      setIsLoggedIn(false);
      setUser(null);
      toast.success('Logged out');
    },
  }), [isLoggedIn, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}