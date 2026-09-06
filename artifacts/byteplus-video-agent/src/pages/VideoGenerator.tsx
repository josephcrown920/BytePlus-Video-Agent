import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useWorkspace } from "@/lib/store";
import { useMediaGeneration } from "@/lib/use-media-generation";
import { getSharedSupabaseAccessToken } from "@/lib/shared-auth";
import type { CreateMediaGenerationRequestAspectRatio, MediaGeneration, MediaModel } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Copy, Pencil, Video, Play, Settings2, Camera, Clock, Save, Trash2, StopCircle, Loader2, PlaySquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";

const DURATIONS = [
  { label: "4 Seconds (Standard)", value: "4s" },
  { label: "5 Seconds", value: "5s" },
  { label: "8 Seconds (Extended)", value: "8s" },
  { label: "10 Seconds", value: "10s" },
];

const ASPECT_RATIOS = [
  { label: "16:9", value: "16:9" },
  { label: "9:16", value: "9:16" },
  { label: "1:1", value: "1:1" },
];

const CAMERAS = [
  { label: "Static", value: "static" },
  { label: "Slow Pan Right", value: "pan_right" },
  { label: "Slow Pan Left", value: "pan_left" },
  { label: "Zoom In", value: "zoom_in" },
  { label: "Zoom Out", value: "zoom_out" },
];

const MODELS = [
  { label: "Seedance 2.5", value: "seedance-2.5", image: "https://v3b.fal.media/files/b/0aa30edb/Ckq9fPYW5fP_nqcCC-SHh.jpg" },
  { label: "Wan 2.5", value: "wan-2.5", image: "https://v3.fal.media/files/koala/yojKCMBipiqJvLr9a3sLC_deec1d2b5b2c4019bc353f6060ec0c09.jpg" },
];

