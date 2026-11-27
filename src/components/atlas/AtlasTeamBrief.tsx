import { useState } from "react";
import { buildTeamBrief, parseTeamBriefCommand, TEAM_BRIEF_COMMANDS, type BriefScope, type BriefTask } from "@/lib/collaboration/teamBrief";

export function AtlasTeamBrief({ scope, tasks, canUseDraft, onUseDraft }: {
  scope: BriefScope;
  tasks: readonly BriefTask[];
  canUseDraft: boolean;
  onUseDraft: (text: string) => void;
}) {
  const [command, setCommand] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState("");
  const ask = () => {
    const parsed = parseTeamBriefCommand(command);
    setAnswer(null);
    if (!parsed) {
      setError("Choose @Atlas status, @Atlas blockers or @Atlas next. Open-ended AI questions are not supported in this pilot.");
      return;
    }
    const result = buildTeamBrief(parsed, scope, tasks, Date.now());
    setAnswer(result);
    setError(result ? "" : "Project context changed. Reload the project before asking again.");
  };
  return (
    <div className="mb-3 space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
      <div>
        <h4 className="text-sm font-semibold">@Atlas · Project brief pilot</h4>
        <p className="mt-1 text-xs text-muted-foreground">Free rule-based guidance from the loaded project tasks. No AI request. Nothing is posted automatically.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {TEAM_BRIEF_COMMANDS.map(item => <button key={item} type="button" onClick={() => { setCommand(item); setAnswer(null); setError(""); }} className="rounded-md border border-border bg-background px-2 py-1 text-xs">{item}</button>)}
      </div>
      <form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); ask(); }}>
        <input aria-label="Atlas project command" value={command} maxLength={80} onChange={event => { setCommand(event.target.value); setAnswer(null); setError(""); }} placeholder="@Atlas status" className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" />
        <button type="submit" className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Ask Atlas</button>
      </form>
      <div aria-live="polite">
        {error && <p className="text-xs text-destructive">{error}</p>}
        {answer && <div className="space-y-2">
          <p className="whitespace-pre-wrap break-words text-sm">{answer}</p>
          <button type="button" disabled={!canUseDraft} onClick={() => onUseDraft(answer)} className="rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold disabled:opacity-50">Use as message draft</button>
          <p className="text-xs text-muted-foreground">{canUseDraft ? "Review the draft, then send it yourself if appropriate." : "Clear or send your existing message before using a new draft."}</p>
        </div>}
      </div>
    </div>
  );
}
