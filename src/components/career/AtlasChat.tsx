﻿import { useEffect, useMemo, useRef, useState } from "react";
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
import { getAtlasSubscriptionCapabilities } from "@/lib/atlas/subscriptionCapabilities";

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


/** Best-effort display name for the learner — never throws. */
function getLearnerName(user: { email?: string | null; user_metadata?: Record<string, unknown> } | null): string | null {
  if (!user) return null;
  try {
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const candidate =
      (typeof meta.full_name === "string" && meta.full_name) ||
      (typeof meta.name === "string" && meta.name) ||
      (typeof user.email === "string" && user.email.split("@")[0]) ||
      null;
    if (!candidate) return null;
    const first = candidate.trim().split(/\s+/)[0];
    return first ? first.charAt(0).toUpperCase() + first.slice(1) : null;
  } catch {
    return null;
  }
}

export function AtlasChat({
  lessonContext,
  layout = "floating",
  conversationKey,
  onMessagesChange,
}: {
  lessonContext?: AtlasLessonContext | null;
  layout?: "floating" | "workspace";
  conversationKey?: string;
  onMessagesChange?: (messages: AtlasConversationMessage[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AtlasConversationMessage[]>([]);
  const [entryState, setEntryState] = useState<AtlasEntryState | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<{ message: string; upgrade?: boolean } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();
  const { loading, tier } = useSubscription();
  const { progress } = useProgress();

  const allowed = getAtlasSubscriptionCapabilities(tier).canUseAtlas;
  const visible = layout === "workspace" || open;

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
    if (visible && allowed) inputRef.current?.focus();
  }, [visible, allowed, streaming]);

  useEffect(() => {
    if (!conversationKey) return;
    setMessages([]);
    setError(null);
    setEntryState(null);
  }, [conversationKey]);

  useEffect(() => {
    if (onMessagesChange) {
      onMessagesChange(messages);
    }
  }, [messages, onMessagesChange]);

  useEffect(() => {
    if (!visible || !allowed || !controllerContext) return;
    let cancelled = false;
    (async () => {
      try {
        const state = await controller.getEntryState(controllerContext);
        if (!cancelled) setEntryState(state);
      } catch (err) {
        console.warn("Atlas entry state unavailable", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, allowed, controller, controllerContext]);


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
      {layout === "floating" && <motion.button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full btn-primary-gold flex items-center justify-center shadow-lg"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.94 }}
        aria-label={open ? "Close Atlas" : "Ask Atlas"}
      >
        {open ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
      </motion.button>}

      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: EASE }}
            className={layout === "workspace"
              ? "flex h-full min-h-0 flex-col overflow-hidden"
              : "fixed bottom-20 right-4 left-4 sm:left-auto sm:w-[380px] z-40 max-h-[70vh] flex flex-col surface-card overflow-hidden"}
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
                  <span className="text-xs font-semibold uppercase tracking-wider">Atlas unavailable</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Sign in to use Atlas as a career guide, then upgrade to Builder for persistent roadmaps and project memory.
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
                      {(entryState?.starterPrompts?.length
                        ? entryState.starterPrompts
                        : lessonContext
                          ? LESSON_OPTIONS
                          : GOAL_OPTIONS
                      ).map((option) => (
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}


