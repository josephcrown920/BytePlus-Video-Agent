import { useEffect, useRef, useState } from "react";
import { X, Loader2, Clapperboard, Film, MessageSquare, Check, Pencil } from "lucide-react";
import { getContentItem, renameContentItem, type ContentItem, type ContentItemFull } from "@/lib/content";
import { ScriptCard } from "./ScriptCard";
import { CaptionsCard } from "./CaptionsCard";
import { StoryboardCard } from "./StoryboardCard";

const TYPE_ICON: Record<string, React.ReactNode> = {
  script: <Clapperboard className="size-4 text-primary" />,
  storyboard: <Film className="size-4 text-primary" />,
  captions: <MessageSquare className="size-4 text-primary" />,
};

const TYPE_LABEL: Record<string, string> = {
  script: "Script",
  storyboard: "Storyboard",
  captions: "Captions",
};

type Props = {
  item: ContentItem;
  onClose: () => void;
  onRename: (id: string, title: string) => void;
};

export function ContentLibraryModal({ item, onClose, onRename }: Props) {
  const [full, setFull] = useState<ContentItemFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(item.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getContentItem(item.id)
      .then(setFull)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [item.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !editing) onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  async function commitRename() {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== item.title) {
      try {
        await renameContentItem(item.id, trimmed);
        onRename(item.id, trimmed);
      } catch { /* ignore */ }
    }
    setEditing(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background/95 backdrop-blur-xl">
      {/* Top bar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-white/5 px-4 py-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          {TYPE_ICON[item.type]}
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              ref={inputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => void commitRename()}
              onKeyDown={(e) => {
                if (e.key === "Enter") void commitRename();
                if (e.key === "Escape") { setTitleDraft(item.title); setEditing(false); }
              }}
              className="w-full bg-transparent text-sm font-semibold outline-none"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="group flex items-center gap-1.5 text-left"
            >
              <p className="truncate text-sm font-semibold">{titleDraft || item.title}</p>
              <Pencil className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          )}
          <p className="text-[11px] text-muted-foreground">
            {TYPE_LABEL[item.type]} ·{" "}
            {new Date(item.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {editing && (
            <button
              onClick={() => void commitRename()}
              aria-label="Save title"
              className="flex size-7 items-center justify-center rounded-lg border border-white/10 text-primary transition-colors hover:bg-primary/10"
            >
              <Check className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:px-8 lg:py-6">
        {loading && (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}
        {full && !loading && (
          <div className="mx-auto max-w-2xl">
            {full.type === "script" && <ScriptCard output={full.data} />}
            {full.type === "captions" && <CaptionsCard output={full.data} />}
            {full.type === "storyboard" && <StoryboardCard output={full.data} />}
          </div>
        )}
      </div>
    </div>
  );
}
