import { FormEvent, useMemo, useState } from "react";
import { Bot, BriefcaseBusiness, CheckCircle2, Code2, Gamepad2, Send, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

type DemoTrack = "game" | "web" | "business";
type DemoTier = "Explorer" | "Builder" | "Professional" | "Elite";

const tracks: Record<DemoTrack, { label: string; icon: typeof Gamepad2; phase: string; mission: string; completed: string; project: string; portfolio: string; progress: number }> = {
  game: { label: "Game Development", icon: Gamepad2, phase: "Builder phase", mission: "Create the character-controller prototype", completed: "Finished player movement", project: "Neon Runner", portfolio: "Playable movement prototype", progress: 68 },
  web: { label: "Web Development", icon: Code2, phase: "Professional phase", mission: "Build the responsive portfolio homepage", completed: "Finished semantic page structure", project: "Studio Portfolio", portfolio: "Responsive landing page", progress: 54 },
  business: { label: "Business", icon: BriefcaseBusiness, phase: "Elite phase", mission: "Write the first customer interview script", completed: "Defined the customer problem", project: "Campus Creator Kit", portfolio: "Validated offer brief", progress: 41 },
};

const answers: Record<DemoTrack, string> = {
  game: "Start with one scene and a capsule player. Confirm that movement feels good before adding the environment.",
  web: "Make the first section responsive at 375px before adding more content. That gives the portfolio a strong foundation.",
  business: "Use five short, open questions. Your goal is to hear the customer’s words, not to sell the solution yet.",
};

export default function Demo() {
  const [track, setTrack] = useState<DemoTrack>("game");
  const [tier, setTier] = useState<DemoTier>("Builder");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([{ role: "atlas", text: "I’m Atlas running on local sample data. I’ll help you finish one useful step without connecting to any account." }]);
  const current = tracks[track];
  const Icon = current.icon;
  const prompt = useMemo(() => `You are viewing a fake ${current.label} learner on the ${tier} plan.`, [current.label, tier]);

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim(); if (!text) return;
    setMessages(items => [...items, { role: "you", text }, { role: "atlas", text: answers[track] }]);
    setInput("");
  };

  return <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6">
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
        <div><div className="flex items-center gap-2 text-primary"><ShieldCheck className="h-4 w-4" /><span className="text-xs font-bold tracking-[.16em]">SAFE PRODUCT DEMO</span></div><h1 className="mt-2 text-2xl font-bold">CareerSourcer inspection mode</h1><p className="mt-1 text-sm text-muted-foreground">All names, progress, conversations, and projects below are fictional and kept in this browser only.</p></div>
        <Link to="/" className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Back to site</Link>
      </header>

      <section className="mt-5 flex flex-wrap gap-2 rounded-2xl border border-primary/20 bg-primary/[.06] p-3" aria-label="Demo controls">
        <span className="self-center text-xs font-semibold text-primary">Sample state</span>
        {(Object.keys(tracks) as DemoTrack[]).map(id => <button key={id} onClick={() => setTrack(id)} className={`rounded-lg px-3 py-2 text-sm ${track === id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}>{tracks[id].label}</button>)}
        {(["Explorer", "Builder", "Professional", "Elite"] as DemoTier[]).map(id => <button key={id} onClick={() => setTier(id)} className={`rounded-lg border px-3 py-2 text-sm ${tier === id ? "border-primary/60 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{id}</button>)}
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="flex items-center gap-3 border-b border-border p-5"><div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary"><Bot className="h-5 w-5" /></div><div><p className="font-semibold">Atlas · demo state</p><p className="text-xs text-muted-foreground">Local simulated conversation · no network requests</p></div></div>
          <div className="min-h-[420px] space-y-5 p-5 sm:p-8">{messages.map((message, index) => <div key={index} className={message.role === "you" ? "ml-auto max-w-[82%] rounded-2xl rounded-br-md bg-primary p-3 text-sm text-primary-foreground" : "max-w-xl text-sm leading-7"}>{message.role === "atlas" && <span className="mb-1 flex items-center gap-2 text-xs font-bold tracking-wider text-primary"><Sparkles className="h-3.5 w-3.5" /> ATLAS</span>}{message.text}</div>)}<div className="max-w-xl rounded-2xl border border-primary/25 bg-primary/[.07] p-4"><p className="text-[10px] font-bold tracking-[.15em] text-primary">ACTIVE MISSION</p><p className="mt-2 font-semibold">{current.mission}</p><p className="mt-1 text-sm text-muted-foreground">25 min · +120 XP · Sample action only</p><button type="button" className="mt-3 rounded-lg border border-primary/40 px-3 py-2 text-sm text-primary">Simulated continue</button></div></div>
          <form onSubmit={send} className="flex gap-2 border-t border-border p-4"><input value={input} onChange={event => setInput(event.target.value)} placeholder="Ask Atlas in demo mode..." className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" /><button type="submit" className="btn-primary-gold grid h-10 w-10 place-items-center rounded-xl" aria-label="Send demo message"><Send className="h-4 w-4" /></button></form>
        </section>
        <aside className="space-y-3"><section className="rounded-2xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-primary"><Icon className="h-4 w-4" /><span className="text-xs font-bold tracking-wider">LEARNER SNAPSHOT</span></div><p className="mt-3 font-semibold">Sample {current.label} learner</p><p className="mt-1 text-sm text-muted-foreground">{current.phase} · {tier} plan</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${current.progress}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">{current.progress}% path progress · 7-day streak</p></section><section className="rounded-2xl border border-border bg-card p-4"><p className="text-[10px] font-bold tracking-[.15em] text-primary">PROJECT IN PROGRESS</p><p className="mt-2 font-semibold">{current.project}</p><p className="mt-1 text-sm text-muted-foreground">Current milestone: {current.mission}</p></section><section className="rounded-2xl border border-border bg-card p-4"><p className="text-[10px] font-bold tracking-[.15em] text-primary">COMPLETED LESSON</p><div className="mt-2 flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /><p className="text-sm">{current.completed}</p></div></section><section className="rounded-2xl border border-border bg-card p-4"><p className="text-[10px] font-bold tracking-[.15em] text-primary">PORTFOLIO PROJECT</p><p className="mt-2 text-sm">{current.portfolio}</p></section><p className="px-2 text-xs leading-5 text-muted-foreground">{prompt} Payments are intentionally unavailable in demo mode.</p></aside>
      </div>
    </div>
  </main>;
}
