import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Monitor, Briefcase, BarChart3, ArrowRight } from "lucide-react";
import { paths } from "@/data/paths";
import { useProgress } from "@/hooks/useProgress";
import { PageTransition } from "@/components/career/PageTransition";

const iconMap: Record<string, React.ReactNode> = {
  Monitor: <Monitor className="w-8 h-8" />,
  Briefcase: <Briefcase className="w-8 h-8" />,
  BarChart3: <BarChart3 className="w-8 h-8" />,
};

export default function PathSelection() {
  const navigate = useNavigate();
  const { selectPath } = useProgress();

  const handleSelect = (pathId: string) => {
    selectPath(pathId);
    navigate(`/dashboard/${pathId}`);
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background px-4 py-16 flex flex-col items-center">
        <div className="max-w-4xl w-full">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Choose Your Path
            </h1>
            <p className="text-muted-foreground text-lg">
              Select a direction that resonates with your goals.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {paths.map((path, i) => (
              <motion.button
                key={path.id}
                onClick={() => handleSelect(path.id)}
                className="group text-left p-8 rounded-2xl border border-border bg-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 + 0.2, duration: 0.4 }}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-5"
                  style={{ backgroundColor: path.color, color: "white" }}
                >
                  {iconMap[path.icon]}
                </div>
                <h3 className="text-2xl font-bold mb-2">{path.title}</h3>
                <p className="text-muted-foreground text-sm mb-6 leading-relaxed">{path.description}</p>
                <div className="flex items-center gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ color: path.color }}>
                  Start path <ArrowRight className="w-4 h-4" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
