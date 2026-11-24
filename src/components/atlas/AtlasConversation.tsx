import { isValidElement, type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, Lock, RotateCcw, Send } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import type { AtlasConversationMessage } from "@/lib/atlas/types";
import { AtlasOrb } from "./AtlasOrb";
import type { AtlasOrbState, AtlasResponseMode } from "./workspaceTypes";

export interface AtlasConversationProps {
  messages: AtlasConversationMessage[];
  draft: string;
  streaming: boolean;
  error: string | null;
  errorCanUpgrade?: boolean;
  accessLocked: boolean;
  mode: AtlasResponseMode;
  orbState: AtlasOrbState;
  composerFocusKey?: number;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onModeChange: (mode: AtlasResponseMode) => void;
  onPreparePrompt: (prompt: string) => void;
  onRetry?: () => void;
}

const starterCards = [
  {
    label: "Teach me something",
    description: "Make a useful concept click.",
    prompt: "Teach me one useful concept for my current learning path, then check my understanding.",
  },
  {
    label: "Build with me",
    description: "Turn an idea into a practical next step.",
    prompt: "Help me build something practical that fits my current learning path. Start with the best next step.",
  },
  {
    label: "Challenge me",
    description: "Pressure-test what you know.",
    prompt: "Challenge my understanding of my current learning path with one thoughtful question, then wait for my answer.",
  },
  {
    label: "Guide my career",
    description: "Connect today’s work to your direction.",
    prompt: "Guide my next career move based on my current learning progress and projects.",
  },
];

const responseModes: AtlasResponseMode[] = ["Adaptive", "Learn", "Build", "Challenge", "Career"];
const atlasEase = [0.22, 1, 0.36, 1] as const;

function textFromNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textFromNode(node.props.children);
  return "";
}

async function copyToClipboard(value: string): Promise<boolean> {
  if (!value) return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the legacy browser-safe path.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  } catch {
    return false;
  }
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const success = await copyToClipboard(value);
    if (!success) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium text-atlas-muted transition-colors hover:bg-atlas-surface hover:text-atlas-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent"
      aria-label={`${label} message`}
    >
      {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}

