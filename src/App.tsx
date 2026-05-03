import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProjectsProvider } from "@/hooks/useProjects";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import ProjectDetail from "./pages/ProjectDetail";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import Onboarding from "./pages/Onboarding";
import Team from "./pages/Team";
import CommandCenter from "./pages/CommandCenter";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { applyBrandPrimary } from "@/lib/brandColor";
import { acceptInvitation, consumeInviteToken } from "@/lib/inviteFlow";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [onboardingState, setOnboardingState] = useState<"checking" | "needs" | "ok">("checking");

  useEffect(() => {
    if (!user) { setOnboardingState("checking"); return; }
    let cancelled = false;
    (async () => {
      // Step 1: if there's a pending invite token from /auth?token=..., accept
      // it now that the user is signed in. Joining a team gives them an
      // existing company, so they can skip onboarding entirely.
      const token = consumeInviteToken();
      if (token) {
        await acceptInvitation(token, user.id);
      }

      // Step 2: figure out if they need onboarding.
      // - If they belong to a company already (membership row exists), skip.
      // - Else, check their own company_settings.onboarding_complete.
      const { data: membership } = await supabase
        .from("company_members")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (membership && membership.role !== "owner") {
        if (!cancelled) setOnboardingState("ok");
        return;
      }

      const { data } = await supabase
        .from("company_settings")
        .select("onboarding_complete")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setOnboardingState(data?.onboarding_complete ? "ok" : "needs");
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading || (user && onboardingState === "checking")) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (onboardingState === "needs") return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

/**
 * Loads the signed-in user's saved brand_color from company_settings and
 * applies it to the document root so the entire app renders in their color
 * on every navigation / refresh.
 */
const BrandColorLoader = () => {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) {
      applyBrandPrimary(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("brand_color")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!error && data?.brand_color) {
        applyBrandPrimary(data.brand_color);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ProjectsProvider>
          <ErrorBoundary>
            <Toaster />
            <Sonner />
            <BrandColorLoader />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/project/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
                <Route path="/command-center" element={<ProtectedRoute><CommandCenter /></ProtectedRoute>} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </ErrorBoundary>
        </ProjectsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
