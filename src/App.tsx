import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Landing from "./pages/Landing";
import PathSelection from "./pages/PathSelection";
import Dashboard from "./pages/Dashboard";
import FocusMode from "./pages/FocusMode";
import NotFound from "./pages/NotFound";
import { AnimatedBackground } from "./components/career/AnimatedBackground";
import { ThemeToggle } from "./components/career/ThemeToggle";

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedBackground />
      <ThemeToggle />
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/paths" element={<PathSelection />} />
          <Route path="/dashboard/:pathId" element={<Dashboard />} />
          <Route path="/session/:pathId/:sessionId" element={<FocusMode />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}
