import { Copy, Hash, MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Caption = {
  platform: string;
  caption: string;
  hashtags: string[];
};

type CaptionsOutput = {
  topic: string;
  captions: Caption[];
};

const PLATFORM_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  tiktok: { label: "TikTok", color: "text-pink-400", bg: "bg-pink-400/10" },
  instagram: { label: "Instagram", color: "text-purple-400", bg: "bg-purple-400/10" },
  linkedin: { label: "LinkedIn", color: "text-blue-400", bg: "bg-blue-400/10" },
};

function CaptionRow({ caption }: { caption: Caption }) {
  const [copied, setCopied] = useState(false);
  const config = PLATFORM_CONFIG[caption.platform] ?? {
    label: caption.platform,
    color: "text-primary",
    bg: "bg-primary/10",
  };

  function handleCopy() {
    const text = `${caption.caption}\n\n${caption.hashtags.map((h) => `#${h}`).join(" ")}`;
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success(`${config.label} caption copied`);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-2 px-4 py-3">
      <div className="flex items-center justify-between">
        <span
          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${config.color} ${config.bg}`}
        >
          {config.label}
        </span>
        <button
          onClick={handleCopy}
          aria-label={`Copy ${config.label} caption`}
          className="flex items-center gap-1 rounded-lg border border-white/10 bg-surface-elevated px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground"
        >
          <Copy className="size-2.5" />
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="text-xs leading-relaxed text-foreground">{caption.caption}</p>
      {caption.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {caption.hashtags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-0.5 rounded-full border border-white/5 bg-surface-elevated px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              <Hash className="size-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function CaptionsCard({ output }: { output: unknown }) {
  const data = output as CaptionsOutput;
  if (!Array.isArray(data?.captions) || data.captions.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/5 bg-surface-elevated px-4 py-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <MessageSquare className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">Social Captions</h3>
          <p className="text-xs text-muted-foreground">
            {data.captions.length} platform{data.captions.length !== 1 ? "s" : ""} · ready to post
          </p>
        </div>
      </div>

      {/* Captions */}
      <div className="divide-y divide-white/5">
        {data.captions.map((caption) => (
          <CaptionRow key={caption.platform} caption={caption} />
        ))}
      </div>
    </div>
  );
}
