import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { buildResearchPilotRequest, parseResearchPilotResult, draftResearchStudyPrompt, type ResearchPilotResult, type ResearchPilotInput } from "@/lib/atlas/researchClient";

/** Founder-only, explicitly enabled pilot. Server authorization is authoritative. */
export function AtlasResearchPilot({ userId, branchId, onPrompt }: { userId: string; branchId: string; onPrompt: (prompt: string) => void }) {
  const web = branchId === "web-development";
  const python = branchId === "ai-automation";
  const [css, setCss] = useState(false);
  const [editor, setEditor] = useState(false);
  const [files, setFiles] = useState(false);
  const [html, setHtml] = useState(false);
  const [interpreter, setInterpreter] = useState(false);
  const [basics, setBasics] = useState(false);
  const [avatar, setAvatar] = useState(false);
  const [fbx, setFbx] = useState(false);
  const [rig, setRig] = useState(false);
  const [minutes, setMinutes] = useState(60);
  const [result, setResult] = useState<ResearchPilotResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  const reset = () => { setResult(null); setError(""); };
  async function search() {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true); reset();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session || data.session.user.id !== userId) throw new Error("Sign in again to use the research pilot.");
      const input: ResearchPilotInput = web ? { goal: "web", css, editor, files, html: css && html, minutes }
        : python ? { goal: "python", interpreter, basics, minutes }
        : { goal: "unity", avatar, fbx, rig: avatar && rig, minutes };
      const request = buildResearchPilotRequest(input);
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/atlas-research`, {
        method: "POST", signal: controller.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error(response.status === 503 ? "The research pilot is not enabled yet." : response.status === 401 || response.status === 403 ? "Founder pilot access is required." : "Research is unavailable. Try again later.");
      const parsed = parseResearchPilotResult(await response.json(), request.stages.length);
      if (!parsed) throw new Error("The catalogue response did not pass validation.");
      if (!controller.signal.aborted) setResult(parsed);
    } catch (caught) {
      if (active.current === controller) setError(controller.signal.aborted ? "Research request timed out." : caught instanceof Error ? caught.message : "Research is unavailable.");
    } finally {
      clearTimeout(timer);
      if (active.current === controller) { active.current = null; setBusy(false); }
    }
  }
  const prompt = result && draftResearchStudyPrompt(result);
  const field = "mt-1 w-full rounded-md border border-atlas-border bg-atlas-background p-2 text-xs text-atlas-foreground";
  return <section aria-label="Curated research pilot" className="mt-4 space-y-3 rounded-xl border border-atlas-border bg-atlas-surface/50 p-3">
    <h3 className="text-sm font-semibold text-atlas-foreground">StudyFlow · Research pilot</h3>
    <p className="text-xs leading-5 text-atlas-muted">{web ? "Official MDN HTML/CSS documentation." : python ? "Official Python 3.14 documentation. Confirm you have Python 3.14 installed." : "Official Unity 6.0 documentation. Confirm you have Unity 6.0 installed."} No live internet search or AI credits. This pilot assumes a computer and internet access.</p>
    <fieldset disabled={busy} className="space-y-2 text-xs text-atlas-muted">
      {!web && !python && <label className="block">Learning goal<select className={field} value={avatar ? "avatar" : "import"} onChange={e => { setAvatar(e.target.value === "avatar"); reset(); }}><option value="import">Import an FBX model</option><option value="avatar">Import and configure a humanoid avatar</option></select></label>}
      <label className="block">Time per resource<select className={field} value={minutes} onChange={e => { setMinutes(Number(e.target.value)); reset(); }}><option value={30}>30 minutes</option><option value={60}>60 minutes</option><option value={120}>120 minutes</option></select></label>
      {web ? <>
        <label className="block">Learning goal<select className={field} value={css ? "css" : "html"} onChange={e => { setCss(e.target.value === "css"); reset(); }}><option value="html">Learn HTML syntax</option><option value="css">Review HTML and begin CSS</option></select></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={editor} onChange={e => { setEditor(e.target.checked); reset(); }} /> I have a web editor ready</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={files} onChange={e => { setFiles(e.target.checked); reset(); }} /> I can create and save files</label>
        {css && <label className="flex items-center gap-2"><input type="checkbox" checked={html} onChange={e => { setHtml(e.target.checked); reset(); }} /> I already understand basic HTML</label>}
      </> : python ? <>
        <label className="flex items-center gap-2"><input type="checkbox" checked={interpreter} onChange={e => { setInterpreter(e.target.checked); reset(); }} /> Python 3.14 interpreter is ready</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={basics} onChange={e => { setBasics(e.target.checked); reset(); }} /> I have basic programming knowledge</label>
      </> : <>
      <label className="flex items-center gap-2"><input type="checkbox" checked={fbx} onChange={e => { setFbx(e.target.checked); reset(); }} /> I have an FBX model ready</label>
      {avatar && <label className="flex items-center gap-2"><input type="checkbox" checked={rig} onChange={e => { setRig(e.target.checked); reset(); }} /> The model has a humanoid rig</label>}
      </>}
      <Button type="button" size="sm" disabled={busy} onClick={() => void search()}>{busy ? "Checking catalogue…" : "Find documentation"}</Button>
    </fieldset>
    {error && <p role="alert" className="text-xs text-atlas-muted">{error}</p>}
    {result && <div aria-live="polite" className="space-y-2 text-xs text-atlas-muted">
      {result.resources.map((resource, i) => <div key={resource.id} className="rounded-md border border-atlas-border p-2"><a className="font-medium text-atlas-accent underline" href={resource.url} target="_blank" rel="noopener noreferrer">{i + 1}. {resource.title}</a><p>{resource.source} · about {resource.estimatedMinutes} min · reviewed {resource.reviewedAt.slice(0, 10)}</p></div>)}
      {result.blockedStage !== null && <p>No matching reviewed resource for step {result.blockedStage + 1}. Check prerequisites, time or catalogue freshness. No alternative was invented.</p>}
      <p>Prerequisites are self-reported; recommendations are not verified mastery. Links were reviewed manually, not live-checked.</p>
      {prompt && <Button type="button" variant="outline" size="sm" onClick={() => onPrompt(prompt)}>Prepare StudyFlow prompt</Button>}
      {prompt && <p>Prepares a draft only. Sending it is a separate Atlas request subject to existing AI controls.</p>}
    </div>}
  </section>;
}
