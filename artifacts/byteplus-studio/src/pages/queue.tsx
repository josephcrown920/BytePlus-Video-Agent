import React from 'react';
import { useStudio, RenderJob } from '@/lib/store';
import { CheckCircle2, Clock, AlertCircle, RefreshCw, Eye, Wand2, Film, Rocket, Layers } from 'lucide-react';

const MODE_ICON = { cinematic: Film, viral: Rocket, standard: Layers } as const;

export default function Queue() {
  const { queue, retryJob } = useStudio();

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
          <button type="button" aria-label="Refresh queue" className="p-2 border border-border rounded text-muted-foreground hover:text-foreground hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="flex-1 flex items-center justify-center border border-dashed border-border rounded-lg">
          <p className="font-mono text-sm text-muted-foreground">NO JOBS IN QUEUE</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {queue.map((job) => (
            <QueueCard key={job.id} job={job} onRetry={() => retryJob(job.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function QueueCard({ job, onRetry }: { job: RenderJob; onRetry: () => void }) {
  const isRendering = job.status === 'rendering';
  const isCompleted = job.status === 'completed';
  const isQueued = job.status === 'queued';
  const isFailed = job.status === 'failed';
  const displayImage = isCompleted && job.resultImage ? job.resultImage : job.sourceFrame;
  const ModeIcon = MODE_ICON[job.mode];
  const lastNarration = job.narration[job.narration.length - 1];

  return (
    <div className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors">
      {/* Visual demonstration of render state */}
      <div className="relative aspect-video overflow-hidden bg-sidebar">
        <img
          src={displayImage}
          alt={isCompleted ? `Completed render: ${job.prompt}` : `Source frame for: ${job.prompt}`}
          className={`h-full w-full object-cover transition-all duration-700 ${isCompleted ? 'opacity-100' : 'opacity-40 blur-[2px] scale-105'}`}
        />

        {(isQueued || isRendering) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/40 px-4 text-center">
            {isRendering && <div className="scanline" />}
            <Wand2 className={`w-6 h-6 text-primary mb-2 ${isRendering ? 'animate-spin-slow' : 'opacity-60'}`} />
            <span className="font-mono text-[11px] tracking-widest text-primary/90">
              {isRendering ? `${job.stage.toUpperCase()} ${Math.round(job.progress)}%` : 'QUEUED FOR GPU'}
            </span>
            {isRendering && lastNarration && (
              <span className="mt-1 font-mono text-[10px] text-primary/70 line-clamp-2">{lastNarration.message}</span>
            )}
          </div>
        )}

        {isFailed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 px-4 text-center gap-2">
            <AlertCircle className="w-6 h-6 text-destructive" />
            <span className="font-mono text-[11px] tracking-widest text-destructive">RENDER FAILED</span>
            {lastNarration && <span className="font-mono text-[10px] text-destructive/80 line-clamp-2">{lastNarration.message}</span>}
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 px-3 py-1 rounded bg-destructive/20 border border-destructive/40 text-destructive text-xs font-medium flex items-center gap-1.5 hover:bg-destructive/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
            >
              <RefreshCw className="w-3 h-3" />
              Retry job
            </button>
          </div>
        )}

        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <StatusPill status={job.status} />
          <span className="inline-flex items-center gap-1 px-1.5 py-1 rounded backdrop-blur-sm text-[10px] font-mono border bg-background/60 border-border text-muted-foreground" title={`${job.mode} mode`}>
            <ModeIcon className="w-3 h-3" />
          </span>
        </div>

        {isCompleted && (
          <button
            type="button"
            aria-label="Preview full render"
            className="absolute bottom-3 right-3 p-2 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Progress + metadata below the visual */}
      <div className="p-4 space-y-3">
        <p className="text-sm font-medium text-foreground truncate" title={job.prompt}>{job.prompt}</p>
        <div className="h-1.5 w-full bg-background rounded-full overflow-hidden border border-border">
          <div
            className={`h-full rounded-full transition-all duration-300 ${isCompleted ? 'bg-green-500' : isFailed ? 'bg-destructive' : 'bg-primary'}`}
            style={{ width: `${job.progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground uppercase">
          <span>ID: {job.id}{job.retryCount > 0 ? ` (retry ${job.retryCount})` : ''}</span>
          <span>{isCompleted ? job.duration : isRendering ? 'GPU-01' : '--'}</span>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: RenderJob['status'] }) {
  const config = {
    queued: { icon: Clock, label: 'Queued', className: 'bg-muted text-muted-foreground border-border' },
    rendering: { icon: RefreshCw, label: 'Rendering', className: 'bg-primary/10 text-primary border-primary/20', spin: true },
    completed: { icon: CheckCircle2, label: 'Completed', className: 'bg-green-500/10 text-green-400 border-green-500/20' },
    failed: { icon: AlertCircle, label: 'Failed', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  }[status];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded backdrop-blur-sm text-xs font-medium border ${config.className}`}>
      <Icon className={`w-3 h-3 ${config.spin ? 'animate-spin' : ''}`} />
      {config.label}
    </span>
  );
}
