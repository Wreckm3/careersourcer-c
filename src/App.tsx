import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "sonner";
import { Suspense, lazy } from "react";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./hooks/useAuth";
import { ProgressProvider } from "./hooks/useProgress";
import { SubscriptionProvider } from "./hooks/useSubscription";
import { ErrorBoundary } from "./components/career/ErrorBoundary";
import { OfflineNotice } from "./components/career/OfflineNotice";
import { PageMeta } from "./components/career/PageMeta";

// Code-split heavier / less-critical routes.
const PathSelection = lazy(() => import("./pages/PathSelection"));
const Category = lazy(() => import("./pages/Category"));
const Branch = lazy(() => import("./pages/Branch"));
const FocusMode = lazy(() => import("./pages/FocusMode"));
const Profile = lazy(() => import("./pages/Profile"));
const AtlasWorkspace = lazy(() => import("./pages/AtlasWorkspace"));
const Demo = lazy(() => import("./pages/Demo"));
const Pool = lazy(() => import("./pages/Pool"));
const Pricing = lazy(() => import("./pages/Pricing"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
    </div>
  );
}

function ProductApp() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <ProgressProvider>
          <ErrorBoundary>
            <Toaster position="top-center" richColors theme="dark" />
            <OfflineNotice />
            <AnimatePresence mode="wait">
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                    <Route path="/" element={<><PageMeta title="CareerSourcer" /><Landing /></>} />
                    <Route path="/auth" element={<><PageMeta title="Sign In" description="Sign in or create a CareerSourcer account to save your learning progress." /><Auth /></>} />
                    <Route path="/reset-password" element={<><PageMeta title="Reset Password" description="Set a new password for your CareerSourcer account." /><ResetPassword /></>} />
                    <Route path="/.lovable/oauth/consent" element={<><PageMeta title="Authorize App" description="Review and approve an app connection to CareerSourcer." /><OAuthConsent /></>} />
                    <Route path="/paths" element={<><PageMeta title="Learning Paths" description="Choose a practical CareerSourcer path in technology, business, or creative work." /><PathSelection /></>} />
                    <Route path="/pricing" element={<><PageMeta title="Pricing" description="Compare CareerSourcer plans and choose the right tier for your goals." /><Pricing /></>} />
                    <Route path="/category/:categoryId" element={<><PageMeta title="Category" description="Explore CareerSourcer branches and find the direction that fits your goals." /><Category /></>} />
                    <Route path="/branch/:categoryId/:branchId" element={<><PageMeta title="Branch" description="Follow project-first lessons and track your branch progress on CareerSourcer." /><Branch /></>} />
                    <Route path="/session/:pathId/:sessionId" element={<><PageMeta title="Focus Mode" description="Complete a CareerSourcer lesson and build a real project artifact." /><FocusMode /></>} />
                    <Route path="/profile" element={<><PageMeta title="Profile" description="Review your CareerSourcer progress, achievements, portfolio, and streak." /><Profile /></>} />
                    <Route path="/atlas" element={<><PageMeta title="Atlas Workspace" description="Your AI-guided CareerSourcer workspace." /><AtlasWorkspace /></>} />
                    <Route path="/pool" element={<><PageMeta title="Collaboration Pool" description="Find CareerSourcer learners in your branch and build projects together." /><Pool /></>} />
                    <Route path="*" element={<><PageMeta title="Page Not Found" description="This CareerSourcer page could not be found." /><NotFound /></>} />
                </Routes>
              </Suspense>
            </AnimatePresence>
          </ErrorBoundary>
        </ProgressProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

function AppShell() {
  const location = useLocation();
  // `/demo` deliberately does not mount AuthProvider, ProgressProvider, SubscriptionProvider,
  // or any Supabase-backed surface. It is a fully local inspection route.
  if (location.pathname === "/demo") return <Suspense fallback={<RouteFallback />}><PageMeta title="Product Demo" description="A safe, local-only CareerSourcer product demo using fictional sample data." /><Demo /></Suspense>;
  return <ProductApp />;
}

export default function App() {
  return <BrowserRouter><AppShell /></BrowserRouter>;
}
