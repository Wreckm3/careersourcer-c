import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Focus, Menu, PanelRightClose, PanelRightOpen } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useProgress } from "@/hooks/useProgress";
import { useSubscription } from "@/hooks/useSubscription";
import { useAtlasEffectiveTier } from "@/hooks/useAtlasEffectiveTier";
import { useAtlasCredits } from "@/hooks/useAtlasCredits";
import { usePhases } from "@/lib/phases";
import { meetsTier, PLANS } from "@/lib/tiers";
import { categories, getBranch, getLesson } from "@/data/curriculum";
import { isEnabled } from "@/config/features";
import { createAtlasConversationController } from "@/lib/atlas/conversationController";
import { createAtlasMemoryService } from "@/lib/atlas/memoryService";
import { streamAtlasResponse } from "@/lib/atlas/atlasTransport";
import type { AtlasConversationMessage, AtlasMemory, AtlasProject } from "@/lib/atlas/types";
import { AtlasSidebar } from "@/components/atlas/AtlasSidebar";
import { AtlasContextPanel, type AtlasWorkspaceProject } from "@/components/atlas/AtlasContextPanel";
import { AtlasConversation } from "@/components/atlas/AtlasConversation";
import { AtlasOrb } from "@/components/atlas/AtlasOrb";
import { AtlasMissionCelebration } from "@/components/atlas/AtlasMissionCelebration";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { AtlasOrbState, AtlasResponseMode, AtlasWorkspacePanel } from "@/components/atlas/workspaceTypes";
import { ATLAS_MISSION_EVENT, type AtlasLessonContext } from "@/lib/atlas/lessonContext";
import {
  approveAtlasStudyFlow,
  assessAtlasStudyFlowEvidence,
  emptyAtlasStudyProfile,
  generateAtlasStudyFlow,
  loadAtlasStudyFlow,
  saveAtlasStudyProfile,
  submitAtlasStudyFlowEvidence,
  type AtlasStudyFlowEvidence,
  type AtlasStudyFlowAssessmentRecord,
  type AtlasStudyFlowRecord,
  type AtlasStudyProfile,
} from "@/lib/atlas/studyFlow";
import { AtlasStudyFlowPanel } from "@/components/atlas/AtlasStudyFlowPanel";
import { AtlasOpportunityPanel } from "@/components/atlas/AtlasOpportunityPanel";
import { AtlasResearchPilot } from "@/components/atlas/AtlasResearchPilot";

const MODE_PREFIXES: Record<AtlasResponseMode, (input: string) => string> = {
  Adaptive: (input) => input,
  Learn: (input) => `Teach me this clearly and check my understanding: ${input}`,
  Build: (input) => `Help me build this with practical, achievable steps: ${input}`,
  Challenge: (input) => `Challenge my thinking about this and test what I know: ${input}`,
  Career: (input) => `Give me practical career guidance about this: ${input}`,
};

function getLearnerName(user: { email?: string | null; user_metadata?: Record<string, unknown> } | null) {
  if (!user) return "";
  const metadata = user.user_metadata ?? {};
  const candidate = typeof metadata.full_name === "string"
    ? metadata.full_name
    : typeof metadata.name === "string"
      ? metadata.name
      : user.email?.split("@")[0] ?? "";
  return candidate.trim().split(/\s+/)[0] ?? "";
}

function toWorkspaceProject(project: AtlasProject | null): AtlasWorkspaceProject[] {
  if (!project) return [];
  return [{ id: project.id, title: project.title, summary: project.description }];
}

