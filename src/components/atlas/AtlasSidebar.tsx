import { useMemo, useState } from "react";
import {
  BarChart3,
  Compass,
  FolderKanban,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AtlasIcon } from "@/components/career/AtlasIcon";
import type { AtlasConversationMessage } from "@/lib/atlas/types";
import type { AtlasWorkspacePanel } from "./workspaceTypes";

interface AtlasSidebarProps {
  collapsed: boolean;
  email: string;
  name: string;
  tier: string;
  recentMessages: AtlasConversationMessage[];
  currentMessages: AtlasConversationMessage[];
  activePanel: AtlasWorkspacePanel;
  onNewConversation: () => void;
  onToggleCollapsed: () => void;
  onOpenPanel: (panel: AtlasWorkspacePanel) => void;
  onUseMessage: (message: string) => void;
  creditStatus?: {
    available: number;
    flexible: number;
    reserve: number;
    renewalAt: string | null;
    essentialMode: boolean;
  };
}

export function AtlasSidebar({
  collapsed,
  email,
  name,
  tier,
  recentMessages,
  currentMessages,
  activePanel,
  onNewConversation,
  onToggleCollapsed,
  onOpenPanel,
  onUseMessage,
  creditStatus,
}: AtlasSidebarProps) {
  const [search, setSearch] = useState("");
  const prompts = useMemo(() => {
    const seen = new Set<string>();
    return [...recentMessages, ...currentMessages]
      .filter((message) => message.role === "user" && message.content.trim())
      .reverse()
      .filter((message) => {
        const key = message.content.trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .filter((message) => message.content.toLowerCase().includes(search.trim().toLowerCase()))
      .slice(0, 12);
  }, [currentMessages, recentMessages, search]);

  const navClass = (active: boolean) =>
    `w-full justify-start ${collapsed ? "px-0" : ""} ${active ? "bg-atlas-surface text-atlas-foreground" : "text-atlas-muted hover:bg-atlas-surface hover:text-atlas-foreground"}`;

  return (
    <aside
      className={`atlas-sidebar-shell flex h-full min-h-0 shrink-0 flex-col border-r border-atlas-border bg-atlas-sidebar ${collapsed ? "w-[72px]" : "w-[264px]"}`}
      aria-label="Atlas navigation"
    >
      <div className={`flex h-16 shrink-0 items-center border-b border-atlas-border ${collapsed ? "justify-center px-2" : "justify-between px-4"}`}>
        <div className="flex min-w-0 items-center gap-3">
          <AtlasIcon className="h-8 w-8" />
          {!collapsed && <span className="truncate text-sm font-semibold text-atlas-foreground">Atlas</span>}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 text-atlas-muted hover:bg-atlas-surface hover:text-atlas-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggleCollapsed}
        >
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </Button>
      </div>

      <div className={`shrink-0 py-4 ${collapsed ? "px-2" : "px-3"}`}>
        <Button
          type="button"
          onClick={onNewConversation}
          className={`h-10 w-full bg-atlas-accent text-atlas-button-foreground hover:bg-atlas-accent/90 ${collapsed ? "px-0" : "justify-start"}`}
          aria-label="New conversation"
          title={collapsed ? "New conversation" : undefined}
        >
          <Plus />
          {!collapsed && <span>New conversation</span>}
        </Button>
      </div>

      <nav className={`shrink-0 space-y-1 ${collapsed ? "px-2" : "px-3"}`} aria-label="Learning workspace">
        <Button asChild variant="ghost" className={navClass(activePanel === "learning")} title={collapsed ? "Learning path" : undefined}>
          <Link to="/paths" aria-label="Learning path">
            <Compass />
            {!collapsed && <span>Learning path</span>}
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          className={navClass(activePanel === "projects")}
          onClick={() => onOpenPanel("projects")}
          title={collapsed ? "My projects" : undefined}
          aria-pressed={activePanel === "projects"}
        >
          <FolderKanban />
          {!collapsed && <span>My projects</span>}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className={navClass(activePanel === "progress")}
          onClick={() => onOpenPanel("progress")}
          title={collapsed ? "My progress" : undefined}
          aria-pressed={activePanel === "progress"}
        >
          <BarChart3 />
          {!collapsed && <span>My progress</span>}
        </Button>
      </nav>

      {!collapsed && (
        <section className="mt-6 flex min-h-0 flex-1 flex-col px-3" aria-labelledby="atlas-history-title">
          <div className="mb-3 flex items-center gap-2 px-1">
            <MessageSquareText className="h-4 w-4 text-atlas-muted" />
            <h2 id="atlas-history-title" className="text-xs font-medium text-atlas-muted">Recent prompts</h2>
          </div>
          <label className="relative mb-2 block">
            <span className="sr-only">Search recent prompts</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-atlas-muted" aria-hidden="true" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search messages"
              className="h-9 border-atlas-border bg-atlas-background pl-9 text-sm text-atlas-foreground placeholder:text-atlas-muted focus-visible:ring-atlas-accent"
              aria-label="Search recent prompts"
            />
          </label>
          <div className="atlas-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto pb-4">
            {prompts.length > 0 ? prompts.map((message, index) => (
              <Button
                key={`${index}-${message.content}`}
                type="button"
                variant="ghost"
                className="h-auto min-h-9 w-full justify-start whitespace-normal px-2 py-2 text-left text-xs leading-5 text-atlas-muted hover:bg-atlas-surface hover:text-atlas-foreground"
                onClick={() => onUseMessage(message.content)}
                title={message.content}
              >
                <span className="line-clamp-2">{message.content}</span>
              </Button>
            )) : (
              <p className="px-2 py-3 text-xs text-atlas-muted">No recent prompts</p>
            )}
          </div>
        </section>
      )}

      <footer className={`mt-auto shrink-0 border-t border-atlas-border py-3 ${collapsed ? "px-2" : "px-3"}`}>
        {!collapsed && creditStatus && (
          <div className="mb-2 rounded-md border border-atlas-border bg-atlas-background px-3 py-2" aria-label="Atlas credit wallet">
            <div className="flex items-center justify-between text-xs">
              <span className="text-atlas-muted">Available credits</span>
              <span className="font-semibold text-atlas-foreground">{creditStatus.available}</span>
            </div>
            {creditStatus.essentialMode && (
              <p className="mt-1 text-[11px] font-medium text-atlas-accent">Essential Mentorship Mode</p>
            )}
            {creditStatus.available <= 20 && !creditStatus.essentialMode && (
              <p className="mt-1 text-[11px] text-atlas-muted">Low-credit warning</p>
            )}
            {creditStatus.renewalAt && (
              <p className="mt-1 text-[11px] text-atlas-muted">
                Renews {new Date(creditStatus.renewalAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
        <Button asChild variant="ghost" className={`h-auto w-full ${collapsed ? "justify-center px-0" : "justify-start px-2"} py-2 text-atlas-foreground hover:bg-atlas-surface`} title={collapsed ? "Account" : undefined}>
          <Link to="/profile" aria-label="Account and profile">
            <UserRound className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-xs font-medium">{name || "Account"}</span>
                <span className="block truncate text-[11px] text-atlas-muted">{email}</span>
              </span>
            )}
          </Link>
        </Button>
        {!collapsed && (
          <div className="mt-2 flex items-center justify-between px-2 text-[11px] text-atlas-muted">
            <span>Subscription</span>
            <span className="text-atlas-foreground">{tier}</span>
          </div>
        )}
      </footer>
    </aside>
  );
}
