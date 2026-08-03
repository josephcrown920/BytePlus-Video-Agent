import { Film, ImageOff } from "lucide-react";

type Scene = {
  scene: number;
  title: string;
  description: string;
  image_prompt: string;
  imageUrl: string | null;
};

type StoryboardOutput = {
  title: string;
  concept: string;
  scenes: Scene[];
};

export function StoryboardCard({ output }: { output: unknown }) {
  const board = output as StoryboardOutput;
  if (!board?.title || !Array.isArray(board.scenes)) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/5 bg-surface-elevated px-4 py-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <Film className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{board.title}</h3>
          <p className="text-xs text-muted-foreground">
            {board.scenes.length}-scene storyboard
          </p>
        </div>
      </div>

      {/* Scenes grid */}
      <div className="divide-y divide-white/5">
        {board.scenes.map((scene) => (
          <div key={scene.scene} className="flex gap-3 p-4">
            {/* Frame number + image */}
            <div className="shrink-0">
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-surface-elevated" style={{ width: 120, height: 120 }}>
                {scene.imageUrl ? (
                  <img
                    src={scene.imageUrl}
                    alt={scene.title}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <ImageOff className="size-5 text-muted-foreground/40" />
                  </div>
                )}
                {/* Frame label overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1">
                  <span className="text-[10px] font-bold text-white/90">
                    Frame {scene.scene}
                  </span>
                </div>
              </div>
            </div>

            {/* Scene details */}
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-semibold leading-tight text-foreground">{scene.title}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{scene.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
