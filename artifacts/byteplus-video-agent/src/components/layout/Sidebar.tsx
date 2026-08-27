import { Link, useLocation } from "wouter";
import { useWorkspace } from "@/lib/store";
import { Activity, Clapperboard, Layers, Library, Settings, Image as ImageIcon, Video, MonitorPlay } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

const NAV_ITEMS = [
  { name: "Studio Overview", path: "/", icon: Activity },
  { name: "Image Generator", path: "/image-generator", icon: ImageIcon, badge: "Seedream" },
  { name: "Video Generator", path: "/video-generator", icon: Video, badge: "Seedance" },
  { name: "Multi-Shot", path: "/multi-shot", icon: Layers },
  { name: "Production Bible", path: "/bible", icon: Library },
  { name: "Pipeline", path: "/pipeline", icon: MonitorPlay },
  { name: "Drafts", path: "/drafts", icon: Clapperboard },
];

export function Sidebar({ className }: { className?: string }) {
  const [location] = useLocation();
  const { tasks } = useWorkspace();
  const activeTasks = tasks.filter(t => t.status === 'processing').length;

  return (
    <div className={cn("w-64 border-r border-border bg-card/50 backdrop-blur-xl flex flex-col h-full shrink-0", className)}>
      <div className="p-6 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-sm bg-primary/20 border border-primary flex items-center justify-center">
            <div className="w-4 h-4 bg-primary animate-pulse rounded-full" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-widest uppercase font-mono text-primary text-glow">BytePlus</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Video Agent</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          return (
            <Link key={item.path} href={item.path}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-sm cursor-pointer transition-all duration-200 group text-sm",
                isActive 
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_0_10px_rgba(59,130,246,0.1)]" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent"
              )}>
                <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                <span className="font-medium">{item.name}</span>
                {item.badge && (
                  <span className="ml-auto text-[9px] uppercase tracking-wider font-mono bg-secondary px-1.5 py-0.5 rounded text-muted-foreground border border-border">
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border/50 bg-black/20">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Queue</span>
          <span className="text-xs font-mono text-primary">{activeTasks} Active</span>
        </div>
        <Link href="/pipeline" className="block w-full">
          <Button variant="outline" className="w-full justify-start text-xs h-8">
            <Activity className="w-3 h-3 mr-2" />
            Open Task Monitor
          </Button>
        </Link>
      </div>
    </div>
  );
}