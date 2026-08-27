import { useWorkspace, TaskType } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ImageIcon, Video, AlertCircle, ClipboardList, Play, Trash2, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Pipeline() {
  const { tasks, projects, removeTask, clearTasks, openProject } = useWorkspace();

  const getIcon = (type: TaskType) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      default: return <ImageIcon className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'default';
      case 'failed': return 'destructive';
      case 'requires_api': return 'warning';
      default: return 'secondary';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <div className="p-4 md:p-6 border-b border-border bg-card/30 flex flex-col md:flex-row items-start md:items-center justify-between shrink-0 gap-2 md:gap-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Render Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">Review saved generation plans before connecting media APIs</p>
        </div>
        <div className="flex gap-4 items-center w-full md:w-auto justify-between md:justify-end">
          <div className="flex flex-col items-start md:items-end">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Planning status</span>
              <span className="text-sm font-mono text-yellow-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                Offline · {tasks.length} saved
            </span>
          </div>
            {tasks.length > 0 && <Button variant="outline" size="sm" onClick={() => {
              if (window.confirm("Delete every saved offline plan? Your projects will remain.")) clearTasks();
            }}>Clear plans</Button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          {tasks.length === 0 ? (
            <div className="text-center py-20 bg-card/20 rounded-md border border-dashed border-border/50">
              <ClipboardList className="w-8 h-8 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-mono text-sm uppercase tracking-wider">No offline plans yet</p>
              <p className="mt-2 text-sm text-muted-foreground">Save a generator prompt or multi-shot batch to review it here.</p>
            </div>
          ) : (
            tasks.map(task => (
              <Card key={task.id} className="bg-card/50 border-border/50 overflow-hidden group">
                <div className="flex flex-col md:flex-row h-full">
                  {/* Task thumbnail area */}
                  <div className="w-full md:w-48 aspect-video md:aspect-auto md:h-32 bg-black/50 border-r border-border/50 flex items-center justify-center relative">
                    {task.status === 'completed' ? (
                      <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent">
                        <div className="absolute inset-0 flex items-center justify-center">
                          {task.type === 'video' ? <Play className="w-8 h-8 text-white/50" /> : <ImageIcon className="w-8 h-8 text-white/50" />}
                        </div>
                      </div>
                    ) : task.status === 'processing' ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        <span className="text-[10px] font-mono text-primary">{Math.round(task.progress)}%</span>
                      </div>
                    ) : task.status === 'requires_api' ? (
                      <AlertCircle className="w-8 h-8 text-yellow-500/50" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                    )}
                  </div>
                  
                  {/* Task Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getIcon(task.type)}
                          <span className="font-mono text-xs uppercase text-muted-foreground tracking-wider">
                            {task.type} • {task.id}
                          </span>
                        </div>
                        <Badge variant={getStatusColor(task.status) as any} className="text-[10px] font-mono uppercase">
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm line-clamp-2 mt-2 leading-relaxed text-foreground/90">
                        {task.prompt}
                      </p>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground font-mono">
                       <span>{formatDistanceToNow(task.createdAt, { addSuffix: true })}</span>
                       <div className="flex items-center gap-1">
                         {task.projectId && projects.some(p => p.id === task.projectId) && (
                           <Link href={task.type === "multi-shot" ? "/multi-shot" : task.type === "video" ? "/video-generator" : "/image-generator"}>
                             <Button size="sm" variant="ghost" className="gap-2" onClick={() => openProject(task.projectId!)}><Pencil className="h-4 w-4" /> Edit</Button>
                           </Link>
                         )}
                         <Button size="icon" variant="ghost" aria-label="Remove saved plan" onClick={() => removeTask(task.id)}><Trash2 className="h-4 w-4" /></Button>
                       </div>
                      {task.status === 'processing' && (
                        <div className="w-32 h-1 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}