import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Bot, Loader2 } from "lucide-react";

import { Toaster as Sonner } from "./components/ui/sonner";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip.tsx";
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";
import DashboardLayout from "./layouts/DashboardLayout.tsx";

// Lazy-loaded routes for code splitting & optimal performance
const Index = lazy(() => import("./pages/Index.tsx"));
const NewAgentCreation = lazy(() => import("./pages/NewAgentCreation.tsx"));
const SignIn = lazy(() => import("./pages/SignIn.tsx"));
const SignUp = lazy(() => import("./pages/SignUp.tsx"));
const OAuthCallback = lazy(() => import("./pages/OAuthCallback.tsx"));
const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome.tsx"));
const EditAgent = lazy(() => import("./pages/dashboard/EditAgent.tsx"));
const MyAgents = lazy(() => import("./pages/dashboard/MyAgents.tsx"));
const Integrations = lazy(() => import("./pages/dashboard/Integrations.tsx"));
const Settings = lazy(() => import("./pages/dashboard/Settings.tsx"));

const PageLoaderFallback = () => (
  <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-3 text-center">
    <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-xl animate-pulse">
      <Bot className="size-6" />
    </div>
    <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
      <Loader2 className="size-3.5 animate-spin text-primary" />
      <span>Loading workspace environment…</span>
    </div>
  </div>
);

const PrivateRoute = () => {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <Outlet /> : <Navigate to="/sign-in" replace />;
};

const GuestRoute = () => {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <Navigate to="/dashboard" replace /> : <Outlet />;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoaderFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/oauth/callback" element={<OAuthCallback />} />

                <Route element={<GuestRoute />}>
                  <Route path="/sign-in" element={<SignIn />} />
                  <Route path="/sign-up" element={<SignUp />} />
                </Route>

                <Route element={<PrivateRoute />}>
                  <Route element={<DashboardLayout />}>
                    <Route path="/dashboard" element={<DashboardHome />} />
                    <Route path="/agents" element={<MyAgents />} />
                    <Route path="/agents/:id/edit" element={<EditAgent />} />
                    <Route path="/integrations" element={<Integrations />} />
                    <Route path="/settings" element={<Settings />} />
                  </Route>
                  <Route path="/new-agent" element={<NewAgentCreation />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
