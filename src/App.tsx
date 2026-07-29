import { BrowserRouter, Routes, Route } from "react-router-dom";
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

// Code-split heavier / less-critical routes.
const PathSelection = lazy(() => import("./pages/PathSelection"));
const Category = lazy(() => import("./pages/Category"));
const Branch = lazy(() => import("./pages/Branch"));
const FocusMode = lazy(() => import("./pages/FocusMode"));
const Profile = lazy(() => import("./pages/Profile"));
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

export default function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <ProgressProvider>
          <BrowserRouter>
            <Toaster position="top-center" richColors theme="dark" />
            <AnimatePresence mode="wait">
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
                  <Route path="/paths" element={<PathSelection />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/category/:categoryId" element={<Category />} />
                  <Route path="/branch/:categoryId/:branchId" element={<Branch />} />
                  <Route path="/session/:pathId/:sessionId" element={<FocusMode />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/pool" element={<Pool />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AnimatePresence>
          </BrowserRouter>
        </ProgressProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}
