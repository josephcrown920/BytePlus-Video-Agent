import { useState, useCallback } from "react";
import { Film, ImageOff, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

type SceneImageState =
  | { status: "loading" }
  | { status: "loaded" }
  | { status: "error" }
  | { status: "retrying" };

function SceneFrame({
  scene,
}: {
  scene: Scene;
}) {
  const [imgState, setImgState] = useState<SceneImageState>(
    scene.imageUrl ? { status: "loading" } : { status: "error" },
  );
  const [currentUrl, setCurrentUrl] = useState<string | null>(scene.imageUrl);

  const retry = useCallback(async () => {
    setImgState({ status: "retrying" });
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) { setImgState({ status: "error" }); return; }

      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: scene.image_prompt }),
      });

      if (!res.ok) { setImgState({ status: "error" }); return; }
      const json = (await res.json()) as { imageUrl?: string };
      if (!json.imageUrl) { setImgState({ status: "error" }); return; }

      setCurrentUrl(json.imageUrl);
      setImgState({ status: "loading" });
    } catch {
      setImgState({ status: "error" });
    }
  }, [scene.image_prompt]);

  const isRetrying = imgState.status === "retrying";
  const isError = imgState.status === "error";
  const isLoaded = imgState.status === "loaded";

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-white/10 bg-surface-elevated"
      style={{ width: 120, height: 120 }}
    >
      {/* Skeleton — shown while loading */}
      {imgState.status === "loading" && (
        <div className="absolute inset-0 animate-pulse bg-white/5" />
      )}

      {/* Actual image */}
      {currentUrl && (
        <img
          key={currentUrl}
          src={currentUrl}
          alt={scene.title}
          loading="lazy"
          className={`size-full object-cover transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setImgState({ status: "loaded" })}
          onError={() => setImgState({ status: "error" })}
        />
      )}

      {/* Error / retry state */}
      {isError && (
        <button
          type="button"
          onClick={retry}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-surface-elevated/90 text-center transition-colors hover:bg-surface-elevated"
        >
          <ImageOff className="size-4 text-muted-foreground/50" />
          <span className="px-2 text-[9px] leading-tight text-muted-foreground">
            Image unavailable
          </span>
          <span className="flex items-center gap-0.5 text-[9px] font-medium text-primary">
            <RefreshCw className="size-2.5" />
            Tap to retry
          </span>
        </button>
      )}

      {/* Retrying spinner */}
      {isRetrying && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-surface-elevated/90">
          <RefreshCw className="size-4 animate-spin text-primary/60" />
          <span className="text-[9px] text-muted-foreground">Retrying…</span>
        </div>
      )}

      {/* Frame label overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1">
        <span className="text-[10px] font-bold text-white/90">Frame {scene.scene}</span>
      </div>
    </div>
  );
}

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
          <p className="text-xs text-muted-foreground">{board.scenes.length}-scene storyboard</p>
        </div>
      </div>

      {/* Scenes grid */}
      <div className="divide-y divide-white/5">
        {board.scenes.map((scene) => (
          <div key={scene.scene} className="flex gap-3 p-4">
            {/* Frame image with loading / retry states */}
            <div className="shrink-0">
              <SceneFrame scene={scene} />
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
