import { Clapperboard, Clock, Download, Zap, BookOpen, Sparkles } from "lucide-react";
import { downloadScriptPdf, type ScriptData } from "@/lib/export";
import { cinematicSceneRole, CINEMATIC_ROLE_STYLES } from "@/lib/video-agent-skills";

type Scene = {
  scene: number;
  description: string;
  dialogue: string;
  duration_seconds: number;
  // video-agent route fields
  index?: number;
  title?: string;
  script?: string;
  duration?: number;
};

type ScriptOutput = {
  title: string;
  format?: string;
  total_duration_seconds?: number;
  scenes: Scene[];
  /** 0-3 s sensory shock — Cinematic Viralist hook */
  hook?: string;
  /** Seamless loop line or stinger — Cinematic Viralist close */
  close?: string;
  mood?: string;
};

const ROLE_ICONS = {
  Hook: Zap,
  Narrative: BookOpen,
  Close: Sparkles,
} as const;

export function ScriptCard({ output }: { output: unknown }) {
  const script = output as ScriptOutput;
  if (!script?.title || !Array.isArray(script.scenes)) return null;

  const formatLabel: Record<string, string> = {
    video: "Video",
    ad: "Ad",
    reel: "Reel",
  };

  const total = script.scenes.length;
  const isHighEnergy = script.mood === "high-energy";

  function handleDownload() {
    downloadScriptPdf(script as ScriptData);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/5 bg-surface-elevated px-4 py-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <Clapperboard className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={`truncate text-sm font-semibold ${isHighEnergy ? "font-extrabold tracking-tight" : ""}`}>
            {script.title}
          </h3>
          <p className="text-xs text-muted-foreground">
            {script.format ? `${formatLabel[script.format] ?? script.format} · ` : ""}
            {script.total_duration_seconds != null ? `${script.total_duration_seconds}s · ` : ""}
            {total} scenes · Hook → Narrative → Close
          </p>
        </div>
        {isHighEnergy && (
          <span className="shrink-0 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-400">
            High Energy
          </span>
        )}
        <button
          type="button"
          onClick={handleDownload}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-surface px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground"
        >
          <Download className="size-3" />
          PDF
        </button>
      </div>

      {/* Cinematic Viralist hook banner */}
      {script.hook && (
        <div className="flex items-start gap-2 border-b border-orange-500/20 bg-orange-500/5 px-4 py-3">
          <Zap className="mt-0.5 size-3.5 shrink-0 text-orange-400" />
          <div className="min-w-0">
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-400">
              Sensory Hook · 0-3 s
            </p>
            <p className="text-xs italic text-muted-foreground">{script.hook}</p>
          </div>
        </div>
      )}

      {/* Scenes */}
      <div className="divide-y divide-white/5">
        {script.scenes.map((scene, i) => {
          const sceneNum = scene.scene ?? scene.index ?? i;
          const role = cinematicSceneRole(i, total);
          const roleStyle = CINEMATIC_ROLE_STYLES[role];
          const RoleIcon = ROLE_ICONS[role];
          const durationSec = scene.duration_seconds ?? scene.duration;
          const text = scene.dialogue || scene.script || scene.description;

          return (
            <div key={sceneNum} className="space-y-1.5 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}>
                  <RoleIcon className="size-2.5" />
                  {role}
                </span>
                <span className="text-[10px] text-muted-foreground/60">Scene {sceneNum}</span>
                {durationSec != null && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="size-3" />
                    {durationSec}s
                  </span>
                )}
              </div>
              {scene.title && (
                <p className="text-xs font-semibold leading-tight text-foreground">{scene.title}</p>
              )}
              <p className="text-xs leading-relaxed text-foreground">{scene.description}</p>
              {text && text !== scene.description && (
                <p className="border-l-2 border-primary/30 pl-2 text-xs italic text-muted-foreground">
                  "{text}"
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Cinematic Viralist close banner */}
      {script.close && (
        <div className="flex items-start gap-2 border-t border-violet-500/20 bg-violet-500/5 px-4 py-3">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-violet-400" />
          <div className="min-w-0">
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-400">
              Aesthetic Close · Loop / Stinger
            </p>
            <p className="text-xs italic text-muted-foreground">{script.close}</p>
          </div>
        </div>
      )}
    </div>
  );
}
