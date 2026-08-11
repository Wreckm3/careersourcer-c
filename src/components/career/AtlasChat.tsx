import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isEnabled } from "@/config/features";
import { useAuth } from "@/hooks/useAuth";
import type { AtlasLessonContext } from "@/lib/atlas/lessonContext";

/** A lightweight entry point kept on lesson and profile routes. Atlas itself lives in /atlas. */
export function AtlasChat({ lessonContext }: { lessonContext?: AtlasLessonContext | null }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  if (!isEnabled("atlas") || !user) return null;
  return <motion.button onClick={() => navigate("/atlas", { state: { lessonContext } })} className="fixed bottom-5 right-5 z-40 flex h-12 items-center gap-2 rounded-full border border-primary/30 bg-card/95 px-3 text-sm font-semibold text-foreground shadow-2xl backdrop-blur hover:border-primary/60" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} aria-label="Open Atlas workspace"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground"><MessageCircle className="h-4 w-4" /></span><span className="hidden pr-1 sm:inline">Ask Atlas</span></motion.button>;
}
