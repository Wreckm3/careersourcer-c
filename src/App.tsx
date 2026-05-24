import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "sonner";
import Landing from "./pages/Landing";
import PathSelection from "./pages/PathSelection";
import Dashboard from "./pages/Dashboard";
import FocusMode from "./pages/FocusMode";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import { AnimatedBackground } from "./components/career/AnimatedBackground";
import { ThemeToggle } from "./components/career/ThemeToggle";
import { AuthProvider } from "./hooks/useAuth";
import { ProgressProvider } from "./hooks/useProgress";

export default function App() {
  return (
    <AuthProvider>
      <ProgressProvider>
        <BrowserRouter>
          <AnimatedBackground />
          <ThemeToggle />
          <Toaster position="top-center" richColors />
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/paths" element={<PathSelection />} />
              <Route path="/dashboard/:pathId" element={<Dashboard />} />
              <Route path="/session/:pathId/:sessionId" element={<FocusMode />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AnimatePresence>
        </BrowserRouter>
      </ProgressProvider>
    </AuthProvider>
  );
}
