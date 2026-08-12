import { Link } from "react-router-dom";
import { useCallback, useMemo, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProgress } from "@/hooks/useProgress";
import { useSubscription } from "@/hooks/useSubscription";
import { usePhases } from "@/lib/phases";
import { getBranch, getLesson } from "@/data/curriculum";
import { AtlasActivation } from "@/components/career/AtlasActivation";
import { AtlasChat } from "@/components/career/AtlasChat";
import { PremiumGate } from "@/components/PremiumGate";
import type { AtlasConversationMessage } from "@/lib/atlas/types";

export default function AtlasWorkspace() {
  const { user, loading: authLoading } = useAuth();
  const { progress } = useProgress();
  const { tier, loading: subscriptionLoading } = useSubscription();
  const phases = usePhases(progress.selectedPath);
  const [activated, setActivated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversationKey, setConversationKey] = useState(String(Date.now()));
  const [sessionHistory, setSessionHistory] = useState<AtlasConversationMessage[]>([]);
  const onReady = useCallback(() => setActivated(true), []);
  const branchData = progress.selectedPath
    ? getBranch("technology", progress.selectedPath) ?? getBranch("business", progress.selectedPath) ?? getBranch("creative", progress.selectedPath)
    : undefined;
  const nextLessonId = phases.phaseStates.find((state) => state.unlocked && !state.isComplete)?.nextLessonId ?? null;
  const nextLesson = nextLessonId && progress.selectedPath ? getLesson(progress.selectedPath, nextLessonId) : undefined;
  const currentProject = useMemo(
    () => phases.projects.find((project) => project.project.requiredLessonIds.some((id) => progress.completedSessions.includes(id))) ?? phases.projects[0],
    [phases.projects, progress.completedSessions],
  );
  const estimatedTime = nextLesson?.lesson.duration ?? "Choose a path";
  const progressPercent = branchData
    ? Math.round((branchData.branch.lessons.filter((lesson) => progress.completedSessions.includes(lesson.id)).length / branchData.branch.lessons.length) * 100)
    : 0;

  const handleNewConversation = () => {
    setConversationKey(String(Date.now()));
    setSessionHistory([]);
  };

  if (!user) return <div className="min-h-screen grid place-items-center bg-background"><Link className="btn-primary-gold rounded-lg px-4 py-2" to="/auth">Sign in to open Atlas</Link></div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {!activated && <AtlasActivation loading={authLoading || subscriptionLoading} onReady={onReady} />}

      <div className="relative mx-auto flex min-h-screen max-w-[1800px] flex-col lg:flex-row">
        <aside className="hidden shrink-0 border-r border-border bg-surface/70 lg:flex lg:w-[270px] lg:flex-col">
          <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-5 py-5 backdrop-blur-sm">
            <div className="flex items-center gap-3 text-primary">
              <Sparkles className="h-4 w-4" />
              <p className="text-xs uppercase tracking-[0.35em]">Atlas</p>
            </div>
            <h2 className="mt-4 text-xl font-black">AI Workspace</h2>
            <p className="mt-3 text-sm text-muted-foreground">{branchData ? `${branchData.branch.title} · ${phases.currentPhase ?? "Explorer"}` : "Choose a branch to begin your roadmap."}</p>
          </div>

          <div className="flex flex-1 flex-col justify-between overflow-y-auto px-5 py-5">
            <div className="space-y-5">
              <button
                onClick={handleNewConversation}
                className="w-full rounded-full border border-primary/30 bg-primary/10 px-4 py-3 text-left text-sm font-semibold text-primary transition hover:bg-primary/15"
              >
                + New conversation
              </button>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.35em] text-primary">Conversation history</p>
                {sessionHistory.length === 0 ? (
                  <div className="rounded-3xl border border-border bg-muted/10 px-4 py-4 text-sm text-muted-foreground">
                    Start a chat to see your recent conversation history here.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessionHistory
                      .slice(-4)
                      .reverse()
                      .map((message, index) => (
                        <div key={`${message.role}-${index}`} className="rounded-3xl border border-border bg-background/70 px-4 py-3 text-sm">
                          <p className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground">{message.role === "user" ? "You" : "Atlas"}</p>
                          <p className="mt-2 line-clamp-2 text-sm text-foreground">{message.content}</p>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.35em] text-primary">Learning snapshot</p>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between gap-3">
                    <span>XP</span>
                    <span className="font-semibold text-foreground">{phases.xp.total}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Level</span>
                    <span className="font-semibold text-foreground">{phases.level.level}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Streak</span>
                    <span className="font-semibold text-foreground">{progress.streakCurrent} days</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Progress</span>
                    <span className="font-semibold text-foreground">{progressPercent}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t border-border pt-5 text-sm text-muted-foreground">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-primary">Current project</p>
                <p className="mt-2 font-semibold text-foreground">{currentProject?.project.title ?? branchData?.branch.projectArc?.projectName ?? "Foundation project"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{currentProject?.project.summary ?? branchData?.branch.projectArc?.promise ?? "Complete missions to turn learning into evidence you can show."}</p>
              </div>
              <Link
                to="/profile"
                className="inline-flex w-full items-center justify-center rounded-full border border-border bg-background/80 px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted/10"
              >
                Profile & settings
              </Link>
            </div>
          </div>
        </aside>

        <main className="flex flex-1 flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-5 lg:px-8">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-primary">Atlas</p>
              <h1 className="mt-3 text-2xl font-black">Your AI assistant workspace</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Ask Atlas about your current path, mission, or portfolio project. The chat is the center of this workspace.</p>
            </div>
            <div className="hidden text-right text-sm text-muted-foreground lg:block">
              <p>Branch: {branchData?.branch.title ?? "Not selected"}</p>
              <p className="mt-2">{estimatedTime} · {progressPercent}%</p>
              <p className="mt-2">Tier: {tier}</p>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex items-center rounded-full border border-border bg-background/80 px-4 py-2 text-sm text-foreground transition hover:bg-muted/10 lg:hidden"
            >
              Workspace
            </button>
          </div>

          <div className="flex flex-1 min-h-0 overflow-hidden p-5 lg:p-8">
            <div className="relative flex flex-1 min-h-0 overflow-hidden rounded-[2rem] border border-border bg-background/90 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
              <PremiumGate required="builder" featureName="Atlas Workspace">
                <AtlasChat
                  layout="workspace"
                  conversationKey={conversationKey}
                  onMessagesChange={setSessionHistory}
                />
              </PremiumGate>
            </div>
          </div>
        </main>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex bg-background/70 lg:hidden">
          <div className="relative flex w-full max-w-[280px] flex-col border-l border-border bg-surface/95 px-5 py-5 shadow-2xl backdrop-blur-sm">
            <button onClick={() => setSidebarOpen(false)} className="absolute right-4 top-4 rounded-full border border-border bg-background/80 p-2 text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
            <div className="pt-8">
              <div className="flex items-center gap-3 text-primary">
                <Sparkles className="h-4 w-4" />
                <p className="text-xs uppercase tracking-[0.35em]">Atlas</p>
              </div>
              <h2 className="mt-4 text-xl font-black">Workspace</h2>
              <p className="mt-3 text-sm text-muted-foreground">A compact view of your ongoing chat and learning progress.</p>
            </div>

            <div className="mt-6 flex flex-1 flex-col justify-between gap-5">
              <div className="space-y-4">
                <button
                  onClick={handleNewConversation}
                  className="w-full rounded-full border border-primary/30 bg-primary/10 px-4 py-3 text-left text-sm font-semibold text-primary transition hover:bg-primary/15"
                >
                  + New conversation
                </button>
                <div className="rounded-3xl border border-border bg-background/80 p-4">
                  <p className="text-xs uppercase tracking-[0.35em] text-primary">Learning snapshot</p>
                  <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between gap-3">
                      <span>XP</span>
                      <span className="font-semibold text-foreground">{phases.xp.total}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Level</span>
                      <span className="font-semibold text-foreground">{phases.level.level}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Progress</span>
                      <span className="font-semibold text-foreground">{progressPercent}%</span>
                    </div>
                  </div>
                </div>
              </div>
              <Link
                to="/profile"
                className="inline-flex w-full items-center justify-center rounded-full border border-border bg-background/80 px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted/10"
              >
                Profile & settings
              </Link>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="flex-1 bg-transparent" aria-label="Close workspace menu" />
        </div>
      )}
    </div>
  );
}
