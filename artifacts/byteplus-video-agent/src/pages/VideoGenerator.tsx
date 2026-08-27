import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useWorkspace } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { Copy, Pencil, Video, Play, Settings2, Camera, Clock, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";

const DURATIONS = [
  { label: "4 Seconds (Standard)", value: "4s" },
  { label: "8 Seconds (Extended)", value: "8s" },
];

const CAMERAS = [
  { label: "Static", value: "static" },
  { label: "Slow Pan Right", value: "pan_right" },
  { label: "Slow Pan Left", value: "pan_left" },
  { label: "Zoom In", value: "zoom_in" },
  { label: "Zoom Out", value: "zoom_out" },
];

export default function VideoGenerator() {
  const workspace = useWorkspace();
  const { addTask, activeProject, presets, updateGeneratorSettings, addPreset, deletePreset, duplicatePreset, renamePreset } = workspace;
  const { toast } = useToast();
  const settings = activeProject.videoSettings;
  const prompt = settings.prompt;
  const duration = settings.duration ?? "4s";
  const camera = settings.camera ?? "static";
  const motion = [settings.motion ?? 50];
  const [presetName, setPresetName] = useState("");

  const handleGenerate = () => {
    if (!prompt.trim()) return;

    addTask({
      type: "video",
      prompt: `[${camera} | ${motion[0]}% motion] ${prompt}`,
      metadata: settings,
    });

    toast({
      title: "API Connection Required",
      description: "Server-side BytePlus connection is required to generate media. Task saved to pipeline as pending.",
      variant: "destructive"
    });
    
  };

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* Visual Preview Area */}
      <div className="shrink-0 h-[40vh] md:h-auto md:flex-1 bg-black/60 p-4 md:p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border relative overflow-hidden">
        {/* Playhead visualization */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-secondary">
          <div className="h-full bg-primary/50 w-1/3 relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-3 bg-primary" />
          </div>
        </div>

        <div className="w-full max-w-4xl aspect-video bg-card border border-border/50 rounded-md overflow-hidden relative shadow-2xl flex items-center justify-center group">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background/50 to-background opacity-80" />
          
          <div className="flex flex-col items-center gap-4 text-muted-foreground z-10 text-center px-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-black/50 border border-primary/30 flex items-center justify-center group-hover:scale-110 group-hover:border-primary transition-all duration-500 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
              <Play className="w-6 h-6 md:w-8 md:h-8 ml-1 text-primary/70 group-hover:text-primary transition-colors" />
            </div>
            <div className="font-mono text-[10px] md:text-xs uppercase tracking-widest mt-4">Seedance Player</div>
            <div className="flex gap-2">
              <Badge variant="outline" className="border-border/50 bg-black/50 text-[10px]">T2V Engine</Badge>
              <Badge variant="outline" className="border-border/50 bg-black/50 text-[10px]">{duration}</Badge>
            </div>
          </div>

          {/* Grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex-1 md:flex-none w-full md:w-[400px] bg-card/50 backdrop-blur-md flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2 shrink-0">
          <Video className="w-4 h-4 text-primary" />
          <h2 className="font-mono text-sm tracking-wider uppercase">Seedance Controls</h2>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-4 md:p-6 space-y-8">
            <div className="space-y-3">
              <label htmlFor="video-prompt" className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Action Prompt</span>
                <Badge variant="secondary" className="text-[9px]">Text to Video</Badge>
              </label>
              <Textarea id="video-prompt"
                placeholder="Describe the motion and action..." 
                className="min-h-[120px] font-sans text-sm resize-none bg-black/40"
                value={prompt}
                onChange={(e) => updateGeneratorSettings("video", { prompt: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label htmlFor="video-duration" className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Duration
                </label>
                <Select id="video-duration"
                  options={DURATIONS} 
                  value={duration}
                  onChange={(e) => updateGeneratorSettings("video", { duration: e.target.value })}
                />
              </div>
              <div className="space-y-3">
                <label htmlFor="video-camera" className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Camera className="w-3 h-3" /> Camera
                </label>
                <Select id="video-camera"
                  options={CAMERAS}
                  value={camera}
                  onChange={(e) => updateGeneratorSettings("video", { camera: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <label id="motion-intensity-label" className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Motion Intensity</span>
                <span className="text-primary">{motion[0]}%</span>
              </label>
              <Slider 
                aria-labelledby="motion-intensity-label"
                value={motion}
                onValueChange={value => updateGeneratorSettings("video", { motion: value[0] })}
                max={100}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>Subtle</span>
                <span>Dynamic</span>
              </div>
            </div>

            <div className="space-y-3 rounded-md border border-border bg-black/20 p-4">
              <label htmlFor="video-preset" className="text-sm font-medium">Reusable presets</label>
              <div className="flex gap-2">
                <Input id="video-preset" value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="Preset name" />
                <Button aria-label="Save video preset" variant="outline" size="icon" className="shrink-0" disabled={!presetName.trim()} onClick={() => { addPreset("video", presetName, settings); setPresetName(""); }}><Save className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-2">
                {presets.filter(p => p.kind === "video").map(preset => (
                  <div key={preset.id} className="flex items-center gap-2">
                    <Button variant="secondary" className="min-h-10 flex-1 justify-start" onClick={() => updateGeneratorSettings("video", preset.settings)}>{preset.name}</Button>
                    <Button variant="ghost" size="icon" aria-label={`Rename ${preset.name} preset`} onClick={() => {
                      const nextName = window.prompt("Rename preset", preset.name);
                      if (nextName) renamePreset(preset.id, nextName);
                    }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label={`Duplicate ${preset.name} preset`} onClick={() => duplicatePreset(preset.id)}><Copy className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${preset.name} preset`} onClick={() => {
                      if (window.confirm(`Delete the “${preset.name}” preset?`)) deletePreset(preset.id);
                    }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <Button 
                onClick={handleGenerate} 
                className="w-full h-12 gap-2 text-sm font-semibold tracking-wide"
                variant="cinematic"
              >
                <Play className="w-4 h-4" />
                Generate Video Sequence
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}