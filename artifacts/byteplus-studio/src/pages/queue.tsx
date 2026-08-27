import React from 'react';
import { useStudio, RenderJob } from '@/lib/store';
import { Server, CheckCircle2, Clock, AlertCircle, RefreshCw, Eye } from 'lucide-react';

export default function Queue() {
  const { queue } = useStudio();

  return (
    <div className="h-full flex flex-col bg-background p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2 flex items-center gap-3">
            Render Queue
            <span className="bg-primary/10 text-primary text-xs font-mono px-2 py-1 rounded border border-primary/20">
              {queue.filter(j => j.status === 'rendering').length} ACTIVE
            </span>
          </h1>
          <p className="text-muted-foreground text-sm font-mono">
            NODE: GPU-CLUSTER-Alpha / US-EAST
          </p>
        </div>
        
        <div className="flex gap-2">
          <button className="p-2 border border-border rounded text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-sidebar text-xs font-mono text-muted-foreground uppercase tracking-wider">
          <div className="col-span-4">Job / Prompt</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-3">Progress</div>
          <div className="col-span-2">Time / Est</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        <div className="divide-y divide-border">
          {queue.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground font-mono text-sm">
              NO JOBS IN QUEUE
            </div>
          ) : (
            queue.map((job) => (
              <QueueItem key={job.id} job={job} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function QueueItem({ job }: { job: RenderJob }) {
  const isRendering = job.status === 'rendering';
  const isCompleted = job.status === 'completed';
  const isQueued = job.status === 'queued';
  const isFailed = job.status === 'failed';

  return (
    <div className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-sidebar/50 transition-colors group">
      <div className="col-span-4 flex items-center gap-3">
        <div className={`w-12 h-12 rounded bg-background border ${isCompleted ? 'border-primary/50' : 'border-border'} flex items-center justify-center overflow-hidden flex-shrink-0`}>
          {isCompleted && job.resultImage ? (
            <img src={job.resultImage} alt="Result" className="w-full h-full object-cover" />
          ) : (
            <Server className={`w-5 h-5 ${isRendering ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
          )}
        </div>
        <div className="truncate">
          <div className="font-medium text-sm text-foreground truncate" title={job.prompt}>{job.prompt}</div>
          <div className="font-mono text-[10px] text-muted-foreground mt-1 uppercase">ID: {job.id}</div>
        </div>
      </div>

      <div className="col-span-2 flex items-center">
        {isRendering && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 text-primary text-xs font-medium border border-primary/20">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Rendering
          </span>
        )}
        {isCompleted && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        )}
        {isQueued && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-muted text-muted-foreground text-xs font-medium border border-border">
            <Clock className="w-3 h-3" />
            Queued
          </span>
        )}
        {isFailed && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        )}
      </div>

      <div className="col-span-3 flex items-center pr-4">
        <div className="w-full space-y-1.5">
          <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
            <span>{Math.round(job.progress)}%</span>
            {isRendering && <span>GPU-01</span>}
          </div>
          <div className="h-1.5 w-full bg-background rounded-full overflow-hidden border border-border">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${isCompleted ? 'bg-green-500' : isFailed ? 'bg-destructive' : 'bg-primary'}`} 
              style={{ width: `${job.progress}%` }} 
            />
          </div>
        </div>
      </div>

      <div className="col-span-2 font-mono text-xs text-muted-foreground flex items-center">
        {isCompleted ? job.duration : isRendering ? 'Calc...' : '--'}
      </div>

      <div className="col-span-1 flex justify-end">
        {isCompleted && (
          <button className="p-2 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
            <Eye className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
