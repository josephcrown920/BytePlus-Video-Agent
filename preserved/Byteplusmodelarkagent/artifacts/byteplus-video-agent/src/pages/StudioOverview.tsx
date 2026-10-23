import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useWorkspace } from "@/lib/store";
import { ImageIcon, Video, Layers, Activity, Clapperboard, ArrowRight } from "lucide-react";

export default function StudioOverview() {
  const { tasks, projects, activeProject, openProject } = useWorkspace();
  const offlinePlans = tasks.filter(t => t.status === 'requires_api').length;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero section */}
      <div className="relative h-[35vh] md:h-[40vh] min-h-[250px] md:min-h-[300px] border-b border-border bg-black overflow-hidden flex items-end">
        <div className="absolute inset-0 cinematic-grid opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        
        {/* Abstract cinematic shapes in background */}
        <div className="absolute top-1/4 right-1/4 w-64 h-64 md:w-96 md:h-96 bg-primary/10 rounded-full blur-[80px] md:blur-[120px]" />
        
        <div className="relative z-10 p-6 md:p-8 w-full max-w-5xl mx-auto">
          <Badge variant="outline" className="mb-4 bg-black/50 border-primary/30 text-primary text-[10px] md:text-xs">Workspace Active</Badge>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tighter mb-2 md:mb-4 text-glow">
            Director's Cockpit
          </h1>
          <p className="text-sm md:text-lg text-muted-foreground max-w-2xl font-mono">
            Orchestrate Seedream models for visual development and Seedance models for temporal generation. 
            Build production-ready prompts, shots, presets, and handoff files while generation remains offline.
          </p>
        </div>
      </div>

      <div className="p-4 md:p-8 w-full max-w-5xl mx-auto space-y-4 md:space-y-8">
        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/image-generator">
            <Card className="p-6 hover:bg-card/80 transition-all cursor-pointer group border-border/50 hover:border-primary/50 relative overflow-hidden h-40 flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <ImageIcon className="w-24 h-24" />
              </div>
              <div>
                <ImageIcon className="w-6 h-6 text-primary mb-2" />
                <h3 className="font-semibold tracking-tight text-lg group-hover:text-primary transition-colors">Seedream Image</h3>
              </div>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Concept Art & Frames</p>
            </Card>
          </Link>
          
          <Link href="/video-generator">
            <Card className="p-6 hover:bg-card/80 transition-all cursor-pointer group border-border/50 hover:border-primary/50 relative overflow-hidden h-40 flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Video className="w-24 h-24" />
              </div>
              <div>
                <Video className="w-6 h-6 text-primary mb-2" />
                <h3 className="font-semibold tracking-tight text-lg group-hover:text-primary transition-colors">Seedance Video</h3>
              </div>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Motion & Scene Gen</p>
            </Card>
          </Link>
          
          <Link href="/multi-shot">
            <Card className="p-6 hover:bg-card/80 transition-all cursor-pointer group border-border/50 hover:border-primary/50 relative overflow-hidden h-40 flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Layers className="w-24 h-24" />
              </div>
              <div>
                <Layers className="w-6 h-6 text-primary mb-2" />
                <h3 className="font-semibold tracking-tight text-lg group-hover:text-primary transition-colors">Multi-Shot Editor</h3>
              </div>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Storyboard Timeline</p>
            </Card>
          </Link>
        </div>

        {/* Status Readout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 bg-card/30 border-border/30">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <Activity className="w-4 h-4" />
              <h4 className="font-mono text-xs uppercase tracking-wider">System Status</h4>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-sm">Seedream Endpoint</span>
                <span className="text-xs font-mono text-destructive">DISCONNECTED</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-sm">Seedance Endpoint</span>
                <span className="text-xs font-mono text-destructive">DISCONNECTED</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Offline Plans Saved</span>
                <span className="text-xs font-mono text-primary">{offlinePlans}</span>
              </div>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden border-border/30 relative flex items-center justify-center min-h-[200px]">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
            <div className="z-10 w-full p-6">
              <Clapperboard className="mb-4 h-10 w-10 text-primary/60" />
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Continue editing</p>
              <h4 className="mt-2 text-xl font-semibold">{activeProject.name}</h4>
              <p className="mt-1 text-sm text-muted-foreground">{activeProject.shots.length} storyboard shots · {projects.length} saved project{projects.length === 1 ? "" : "s"}</p>
              <Link href="/multi-shot"><Button className="mt-5 min-h-11 gap-2" variant="cinematic" onClick={() => openProject(activeProject.id)}>Open sequence <ArrowRight className="h-4 w-4" /></Button></Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Ensure Badge is imported in StudioOverview (mocking it here if missed)
import { Badge } from "@/components/ui/badge";