function MarkdownCodeBlock({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const code = textFromNode(children).replace(/\n$/, "");

  const copy = async () => {
    const success = await copyToClipboard(code);
    if (!success) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="not-prose my-3 overflow-hidden rounded-lg border border-atlas-border bg-atlas-background">
      <div className="flex items-center justify-end border-b border-atlas-border px-2 py-1">
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex h-7 items-center gap-1 rounded px-1.5 text-[11px] text-atlas-muted transition-colors hover:bg-atlas-surface hover:text-atlas-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <pre className="atlas-scrollbar overflow-x-auto p-3 text-xs leading-6 text-atlas-foreground">{children}</pre>
    </div>
  );
}

function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none break-words text-atlas-foreground prose-headings:text-atlas-foreground prose-p:my-2 prose-p:leading-7 prose-strong:text-atlas-foreground prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-a:text-atlas-accent prose-a:underline prose-code:rounded prose-code:bg-atlas-surface prose-code:px-1 prose-code:py-0.5 prose-code:text-atlas-foreground prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown
        components={{
          pre: ({ children }) => <MarkdownCodeBlock>{children}</MarkdownCodeBlock>,
          code: ({ className, children, ...props }) => (
            <code className={className} {...props}>
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function AtlasMessageMotion({
  children,
  className,
  shouldEnter,
}: {
  children: ReactNode;
  className: string;
  shouldEnter: boolean;
}) {
  const entersOnMount = useRef(shouldEnter).current;

  return (
    <motion.article
      className={className}
      initial={entersOnMount ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={entersOnMount ? { duration: 0.26, ease: atlasEase } : { duration: 0 }}
    >
      {children}
    </motion.article>
  );
}

export function AtlasConversation({
  messages,
  draft,
  streaming,
  error,
  errorCanUpgrade = false,
  accessLocked,
  mode,
  orbState,
  composerFocusKey = 0,
  onDraftChange,
  onSubmit,
  onModeChange,
  onPreparePrompt,
  onRetry,
}: AtlasConversationProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastComposerFocusKey = useRef(composerFocusKey);
  const renderedMessageKeys = useRef(new Set<string>());
  const previousMessageCount = useRef(messages.length);
  const reducedMotion = useReducedMotion();
  const viewTransition = reducedMotion ? { duration: 0 } : { duration: 0.3, ease: atlasEase };

  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 192)}px`;
  };

  useEffect(() => {
    resizeTextarea();
  }, [draft]);

  useEffect(() => {
    if (composerFocusKey === lastComposerFocusKey.current) return;
    lastComposerFocusKey.current = composerFocusKey;
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  }, [composerFocusKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: streaming ? "auto" : "smooth",
    });
  }, [messages, streaming, error]);

  useEffect(() => {
    if (messages.length === 0) {
      renderedMessageKeys.current.clear();
      previousMessageCount.current = 0;
      return;
    }

    if (messages.length < previousMessageCount.current) {
      renderedMessageKeys.current = new Set(
        messages.map((message, index) => `${message.role}-${index}`),
      );
    }

    messages.forEach((message, index) => {
      renderedMessageKeys.current.add(`${message.role}-${index}`);
    });
    previousMessageCount.current = messages.length;
  }, [messages]);

  const preparePrompt = (prompt: string) => {
    onPreparePrompt(prompt);
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const submit = () => {
    if (!draft.trim() || streaming) return;
    onSubmit();
  };

  if (accessLocked) {
    return (
      <section className="grid min-h-0 flex-1 place-items-center px-6 py-10 text-center" aria-label="Atlas Workspace access">
        <div className="max-w-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-atlas-border bg-atlas-surface text-atlas-accent">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="mt-5 text-lg font-semibold text-atlas-foreground">Atlas Workspace is a Builder feature</h2>
          <p className="mt-2 text-sm leading-6 text-atlas-muted">Upgrade to continue conversations, save your project memory, and build with Atlas.</p>
          <Link to="/pricing" className="mt-5 inline-flex h-10 items-center rounded-md bg-atlas-accent px-4 text-sm font-semibold text-atlas-button-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent focus-visible:ring-offset-2 focus-visible:ring-offset-atlas-background">
            Explore plans
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label="Atlas conversation">
      <div ref={scrollRef} className="atlas-scrollbar relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <AnimatePresence initial={false} mode="popLayout">
          {messages.length === 0 ? (
            <motion.div
              key="atlas-welcome"
              className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center px-5 py-8 text-center sm:px-8 sm:py-12"
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
              transition={viewTransition}
            >
              <div className="atlas-welcome-orb"><AtlasOrb state={orbState} /></div>
              <p className="atlas-welcome-kicker mt-7 text-[11px] font-medium uppercase tracking-[0.28em] text-atlas-muted">Atlas 3.0</p>
              <h1 className="atlas-welcome-heading mt-3 font-display text-3xl font-semibold tracking-tight text-atlas-foreground sm:text-4xl">What&apos;s your next move?</h1>
              <p className="atlas-welcome-subtitle mt-3 text-sm text-atlas-muted sm:text-base">Your mentor. Your partner. Your potential.</p>

              <div className="atlas-welcome-cards mt-8 grid w-full grid-cols-1 gap-2 text-left sm:grid-cols-2">
                {starterCards.map((card) => (
                  <button
                    key={card.label}
                    type="button"
                    onClick={() => preparePrompt(card.prompt)}
                    className="atlas-suggestion-card group rounded-lg border border-atlas-border bg-atlas-surface px-4 py-3 text-left hover:border-atlas-accent/60 hover:bg-atlas-surface/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent"
                  >
                    <span className="block text-sm font-medium text-atlas-foreground">{card.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-atlas-muted">{card.description}</span>
                  </button>
                ))}
              </div>

              {error && <ConversationError error={error} canUpgrade={errorCanUpgrade} onRetry={onRetry} />}
            </motion.div>
          ) : (
            <motion.div
              key="atlas-thread"
              className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8"
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
              transition={viewTransition}
            >
              {messages.map((message, index) => {
                const messageKey = `${message.role}-${index}`;
                const isUser = message.role === "user";
                const isPending = !isUser && !message.content && streaming;
                const shouldEnter = !reducedMotion && !renderedMessageKeys.current.has(messageKey);

                return (
                  <AtlasMessageMotion
                    key={messageKey}
                    className={isUser ? "ml-auto max-w-[88%] sm:max-w-[76%]" : "max-w-[95%] sm:max-w-[88%]"}
                    shouldEnter={shouldEnter}
                  >
                    {isUser ? (
                      <div className="rounded-2xl rounded-br-sm border border-atlas-border bg-atlas-surface px-4 py-3 text-sm leading-6 text-atlas-foreground">
                        {message.content}
                      </div>
                    ) : (
                      <div className="group">
                        <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-atlas-muted">
                          <span>Atlas</span>
                          {isPending && <span className="normal-case tracking-normal">thinking</span>}
                        </div>
                        {isPending ? <TypingIndicator /> : <MarkdownMessage content={message.content} />}
                        {!isPending && message.content && (
                          <div className="mt-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                            <CopyButton value={message.content} />
                          </div>
                        )}
                      </div>
                    )}
                  </AtlasMessageMotion>
                );
              })}
              {error && <ConversationError error={error} canUpgrade={errorCanUpgrade} onRetry={onRetry} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="shrink-0 border-t border-atlas-border bg-atlas-background px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
        <div className="mx-auto max-w-4xl">
          <div className="mb-2 flex items-center gap-1 overflow-x-auto pb-1" role="toolbar" aria-label="Atlas response mode">
            {responseModes.map((responseMode) => (
              <button
                key={responseMode}
                type="button"
                onClick={() => onModeChange(responseMode)}
                aria-pressed={mode === responseMode}
                className={`atlas-mode-control h-8 shrink-0 rounded-md px-2.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent ${mode === responseMode ? "bg-atlas-surface text-atlas-foreground" : "text-atlas-muted hover:bg-atlas-surface hover:text-atlas-foreground"}`}
              >
                {responseMode}
              </button>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
            className="flex items-end gap-2 rounded-xl border border-atlas-border bg-atlas-surface p-2 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] focus-within:border-atlas-accent/70"
          >
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              onInput={resizeTextarea}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
              rows={1}
              maxLength={2000}
              disabled={streaming}
              placeholder="Ask Atlas anything..."
              className="max-h-48 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-atlas-foreground outline-none placeholder:text-atlas-muted disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Ask Atlas anything"
            />
            <button
              type="submit"
              disabled={streaming || !draft.trim()}
              className="atlas-send-button grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-atlas-accent text-atlas-button-foreground disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent focus-visible:ring-offset-2 focus-visible:ring-offset-atlas-surface"
              aria-label={streaming ? "Atlas is responding" : "Send message"}
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            </button>
          </form>
          <p className="px-1 pt-2 text-[11px] text-atlas-muted">Enter to send · Shift + Enter for a new line</p>
        </div>
      </div>
    </section>
  );
}

function TypingIndicator() {
  return (
    <span className="atlas-processing-indicator flex h-8 items-center gap-1" aria-label="Atlas is typing" role="status">
      {[0, 1, 2].map((dot) => (
        <span key={dot} className="atlas-processing-dot h-1.5 w-1.5 rounded-full bg-atlas-muted" style={{ "--atlas-dot-index": dot } as CSSProperties} />
      ))}
    </span>
  );
}

function ConversationError({ error, canUpgrade, onRetry }: { error: string; canUpgrade: boolean; onRetry?: () => void }) {
  return (
    <div className="mt-2 flex max-w-xl items-start justify-between gap-3 rounded-lg border border-atlas-border bg-atlas-surface px-3 py-3 text-left" role="alert">
      <p className="text-sm leading-6 text-atlas-foreground">{error}</p>
      <div className="flex shrink-0 items-center gap-1">
        {canUpgrade && <Link to="/pricing" className="rounded-md px-2 py-1 text-xs font-medium text-atlas-accent hover:bg-atlas-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent">Plans</Link>}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-atlas-accent hover:bg-atlas-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
