import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Monitor, Briefcase, Palette, ArrowRight, ArrowLeft } from "lucide-react";
import { categories } from "@/data/curriculum";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Monitor, Briefcase, Palette,
};

export default function PathSelection() {
  const navigate = useNavigate();

  return (
    <motion.div
      className="min-h-screen bg-background px-4 py-12 flex flex-col items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="max-w-4xl w-full">
        <motion.button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </motion.button>

        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
            What do you want to learn?
          </h1>
          <p className="text-muted-foreground text-base max-w-md mx-auto">
            Three directions. Each one practical, free to start, built for action.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((cat, i) => {
            const Icon = iconMap[cat.icon];
            const featuredCount = cat.branches.filter((b) => b.featured).length;
            return (
              <motion.button
                key={cat.id}
                onClick={() => navigate(`/category/${cat.id}`)}
                className="group relative text-left p-7 rounded-2xl border border-border bg-card overflow-hidden transition-colors duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 + 0.15, duration: 0.4 }}
                whileHover={{ y: -4, boxShadow: `0 16px 32px -8px ${cat.color}18` }}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  className="absolute inset-0 transition-opacity duration-500 opacity-0 group-hover:opacity-100"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${cat.color}12, transparent 70%)` }}
                />
                <div className="relative z-10">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ backgroundColor: `color-mix(in srgb, ${cat.color} 15%, transparent)`, color: cat.color }}
                  >
                    {Icon && <Icon className="w-6 h-6" />}
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl">{cat.emoji}</span>
                    <h3 className="text-xl font-bold">{cat.title}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{cat.description}</p>
                  <p className="text-xs text-muted-foreground mb-5">
                    {cat.branches.length} branches · {featuredCount} ready to learn
                  </p>
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: cat.color }}>
                    Explore <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
