import { useRef, useState } from "react";
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
  PlayCircle,
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
  previs: { label: "Building previs", icon: PlayCircle },
};

type PrevisScene = {
  scene: number;
  description: string;
  dialogue?: string;
  duration_seconds: number;
  imageUrl: string | null;
  startTime: number;
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

function PrevisPlayer({ videoUrl, scenes }: { videoUrl: string; scenes: PrevisScene[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const handleTimeUpdate = () => {
    const t = videoRef.current?.currentTime ?? 0;
    // Find the last scene whose startTime is <= current playback time
    let idx = 0;
    for (let i = scenes.length - 1; i >= 0; i--) {
      if (scenes[i].startTime <= t) {
        idx = i;
        break;
      }
    }
    setActiveIdx(idx);
  };

  const seekToScene = (i: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = scenes[i].startTime;
      videoRef.current.play().catch(() => {});
    }
    setActiveIdx(i);
  };

  return (
    <div className="space-y-3 max-w-lg">
      {/* Video player */}
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        autoPlay
        playsInline
        onTimeUpdate={handleTimeUpdate}
        className="w-full rounded-2xl border border-white/10 shadow-2xl"
      />

      {/* Scene strip */}
      <div className="flex gap-2 overflow-x-auto pb-1 snap-x">
        {scenes.map((scene, i) => (
          <button
            key={scene.scene}
            onClick={() => seekToScene(i)}
            title={scene.description}
            className={[
              "shrink-0 snap-start flex flex-col items-center gap-1 rounded-xl overflow-hidden border transition-all",
              "w-[88px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              activeIdx === i
                ? "border-primary shadow-[0_0_0_2px] shadow-primary/40 scale-[1.04]"
                : "border-white/10 opacity-70 hover:opacity-100",
            ].join(" ")}
          >
            {scene.imageUrl ? (
              <img
                src={scene.imageUrl}
                alt={`Scene ${scene.scene}`}
                loading="lazy"
                className="w-full h-[52px] object-cover"
              />
            ) : (
              <div className="w-full h-[52px] bg-white/5 flex items-center justify-center">
                <Film className="size-4 text-muted-foreground" />
              </div>
            )}
            <span className="text-[10px] text-muted-foreground pb-1 font-medium">
              {scene.scene}
            </span>
          </button>
        ))}
      </div>

      {/* Active scene caption */}
      {scenes[activeIdx] && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          <span className="text-primary font-medium mr-1">Scene {scenes[activeIdx].scene}:</span>
          {scenes[activeIdx].description}
        </p>
      )}
    </div>
  );
}

export function ToolActivity({ name, state, input, output, progress }: Props) {
  const meta = LABELS[name] ?? { label: name, icon: Wrench };
  const Icon = meta.icon;
  const running = state !== "output-available" && state !== "output-error";
  const detail = summarize(input);
  const rec = output && typeof output === "object" ? (output as Record<string, unknown>) : null;
  const failure = rec && "error" in rec ? String(rec.error) : null;

  // Previs output: has both videoUrl and scenes[]
  const previsScenes =
    rec &&
    "scenes" in rec &&
    Array.isArray(rec.scenes) &&
    "videoUrl" in rec
      ? (rec.scenes as PrevisScene[])
      : null;
  const previsVideoUrl = previsScenes ? String(rec!.videoUrl) : null;

  // Plain image / video (non-previs)
  const image = !previsScenes && rec && "imageUrl" in rec ? String(rec.imageUrl) : null;
  const videoUrl = !previsScenes && rec && "videoUrl" in rec ? String(rec.videoUrl) : null;

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

      {previsVideoUrl && previsScenes && (
        <PrevisPlayer videoUrl={previsVideoUrl} scenes={previsScenes} />
      )}
    </div>
  );
}
