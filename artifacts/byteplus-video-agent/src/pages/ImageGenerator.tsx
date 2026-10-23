import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useWorkspace } from "@/lib/store";
import { useMediaGeneration } from "@/lib/use-media-generation";
import { getSharedSupabaseAccessToken } from "@/lib/shared-auth";
import type { MediaGeneration, MediaModel, CreateMediaGenerationRequestAspectRatio } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Copy, ImageIcon, Pencil, Wand2, Settings2, Ratio, Save, Trash2, StopCircle, RefreshCw, Loader2, ImagePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const ASPECT_RATIOS = [
  { label: "16:9 (Cinematic)", value: "16:9" },
  { label: "9:16 (Vertical)", value: "9:16" },
  { label: "1:1 (Square)", value: "1:1" },
  { label: "21:9 (Ultrawide)", value: "21:9" },
];

const STYLES = [
  { label: "Photorealistic", value: "photorealistic" },
  { label: "Cinematic Shot", value: "cinematic" },
  { label: "Anime", value: "anime" },
  { label: "Cyberpunk", value: "cyberpunk" },
  { label: "3D Render", value: "3d" },
];

const MODELS = [
  { label: "Seedream 4.5", value: "seedream-4.5", image: "https://v3b.fal.media/files/b/0a84c771/1bdm3n1K8bRK-TzYjLF04_57edae699adf457a8a66ae6665a17e3a.jpg" },
  { label: "FLUX", value: "flux-dev", image: "https://storage.googleapis.com/fal_cdn/fal/Upscale-1.jpeg" },
  { label: "Nano Banana Pro", value: "nano-banana-pro", image: "https://v3b.fal.media/files/b/0a8691ce/SR0_u1zPJbx8jCIO6bJR0_8c83f0d66bbd48f3b55f825117941f84.jpg" },
];

