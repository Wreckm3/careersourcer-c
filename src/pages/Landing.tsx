import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, ArrowRight } from "lucide-react";
import { PageTransition } from "@/components/career/PageTransition";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <motion.div
          className="flex flex-col items-center text-center max-w-2xl gap-8"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.div
            initial={{ rotate: -10, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Compass className="w-16 h-16 text-accent-blue" />
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight">
            Build Your <span className="text-accent-blue">Direction</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-md">
            A focused, distraction-free platform for structured self-growth. Choose a path. Complete sessions. Grow with clarity.
          </p>

          <motion.button
            onClick={() => navigate("/paths")}
            className="group flex items-center gap-3 px-8 py-4 rounded-xl bg-primary text-primary-foreground text-lg font-semibold transition-all duration-200 hover:scale-[1.03] hover:shadow-lg"
            whileTap={{ scale: 0.98 }}
          >
            Start Your Path
            <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
          </motion.button>
        </motion.div>
      </div>
    </PageTransition>
  );
}
