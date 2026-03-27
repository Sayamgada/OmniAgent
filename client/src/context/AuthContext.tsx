import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "omniagent_session";

type AuthContextValue = {
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem(STORAGE_KEY) === "1");

  useEffect(() => {
    const sync = () => setIsLoggedIn(localStorage.getItem(STORAGE_KEY) === "1");
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const value = useMemo(
    () => ({
      isLoggedIn,
      login: () => {
        localStorage.setItem(STORAGE_KEY, "1");
        setIsLoggedIn(true);
      },
      logout: () => {
        localStorage.removeItem(STORAGE_KEY);
        setIsLoggedIn(false);
      },
    }),
    [isLoggedIn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