export default function ImageGenerator() {
  const workspace = useWorkspace();
  const { tasks, addTask, updateTask, activeProject, presets, updateGeneratorSettings, addPreset, deletePreset, renamePreset } = workspace;
  const { toast } = useToast();
  
  const settings = activeProject.imageSettings;
  const prompt = settings.prompt || "";
  const negativePrompt = settings.negativePrompt ?? "";
  const ratio = settings.ratio || "16:9";
  const style = settings.style ?? "cinematic";
  const model = settings.model || "seedream-4.5";
  
  const [presetName, setPresetName] = useState("");
  const taskIdRef = useRef<string | null>(null);
  const syncGeneration = useCallback((generation: MediaGeneration) => {
    if (!taskIdRef.current) return;
    updateTask(taskIdRef.current, {
      status: generation.status,
      progress: generation.progress,
      generationId: generation.id,
      queuePosition: generation.queuePosition ?? undefined,
      resultUrl: generation.resultUrl ?? undefined,
      error: generation.error ?? undefined,
      logs: generation.logs,
    });
  }, [updateTask]);
  const { generation, isSubmitting, submitError, start, cancel, resume } = useMediaGeneration(syncGeneration);

  const currentTask = useMemo(() => {
    return tasks.find(t => t.type === 'image' && t.projectId === activeProject.id);
  }, [tasks, activeProject.id]);

  useEffect(() => {
    if (
      !currentTask?.generationId ||
      !["queued", "processing"].includes(currentTask.status) ||
      generation?.id === currentTask.generationId ||
      !getSharedSupabaseAccessToken()
    ) return;
    taskIdRef.current = currentTask.id;
    void resume(currentTask.generationId).catch((error: unknown) => {
      if (error instanceof Error && error.message.includes("404")) {
        updateTask(currentTask.id, {
          status: "failed",
          progress: 100,
          error: "This render could not be resumed after the generation service restarted.",
        });
      }
    });
  }, [currentTask?.generationId, currentTask?.id, currentTask?.status, generation?.id, resume, updateTask]);

  const handleGenerate = async () => {
    if (!getSharedSupabaseAccessToken()) {
      toast({ title: "Sign in required", description: "Sign in through Aura before using paid image generation.", variant: "destructive" });
      return;
    }
    if (prompt.trim().length < 3) {
      toast({ title: "Add more detail", description: "Your prompt must be at least 3 characters.", variant: "destructive" });
      return;
    }
    const localTaskId = addTask({
      type: "image",
      prompt: `[${style}] ${prompt} (AR: ${ratio})`,
      metadata: { ...settings, model },
      status: "queued",
      progress: 2,
    });
    taskIdRef.current = localTaskId;
    try {
      const created = await start({
        kind: "image",
        model: model as MediaModel,
        prompt: `[${style}] ${prompt.trim()}`,
        negativePrompt: negativePrompt.trim() || undefined,
        aspectRatio: ratio as CreateMediaGenerationRequestAspectRatio,
        resolution: "standard",
      });
      syncGeneration(created);
      toast({ title: "Image queued", description: `${MODELS.find(item => item.value === model)?.label ?? model} is rendering on fal.ai.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image generation could not be started.";
      updateTask(localTaskId, { status: "failed", progress: 100, error: message });
      toast({ title: "Could not start image", description: message, variant: "destructive" });
    }
  };

  const getPreviewClasses = (r: string) => {
    switch (r) {
      case "16:9": return "aspect-video w-full";
      case "9:16": return "aspect-[9/16] h-full max-h-[70vh] w-auto mx-auto";
      case "1:1": return "aspect-square h-full max-h-[70vh] w-auto mx-auto";
      case "21:9": return "aspect-[21/9] w-full";
      default: return "aspect-video w-full";
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* Visual Preview Area (Takes precedence) */}
      <div className="shrink-0 h-[50vh] md:h-auto md:flex-1 bg-black/90 p-4 md:p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border relative overflow-hidden group">
        {/* Background ambient light based on task state */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] blur-[120px] pointer-events-none rounded-full transition-colors duration-1000 ${
          currentTask?.status === 'processing' ? 'bg-primary/20' :
          currentTask?.status === 'failed' ? 'bg-destructive/10' :
          currentTask?.status === 'completed' ? 'bg-white/5' : 'bg-primary/5'
        }`} />
        
        <div className={`relative flex items-center justify-center bg-black/50 border border-border/50 rounded-xl overflow-hidden shadow-2xl transition-all duration-500 ${getPreviewClasses(currentTask?.metadata?.ratio || ratio)}`}>
          
          {(!currentTask || currentTask.status === 'requires_api' || currentTask.status === 'cancelled') && (
            <div className="flex flex-col items-center justify-center gap-4 text-center p-6 w-full h-full relative z-10">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-2">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg text-foreground tracking-tight">{currentTask?.status === "cancelled" ? "Render cancelled" : "Ready to Generate"}</h3>
              <p className="text-sm text-muted-foreground max-w-md font-sans">
                Set your parameters and prompt in the sidebar. The visual board is standing by for {model}.
              </p>
            </div>
          )}

          {currentTask?.status === 'queued' && (
            <div className="flex flex-col items-center justify-center gap-6 text-center w-full h-full relative z-10">
              <Loader2 className="w-12 h-12 text-muted-foreground animate-spin" />
              <div className="space-y-1">
                <h3 className="font-semibold text-lg text-foreground tracking-tight">Queued...</h3>
                <p className="text-sm text-muted-foreground font-mono">
                  {currentTask.queuePosition != null ? `Queue position ${currentTask.queuePosition}` : "Waiting for inference slot"}
                </p>
              </div>
            </div>
          )}

          {currentTask?.status === 'processing' && (
            <div className="flex flex-col items-center justify-center gap-6 text-center w-full h-full relative z-10">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent pointer-events-none opacity-40 animate-pulse" />
              <div className="absolute inset-0 border-t border-primary/40 bg-gradient-to-b from-primary/10 to-transparent h-32 animate-[scan_3s_ease-in-out_infinite]" style={{ transform: 'translateY(-100%)' }} />
              
              <div className="relative z-20 flex flex-col items-center gap-4">
                <div className="text-4xl font-mono font-bold tracking-tighter text-primary text-glow">
                  {Math.round(currentTask.progress)}%
                </div>
                <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10 font-mono">
                  {currentTask.metadata?.model || 'Rendering'} Active
                </Badge>
                <div className="w-48 h-1.5 bg-black/80 rounded-full overflow-hidden border border-border/50">
                  <div className="h-full bg-primary animate-stripes transition-all duration-300" style={{ width: `${currentTask.progress}%` }} />
                </div>
                <p className="max-w-sm text-xs text-muted-foreground" aria-live="polite">{currentTask.logs?.at(-1) ?? "Generating image…"}</p>
              </div>
            </div>
          )}

          {currentTask?.status === 'completed' && (
            <div className="w-full h-full relative group/result">
              {currentTask.resultUrl ? (
                <img src={currentTask.resultUrl} alt="Generated result" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-secondary/30 flex items-center justify-center p-8 text-center">
                  <p className="text-sm text-muted-foreground">The model completed without a displayable image URL.</p>
                </div>
              )}
            </div>
          )}

          {currentTask?.status === 'failed' && (
            <div className="flex flex-col items-center justify-center gap-4 text-center w-full h-full relative z-10 bg-destructive/5">
              <StopCircle className="w-12 h-12 text-destructive" />
              <div className="space-y-1">
                <h3 className="font-semibold text-lg text-foreground tracking-tight">Generation Failed</h3>
                <p className="text-sm text-destructive font-mono max-w-sm px-4">{currentTask.error || "An unknown error occurred during inference."}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Status bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/80 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full shadow-lg">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentTask?.status === 'processing' ? 'bg-primary' : 'bg-green-500'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${currentTask?.status === 'processing' ? 'bg-primary' : 'bg-green-500'}`}></span>
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">fal.ai Gateway</span>
          </div>
          <div className="w-px h-3 bg-white/10 mx-1" />
          <span className="text-[10px] font-mono text-muted-foreground">{model}</span>
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex-1 md:flex-none w-full md:w-[400px] lg:w-[440px] bg-card/80 backdrop-blur-2xl flex flex-col overflow-hidden border-l border-white/5">
        <div className="px-6 py-5 border-b border-border/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-md">
              <Settings2 className="w-4 h-4 text-foreground" />
            </div>
            <div>
              <h2 className="font-semibold tracking-tight text-sm">Image Setup</h2>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">Parameters</p>
            </div>
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8">
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold tracking-tight">AI Model</label>
                <Badge variant="secondary" className="text-[10px] font-mono bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">Pro</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Image model">
                {MODELS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={model === option.value}
                    onClick={() => updateGeneratorSettings("image", { model: option.value })}
                    className={`overflow-hidden rounded-lg border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${model === option.value ? "border-primary bg-primary/10" : "border-white/10 bg-black/30 hover:border-white/25"}`}
                    data-testid={`model-image-${option.value}`}
                  >
                    <img src={option.image} alt={`${option.label} example output`} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                    <span className="block truncate px-2 py-2 text-[11px] font-semibold">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label htmlFor="image-prompt" className="text-sm font-semibold tracking-tight flex items-center justify-between">
                <span>Prompt</span>
              </label>
              <Textarea id="image-prompt"
                placeholder="Describe your scene in cinematic detail..." 
                className="min-h-[140px] font-sans text-sm resize-none bg-black/40 border-border/60 focus:border-primary/50"
                value={prompt}
                onChange={(e) => updateGeneratorSettings("image", { prompt: e.target.value })}
                data-testid="input-image-prompt"
              />
            </div>

            <div className="space-y-4">
              <label htmlFor="negative-prompt" className="text-sm font-semibold tracking-tight text-muted-foreground">
                Negative Prompt <span className="text-xs font-normal opacity-70">(Optional)</span>
              </label>
              <Input id="negative-prompt"
                placeholder="Blurry, low quality, artifacts..." 
                className="font-sans text-sm bg-black/40 border-border/60"
                value={negativePrompt}
                onChange={(e) => updateGeneratorSettings("image", { negativePrompt: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-3">
                <label htmlFor="image-ratio" className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Ratio className="w-3 h-3" /> Ratio
                </label>
                <Select id="image-ratio"
                  options={ASPECT_RATIOS} 
                  value={ratio}
                  onChange={(e) => updateGeneratorSettings("image", { ratio: e.target.value })}
                  className="bg-black/40"
                />
              </div>
              <div className="space-y-3">
                <label htmlFor="image-style" className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-3 h-3" /> Style
                </label>
                <Select id="image-style"
                  options={STYLES}
                  value={style}
                  onChange={(e) => updateGeneratorSettings("image", { style: e.target.value })}
                  className="bg-black/40"
                />
              </div>
            </div>

            <div className="space-y-4 p-5 rounded-xl border border-white/5 bg-white/[0.02]">
              <label htmlFor="image-preset" className="text-sm font-semibold tracking-tight">Presets</label>
              <div className="flex gap-2">
                <Input id="image-preset" className="bg-black/40 border-white/5" value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="Save current settings..." />
                <Button aria-label="Save image preset" variant="secondary" size="icon" className="shrink-0 hover:bg-primary/20 hover:text-primary transition-colors" disabled={!presetName.trim()} onClick={() => { addPreset("image", presetName, settings); setPresetName(""); }}><Save className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-2 mt-4">
                {presets.filter(p => p.kind === "image").map(preset => (
                  <div key={preset.id} className="flex items-center gap-1.5 group">
                    <Button variant="ghost" className="h-9 flex-1 justify-start bg-black/20 hover:bg-black/40 font-medium text-sm text-muted-foreground hover:text-foreground border border-white/5" onClick={() => updateGeneratorSettings("image", preset.settings)}>{preset.name}</Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Rename ${preset.name} preset`} onClick={() => {
                      const nextName = window.prompt("Rename preset", preset.name);
                      if (nextName) renamePreset(preset.id, nextName);
                    }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Delete ${preset.name} preset`} onClick={() => {
                      if (window.confirm(`Delete the “${preset.name}” preset?`)) deletePreset(preset.id);
                    }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </ScrollArea>
        
        <div className="p-6 bg-black/20 border-t border-border/50 shrink-0">
          {submitError && <p role="alert" className="mb-3 text-xs text-destructive">{submitError}</p>}
          <div className="flex gap-2">
          {currentTask && (currentTask.status === "queued" || currentTask.status === "processing") && (
            <Button variant="outline" onClick={() => void cancel()} className="h-14 px-4" aria-label="Cancel image generation" data-testid="button-cancel-image">
              <StopCircle className="w-5 h-5" />
            </Button>
          )}
          <Button
            onClick={handleGenerate} 
            disabled={isSubmitting || currentTask?.status === 'processing' || currentTask?.status === "queued"}
            className="flex-1 h-14 gap-2 text-sm font-bold tracking-wide rounded-xl shadow-[0_0_20px_rgba(212,255,0,0.15)] hover:shadow-[0_0_30px_rgba(212,255,0,0.3)] transition-all"
            data-testid="button-generate"
          >
            {isSubmitting || currentTask?.status === 'processing' || currentTask?.status === "queued" ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</>
            ) : (
              <><ImagePlus className="w-5 h-5" /> Generate Image</>
            )}
          </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
