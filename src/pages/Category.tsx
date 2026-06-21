import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Search, Sparkles, Lock } from "lucide-react";
import { getCategory, searchBranches, getBranchProgress } from "@/data/curriculum";
import { useProgress } from "@/hooks/useProgress";

const exampleQueries = [
  "I want to build games",
  "I want to make websites",
  "I want to earn online",
  "I want to edit videos",
  "I want to design logos",
];

export default function Category() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { progress } = useProgress();
  const category = getCategory(categoryId || "");
  const [query, setQuery] = useState("");

  const searchResults = useMemo(() => searchBranches(query), [query]);

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Category not found.</p>
      </div>
    );
  }

  const branchesToShow = query.trim()
    ? searchResults.map((r) => r.branch)
    : category.branches;

  return (
    <motion.div
      className="min-h-screen bg-background px-4 py-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate("/paths")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> All categories
        </button>

        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-3xl">{category.emoji}</span>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">{category.title}</h1>
          </div>
          <p className="text-muted-foreground">{category.description}</p>
        </motion.div>

        {/* Guided search */}
        <motion.div
          className="mb-8 p-5 rounded-2xl border border-border bg-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4" style={{ color: category.color }} />
            <p className="text-sm font-semibold">Not sure where to start?</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Try: "I want to build games"'
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2"
              style={{ ["--tw-ring-color" as never]: category.color }}
            />
          </div>
          {!query && (
            <div className="flex flex-wrap gap-2 mt-3">
              {exampleQueries.map((q) => (
                <button
                  key={q}
                  onClick={() => setQuery(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          {query && searchResults.length === 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              No match found. Try a different phrase or browse all branches below.
            </p>
          )}
        </motion.div>

        {/* Branches */}
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
          {query.trim() ? "Best matches" : "Branches"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {branchesToShow.map((branch, i) => {
              const progressInfo = getBranchProgress(branch, progress.completedSessions);
              return (
                <motion.button
                  key={branch.id}
                  layout
                  onClick={() =>
                    branch.featured && navigate(`/branch/${category.id}/${branch.id}`)
                  }
                  disabled={!branch.featured}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={branch.featured ? { y: -3 } : undefined}
                  className={`group relative text-left p-5 rounded-2xl border bg-card transition-all ${
                    branch.featured
                      ? "border-border cursor-pointer hover:shadow-md"
                      : "border-border/50 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{branch.emoji}</span>
                      <h3 className="font-bold">{branch.title}</h3>
                    </div>
                    {!branch.featured && (
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        <Lock className="w-3 h-3" /> Soon
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold mb-1" style={{ color: category.color }}>
                    {branch.tagline}
                  </p>
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                    {branch.description}
                  </p>
                  {branch.featured && (
                    <>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>{branch.lessons.length} lessons</span>
                        {progressInfo.completed > 0 && (
                          <span>{progressInfo.percent}% done</span>
                        )}
                      </div>
                      {progressInfo.completed > 0 && (
                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden mb-3">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${progressInfo.percent}%`,
                              backgroundColor: category.color,
                            }}
                          />
                        </div>
                      )}
                      <div
                        className="flex items-center gap-1 text-sm font-semibold"
                        style={{ color: category.color }}
                      >
                        {progressInfo.completed > 0 ? "Continue" : "Start learning"}
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </>
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