export default function AtlasWorkspace() {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { progress } = useProgress();
  const { tier: subscriptionTier, loading: subscriptionLoading } = useSubscription();
  const { tier: atlasTier, loading: atlasTierLoading, isFounder } = useAtlasEffectiveTier();
  const atlasCredits = useAtlasCredits();
  const refreshAtlasCredits = atlasCredits.refresh;
  const phases = usePhases(progress.selectedPath);
  const reducedMotion = useReducedMotion();
  const [messages, setMessages] = useState<AtlasConversationMessage[]>([]);
  const [archivedMessages, setArchivedMessages] = useState<AtlasConversationMessage[]>([]);
  const [storedMessages, setStoredMessages] = useState<AtlasConversationMessage[]>([]);
  const [storedProject, setStoredProject] = useState<AtlasProject | null>(null);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<{ message: string; upgrade?: boolean } | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [composerFocusKey, setComposerFocusKey] = useState(0);
  const [mode, setMode] = useState<AtlasResponseMode>("Adaptive");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState<"navigation" | "context" | null>(null);
  const [activePanel, setActivePanel] = useState<AtlasWorkspacePanel>("learning");
  const [celebrationKey, setCelebrationKey] = useState<number | null>(null);
  const [studyProfile, setStudyProfile] = useState<AtlasStudyProfile>(emptyAtlasStudyProfile);
  const [studyFlow, setStudyFlow] = useState<AtlasStudyFlowRecord | null>(null);
  const [studyEvidence, setStudyEvidence] = useState<AtlasStudyFlowEvidence[]>([]);
  const [studyAssessments, setStudyAssessments] = useState<AtlasStudyFlowAssessmentRecord[]>([]);
  const [studyFlowLoading, setStudyFlowLoading] = useState(false);
  const [studyFlowBusy, setStudyFlowBusy] = useState(false);
  const [studyFlowError, setStudyFlowError] = useState<string | null>(null);
  const celebrationTimerRef = useRef<number | null>(null);
  const sidebarPanelRef = useRef<HTMLDivElement>(null);

  const memoryService = useMemo(() => createAtlasMemoryService(), []);
  const controller = useMemo(
    () => createAtlasConversationController({ categories, memoryService }),
    [memoryService],
  );
  const navigationState = location.state as { lessonContext?: AtlasLessonContext } | null;
  const navigationLessonContext = navigationState?.lessonContext ?? null;
  const controllerContext = useMemo(
    () => user
      ? {
          userId: user.id,
          learnerName: getLearnerName(user) || null,
          tier: atlasTier,
          selectedPath: progress.selectedPath,
          completedSessions: progress.completedSessions,
          streakCurrent: progress.streakCurrent,
          lessonContext: navigationLessonContext,
        }
      : null,
    [atlasTier, navigationLessonContext, progress.completedSessions, progress.selectedPath, progress.streakCurrent, user],
  );

  const branchData = progress.selectedPath
    ? getBranch("technology", progress.selectedPath) ?? getBranch("business", progress.selectedPath) ?? getBranch("creative", progress.selectedPath)
    : undefined;
  const nextLessonId = phases.phaseStates.find((state) => state.unlocked && !state.isComplete)?.nextLessonId ?? null;
  const nextLesson = nextLessonId && progress.selectedPath ? getLesson(progress.selectedPath, nextLessonId) : undefined;
  const progressPercent = branchData
    ? Math.round((branchData.branch.lessons.filter((lesson) => progress.completedSessions.includes(lesson.id)).length / branchData.branch.lessons.length) * 100)
    : 0;
  const currentMission = nextLesson
    ? { title: nextLesson.lesson.title, duration: nextLesson.lesson.duration }
    : null;
  const refreshStudyFlow = useCallback(async () => {
    if (!user || !progress.selectedPath) {
      setStudyProfile(emptyAtlasStudyProfile);
      setStudyFlow(null);
      setStudyEvidence([]);
      setStudyAssessments([]);
      return;
    }
    const saved = await loadAtlasStudyFlow(user.id, progress.selectedPath);
    setStudyProfile(saved.profile);
    setStudyFlow(saved.flow);
    setStudyEvidence(saved.evidence);
    setStudyAssessments(saved.assessments);
  }, [progress.selectedPath, user]);

  useEffect(() => {
    let cancelled = false;
    setStudyFlowError(null);
    if (!user || !progress.selectedPath) {
      setStudyProfile(emptyAtlasStudyProfile);
      setStudyFlow(null);
      setStudyEvidence([]);
      setStudyAssessments([]);
      setStudyFlowLoading(false);
      return;
    }
    setStudyProfile(emptyAtlasStudyProfile);
    setStudyFlow(null);
    setStudyEvidence([]);
    setStudyAssessments([]);
    setStudyFlowLoading(true);
    void loadAtlasStudyFlow(user.id, progress.selectedPath)
      .then((saved) => {
        if (cancelled) return;
        setStudyProfile(saved.profile);
        setStudyFlow(saved.flow);
        setStudyEvidence(saved.evidence);
        setStudyAssessments(saved.assessments);
      })
      .catch((caught) => {
        if (cancelled) return;
        console.error("Could not load Atlas StudyFlow", caught);
        setStudyFlowError("Your saved StudyFlow could not be loaded. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setStudyFlowLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [progress.selectedPath, user]);

  const handleSaveStudyProfile = useCallback(async (profile: AtlasStudyProfile) => {
    if (!user) return;
    setStudyFlowBusy(true);
    setStudyFlowError(null);
    try {
      await saveAtlasStudyProfile(user.id, profile);
      setStudyProfile(profile);
    } catch (caught) {
      console.error("Could not save Atlas learner profile", caught);
      setStudyFlowError(caught instanceof Error ? caught.message : "Your learner profile could not be saved.");
    } finally {
      setStudyFlowBusy(false);
    }
  }, [user]);

  const handleGenerateStudyFlow = useCallback(async (
    operation: "generate" | "revise",
    instruction: string,
  ) => {
    if (!progress.selectedPath || studyFlowBusy || streaming) return;
    setStudyFlowBusy(true);
    setStudyFlowError(null);
    try {
      const result = await generateAtlasStudyFlow(operation, instruction);
      setMessages((previous) => [...previous, { role: "assistant", content: result.message }]);
      await refreshStudyFlow();
    } catch (caught) {
      console.error("Could not generate Atlas StudyFlow", caught);
      setStudyFlowError(caught instanceof Error ? caught.message : "Atlas could not prepare a StudyFlow.");
    } finally {
      await refreshAtlasCredits();
      setStudyFlowBusy(false);
    }
  }, [progress.selectedPath, refreshAtlasCredits, refreshStudyFlow, streaming, studyFlowBusy]);

  const handleApproveStudyFlow = useCallback(async () => {
    if (!progress.selectedPath || studyFlowBusy) return;
    setStudyFlowBusy(true);
    setStudyFlowError(null);
    try {
      const approved = await approveAtlasStudyFlow(progress.selectedPath);
      if (!approved) throw new Error("The approved roadmap could not be loaded.");
      await refreshStudyFlow();
    } catch (caught) {
      console.error("Could not approve Atlas StudyFlow", caught);
      setStudyFlowError(caught instanceof Error ? caught.message : "The StudyFlow could not be approved.");
    } finally {
      setStudyFlowBusy(false);
    }
  }, [progress.selectedPath, refreshStudyFlow, studyFlowBusy]);

  const handleSubmitStudyEvidence = useCallback(async (itemId: string, evidenceText: string) => {
    if (!progress.selectedPath || studyFlowBusy) return;
    setStudyFlowBusy(true);
    setStudyFlowError(null);
    try {
      await submitAtlasStudyFlowEvidence(progress.selectedPath, itemId, evidenceText);
      await refreshStudyFlow();
    } catch (caught) {
      console.error("Could not submit StudyFlow evidence", caught);
      setStudyFlowError(caught instanceof Error ? caught.message : "Your evidence could not be saved.");
    } finally {
      setStudyFlowBusy(false);
    }
  }, [progress.selectedPath, refreshStudyFlow, studyFlowBusy]);

  const handleAssessStudyEvidence = useCallback(async (evidenceId: string) => {
    if (!progress.selectedPath || studyFlowBusy || streaming) return;
    setStudyFlowBusy(true);
    setStudyFlowError(null);
    try {
      await assessAtlasStudyFlowEvidence(evidenceId);
      await refreshStudyFlow();
    } catch (caught) {
      console.error("Could not assess StudyFlow evidence", caught);
      setStudyFlowError(caught instanceof Error ? caught.message : "Atlas could not assess this evidence.");
    } finally {
      await refreshAtlasCredits();
      setStudyFlowBusy(false);
    }
  }, [progress.selectedPath, refreshAtlasCredits, refreshStudyFlow, streaming, studyFlowBusy]);
  const historyMessages = useMemo(
    () => [...storedMessages, ...archivedMessages],
    [archivedMessages, storedMessages],
  );
  const accessLocked = !atlasTierLoading && !meetsTier(atlasTier, "builder");
  const orbState: AtlasOrbState = error
    ? "error"
    : streaming
      ? messages[messages.length - 1]?.content ? "streaming" : "processing"
      : "idle";

  useEffect(() => {
    if (!user || atlasTierLoading) return;
    let cancelled = false;

    void memoryService.load(user.id, atlasTier).then((memory: AtlasMemory) => {
      if (cancelled) return;
      setStoredMessages(memory.recentConversations);
      setStoredProject(memory.currentProject);
    });

    return () => {
      cancelled = true;
    };
  }, [atlasTier, atlasTierLoading, memoryService, user]);

  useEffect(() => {
    const handleMissionCompletion = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const detail = event.detail as Partial<AtlasLessonContext> | undefined;
      if (detail?.missionCompleted !== true) return;

      setCelebrationKey((current) => (current ?? 0) + 1);
      if (celebrationTimerRef.current !== null) window.clearTimeout(celebrationTimerRef.current);
      celebrationTimerRef.current = window.setTimeout(() => setCelebrationKey(null), 1200);
    };

    window.addEventListener(ATLAS_MISSION_EVENT, handleMissionCompletion);
    return () => {
      window.removeEventListener(ATLAS_MISSION_EVENT, handleMissionCompletion);
      if (celebrationTimerRef.current !== null) window.clearTimeout(celebrationTimerRef.current);
    };
  }, []);

  useEffect(() => {
    sidebarPanelRef.current?.toggleAttribute("inert", focusMode);
  }, [focusMode]);

  const preparePrompt = useCallback((prompt: string) => {
    setDraft(prompt);
    setError(null);
    setMobileDrawer(null);
    setComposerFocusKey((key) => key + 1);
  }, []);

  const openContextPanel = useCallback((panel: AtlasWorkspacePanel) => {
    setActivePanel(panel);
    setContextOpen(true);
    setFocusMode(false);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setMobileDrawer("context");
    }
  }, []);

  const handleNewConversation = useCallback(() => {
    if (streaming) return;
    if (messages.length > 0) {
      setArchivedMessages((previous) => [...previous, ...messages].slice(-32));
    }
    setMessages([]);
    setDraft("");
    setError(null);
    setLastFailedPrompt(null);
    setMode("Adaptive");
    setMobileDrawer(null);
  }, [messages, streaming]);

  const send = useCallback(async (input: string, retryPrompt?: string) => {
    const rawInput = retryPrompt ?? input;
    const trimmed = rawInput.trim();
    if (!trimmed || streaming || !controllerContext || accessLocked) return;

    const prompt = retryPrompt ?? MODE_PREFIXES[mode](trimmed);
    setError(null);
    setDraft("");
    setStreaming(true);
    setLastFailedPrompt(null);
    let pendingMessages: AtlasConversationMessage[] | null = null;

    try {
      const plan = await controller.prepareTurn(controllerContext, messages, prompt);
      pendingMessages = plan.messages;
      setStoredProject(plan.memory.currentProject);
      setMessages([...plan.messages, { role: "assistant", content: "" }]);

      const { answer } = await streamAtlasResponse(plan.request, (answer) => {
        setMessages([...plan.messages, { role: "assistant", content: answer }]);
      });

      await controller.recordAssistantReply(plan, answer);
      await refreshAtlasCredits();
    } catch (caught) {
      const failure = caught as Error & { upgrade?: boolean };
      setMessages(pendingMessages ?? messages);
      setLastFailedPrompt(prompt);
      setError({
        message: failure.message || "Network problem reaching Atlas. Try again.",
        upgrade: failure.upgrade,
      });
      await refreshAtlasCredits();
    } finally {
      setStreaming(false);
    }
  }, [accessLocked, refreshAtlasCredits, controller, controllerContext, messages, mode, streaming]);

  const retry = useCallback(() => {
    if (lastFailedPrompt) void send(lastFailedPrompt, lastFailedPrompt);
  }, [lastFailedPrompt, send]);

  const panelTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };

  if (!user) {
    return <div className="atlas-workspace grid min-h-screen place-items-center px-6"><Link className="rounded-md bg-atlas-accent px-4 py-2 text-sm font-semibold text-atlas-button-foreground hover:opacity-90" to="/auth">Sign in to open Atlas</Link></div>;
  }

  if (!isEnabled("atlas")) {
    return <div className="atlas-workspace grid min-h-screen place-items-center px-6 text-center text-atlas-muted">Atlas is not available in this workspace.</div>;
  }

  const sidebar = (
    <AtlasSidebar
      collapsed={sidebarCollapsed}
      email={user.email ?? ""}
      name={getLearnerName(user)}
      tier={PLANS[subscriptionTier].name}
      recentMessages={historyMessages}
      currentMessages={messages}
      activePanel={activePanel}
      onNewConversation={handleNewConversation}
      onToggleCollapsed={() => setSidebarCollapsed((collapsed) => !collapsed)}
      onOpenPanel={openContextPanel}
      onUseMessage={preparePrompt}
      creditStatus={{
        available: atlasCredits.available,
        flexible: atlasCredits.flexible,
        reserve: atlasCredits.reserve,
        renewalAt: atlasCredits.renewalAt,
        essentialMode: atlasCredits.essentialMode,
      }}
    />
  );

  const contextPanel = (
    <AtlasContextPanel
      activePanel={activePanel}
      branchTitle={branchData?.branch.title ?? null}
      phaseTitle={phases.currentPhase ? phases.currentPhase.charAt(0).toUpperCase() + phases.currentPhase.slice(1) : null}
      progressPercent={progressPercent}
      currentMission={currentMission}
      projects={toWorkspaceProject(storedProject)}
      xp={phases.xp.total}
      level={phases.level.level}
      streak={progress.streakCurrent}
      studyFlowContent={(
        <>
          <AtlasStudyFlowPanel
            branchId={branchData?.branch.id ?? null}
            branchTitle={branchData?.branch.title ?? null}
            profile={studyProfile}
            flow={studyFlow}
            evidence={studyEvidence}
            assessments={studyAssessments}
            busy={studyFlowBusy || studyFlowLoading || streaming}
            error={studyFlowError}
            onSaveProfile={(profile) => void handleSaveStudyProfile(profile)}
            onGenerate={(operation, instruction) => void handleGenerateStudyFlow(operation, instruction)}
            onApprove={() => void handleApproveStudyFlow()}
            onSubmitEvidence={(itemId, evidence) => void handleSubmitStudyEvidence(itemId, evidence)}
            onAssessEvidence={(evidenceId) => void handleAssessStudyEvidence(evidenceId)}
            onPrompt={preparePrompt}
          />
          {user && !atlasTierLoading && isFounder && (branchData?.branch.id === "game-development" || branchData?.branch.id === "web-development" || branchData?.branch.id === "ai-automation") && import.meta.env.VITE_ATLAS_CURATED_RESEARCH_ENABLED === "true" && (
            <AtlasResearchPilot key={`${user.id}:${branchData.branch.id}`} userId={user.id} branchId={branchData.branch.id} onPrompt={preparePrompt} />
          )}
          {user && !atlasTierLoading && atlasTier === "elite" && branchData?.branch.id && (
            <AtlasOpportunityPanel key={`${user.id}:${branchData.branch.id}`} branchId={branchData.branch.id} />
          )}
        </>
      )}
      onSelectPanel={setActivePanel}
      onClose={() => {
        setContextOpen(false);
        setMobileDrawer(null);
      }}
      onPrompt={preparePrompt}
    />
  );

  return (
    <div className="atlas-workspace relative h-[100dvh] min-h-[32rem] overflow-hidden">
      <div className="flex h-full min-h-0">
        <motion.div
          ref={sidebarPanelRef}
          className="atlas-side-panel-enter hidden min-h-0 overflow-hidden lg:flex"
          initial={false}
          animate={{
            width: focusMode ? 0 : sidebarCollapsed ? 72 : 264,
            opacity: focusMode ? 0 : 1,
          }}
          transition={panelTransition}
          aria-hidden={focusMode || undefined}
          style={{ pointerEvents: focusMode ? "none" : "auto" }}
        >
          {sidebar}
        </motion.div>

        <main className="flex min-w-0 flex-1 flex-col bg-atlas-background">
          <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-atlas-border px-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-atlas-muted hover:bg-atlas-surface hover:text-atlas-foreground lg:hidden"
                onClick={() => setMobileDrawer("navigation")}
                aria-label="Open Atlas navigation"
              >
                <Menu />
              </Button>
              <AtlasOrb state={orbState} size="compact" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-atlas-foreground">Atlas 3.0</p>
                <p className="hidden truncate text-xs text-atlas-muted sm:block">Learn. Build. Become.</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="atlas-context-trigger text-atlas-muted hover:bg-atlas-surface hover:text-atlas-foreground sm:w-auto sm:px-3"
                onClick={() => {
                  setFocusMode((active) => !active);
                  setMobileDrawer(null);
                }}
                aria-pressed={focusMode}
                aria-label={focusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
              >
                <Focus />
                <span className="hidden sm:inline">{focusMode ? "Exit focus" : "Focus"}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="atlas-context-trigger text-atlas-muted hover:bg-atlas-surface hover:text-atlas-foreground"
                onClick={() => {
                  if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
                    setMobileDrawer("context");
                    return;
                  }
                  setContextOpen((open) => !open);
                  setFocusMode(false);
                }}
                aria-label={contextOpen ? "Hide learning context" : "Show learning context"}
                aria-pressed={contextOpen}
              >
                {contextOpen ? <PanelRightClose /> : <PanelRightOpen />}
              </Button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1">
            <section className="flex min-h-0 min-w-0 flex-1">
              {atlasTierLoading || authLoading || subscriptionLoading ? (
                <div className="grid h-full w-full place-items-center" aria-live="polite">
                  <div className="h-16 w-16 animate-pulse rounded-full border border-atlas-border bg-atlas-surface" aria-label="Loading Atlas workspace" />
                </div>
              ) : accessLocked ? (
                <div className="grid h-full w-full place-items-center px-5">
                  <div className="w-full max-w-md border border-atlas-border bg-atlas-surface p-6 text-center">
                    <p className="text-sm font-medium text-atlas-foreground">Atlas Workspace is a Basic feature</p>
                    <p className="mt-2 text-sm leading-6 text-atlas-muted">Your current subscription is {PLANS[subscriptionTier].name}. Upgrade to continue with persistent mentorship and project memory.</p>
                    <Button asChild className="mt-5 bg-atlas-accent text-atlas-button-foreground hover:bg-atlas-accent/90">
                      <Link to="/pricing">View plans</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <AtlasConversation
                  messages={messages}
                  draft={draft}
                  onDraftChange={setDraft}
                  onSubmit={() => void send(draft)}
                  streaming={streaming}
                  error={error?.message ?? null}
                  errorCanUpgrade={Boolean(error?.upgrade)}
                  accessLocked={false}
                  mode={mode}
                  onModeChange={setMode}
                  onPreparePrompt={preparePrompt}
                  orbState={orbState}
                  composerFocusKey={composerFocusKey}
                  onRetry={lastFailedPrompt ? retry : undefined}
                />
              )}
            </section>

            <AnimatePresence initial={false}>
              {!focusMode && contextOpen && (
                <motion.div
                  key="atlas-context-panel"
                  className="atlas-side-panel-enter hidden min-h-0 shrink-0 overflow-hidden lg:flex"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 304, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={panelTransition}
                >
                  {contextPanel}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {celebrationKey !== null && <AtlasMissionCelebration key={celebrationKey} />}

      <Sheet open={mobileDrawer === "navigation"} onOpenChange={(open) => setMobileDrawer(open ? "navigation" : null)}>
        <SheetContent side="left" className="atlas-workspace w-[min(88vw,20rem)] border-atlas-border bg-atlas-sidebar p-0 text-atlas-foreground sm:max-w-none">
          <SheetTitle className="sr-only">Atlas navigation</SheetTitle>
          <SheetDescription className="sr-only">Conversation history, learning links, and account details.</SheetDescription>
          <div className="h-full min-h-0">{sidebar}</div>
        </SheetContent>
      </Sheet>

      <Sheet open={mobileDrawer === "context"} onOpenChange={(open) => setMobileDrawer(open ? "context" : null)}>
        <SheetContent side="right" className="atlas-workspace w-[min(92vw,22rem)] border-atlas-border bg-atlas-sidebar p-0 text-atlas-foreground sm:max-w-none">
          <SheetTitle className="sr-only">Atlas learning context</SheetTitle>
          <SheetDescription className="sr-only">Your real learning path, progress, and contextual tools.</SheetDescription>
          <div className="h-full min-h-0">{contextPanel}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
