import { useState, type ReactNode } from "react";
import { PanelRightClose } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { AtlasWorkspacePanel } from "./workspaceTypes";

export interface AtlasWorkspaceProject {
  id: string;
  title: string;
  summary: string;
}

interface AtlasContextPanelProps {
  activePanel: AtlasWorkspacePanel;
  branchTitle: string | null;
  phaseTitle: string | null;
  progressPercent: number;
  currentMission: { title: string; duration: string } | null;
  projects: AtlasWorkspaceProject[];
  xp: number;
  level: number;
  streak: number;
  studyFlowContent?: ReactNode;
  onSelectPanel: (panel: AtlasWorkspacePanel) => void;
  onClose: () => void;
  onPrompt: (prompt: string) => void;
}

const baseActions = [
  { label: "Explain differently", prompt: "Explain the learning concept I am working on in another way, using a simple analogy and one check for understanding." },
  { label: "Give me a hint", prompt: "Give me one small hint for my current learning challenge without revealing the full solution." },
  { label: "Show an example", prompt: "Show me a concise example that fits my current learning goals and explain each step." },
  { label: "Test my knowledge", prompt: "Give me one short question related to my current learning goals. Wait for my answer before giving feedback." },
  { label: "Break this into steps", prompt: "Help me choose a clear next step for my learning and break it into practical actions." },
  { label: "Review my project", prompt: "Help me review my current project. Ask me for the artifact or details you need." },
  { label: "Continue my mission", prompt: "Help me choose and continue one realistic mission for my current learning goals. Start with one actionable task." },
];

