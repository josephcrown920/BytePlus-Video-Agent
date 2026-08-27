import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useWorkspace } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { Copy, ImageIcon, Pencil, Wand2, Settings2, Ratio, Save, Trash2 } from "lucide-react";
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

export default function ImageGenerator() {
  const workspace = useWorkspace();
  const { addTask, activeProject, presets, updateGeneratorSettings, addPreset, deletePreset, duplicatePreset, renamePreset } = workspace;
  const { toast } = useToast();
  const settings = activeProject.imageSettings;
  const prompt = settings.prompt;
  const negativePrompt = settings.negativePrompt ?? "";
  const ratio = settings.ratio;
  const style = settings.style ?? "cinematic";
  const [presetName, setPresetName] = useState("");

  const handleGenerate = () => {
    if (!prompt.trim()) return;

    addTask({
      type: "image",
      prompt: `[${style}] ${prompt} (AR: ${ratio})`,
      metadata: settings,
    });

    toast({
      title: "API Connection Required",
      description: "Server-side BytePlus connection is required to generate media. Task saved to pipeline as pending.",
      variant: "destructive"
    });
    
  };

  // Mock visual preview based on ratio
  const getPreviewClasses = () => {
    switch (ratio) {
      case "16:9": return "aspect-video";
      case "9:16": return "aspect-[9/16] max-h-[60vh] w-auto mx-auto";
      case "1:1": return "aspect-square max-h-[60vh] w-auto mx-auto";
      case "21:9": return "aspect-[21/9]";
      default: return "aspect-video";
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* Visual Preview Area (Takes precedence) */}
      <div className="shrink-0 h-[40vh] md:h-auto md:flex-1 bg-black/60 p-4 md:p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border relative overflow-hidden">
        {/* Background ambient light */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-primary/5 blur-[100px] pointer-events-none rounded-full" />
        
        <div className={`w-full max-w-4xl bg-card border border-border/50 rounded-md overflow-hidden relative shadow-2xl flex items-center justify-center ${getPreviewClasses()}`}>
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent pointer-events-none opacity-20" />
          
          <div className="flex flex-col items-center gap-4 text-muted-foreground/50 text-center px-4">
            <ImageIcon className="w-12 h-12 md:w-16 md:h-16 opacity-50" />
            <div className="font-mono text-[10px] md:text-xs uppercase tracking-widest">Seedream Preview Window</div>
            <div className="flex gap-2">
              <Badge variant="outline" className="border-border/50 bg-black/50 text-[10px]">AR: {ratio}</Badge>
              <Badge variant="outline" className="border-border/50 bg-black/50 text-[10px]">Model: SD-XL v2</Badge>
            </div>
          </div>
          
          {/* Scanning line effect */}
          <div className="absolute inset-0 border-t border-primary/20 bg-gradient-to-b from-primary/5 to-transparent h-32 animate-[scan_4s_ease-in-out_infinite]" style={{ transform: 'translateY(-100%)' }} />
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex-1 md:flex-none w-full md:w-[400px] bg-card/50 backdrop-blur-md flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2 shrink-0">
          <Settings2 className="w-4 h-4 text-primary" />
          <h2 className="font-mono text-sm tracking-wider uppercase">Seedream Controls</h2>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-4 md:p-6 space-y-6">
            <div className="space-y-3">
              <label htmlFor="image-prompt" className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Prompt</span>
                <Badge variant="secondary" className="text-[9px]">Text to Image</Badge>
              </label>
              <Textarea id="image-prompt"
                placeholder="Describe your scene in cinematic detail..." 
                className="min-h-[120px] font-sans text-sm resize-none bg-black/40"
                value={prompt}
                onChange={(e) => updateGeneratorSettings("image", { prompt: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <label htmlFor="negative-prompt" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Negative Prompt (Optional)
              </label>
              <Input id="negative-prompt"
                placeholder="Blurry, low quality, artifacts..." 
                className="font-sans text-sm bg-black/40"
                value={negativePrompt}
                onChange={(e) => updateGeneratorSettings("image", { negativePrompt: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label htmlFor="image-ratio" className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Ratio className="w-3 h-3" /> Ratio
                </label>
                <Select id="image-ratio"
                  options={ASPECT_RATIOS} 
                  value={ratio}
                  onChange={(e) => updateGeneratorSettings("image", { ratio: e.target.value })}
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
                />
              </div>
            </div>

            <div className="space-y-3 rounded-md border border-border bg-black/20 p-4">
              <label htmlFor="image-preset" className="text-sm font-medium">Reusable presets</label>
              <div className="flex gap-2">
                <Input id="image-preset" value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="Preset name" />
                <Button aria-label="Save image preset" variant="outline" size="icon" className="shrink-0" disabled={!presetName.trim()} onClick={() => { addPreset("image", presetName, settings); setPresetName(""); }}><Save className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-2">
                {presets.filter(p => p.kind === "image").map(preset => (
                  <div key={preset.id} className="flex items-center gap-2">
                    <Button variant="secondary" className="min-h-10 flex-1 justify-start" onClick={() => updateGeneratorSettings("image", preset.settings)}>{preset.name}</Button>
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
                <Wand2 className="w-4 h-4" />
                Generate Frame
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}