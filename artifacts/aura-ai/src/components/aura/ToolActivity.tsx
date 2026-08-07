import {
  Brain,
  Calculator,
  Check,
  Clapperboard,
  Clock,
  Film,
  Globe,
  ImageIcon,
  Loader2,
  MessageSquare,
  Search,
  Video,
  Wrench,
} from "lucide-react";

const LABELS: Record<string, { label: string; icon: typeof Search }> = {
  web_search: { label: "Searching the web", icon: Search },
  fetch_url: { label: "Reading page", icon: Globe },
  calculate: { label: "Calculating", icon: Calculator },
  current_time: { label: "Checking the time", icon: Clock },
  generate_image: { label: "Generating image", icon: ImageIcon },
  generate_video: { label: "Generating video", icon: Video },
  remember: { label: "Saving to memory", icon: Brain },
  recall_memories: { label: "Recalling memory", icon: Brain },
  generate_script: { label: "Writing script", icon: Clapperboard },
  generate_captions: { label: "Crafting captions", icon: MessageSquare },
  storyboard: { label: "Building storyboard", icon: Film },
};

type Props = {
  name: string;
  state: string;
  input?: unknown;
  output?: unknown;
  /** Live progress label emitted by the tool during execution (e.g. "Generating frame 2/3…") */
  progress?: string;
};

function summarize(input: unknown) {
  if (!input || typeof input !== "object") return "";
  const record = input as Record<string, unknown>;
  const value =
    record.query ?? record.url ?? record.expression ?? record.prompt ?? record.fact ?? record.concept ?? record.topic;
  return typeof value === "string" ? value : "";
}

export function ToolActivity({ name, state, input, output, progress }: Props) {
  const meta = LABELS[name] ?? { label: name, icon: Wrench };
  const Icon = meta.icon;
  const running = state !== "output-available" && state !== "output-error";
  const detail = summarize(input);
  const rec = output && typeof output === "object" ? (output as Record<string, unknown>) : null;
  const image = rec && "imageUrl" in rec ? String(rec.imageUrl) : null;
  const videoUrl = rec && "videoUrl" in rec ? String(rec.videoUrl) : null;
  const failure = rec && "error" in rec ? String(rec.error) : null;

  // While running, show live progress label if available; fall back to default label
  const displayLabel = running && progress ? progress : `${meta.label}${detail ? `: ${detail}` : ""}`;

  return (
    <div className="space-y-2">
      <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-surface/70 px-3 py-1.5 text-xs text-muted-foreground">
        {running ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
        ) : failure ? (
          <Icon className="size-3.5 shrink-0 text-destructive" />
        ) : (
          <Check className="size-3.5 shrink-0 text-primary" />
        )}
        <Icon className="hidden size-3.5 shrink-0 sm:block" />
        <span className="truncate">
          {displayLabel}
        </span>
      </div>
      {failure && <p className="text-xs text-destructive">{failure}</p>}
      {image && (
        <img
          src={image}
          alt={detail || "Generated image"}
          loading="lazy"
          className="max-w-sm rounded-2xl border border-white/10 shadow-2xl"
        />
      )}
      {videoUrl && (
        <video
          src={videoUrl}
          controls
          autoPlay
          loop
          muted
          playsInline
          className="max-w-sm rounded-2xl border border-white/10 shadow-2xl"
        />
      )}
    </div>
  );
}
