import React, { Suspense, lazy } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';

// Lazy load pages
const Login = lazy(() => import('@/pages/Login'));
const Signup = lazy(() => import('@/pages/Signup'));
const OnboardingFlow = lazy(() => import('./OnboardingFlow'));
const Dashboard = lazy(() => import('./Dashboard').then(m => ({ default: m.Dashboard })));
const LandingPage = lazy(() => import('./LandingPage').then(m => ({ default: m.LandingPage })));
const FeaturesPage = lazy(() => import('./FeaturesPage').then(m => ({ default: m.FeaturesPage })));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const TermsOfService = lazy(() => import('@/pages/TermsOfService').then(m => ({ default: m.TermsOfService })));
const AlexRamozyPage = lazy(() => import('./AlexRamozyPage').then(m => ({ default: m.AlexRamozyPage })));

// Loading spinner component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-accent/10">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm text-slate-600">Loading...</p>
    </div>
  </div>
);

export function AppRouter() {
  const [location, setLocation] = useLocation();

  // Check for active session
  const { data: user, isLoading: isAuthLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Show loading spinner while checking auth
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Redirect logic for authenticated users
  if (user) {
    // If user is on landing or auth pages, redirect to dashboard or onboarding
    if (location === '/' || location === '/landing' || location === '/login' || location === '/signup') {
      if (user.onboardingCompleted === false) {
        if (location !== '/onboarding') {
          setLocation('/onboarding');
        }
      } else {
        if (location !== '/dashboard') {
          setLocation('/dashboard');
        }
      }
    }
  } else {
    // If user is not authenticated and trying to access protected routes
    const protectedRoutes = ['/dashboard', '/onboarding'];
    if (protectedRoutes.some(route => location.startsWith(route))) {
      setLocation('/login');
    }
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Switch>
        {/* Public routes */}
        <Route path="/">
          <LandingPage
            onLogin={() => setLocation('/login')}
            onNavigateToFeatures={() => setLocation('/features')}
          />
        </Route>
        <Route path="/landing">
          <LandingPage
            onLogin={() => setLocation('/login')}
            onNavigateToFeatures={() => setLocation('/features')}
          />
        </Route>
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/features">
          <FeaturesPage
            onGetStarted={() => user ? setLocation('/dashboard') : setLocation('/login')}
            onNavigateHome={() => setLocation('/')}
          />
        </Route>
        <Route path="/privacy">
          <PrivacyPolicy onBack={() => setLocation('/')} />
        </Route>
        <Route path="/terms">
          <TermsOfService onBack={() => setLocation('/')} />
        </Route>
        <Route path="/alex-ramozy">
          <AlexRamozyPage onDemoClick={() => setLocation('/login')} />
        </Route>

        {/* Protected routes */}
        <Route path="/onboarding">
          {user ? (
            <OnboardingFlow onComplete={() => setLocation('/dashboard')} />
          ) : (
            <div>Redirecting...</div>
          )}
        </Route>
        <Route path="/dashboard">
          {user ? (
            <main id="main-content">
              <Dashboard userTier="WHITELABEL" credits={1000} />
            </main>
          ) : (
            <div>Redirecting...</div>
          )}
        </Route>

        {/* 404 */}
        <Route>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">404</h1>
              <p className="text-muted-foreground mb-4">Page not found</p>
              <button
                onClick={() => setLocation('/')}
                className="text-primary hover:underline"
              >
                Go back home
              </button>
            </div>
          </div>
        </Route>
      </Switch>
    </Suspense>
  );
}
