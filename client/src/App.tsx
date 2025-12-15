import React, { Suspense, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./contexts/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { TourProvider } from "./components/tour/TourProvider";
import { SkipNavLink } from "./components/SkipNavLink";
import { NotificationProvider } from "./components/notifications";
import { LandingPage } from "./components/LandingPage";
import { FeaturesPage } from "./components/FeaturesPage";
import { LoginScreen } from "./components/LoginScreen";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { TermsOfService } from "./pages/TermsOfService";
import { Routes as AppRoutes } from "./components/Routes";
import { trpc } from "@/lib/trpc";

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-accent/10">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-slate-600">Loading...</p>
    </div>
  </div>
);

function safeReturnTo(raw: string | null): string {
  if (!raw) return "/app";
  // Only allow same-origin relative paths.
  if (!raw.startsWith("/")) return "/app";
  if (raw.startsWith("/api")) return "/app";
  return raw;
}

function LoginRoute() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const returnTo = safeReturnTo(
    new URLSearchParams(window.location.search).get("returnTo")
  );

  return (
    <LoginScreen
      onAuthenticated={async () => {
        // Ensure auth state is refreshed before entering the app shell.
        await utils.auth.me.invalidate();
        setLocation(returnTo);
      }}
      onBack={() => setLocation("/")}
    />
  );
}

function LandingRoute() {
  const [, setLocation] = useLocation();
  return (
    <LandingPage
      onLogin={() => setLocation("/login")}
      onNavigateToFeatures={() => setLocation("/features")}
    />
  );
}

function FeaturesRoute() {
  const [, setLocation] = useLocation();
  return (
    <FeaturesPage
      onGetStarted={() => setLocation("/login")}
      onNavigateHome={() => setLocation("/")}
    />
  );
}

function PrivacyRoute() {
  const [, setLocation] = useLocation();
  return <PrivacyPolicy onBack={() => setLocation("/")} />;
}

function TermsRoute() {
  const [, setLocation] = useLocation();
  return <TermsOfService onBack={() => setLocation("/")} />;
}

function RedirectHome() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/");
  }, [setLocation]);
  return null;
}

export default function App() {
  const [location] = useLocation();
  const { data: user } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" switchable={true}>
        <TooltipProvider>
          <NotificationProvider>
            <TourProvider
              onboardingCompleted={user?.onboardingCompleted === true}
              isDashboardActive={location.startsWith("/app")}
            >
              <SkipNavLink />
              <Toaster />

              <Suspense fallback={<LoadingSpinner />}>
                <Switch>
                  <Route path="/" component={LandingRoute} />
                  <Route path="/features" component={FeaturesRoute} />
                  <Route path="/login" component={LoginRoute} />
                  <Route path="/privacy" component={PrivacyRoute} />
                  <Route path="/terms" component={TermsRoute} />

                  {/* Protected app shell */}
                  <Route path="/app" component={AppRoutes} />
                  <Route path="/app/:rest*">
                    {() => <AppRoutes />}
                  </Route>

                  <Route component={RedirectHome} />
                </Switch>
              </Suspense>
            </TourProvider>
          </NotificationProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
