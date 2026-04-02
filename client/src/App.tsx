import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "./components/ui/sonner";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip.tsx";
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";
import Index from "./pages/Index.tsx";
import NewAgentCreation from "./pages/NewAgentCreation.tsx";
import SignIn from "./pages/SignIn.tsx";
import SignUp from "./pages/SignUp.tsx";
import OAuthCallback from "./pages/OAuthCallback.tsx";

const PrivateRoute = () => {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <Outlet /> : <Navigate to="/sign-in" replace />;
};

const GuestRoute = () => {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <Navigate to="/new-agent" replace /> : <Outlet />;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />

            <Route element={<GuestRoute />}>
              <Route path="/sign-in" element={<SignIn />} />
              <Route path="/sign-up" element={<SignUp />} />
            </Route>

            <Route element={<PrivateRoute />}>
              <Route path="/new-agent" element={<NewAgentCreation />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;