import { useState, useCallback, useRef, useEffect } from "react";
import { Download, Film, ImageOff, Loader2, Pencil, RefreshCw, Share2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  downloadStoryboardImages,
  downloadStoryboardPdf,
  type StoryboardData,
} from "@/lib/export";
import { cinematicSceneRole, CINEMATIC_ROLE_STYLES } from "@/lib/video-agent-skills";
import { createShareLink } from "@/lib/share";

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
  | { status: "pending" }
  | { status: "loading" }
  | { status: "loaded" }
  | { status: "error" }
  | { status: "retrying" };

async function generateImage(prompt: string): Promise<string | null> {
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;
  if (!token) return null;

  const res = await fetch("/api/images/generate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) return null;
  const json = (await res.json()) as { imageUrl?: string };
  return json.imageUrl ?? null;
}

function SceneFrame({
  scene,
  isPending = false,
  readOnly = false,
}: {
  scene: Scene;
  isPending?: boolean;
  readOnly?: boolean;
}) {
  const [imgState, setImgState] = useState<SceneImageState>(
    scene.imageUrl ? { status: "loading" } : isPending ? { status: "pending" } : { status: "error" },
  );
  const [currentUrl, setCurrentUrl] = useState<string | null>(scene.imageUrl);
  const [hovered, setHovered] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editPrompt, setEditPrompt] = useState(scene.image_prompt);
  const [editLoading, setEditLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const retry = useCallback(async () => {
    if (readOnly) return;
    setImgState({ status: "retrying" });
    try {
      const url = await generateImage(scene.image_prompt);
      if (!url) { setImgState({ status: "error" }); return; }
      setCurrentUrl(url);
      setImgState({ status: "loading" });
    } catch {
      setImgState({ status: "error" });
    }
  }, [scene.image_prompt, readOnly]);

  const openEdit = useCallback(() => {
    setEditPrompt(scene.image_prompt);
    setEditOpen(true);
    // focus textarea after render
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [scene.image_prompt]);

  const cancelEdit = useCallback(() => {
    setEditOpen(false);
  }, []);

  const submitEdit = useCallback(async () => {
    const trimmed = editPrompt.trim();
    if (!trimmed) return;
    setEditLoading(true);
    setEditOpen(false);
    setImgState({ status: "retrying" });
    try {
      const url = await generateImage(trimmed);
      if (!url) { setImgState({ status: "error" }); return; }
      setCurrentUrl(url);
      setImgState({ status: "loading" });
    } catch {
      setImgState({ status: "error" });
    } finally {
      setEditLoading(false);
    }
  }, [editPrompt]);

  // When scene.imageUrl arrives (streaming: was null, now has a URL), kick off the load
  useEffect(() => {
    if (scene.imageUrl && !currentUrl) {
      setCurrentUrl(scene.imageUrl);
      setImgState({ status: "loading" });
    }
  }, [scene.imageUrl, currentUrl]);

  const isRetrying = imgState.status === "retrying";
  const isError = imgState.status === "error";
  const isLoaded = imgState.status === "loaded";
  const isPendingState = imgState.status === "pending";

  return (
    <div className="flex flex-col gap-1">
      <div
        className="relative overflow-hidden rounded-xl border border-white/10 bg-surface-elevated"
        style={{ width: 120, height: 120 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Pending skeleton — image generation not started yet */}
        {isPendingState && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 animate-pulse bg-white/5">
            <Loader2 className="size-4 animate-spin text-primary/40" />
            <span className="text-[9px] text-muted-foreground/50">Generating…</span>
          </div>
        )}

        {/* Skeleton — shown while image URL is loading */}
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
          readOnly ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-surface-elevated/90 text-center">
              <ImageOff className="size-4 text-muted-foreground/50" />
              <span className="px-2 text-[9px] leading-tight text-muted-foreground">
                Image unavailable
              </span>
            </div>
          ) : (
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
          )
        )}

        {/* Retrying spinner */}
        {(isRetrying || editLoading) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-surface-elevated/90">
            <RefreshCw className="size-4 animate-spin text-primary/60" />
            <span className="text-[9px] text-muted-foreground">Generating…</span>
          </div>
        )}

        {/* Edit button — shown on hover when image is loaded */}
        {isLoaded && hovered && !editLoading && !readOnly && (
          <button
            type="button"
            onClick={openEdit}
            title="Edit image prompt"
            className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-md bg-black/60 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/80 hover:text-white"
          >
            <Pencil className="size-3" />
          </button>
        )}

        {/* Frame label overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1">
          <span className="text-[10px] font-bold text-white/90">Frame {scene.scene}</span>
        </div>
      </div>

      {/* Inline prompt editor */}
      {editOpen && (
        <div className="w-[120px] rounded-lg border border-white/15 bg-surface-elevated p-2 shadow-lg">
          <textarea
            ref={textareaRef}
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submitEdit(); }
              if (e.key === "Escape") cancelEdit();
            }}
            rows={4}
            className="w-full resize-none rounded-md bg-black/20 px-1.5 py-1 text-[9px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
            placeholder="Describe this frame…"
          />
          <div className="mt-1.5 flex gap-1">
            <button
              type="button"
              onClick={() => void submitEdit()}
              disabled={!editPrompt.trim()}
              className="flex flex-1 items-center justify-center gap-1 rounded-md bg-primary/80 py-1 text-[9px] font-medium text-white transition-colors hover:bg-primary disabled:opacity-40"
            >
              <RefreshCw className="size-2.5" />
              Regen
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="flex size-[22px] items-center justify-center rounded-md border border-white/10 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-2.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function StoryboardCard({
  output,
  isPending = false,
  readOnly = false,
}: {
  output: unknown;
  isPending?: boolean;
  readOnly?: boolean;
}) {
  const board = output as StoryboardOutput;
  const [pdfLoading, setPdfLoading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  if (!board?.title || !Array.isArray(board.scenes)) return null;

  const total = board.scenes.length;

  async function handleDownload() {
    setPdfLoading(true);
    try {
      await downloadStoryboardPdf(board as StoryboardData);
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleImagesDownload() {
    setZipLoading(true);
    try {
      await downloadStoryboardImages(board as StoryboardData);
    } finally {
      setZipLoading(false);
    }
  }

  async function handleShare() {
    setShareLoading(true);
    try {
      await createShareLink("storyboard", board as unknown as Record<string, unknown>);
      toast.success("Share link copied to clipboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't create share link");
    } finally {
      setShareLoading(false);
    }
  }

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
            {total}-scene storyboard · Hook → Narrative → Close
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!readOnly && (
            <button
              type="button"
              onClick={() => void handleShare()}
              disabled={shareLoading || isPending}
              aria-label="Share storyboard"
              title="Copy share link"
              className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-surface text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground disabled:opacity-50"
            >
              {shareLoading ? <Loader2 className="size-3 animate-spin" /> : <Share2 className="size-3.5" />}
            </button>
          )}
          <button
            type="button"
            onClick={handleDownload}
            disabled={pdfLoading || zipLoading || isPending}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-surface px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground disabled:opacity-50"
          >
            {pdfLoading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Download className="size-3" />
            )}
            {pdfLoading ? "Generating…" : "PDF"}
          </button>
          <button
            type="button"
            onClick={handleImagesDownload}
            disabled={pdfLoading || zipLoading || isPending}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-surface px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground disabled:opacity-50"
          >
            {zipLoading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Download className="size-3" />
            )}
            {zipLoading ? "Packaging…" : "Images (.zip)"}
          </button>
        </div>
      </div>

      {/* Scenes grid */}
      <div className="divide-y divide-white/5">
        {board.scenes.map((scene, i) => {
          const role = cinematicSceneRole(i, total);
          const roleStyle = CINEMATIC_ROLE_STYLES[role];
          return (
            <div key={scene.scene} className="flex gap-3 p-4">
              {/* Frame image with loading / retry states */}
              <div className="shrink-0">
                 <SceneFrame scene={scene} isPending={isPending && !scene.imageUrl} readOnly={readOnly} />
              </div>

              {/* Scene details */}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}>
                    {role}
                  </span>
                </div>
                <p className="text-xs font-semibold leading-tight text-foreground">{scene.title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{scene.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
