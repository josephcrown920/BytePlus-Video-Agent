import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Brain,
  Clapperboard,
  Film,
  Library,
  LogOut,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
  X,
  Zap,
} from "lucide-react";

import type { ThreadSummary } from "@/lib/threads";
import type { ContentItem } from "@/lib/content";

const CONTENT_ICON: Record<string, React.ReactNode> = {
  script: <Clapperboard className="size-3.5 shrink-0 text-primary/70" />,
  storyboard: <Film className="size-3.5 shrink-0 text-primary/70" />,
  captions: <MessageSquare className="size-3.5 shrink-0 text-primary/70" />,
};

type Props = {
  threads: ThreadSummary[];
  activeId: string;
  open: boolean;
  email?: string;
  contentItems: ContentItem[];
  onClose: () => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onOpenMemory: () => void;
  onSignOut: () => void;
  onOpenContent: (item: ContentItem) => void;
  onDeleteContent: (id: string) => Promise<void>;
  onRenameContent: (id: string, title: string) => void;
};

export function ThreadSidebar({
  threads,
  activeId,
  open,
  email,
  contentItems,
  onClose,
  onNew,
  onDelete,
  onOpenMemory,
  onSignOut,
  onOpenContent,
  onDeleteContent,
  onRenameContent,
}: Props) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function startRename(item: ContentItem) {
    setRenamingId(item.id);
    setRenameValue(item.title);
  }

  async function commitRename(id: string) {
    const trimmed = renameValue.trim();
    if (trimmed) onRenameContent(id, trimmed);
    setRenamingId(null);
  }

  return (
    <>
      {open && (
        <button
          aria-label="Close conversations"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/5 bg-surface/80 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="relative flex size-8 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-fuchsia-500">
              <Zap className="size-4 fill-white text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Aura Agent</span>
          </Link>
          <button onClick={onClose} aria-label="Hide conversations" className="lg:hidden">
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-3">
          <button
            onClick={onNew}
            className="flex w-full items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-fuchsia-500 px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" />
            New conversation
          </button>
        </div>

        <nav className="mt-5 flex-1 space-y-4 overflow-y-auto px-3 pb-4">
          {/* ── Conversations ─────────────────────────────────── */}
          <div>
            <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              History
            </p>
            {threads.length === 0 && (
              <p className="px-2 text-xs text-muted-foreground">No conversations yet.</p>
            )}
            {threads.map((thread) => (
              <div
                key={thread.id}
                className={`group flex items-center gap-2 rounded-xl px-2 py-2 transition-colors ${
                  thread.id === activeId
                    ? "bg-surface-elevated text-foreground ring-1 ring-white/10"
                    : "text-muted-foreground hover:bg-surface-elevated/60 hover:text-foreground"
                }`}
              >
                <Link
                  to="/chat/$threadId"
                  params={{ threadId: thread.id }}
                  onClick={onClose}
                  className="flex min-w-0 flex-1 items-center gap-2"
                >
                  <MessageSquare className="size-3.5 shrink-0" />
                  <span className="truncate text-sm">{thread.title}</span>
                </Link>
                <button
                  aria-label={`Delete ${thread.title}`}
                  onClick={() => onDelete(thread.id)}
                  className="shrink-0 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* ── Content Library ───────────────────────────────── */}
          {contentItems.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <Library className="size-3" />
                Content
              </p>
              {contentItems.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center gap-2 rounded-xl px-2 py-2 text-muted-foreground transition-colors hover:bg-surface-elevated/60 hover:text-foreground"
                >
                  {CONTENT_ICON[item.type]}

                  {renamingId === item.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => void commitRename(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void commitRename(item.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      className="min-w-0 flex-1 truncate bg-transparent text-sm text-foreground outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => onOpenContent(item)}
                      className="min-w-0 flex-1 truncate text-left text-sm"
                    >
                      {item.title}
                    </button>
                  )}

                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      aria-label="Rename"
                      onClick={() => startRename(item)}
                      className="hover:text-foreground"
                    >
                      <Pencil className="size-3" />
                    </button>
                    <button
                      aria-label={`Delete ${item.title}`}
                      onClick={() => void onDeleteContent(item.id)}
                      className="hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </nav>

        <div className="space-y-1 border-t border-white/5 p-3">
          <button
            onClick={onOpenMemory}
            className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
          >
            <Brain className="size-4" />
            Agent memory
          </button>
          <button
            onClick={onSignOut}
            className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
          >
            <LogOut className="size-4" />
            <span className="truncate">{email ? `Sign out (${email})` : "Sign out"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
