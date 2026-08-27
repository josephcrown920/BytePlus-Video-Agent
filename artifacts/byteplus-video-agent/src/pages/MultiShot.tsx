import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, ListVideo, GripVertical, Settings2, Play, Wand2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface Shot {
  id: string;
  type: 'image' | 'video';
  prompt: string;
  duration?: number;
}

export default function MultiShot() {
  const { toast } = useToast();
  const [shots, setShots] = useState<Shot[]>([
    { id: '1', type: 'image', prompt: 'Establishing shot of a neon-lit cyberpunk city alleyway.' },
    { id: '2', type: 'video', prompt: 'Camera slowly pans down to reveal a figure in a trenchcoat.', duration: 4 },
  ]);

  const addShot = (type: 'image' | 'video') => {
    setShots([...shots, { 
      id: Math.random().toString(), 
      type, 
      prompt: '',
      duration: type === 'video' ? 4 : undefined
    }]);
  };

  const handleGenerateAll = () => {
    toast({
      title: "Sequence Queued",
      description: `Sent ${shots.length} shots to pipeline.`,
      variant: "api"
    });
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Top Bar */}
      <div className="h-auto md:h-14 py-3 md:py-0 border-b border-border bg-card/30 flex flex-col md:flex-row items-start md:items-center justify-between px-4 shrink-0 gap-3 md:gap-0">
        <div className="flex items-center gap-3">
          <ListVideo className="w-5 h-5 text-primary" />
          <h1 className="font-semibold tracking-tight text-sm">Sequence Editor</h1>
          <div className="hidden md:block h-4 w-px bg-border mx-2" />
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
            {shots.length} Shots
          </span>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" onClick={() => addShot('image')} className="flex-1 md:flex-none h-8 text-xs">
            + Image
          </Button>
          <Button variant="outline" size="sm" onClick={() => addShot('video')} className="flex-1 md:flex-none h-8 text-xs">
            + Video
          </Button>
          <Button variant="cinematic" size="sm" onClick={handleGenerateAll} className="w-full md:w-auto h-8 text-xs gap-2 md:ml-4">
            <Wand2 className="w-3 h-3" />
            Generate All
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Timeline Area (Visual representation) */}
        <div className="shrink-0 h-32 md:h-auto md:flex-1 bg-black/40 flex flex-col relative overflow-hidden">
          <div className="h-8 md:h-10 border-b border-border/50 bg-black/60 flex items-center px-4 font-mono text-[9px] md:text-[10px] text-muted-foreground">
            <div className="flex-1 flex justify-between">
              <span>00:00</span>
              <span>00:04</span>
              <span>00:08</span>
              <span>00:12</span>
            </div>
          </div>
          
          <div className="flex-1 p-4 md:p-8 flex items-center justify-center relative">
            {/* Mock Timeline UI */}
            <div className="absolute inset-x-4 md:inset-x-8 top-1/2 -translate-y-1/2 h-16 md:h-24 bg-card/50 border border-border/50 rounded-sm flex overflow-hidden">
              {shots.map((shot, i) => (
                <div key={shot.id} className="h-full border-r border-border/50 relative group cursor-pointer" style={{ width: shot.type === 'video' ? '40%' : '20%' }}>
                  <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/20 transition-colors" />
                  <div className="absolute top-1 md:top-2 left-1 md:left-2 flex flex-col">
                    <span className="font-mono text-[8px] md:text-[9px] text-muted-foreground uppercase">Shot {i+1}</span>
                    <span className="font-mono text-[9px] md:text-xs text-primary uppercase">{shot.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Storyboard List */}
        <div className="flex-1 md:flex-none w-full md:w-96 border-t md:border-t-0 md:border-l border-border bg-card/50 backdrop-blur-md flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border/50 shrink-0">
            <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Storyboard Details</h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {shots.map((shot, index) => (
                <Card key={shot.id} className="p-0 overflow-hidden border-border/50 group">
                  <div className="flex items-stretch h-24">
                    <div className="w-8 flex flex-col items-center justify-center border-r border-border/50 bg-black/20 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                      <span className="font-mono text-[10px] mb-2">{index + 1}</span>
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <div className="w-24 bg-black/50 border-r border-border/50 flex items-center justify-center relative">
                      <span className="font-mono text-[10px] text-muted-foreground absolute top-1 left-1 uppercase">{shot.type}</span>
                      <Play className="w-6 h-6 text-muted-foreground/30" />
                    </div>
                    <div className="flex-1 p-3">
                      <textarea 
                        className="w-full h-full bg-transparent resize-none text-xs text-foreground/90 focus:outline-none placeholder:text-muted-foreground/50"
                        placeholder="Enter shot description..."
                        value={shot.prompt}
                        onChange={(e) => {
                          const newShots = [...shots];
                          newShots[index].prompt = e.target.value;
                          setShots(newShots);
                        }}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}