export default function VideoGenerator() {
  const workspace = useWorkspace();
  const { tasks, addTask, updateTask, activeProject, presets, updateGeneratorSettings, addPreset, deletePreset, renamePreset } = workspace;
  const { toast } = useToast();
  
  const settings = activeProject.videoSettings;
  const prompt = settings.prompt || "";
  const duration = settings.duration ?? "5s";
  const ratio = settings.ratio || "16:9";
  const camera = settings.camera ?? "static";
  const motion = [settings.motion ?? 50];
  const model = settings.model || "seedance-2.5";
  
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
    return tasks.find(t => t.type === 'video' && t.projectId === activeProject.id);
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
      toast({ title: "Sign in required", description: "Sign in through Aura before using paid video generation.", variant: "destructive" });
      return;
    }
    if (prompt.trim().length < 3) {
      toast({ title: "Add more detail", description: "Your prompt must be at least 3 characters.", variant: "destructive" });
      return;
    }
    const localTaskId = addTask({
      type: "video",
      prompt: `[${camera} | ${motion[0]}% motion] ${prompt}`,
      metadata: { ...settings, model },
      status: "queued",
      progress: 2,
    });
    taskIdRef.current = localTaskId;
    try {
      const created = await start({
        kind: "video",
        model: model as MediaModel,
        prompt: `[Camera: ${camera}; motion: ${motion[0]}%] ${prompt.trim()}`,
        aspectRatio: ratio as CreateMediaGenerationRequestAspectRatio,
        duration: Number.parseInt(duration, 10) as 4 | 5 | 8 | 10,
        resolution: "standard",
      });
      syncGeneration(created);
      toast({ title: "Video queued", description: `${MODELS.find(item => item.value === model)?.label ?? model} is rendering on fal.ai.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Video generation could not be started.";
      updateTask(localTaskId, { status: "failed", progress: 100, error: message });
      toast({ title: "Could not start video", description: message, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* Visual Preview Area */}
      <div className="shrink-0 h-[50vh] md:h-auto md:flex-1 bg-black/90 p-4 md:p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border relative overflow-hidden group">
        
        {/* Playhead visualization */}
        {currentTask?.status === 'processing' && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-secondary/50 z-20">
            <div className="h-full bg-primary/80 relative transition-all duration-1000 ease-linear" style={{ width: `${currentTask.progress}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-4 bg-primary shadow-[0_0_10px_rgba(212,255,0,0.8)]" />
            </div>
          </div>
        )}

        {/* Ambient background light */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] blur-[120px] pointer-events-none rounded-full transition-colors duration-1000 ${
          currentTask?.status === 'processing' ? 'bg-primary/20' :
          currentTask?.status === 'failed' ? 'bg-destructive/10' :
          currentTask?.status === 'completed' ? 'bg-white/5' : 'bg-primary/5'
        }`} />

        <div className="w-full max-w-5xl aspect-video bg-black/50 border border-border/50 rounded-xl overflow-hidden relative shadow-2xl flex items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent opacity-80 pointer-events-none" />
          
          {/* Grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-30" />

          {(!currentTask || currentTask.status === 'requires_api' || currentTask.status === "cancelled") && (
            <div className="flex flex-col items-center justify-center gap-4 text-center p-6 relative z-10">
              <div className="w-20 h-20 rounded-full bg-secondary/80 border border-white/5 flex items-center justify-center mb-2 shadow-2xl">
                <PlaySquare className="w-8 h-8 text-muted-foreground ml-1" />
              </div>
              <h3 className="font-semibold text-lg text-foreground tracking-tight">{currentTask?.status === "cancelled" ? "Render cancelled" : "Sequence Ready"}</h3>
              <p className="text-sm text-muted-foreground max-w-md font-sans">
                Set motion parameters and action prompt in the sidebar. {model} engine is online.
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
            <div className="flex flex-col items-center justify-center gap-8 text-center w-full h-full relative z-10">
              {/* Scanline effect */}
              <div className="absolute inset-0 border-t border-primary/30 bg-gradient-to-b from-primary/10 to-transparent h-full animate-[scan_2.5s_ease-in-out_infinite]" style={{ transform: 'translateY(-100%)' }} />
              
              <div className="relative z-20 flex flex-col items-center gap-5">
                <div className="text-5xl font-mono font-bold tracking-tighter text-primary text-glow">
                  {Math.round(currentTask.progress)}%
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10 font-mono">
                    {currentTask.metadata?.model || 'Rendering'}
                  </Badge>
                  <Badge variant="outline" className="border-border text-muted-foreground bg-black/50 font-mono">
                    Generating Frames
                  </Badge>
                </div>
                <div className="w-64 h-1.5 bg-black/80 rounded-full overflow-hidden border border-border/50">
                  <div className="h-full bg-primary animate-stripes transition-all duration-300" style={{ width: `${currentTask.progress}%` }} />
                </div>
                <p className="max-w-sm text-xs text-muted-foreground" aria-live="polite">{currentTask.logs?.at(-1) ?? "Generating video frames…"}</p>
              </div>
            </div>
          )}

          {currentTask?.status === 'completed' && (
            <div className="w-full h-full relative group/result cursor-pointer">
              {currentTask.resultUrl ? (
                <video src={currentTask.resultUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-secondary to-background flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=2600&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-luminosity" />
                  
                  <div className="z-10 w-20 h-20 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center backdrop-blur-md hover:bg-primary/30 hover:scale-105 transition-all">
                     <Play className="w-8 h-8 text-primary ml-1" />
                  </div>
                  <span className="z-10 font-medium tracking-tight text-sm mt-6 px-4 py-1.5 bg-black/60 rounded-md border border-white/10">Video Sequence Complete</span>
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
              <Video className="w-4 h-4 text-foreground" />
            </div>
            <div>
              <h2 className="font-semibold tracking-tight text-sm">Sequence Setup</h2>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">Parameters</p>
            </div>
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8">
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold tracking-tight">Video Engine</label>
                <Badge variant="secondary" className="text-[10px] font-mono bg-primary/10 text-primary border-primary/20">Motion</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Video model">
                {MODELS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={model === option.value}
                    onClick={() => updateGeneratorSettings("video", {
                      model: option.value,
                      ...(option.value === "wan-2.5" && !["5s", "10s"].includes(duration) ? { duration: "5s" } : {}),
                    })}
                    className={`overflow-hidden rounded-lg border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${model === option.value ? "border-primary bg-primary/10" : "border-white/10 bg-black/30 hover:border-white/25"}`}
                    data-testid={`model-video-${option.value}`}
                  >
                    <img src={option.image} alt={`${option.label} example output`} loading="lazy" className="aspect-video w-full object-cover" />
                    <span className="block px-2.5 py-2 text-xs font-semibold">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label htmlFor="video-prompt" className="text-sm font-semibold tracking-tight flex items-center justify-between">
                <span>Action Prompt</span>
              </label>
              <Textarea id="video-prompt"
                placeholder="Describe the motion and action..." 
                className="min-h-[140px] font-sans text-sm resize-none bg-black/40 border-border/60 focus:border-primary/50"
                value={prompt}
                onChange={(e) => updateGeneratorSettings("video", { prompt: e.target.value })}
                data-testid="input-video-prompt"
              />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-3">
                <label htmlFor="video-ratio" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Ratio</label>
                <Select id="video-ratio"
                  options={ASPECT_RATIOS}
                  value={ratio}
                  onChange={(e) => updateGeneratorSettings("video", { ratio: e.target.value })}
                  className="bg-black/40"
                />
              </div>
              <div className="space-y-3">
                <label htmlFor="video-duration" className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Duration
                </label>
                <Select id="video-duration"
                  options={model === "wan-2.5" ? DURATIONS.filter(option => option.value === "5s" || option.value === "10s") : DURATIONS}
                  value={duration}
                  onChange={(e) => updateGeneratorSettings("video", { duration: e.target.value })}
                  className="bg-black/40"
                />
              </div>
              <div className="col-span-2 space-y-3">
                <label htmlFor="video-camera" className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Camera className="w-3 h-3" /> Camera
                </label>
                <Select id="video-camera"
                  options={CAMERAS}
                  value={camera}
                  onChange={(e) => updateGeneratorSettings("video", { camera: e.target.value })}
                  className="bg-black/40"
                />
              </div>
            </div>

            <div className="space-y-5 p-5 rounded-xl border border-white/5 bg-white/[0.02]">
              <label id="motion-intensity-label" className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Motion Intensity</span>
                <span className="text-primary font-bold">{motion[0]}%</span>
              </label>
              <Slider 
                aria-labelledby="motion-intensity-label"
                value={motion}
                onValueChange={value => updateGeneratorSettings("video", { motion: value[0] })}
                max={100}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono opacity-70">
                <span>Subtle</span>
                <span>Dynamic</span>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <label htmlFor="video-preset" className="text-sm font-semibold tracking-tight">Presets</label>
              <div className="flex gap-2">
                <Input id="video-preset" className="bg-black/40 border-white/5" value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="Save current settings..." />
                <Button aria-label="Save video preset" variant="secondary" size="icon" className="shrink-0 hover:bg-primary/20 hover:text-primary transition-colors" disabled={!presetName.trim()} onClick={() => { addPreset("video", presetName, settings); setPresetName(""); }}><Save className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-2 mt-4">
                {presets.filter(p => p.kind === "video").map(preset => (
                  <div key={preset.id} className="flex items-center gap-1.5 group">
                    <Button variant="ghost" className="h-9 flex-1 justify-start bg-black/20 hover:bg-black/40 font-medium text-sm text-muted-foreground hover:text-foreground border border-white/5" onClick={() => updateGeneratorSettings("video", preset.settings)}>{preset.name}</Button>
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
            <Button variant="outline" onClick={() => void cancel()} className="h-14 px-4" aria-label="Cancel video generation" data-testid="button-cancel-video">
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
              <><Loader2 className="w-5 h-5 animate-spin" /> Rendering Sequence...</>
            ) : (
              <><Play className="w-5 h-5 fill-current" /> Generate Video</>
            )}
          </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
