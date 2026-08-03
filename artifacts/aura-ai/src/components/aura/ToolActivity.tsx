import {
  Brain,
  Calculator,
  Check,
  Clock,
  Globe,
  ImageIcon,
  Loader2,
  Search,
  Wrench,
} from "lucide-react";

const LABELS: Record<string, { label: string; icon: typeof Search }> = {
  web_search: { label: "Searching the web", icon: Search },
  fetch_url: { label: "Reading page", icon: Globe },
  calculate: { label: "Calculating", icon: Calculator },
  current_time: { label: "Checking the time", icon: Clock },
  generate_image: { label: "Generating image", icon: ImageIcon },
  remember: { label: "Saving to memory", icon: Brain },
  recall_memories: { label: "Recalling memory", icon: Brain },
};

type Props = {
  name: string;
  state: string;
  input?: unknown;
  output?: unknown;
};

function summarize(input: unknown) {
  if (!input || typeof input !== "object") return "";
  const record = input as Record<string, unknown>;
  const value = record.query ?? record.url ?? record.expression ?? record.prompt ?? record.fact;
  return typeof value === "string" ? value : "";
}

export function ToolActivity({ name, state, input, output }: Props) {
  const meta = LABELS[name] ?? { label: name, icon: Wrench };
  const Icon = meta.icon;
  const running = state !== "output-available" && state !== "output-error";
  const detail = summarize(input);
  const image =
    output && typeof output === "object" && "imageUrl" in (output as Record<string, unknown>)
      ? String((output as Record<string, unknown>).imageUrl)
      : null;
  const failure =
    output && typeof output === "object" && "error" in (output as Record<string, unknown>)
      ? String((output as Record<string, unknown>).error)
      : null;

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
          {meta.label}
          {detail ? `: ${detail}` : ""}
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
    </div>
  );
}
