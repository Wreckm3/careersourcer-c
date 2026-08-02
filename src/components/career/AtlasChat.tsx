import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Loader2, Lock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { isEnabled } from "@/config/features";
import { buildAtlasLearnerProfile, type AtlasLessonContext } from "@/lib/atlas/lessonContext";
import { categories } from "@/data/curriculum";
import { useProgress } from "@/hooks/useProgress";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

const ATLAS_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/atlas`;

/** Guided entry — Atlas leads with goals instead of "How can I help?". */
const GOAL_OPTIONS: { label: string; prompt: string }[] = [
  { label: "I want to build a website", prompt: "I want to build a website. What should I build first and which lessons here get me there?" },
  { label: "I want to build a game", prompt: "I want to build a game. Give me a small first game idea and the milestones to finish it." },
  { label: "I want to build an AI tool", prompt: "I want to build an AI tool. Suggest a beginner-sized AI project and break it into milestones." },
  { label: "I want to start a business", prompt: "I want to start a small business. Help me pick something I can start this month and the first three steps." },
  { label: "Help me find an idea", prompt: "Help me find a project idea that fits what I've completed so far." },
];

const LESSON_OPTIONS: { label: string; prompt: string }[] = [
  { label: "I'm stuck — what do I do next?", prompt: "I'm stuck on this mission. What is the very next thing I should do?" },
  { label: "Review my approach", prompt: "Here's how I'm approaching this mission — review it and tell me the weakest part." },
  { label: "Which tool should I use?", prompt: "Which tool should I use for this mission, and why that one?" },
  { label: "How does this fit my bigger project?", prompt: "How does this mission connect to the full project this track is building?" },
];


export function AtlasChat({ lessonContext }: { lessonContext?: AtlasLessonContext | null }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<{ message: string; upgrade?: boolean } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();
  const { hasAccess, loading } = useSubscription();
  const { progress } = useProgress();

  const allowed = hasAccess("builder");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    if (open && allowed) inputRef.current?.focus();
  }, [open, allowed, streaming]);

  if (!isEnabled("atlas") || !user) return null;

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setError(null);
    setInput("");
    const history = [...messages, { role: "user" as const, content: trimmed }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch(ATLAS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session?.access_token ?? ""}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: history,
          lessonContext: lessonContext ?? null,
          learnerProfile: buildAtlasLearnerProfile(
            categories,
            progress.completedSessions,
            progress.streakCurrent,
          ),
        }),
      });

      if (!res.ok || !res.body) {
        const payload = await res.json().catch(() => ({}));
        setMessages(history);
        setError({
          message:
            typeof payload.error === "string" ? payload.error : "Atlas could not answer that.",
          upgrade: !!payload.upgrade,
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();
          if (!raw || raw === "[DONE]") continue;
          try {
            const evt = JSON.parse(raw);
            if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
              answer += evt.delta;
              setMessages([...history, { role: "assistant", content: answer }]);
            }
          } catch {
            /* partial frame — ignore */
          }
        }
      }

      if (!answer.trim()) {
        setMessages([
          ...history,
          { role: "assistant", content: "I didn't catch that — try asking it a different way." },
        ]);
      }
    } catch {
      setMessages(history);
      setError({ message: "Network problem reaching Atlas. Try again." });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full btn-primary-gold flex items-center justify-center shadow-lg"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.94 }}
        aria-label={open ? "Close Atlas" : "Ask Atlas"}
      >
        {open ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="fixed bottom-20 right-4 left-4 sm:left-auto sm:w-[380px] z-40 max-h-[70vh] flex flex-col surface-card overflow-hidden"
            role="dialog"
            aria-label="Atlas mentor"
          >
            <header className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Sparkles className="w-4 h-4 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">Atlas</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {lessonContext ? lessonContext.mission : "Your build mentor"}
                </p>
              </div>
            </header>

            {loading ? (
              <div className="p-6 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !allowed ? (
              <div className="p-6 flex flex-col items-start gap-3">
                <div className="flex items-center gap-2 text-primary">
                  <Lock className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Builder plan</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Atlas reviews your missions, suggests tools, and tells you exactly what to build next.
                </p>
                <Link to="/pricing" className="btn-primary-gold px-4 py-2 rounded-lg text-sm">
                  Unlock Atlas
                </Link>
              </div>
            ) : (
              <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
                  {messages.length === 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-foreground font-medium">
                        {lessonContext
                          ? "What do you need on this mission?"
                          : "What do you want to build?"}
                      </p>
                      <p className="text-xs text-muted-foreground -mt-1">
                        Pick one to get started — or type your own.
                      </p>
                      {(lessonContext ? LESSON_OPTIONS : GOAL_OPTIONS).map((o) => (
                        <button
                          key={o.label}
                          onClick={() => send(o.prompt)}
                          className="text-left text-sm px-3 py-2 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  )}


                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`text-sm rounded-xl px-3 py-2 max-w-[92%] ${
                        m.role === "user"
                          ? "self-end bg-primary/15 text-foreground"
                          : "self-start bg-muted text-foreground"
                      }`}
                    >
                      {m.role === "assistant" && !m.content && streaming ? (
                        <span className="flex gap-1 py-1" aria-label="Atlas is typing">
                          {[0, 1, 2].map((d) => (
                            <motion.span
                              key={d}
                              className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 1, repeat: Infinity, delay: d * 0.15 }}
                            />
                          ))}
                        </span>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  ))}

                  {error && (
                    <div className="text-sm rounded-xl px-3 py-2 border border-destructive/40 text-destructive-foreground bg-destructive/10">
                      {error.message}
                      {error.upgrade && (
                        <Link to="/pricing" className="block mt-2 underline text-primary">
                          See plans
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    send(input);
                  }}
                  className="border-t border-border p-3 flex items-end gap-2"
                >
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send(input);
                      }
                    }}
                    rows={1}
                    maxLength={2000}
                    placeholder="Ask Atlas…"
                    className="flex-1 resize-none max-h-28 px-3 py-2 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    type="submit"
                    disabled={streaming || !input.trim()}
                    className="btn-primary-gold h-9 w-9 rounded-lg flex items-center justify-center disabled:opacity-40"
                    aria-label="Send"
                  >
                    {streaming ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>
              </>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
