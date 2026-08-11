import { Link } from "react-router-dom";
import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, Award, Compass, Flame, FolderKanban, GraduationCap, Lock, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProgress } from "@/hooks/useProgress";
import { useSubscription } from "@/hooks/useSubscription";
import { usePhases } from "@/lib/phases";
import { getBranch, getLesson } from "@/data/curriculum";
import { AtlasActivation } from "@/components/career/AtlasActivation";
import { AtlasChat } from "@/components/career/AtlasChat";
import { PremiumGate } from "@/components/PremiumGate";

function Stat({ icon: Icon, label, value }: { icon: typeof Award; label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-card p-3"><Icon className="h-4 w-4 text-primary" /><p className="mt-2 text-lg font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>;
}

export default function AtlasWorkspace() {
  const { user, loading: authLoading } = useAuth();
  const { progress } = useProgress();
  const { tier, loading: subscriptionLoading } = useSubscription();
  const phases = usePhases(progress.selectedPath);
  const [activated, setActivated] = useState(false);
  const onReady = useCallback(() => setActivated(true), []);
  const branchData = progress.selectedPath
    ? getBranch("technology", progress.selectedPath) ?? getBranch("business", progress.selectedPath) ?? getBranch("creative", progress.selectedPath)
    : undefined;
  const nextLessonId = phases.phaseStates.find((state) => state.unlocked && !state.isComplete)?.nextLessonId ?? null;
  const nextLesson = nextLessonId && progress.selectedPath ? getLesson(progress.selectedPath, nextLessonId) : undefined;
  const currentProject = useMemo(() => phases.projects.find((project) => project.project.requiredLessonIds.some((id) => progress.completedSessions.includes(id))) ?? phases.projects[0], [phases.projects, progress.completedSessions]);
  const estimatedTime = nextLesson?.lesson.duration ?? "Choose a path";
  const progressPercent = branchData ? Math.round((branchData.branch.lessons.filter((lesson) => progress.completedSessions.includes(lesson.id)).length / branchData.branch.lessons.length) * 100) : 0;

  if (!user) return <div className="min-h-screen grid place-items-center bg-background"><Link className="btn-primary-gold rounded-lg px-4 py-2" to="/auth">Sign in to open Atlas</Link></div>;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-7">
      {!activated && <AtlasActivation loading={authLoading || subscriptionLoading} onReady={onReady} />}
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/25 bg-card p-5">
          <Link to="/profile" className="rounded-lg p-2 hover:bg-muted"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="flex-1"><p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Atlas workspace</p><h1 className="text-2xl font-black">Your career command center</h1><p className="text-sm text-muted-foreground">{branchData ? `${branchData.branch.title} · ${phases.currentPhase ?? "Explorer"}` : "Choose a branch to begin your roadmap."}</p></div>
          <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">{tier}</div>
        </header>

        <PremiumGate required="builder" featureName="Atlas Workspace">
          <main className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
            <section className="space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat icon={Award} label="XP" value={String(phases.xp.total)} />
                <Stat icon={GraduationCap} label="Level" value={`${phases.level.level}`} />
                <Stat icon={Flame} label="Streak" value={`${progress.streakCurrent} days`} />
                <Stat icon={Target} label="Progress" value={`${progressPercent}%`} />
              </div>
              <section className="rounded-2xl border border-border bg-card p-5"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Today’s objective</p><h2 className="mt-2 text-xl font-bold">{nextLesson?.lesson.title ?? "Select a learning branch"}</h2><p className="mt-1 text-sm text-muted-foreground">{nextLesson?.lesson.mission ?? "Atlas needs a branch before it can build a focused roadmap."}</p><div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-muted px-3 py-1">{estimatedTime}</span><span className="rounded-full bg-muted px-3 py-1">Next milestone: {currentProject?.project.title ?? "Foundation project"}</span></div>{nextLesson && <Link className="btn-primary-gold mt-5 inline-flex rounded-lg px-4 py-2 text-sm" to={`/session/${nextLesson.branch.id}/${nextLesson.lesson.id}`}>Start recommended mission</Link>}</section>
              <section className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-2"><Compass className="h-4 w-4 text-primary" /><h2 className="font-bold">Sequential roadmap</h2></div><div className="mt-4 space-y-3">{phases.phaseStates.map((state) => <div key={state.phase.definition.id} className="flex items-center gap-3 rounded-xl border border-border p-3"><div className={`h-2.5 w-2.5 rounded-full ${state.unlocked ? "bg-primary" : "bg-muted-foreground/40"}`} /><div className="min-w-0 flex-1"><p className="font-semibold capitalize">{state.phase.definition.title}</p><p className="text-xs text-muted-foreground">{state.completed}/{state.total} lessons · {state.lockedBy ? state.lockedBy === "tier" ? "Plan required" : "Complete prerequisite" : "Active"}</p></div>{!state.unlocked && <Lock className="h-4 w-4 text-muted-foreground" />}</div>)}</div></section>
              <section className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-2"><FolderKanban className="h-4 w-4 text-primary" /><h2 className="font-bold">Project focus</h2></div><p className="mt-3 font-semibold">{currentProject?.project.title ?? branchData?.branch.projectArc?.projectName ?? "Your first portfolio project"}</p><p className="mt-1 text-sm text-muted-foreground">{currentProject?.project.summary ?? branchData?.branch.projectArc?.promise ?? "Complete missions to turn learning into evidence you can show."}</p></section>
            </section>
            <AtlasChat layout="workspace" />
          </main>
        </PremiumGate>
      </div>
    </div>
  );
}
