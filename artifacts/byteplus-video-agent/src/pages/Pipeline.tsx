import { useWorkspace, TaskType } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ImageIcon, Video, AlertCircle, Loader2, Play } from "lucide-react";

export default function Pipeline() {
  const { tasks } = useWorkspace();

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
          <p className="text-sm text-muted-foreground mt-1">Monitor Seedream and Seedance generation tasks</p>
        </div>
        <div className="flex gap-4 items-center w-full md:w-auto justify-between md:justify-end">
          <div className="flex flex-col items-start md:items-end">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Queue Status</span>
            <span className="text-sm font-mono text-primary flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Active
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          {tasks.length === 0 ? (
            <div className="text-center py-20 bg-card/20 rounded-md border border-dashed border-border/50">
              <Loader2 className="w-8 h-8 text-muted-foreground/30 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground font-mono text-sm uppercase tracking-wider">Pipeline Empty</p>
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