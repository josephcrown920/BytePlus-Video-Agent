import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useWorkspace } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { ImageIcon, Wand2, Settings2, Ratio } from "lucide-react";
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
  const { addTask } = useWorkspace();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [ratio, setRatio] = useState("16:9");
  const [style, setStyle] = useState("cinematic");

  const handleGenerate = () => {
    if (!prompt.trim()) return;

    addTask({
      type: "image",
      prompt: `[${style}] ${prompt} (AR: ${ratio})`,
    });

    toast({
      title: "API Connection Required",
      description: "Server-side BytePlus connection is required to generate media. Task saved to pipeline as pending.",
      variant: "destructive"
    });
    
    setPrompt("");
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
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Prompt</span>
                <Badge variant="secondary" className="text-[9px]">Text to Image</Badge>
              </label>
              <Textarea 
                placeholder="Describe your scene in cinematic detail..." 
                className="min-h-[120px] font-sans text-sm resize-none bg-black/40"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Negative Prompt (Optional)
              </label>
              <Input 
                placeholder="Blurry, low quality, artifacts..." 
                className="font-sans text-sm bg-black/40"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Ratio className="w-3 h-3" /> Ratio
                </label>
                <Select 
                  options={ASPECT_RATIOS} 
                  value={ratio}
                  onChange={(e) => setRatio(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-3 h-3" /> Style
                </label>
                <Select 
                  options={STYLES}
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                />
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