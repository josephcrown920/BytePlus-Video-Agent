import { Clapperboard, Clock, Download } from "lucide-react";
import { downloadScriptPdf, type ScriptData } from "@/lib/export";

type Scene = {
  scene: number;
  description: string;
  dialogue: string;
  duration_seconds: number;
};

type ScriptOutput = {
  title: string;
  format: string;
  total_duration_seconds: number;
  scenes: Scene[];
};

export function ScriptCard({ output }: { output: unknown }) {
  const script = output as ScriptOutput;
  if (!script?.title || !Array.isArray(script.scenes)) return null;

  const formatLabel: Record<string, string> = {
    video: "Video",
    ad: "Ad",
    reel: "Reel",
  };

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
          <h3 className="truncate text-sm font-semibold">{script.title}</h3>
          <p className="text-xs text-muted-foreground">
            {formatLabel[script.format] ?? script.format} · {script.total_duration_seconds}s total ·{" "}
            {script.scenes.length} scenes
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-surface px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground"
        >
          <Download className="size-3" />
          PDF
        </button>
      </div>

      {/* Scenes */}
      <div className="divide-y divide-white/5">
        {script.scenes.map((scene) => (
          <div key={scene.scene} className="space-y-1.5 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                Scene {scene.scene}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="size-3" />
                {scene.duration_seconds}s
              </span>
            </div>
            <p className="text-xs leading-relaxed text-foreground">{scene.description}</p>
            {scene.dialogue && (
              <p className="border-l-2 border-primary/30 pl-2 text-xs italic text-muted-foreground">
                "{scene.dialogue}"
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
