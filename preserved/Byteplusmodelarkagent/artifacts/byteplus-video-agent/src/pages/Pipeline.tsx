import { useWorkspace, TaskType } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ImageIcon, Video, AlertCircle, ClipboardList, Play, Trash2, Pencil, Loader2, StopCircle, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Pipeline() {
  const { tasks, projects, removeTask, clearTasks, openProject } = useWorkspace();
  const hasActiveTasks = tasks.some(task => task.status === "queued" || task.status === "processing");

  const getIcon = (type: TaskType) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      default: return <ImageIcon className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'processing': return 'default';
      case 'failed': return 'destructive';
      case 'requires_api': return 'secondary';
      case 'queued': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <div className="px-6 py-5 border-b border-border/50 bg-card/40 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between shrink-0 gap-4 md:gap-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-secondary rounded-xl border border-white/5">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Render Pipeline</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage and monitor AI generation tasks across all projects</p>
          </div>
        </div>
        <div className="flex gap-4 items-center w-full md:w-auto justify-between md:justify-end">
          <div className="flex flex-col items-start md:items-end">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Engine Status</span>
            <span className="text-sm font-mono font-bold text-primary flex items-center gap-2 mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              fal.ai Gateway
            </span>
          </div>
          {tasks.length > 0 && (
            <Button variant="outline" size="sm" disabled={hasActiveTasks} title={hasActiveTasks ? "Cancel active renders before clearing history." : undefined} className="border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors" onClick={() => {
              if (window.confirm("Clear pipeline history? Active projects will remain.")) clearTasks();
            }} data-testid="button-clear-pipeline">
              Clear History
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gradient-to-b from-background to-black/40">
        <div className="max-w-6xl mx-auto space-y-4">
          {tasks.length === 0 ? (
            <div className="text-center py-24 bg-card/20 rounded-2xl border border-dashed border-border/50 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-6">
                <ClipboardList className="w-8 h-8 text-muted-foreground opacity-50" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground mb-2">Pipeline is Empty</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Generate images or video sequences to see them tracked and rendered here.
              </p>
            </div>
          ) : (
            tasks.map(task => {
              const model = task.metadata?.model || (task.type === 'video' ? 'Seedance 2.5' : 'Seedream 4.5');
              
              return (
                <Card key={task.id} className="bg-card/40 border-white/5 overflow-hidden group hover:border-white/10 transition-colors shadow-lg" data-testid={`task-card-${task.id}`}>
                  <div className="flex flex-col md:flex-row h-full">
                    {/* Task thumbnail area */}
                    <div className="w-full md:w-64 aspect-video md:aspect-auto md:h-40 bg-black/60 border-b md:border-b-0 md:border-r border-white/5 flex items-center justify-center relative overflow-hidden">
                      {task.status === 'completed' ? (
                        <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-700">
                          {task.resultUrl ? (
                            task.type === 'video' ? (
                              <video src={task.resultUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                            ) : (
                              <img src={task.resultUrl} alt="Result" className="w-full h-full object-cover" />
                            )
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-primary/10 to-transparent">
                              {task.type === 'video' ? <Play className="w-8 h-8 text-white/30" /> : <ImageIcon className="w-8 h-8 text-white/30" />}
                            </div>
                          )}
                        </div>
                      ) : task.status === 'processing' ? (
                        <div className="absolute inset-0 bg-primary/5 flex flex-col items-center justify-center gap-3">
                          <Loader2 className="w-8 h-8 text-primary animate-spin" />
                          <span className="text-sm font-mono font-bold text-primary text-glow">{Math.round(task.progress)}%</span>
                        </div>
                      ) : task.status === 'failed' ? (
                        <div className="absolute inset-0 bg-destructive/10 flex items-center justify-center">
                          <StopCircle className="w-8 h-8 text-destructive/50" />
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Loader2 className="w-6 h-6 text-muted-foreground/30 animate-spin" />
                        </div>
                      )}
                      
                      <div className="absolute top-2 left-2 flex gap-1">
                         <Badge variant="outline" className="bg-black/60 backdrop-blur-sm text-[9px] font-mono border-white/10 uppercase">{task.type}</Badge>
                         {task.metadata?.ratio && (
                           <Badge variant="outline" className="bg-black/60 backdrop-blur-sm text-[9px] font-mono border-white/10">{task.metadata.ratio}</Badge>
                         )}
                      </div>
                    </div>
                    
                    {/* Task Details */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
                              ID: {task.id.slice(0, 8)}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="font-mono text-[10px] text-primary tracking-widest uppercase font-bold">
                              {model}
                            </span>
                          </div>
                          <Badge variant={getStatusColor(task.status) as any} className={`text-[10px] font-mono uppercase ${
                            task.status === 'processing' ? 'bg-primary/20 text-primary border-primary/30' :
                            task.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                            task.status === 'failed' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                            'bg-secondary text-muted-foreground'
                          }`}>
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium line-clamp-2 mt-1 leading-relaxed text-foreground/90">
                          {task.prompt}
                        </p>
                        {task.error && task.status === 'failed' && (
                          <p className="text-xs text-destructive mt-2 bg-destructive/10 p-2 rounded-md font-mono border border-destructive/20 inline-block">
                            {task.error}
                          </p>
                        )}
                      </div>
                      
                      <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground font-mono">
                         <span className="opacity-70">{formatDistanceToNow(task.createdAt, { addSuffix: true })}</span>
                         <div className="flex items-center gap-1.5">
                           {task.projectId && projects.some(p => p.id === task.projectId) && (
                             <Link href={task.type === "multi-shot" ? "/multi-shot" : task.type === "video" ? "/video-generator" : "/image-generator"}>
                               <Button size="sm" variant="secondary" className="gap-2 h-8 bg-black/40 hover:bg-black/60 border border-white/5" onClick={() => openProject(task.projectId!)} data-testid={`button-edit-task-${task.id}`}>
                                 <Pencil className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Remix</span>
                               </Button>
                             </Link>
                           )}
                            <Button size="icon" variant="ghost" disabled={task.status === "queued" || task.status === "processing"} title={task.status === "queued" || task.status === "processing" ? "Cancel this render before removing it." : undefined} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" aria-label="Remove saved plan" onClick={() => {
                             if (window.confirm("Delete this rendering task?")) removeTask(task.id);
                           }} data-testid={`button-delete-task-${task.id}`}>
                             <Trash2 className="h-3.5 w-3.5" />
                           </Button>
                         </div>
                      </div>
                      
                      {task.status === 'processing' && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-500 ease-linear shadow-[0_0_10px_rgba(212,255,0,0.8)]"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
