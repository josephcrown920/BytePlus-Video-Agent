import { Link, useLocation } from "wouter";
import { useWorkspace } from "@/lib/store";
import { Activity, Clapperboard, Layers, Library, Image as ImageIcon, Video, MonitorPlay, PanelsTopLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

const NAV_ITEMS = [
  { name: "Studio Overview", path: "/", icon: Activity },
  { name: "Image Generator", path: "/image-generator", icon: ImageIcon, badge: "Seedream" },
  { name: "Video Generator", path: "/video-generator", icon: Video, badge: "Seedance" },
  { name: "Multi-Shot", path: "/multi-shot", icon: Layers },
  { name: "Visual Boards", path: "/boards", icon: PanelsTopLeft, badge: "New" },
  { name: "Production Bible", path: "/bible", icon: Library },
  { name: "Pipeline", path: "/pipeline", icon: MonitorPlay },
  { name: "Drafts", path: "/drafts", icon: Clapperboard },
];

export function Sidebar({ className }: { className?: string }) {
  const [location] = useLocation();
  const { tasks } = useWorkspace();
  const activeJobs = tasks.filter(t => t.status === 'processing' || t.status === 'queued').length;
  const completedJobs = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className={cn("w-64 border-r border-border bg-card/80 backdrop-blur-2xl flex flex-col h-full shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.4)]", className)}>
      <div className="p-6 border-b border-white/5 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center shadow-[0_0_15px_rgba(212,255,0,0.1)]">
            <div className="w-3 h-3 bg-primary rounded-sm rotate-45" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-foreground">BytePlus</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Video Agent</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          return (
            <Link key={item.path} href={item.path}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group text-sm font-medium",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )} data-testid={`nav-item-${item.name.replace(/\s+/g, '-').toLowerCase()}`}>
                <Icon className={cn("w-4 h-4 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                <span>{item.name}</span>
                {item.badge && (
                  <span className={cn(
                    "ml-auto text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border",
                    isActive ? "bg-primary/20 text-primary border-primary/30" : "bg-black/40 text-muted-foreground border-white/10"
                  )}>
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-5 border-t border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-muted-foreground font-semibold tracking-tight">Active Pipeline</span>
          <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded border border-white/5">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-mono font-bold text-primary">{activeJobs}</span>
          </div>
        </div>
        <Link href="/pipeline" className="block w-full">
          <Button variant="secondary" className="w-full justify-start text-xs h-9 bg-black/40 hover:bg-black/60 border border-white/5 hover:border-white/10" data-testid="button-open-pipeline">
            <MonitorPlay className="w-3.5 h-3.5 mr-2" />
            View {completedJobs} Completed
          </Button>
        </Link>
      </div>
    </div>
  );
}
