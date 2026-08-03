import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Loader2, Lock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { isEnabled } from "@/config/features";
import type { AtlasLessonContext } from "@/lib/atlas/lessonContext";
import { categories } from "@/data/curriculum";
import { useProgress } from "@/hooks/useProgress";
import { createAtlasConversationController } from "@/lib/atlas/conversationController";
import { createAtlasMemoryService } from "@/lib/atlas/memoryService";
import { streamAtlasResponse } from "@/lib/atlas/atlasTransport";
import type { AtlasConversationMessage, AtlasEntryState } from "@/lib/atlas/types";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

function getLearnerName(user: ReturnType<typeof useAuth>["user"]) {
  const metadata = user?.user_metadata as { display_name?: string; full_name?: string; name?: string } | undefined;
  return metadata?.display_name ?? metadata?.full_name ?? metadata?.name ?? user?.email?.split("@")[0] ?? null;
}

export function AtlasChat({ lessonContext }: { lessonContext?: AtlasLessonContext | null }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AtlasConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<{ message: string; upgrade?: boolean } | null>(null);
  const [entryState, setEntryState] = useState<AtlasEntryState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();
  const { hasAccess, loading, tier } = useSubscription();
  const { progress } = useProgress();

  const allowed = hasAccess("builder");
  const memoryService = useMemo(() => createAtlasMemoryService(), []);
  const controller = useMemo(
    () => createAtlasConversationController({ categories, memoryService }),
    [memoryService],
  );
  const controllerContext = useMemo(
    () =>
      user
        ? {
            userId: user.id,
            learnerName: getLearnerName(user),
            tier,
            selectedPath: progress.selectedPath,
            completedSessions: progress.completedSessions,
            streakCurrent: progress.streakCurrent,
            lessonContext: lessonContext ?? undefined,
          }
        : null,
    [user, tier, progress.selectedPath, progress.completedSessions, progress.streakCurrent, lessonContext],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    if (open && allowed) inputRef.current?.focus();
  }, [open, allowed, streaming]);

  useEffect(() => {
    if (!controllerContext || !allowed) {
      setEntryState(null);
      return;
    }

    let mounted = true;
    controller
      .getEntryState(controllerContext)
      .then((state) => {
        if (mounted) setEntryState(state);
      })
      .catch((err) => console.warn("Could not prepare Atlas entry state", err));

    return () => {
      mounted = false;
    };
  }, [allowed, controller, controllerContext]);

  if (!isEnabled("atlas") || !user) return null;

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming || !controllerContext) return;

    setError(null);
    setInput("");
    setStreaming(true);

    try {
      const plan = await controller.prepareTurn(controllerContext, messages, trimmed);
      setMessages([...plan.messages, { role: "assistant", content: "" }]);

      const { answer } = await streamAtlasResponse(plan.request, (answer) => {
        setMessages([...plan.messages, { role: "assistant", content: answer }]);
      });

      if (!answer.trim()) {
        setMessages([
          ...plan.messages,
          { role: "assistant", content: "I didn't catch that. Try asking it a different way." },
        ]);
        return;
      }

      await controller.recordAssistantReply(plan, answer);
      controller.getEntryState(controllerContext).then(setEntryState).catch(() => {});
    } catch (err) {
      const failure = err as Error & { upgrade?: boolean };
      setMessages((current) => current.filter((message) => message.content));
      setError({
        message: failure.message || "Network problem reaching Atlas. Try again.",
        upgrade: failure.upgrade,
      });
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
                  {entryState?.subtitle ?? lessonContext?.mission ?? "Your build mentor"}
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
                  Atlas remembers your projects, suggests milestones, and keeps learning tied to what you build.
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
                        {entryState?.greeting ?? "What do you want to build?"}
                      </p>
                      <p className="text-xs text-muted-foreground -mt-1">
                        {entryState?.subtitle ?? "Pick one to get started, or type your own."}
                      </p>
                      {(entryState?.starterPrompts ?? []).map((option) => (
                        <button
                          key={option.label}
                          onClick={() => send(option.prompt)}
                          className="text-left text-sm px-3 py-2 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`text-sm rounded-xl px-3 py-2 max-w-[92%] ${
                        message.role === "user"
                          ? "self-end bg-primary/15 text-foreground"
                          : "self-start bg-muted text-foreground"
                      }`}
                    >
                      {message.role === "assistant" && !message.content && streaming ? (
                        <span className="flex gap-1 py-1" aria-label="Atlas is typing">
                          {[0, 1, 2].map((delay) => (
                            <motion.span
                              key={delay}
                              className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 1, repeat: Infinity, delay: delay * 0.15 }}
                            />
                          ))}
                        </span>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
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
                  onSubmit={(event) => {
                    event.preventDefault();
                    send(input);
                  }}
                  className="border-t border-border p-3 flex items-end gap-2"
                >
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        send(input);
                      }
                    }}
                    rows={1}
                    maxLength={2000}
                    placeholder="Ask Atlas..."
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