export function AtlasContextPanel({
  activePanel,
  branchTitle,
  phaseTitle,
  progressPercent,
  currentMission,
  projects,
  xp,
  level,
  streak,
  studyFlowContent,
  onSelectPanel,
  onClose,
  onPrompt,
}: AtlasContextPanelProps) {
  const [expandedActions, setExpandedActions] = useState(false);
  const contextualActions = branchTitle && currentMission
    ? [
        { label: "Explain differently", prompt: `Explain ${currentMission.title} in another way, using a simple analogy and one check for understanding.` },
        { label: "Give me a hint", prompt: `Give me one small hint for ${currentMission.title} without revealing the full solution.` },
        { label: "Show an example", prompt: `Show me a concise example related to ${currentMission.title} and explain each step.` },
        { label: "Test my knowledge", prompt: `Give me one short question about ${currentMission.title}. Wait for my answer before giving feedback.` },
        { label: "Break this into steps", prompt: `Break ${currentMission.title} into three practical steps I can complete.` },
        { label: "Review my project", prompt: `Help me review my current project for ${branchTitle}. Ask me for the artifact or details you need.` },
        { label: "Continue my mission", prompt: `Help me continue ${currentMission.title} in ${branchTitle}. Start with one actionable task.` },
      ]
    : baseActions;
  const shownActions = expandedActions ? contextualActions : contextualActions.slice(0, 4);

  return (
    <aside className="atlas-context-shell flex h-full min-h-0 w-full flex-col border-l border-atlas-border bg-atlas-sidebar" aria-label="Atlas learning context">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-atlas-border px-4">
        <div>
          <p className="text-sm font-semibold text-atlas-foreground">Context</p>
          <p className="text-xs text-atlas-muted">Your work, in focus</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="atlas-context-trigger h-9 w-9 text-atlas-muted hover:bg-atlas-surface hover:text-atlas-foreground"
          onClick={onClose}
          aria-label="Hide context panel"
          title="Hide context panel"
        >
          <PanelRightClose />
        </Button>
      </header>

      <div className="grid shrink-0 grid-cols-4 gap-1 border-b border-atlas-border p-2" role="tablist" aria-label="Context sections">
        {([
          ["learning", "Learning"],
          ["projects", "Projects"],
          ["progress", "Progress"],
          ["studyflow", "StudyFlow"],
        ] as const).map(([panel, label]) => (
          <Button
            key={panel}
            type="button"
            variant={activePanel === panel ? "secondary" : "ghost"}
            size="sm"
            className={`atlas-mode-control ${activePanel === panel ? "bg-atlas-surface text-atlas-foreground" : "text-atlas-muted hover:bg-atlas-surface hover:text-atlas-foreground"}`}
            onClick={() => onSelectPanel(panel)}
            role="tab"
            aria-selected={activePanel === panel}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="atlas-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {activePanel === "learning" && (
          <section className="space-y-5">
            {branchTitle ? (
              <div>
                <p className="text-[11px] font-medium uppercase text-atlas-muted">Selected path</p>
                <h2 className="mt-1 text-base font-semibold text-atlas-foreground">{branchTitle}</h2>
                {phaseTitle && <p className="mt-1 text-xs text-atlas-muted">{phaseTitle} phase</p>}
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-atlas-muted">Learning progress</span>
                  <span className="tabular-nums text-atlas-foreground">{progressPercent}%</span>
                </div>
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-atlas-surface"
                  role="progressbar"
                  aria-label="Learning progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressPercent}
                >
                  <div className="h-full rounded-full bg-atlas-accent transition-[width] duration-500" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            ) : (
              <div className="border-b border-atlas-border pb-5">
                <p className="text-[11px] font-medium uppercase text-atlas-muted">Learning path</p>
                <h2 className="mt-2 text-base font-semibold text-atlas-foreground">Choose where you want to grow</h2>
                <p className="mt-2 text-sm leading-6 text-atlas-muted">Your learning path and mission details will appear here after you choose a branch.</p>
                <Button asChild className="mt-4 bg-atlas-accent text-atlas-button-foreground hover:bg-atlas-accent/90">
                  <Link to="/paths">Explore paths</Link>
                </Button>
              </div>
            )}

            {currentMission && (
              <div className="border-b border-atlas-border pb-5">
                <p className="text-[11px] font-medium uppercase text-atlas-muted">Next mission</p>
                <p className="mt-2 text-sm font-medium text-atlas-foreground">{currentMission.title}</p>
                <p className="mt-1 text-xs text-atlas-muted">{currentMission.duration}</p>
              </div>
            )}
          </section>
        )}

        {activePanel === "projects" && (
          <section>
            <p className="text-[11px] font-medium uppercase text-atlas-muted">Active projects</p>
            {projects.length > 0 ? (
              <ul className="mt-2 divide-y divide-atlas-border">
                {projects.map((project) => (
                  <li key={project.id} className="py-3">
                    <p className="text-sm font-medium text-atlas-foreground">{project.title}</p>
                    <p className="mt-1 text-xs leading-5 text-atlas-muted">{project.summary}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 border-t border-atlas-border pt-4">
                <p className="text-sm text-atlas-muted">No active projects yet.</p>
                <Button type="button" variant="link" className="mt-2 h-auto p-0 text-atlas-accent" onClick={() => onPrompt("Help me choose a practical project that fits my current learning goals.")}>Plan a first project</Button>
              </div>
            )}
          </section>
        )}

        {activePanel === "progress" && (
          <section>
            <p className="text-[11px] font-medium uppercase text-atlas-muted">Your progress</p>
            <dl className="mt-2 divide-y divide-atlas-border">
              <div className="flex items-center justify-between py-3 text-sm">
                <dt className="text-atlas-muted">XP</dt>
                <dd className="tabular-nums font-medium text-atlas-foreground">{xp.toLocaleString()}</dd>
              </div>
              <div className="flex items-center justify-between py-3 text-sm">
                <dt className="text-atlas-muted">Level</dt>
                <dd className="tabular-nums font-medium text-atlas-foreground">{level}</dd>
              </div>
              <div className="flex items-center justify-between py-3 text-sm">
                <dt className="text-atlas-muted">Streak</dt>
                <dd className="tabular-nums font-medium text-atlas-foreground">{streak} days</dd>
              </div>
              {branchTitle && (
                <div className="flex items-center justify-between py-3 text-sm">
                  <dt className="text-atlas-muted">Path complete</dt>
                  <dd className="tabular-nums font-medium text-atlas-foreground">{progressPercent}%</dd>
                </div>
              )}

              {activePanel === "studyflow" && studyFlowContent}
            </dl>
            <Button asChild variant="outline" className="mt-4 w-full border-atlas-border bg-transparent text-atlas-foreground hover:bg-atlas-surface">
              <Link to="/profile">Open full profile</Link>
            </Button>
          </section>
        )}

        <section className="mt-6 border-t border-atlas-border pt-4" aria-labelledby="atlas-context-tools">
          <h3 id="atlas-context-tools" className="text-[11px] font-medium uppercase text-atlas-muted">Tools for this moment</h3>
          <div key={expandedActions ? "all-context-actions" : "primary-context-actions"} className="atlas-dropdown-enter mt-2 space-y-1">
            {shownActions.map((action) => (
              <Button
                key={action.label}
                type="button"
                variant="ghost"
                className="h-auto min-h-9 w-full justify-start whitespace-normal px-2 py-2 text-left text-xs text-atlas-muted hover:bg-atlas-surface hover:text-atlas-foreground"
                onClick={() => onPrompt(action.prompt)}
              >
                {action.label}
              </Button>
            ))}
          </div>
          {contextualActions.length > 4 && (
            <Button type="button" variant="link" className="mt-1 h-auto p-0 text-xs text-atlas-accent" onClick={() => setExpandedActions((expanded) => !expanded)}>
              {expandedActions ? "Show fewer tools" : "Show all tools"}
            </Button>
          )}
        </section>
      </div>
    </aside>
  );
}
