import React from 'react';
import { useStudio, RenderJob } from '@/lib/store';
import { CheckCircle2, Clock, AlertCircle, RefreshCw, Eye, Wand2, RotateCcw, ExternalLink } from 'lucide-react';

export default function Queue() {
  const { queue, retryJob, deliverJob } = useStudio();

  return (
    <div className="h-full flex flex-col bg-background p-6 lg:p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2 flex items-center gap-3">
            Customer Render Queue
            <span className="bg-primary/10 text-primary text-xs font-mono px-2 py-1 rounded border border-primary/20">
              {queue.filter((j) => j.status === 'rendering').length} ACTIVE
            </span>
          </h1>
          <p className="text-muted-foreground text-sm font-mono">
            NODE: GPU-CLUSTER-Alpha / US-EAST · GRACEFUL AUTO-RETRY ACTIVE
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Refresh queue"
            className="p-2 border border-border rounded text-muted-foreground hover:text-foreground hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="flex-1 flex items-center justify-center border border-dashed border-border rounded-lg p-12">
          <p className="font-mono text-sm text-muted-foreground">NO JOBS IN QUEUE</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {queue.map((job) => (
            <QueueCard key={job.id} job={job} onRetry={() => retryJob(job.id)} onDeliver={() => deliverJob(job.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function QueueCard({ job, onRetry, onDeliver }: { job: RenderJob; onRetry: () => void; onDeliver: () => void }) {
  const isRendering = job.status === 'rendering';
  const isCompleted = job.status === 'completed';
  const isQueued = job.status === 'queued';
  const isFailed = job.status === 'failed';
  const displayImage = isCompleted && job.resultImage ? job.resultImage : job.sourceFrame;

  return (
    <div className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors flex flex-col justify-between">
      {/* Visual demonstration of render state */}
      <div className="relative aspect-video overflow-hidden bg-sidebar">
        <img
          src={displayImage}
          alt={isCompleted ? `Completed render: ${job.prompt}` : `Source frame for: ${job.prompt}`}
          className={`h-full w-full object-cover transition-all duration-700 ${
            isCompleted ? 'opacity-100' : 'opacity-40 blur-[2px] scale-105'
          }`}
        />

        {(isQueued || isRendering) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/40">
            {isRendering && <div className="scanline" />}
            <Wand2 className={`w-6 h-6 text-primary mb-2 ${isRendering ? 'animate-spin-slow' : 'opacity-60'}`} />
            <span className="font-mono text-[11px] tracking-widest text-primary/90">
              {isRendering ? `STAGE: ${(job.stage || 'SYNTHESIZING').toUpperCase()} (${Math.round(job.progress)}%)` : 'QUEUED FOR GPU'}
            </span>
          </div>
        )}

        {isFailed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10">
            <AlertCircle className="w-6 h-6 text-destructive mb-2" />
            <span className="font-mono text-[11px] tracking-widest text-destructive uppercase">
              {job.failureReason || 'RENDER FAILED'}
            </span>
          </div>
        )}

        <div className="absolute top-3 left-3 flex gap-2">
          <StatusPill status={job.status} />
          {job.mode && (
            <span className="px-2 py-1 rounded text-[10px] font-mono uppercase bg-black/60 border border-white/20 text-white backdrop-blur-sm">
              {job.mode}
            </span>
          )}
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
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div>
          <p className="text-sm font-medium text-foreground truncate" title={job.prompt}>
            {job.prompt}
          </p>
          <div className="mt-2 h-1.5 w-full bg-background rounded-full overflow-hidden border border-border">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isCompleted ? 'bg-green-500' : isFailed ? 'bg-destructive' : 'bg-primary'
              }`}
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>

        <div className="space-y-2 pt-1 border-t border-border">
          <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground uppercase">
            <span>ID: {job.id}</span>
            <span>{isCompleted ? job.duration : isRendering ? 'GPU-01' : '--'}</span>
          </div>

          {job.deliveryUrl && (
            <div className="flex items-center justify-between text-[11px] font-mono text-green-400 bg-green-500/10 p-1.5 rounded border border-green-500/20">
              <span className="truncate">CDN Delivered</span>
              <a href={job.deliveryUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {isFailed && (
            <button
              onClick={onRetry}
              className="w-full py-1.5 bg-destructive/15 border border-destructive/30 hover:bg-destructive/25 text-destructive rounded text-xs font-mono flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry Render (Attempt {(job.retryCount ?? 0) + 1})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: RenderJob['status'] }) {
  const config = {
    queued: { icon: Clock, label: 'Queued', className: 'bg-muted text-muted-foreground border-border' },
    rendering: { icon: RefreshCw, label: 'Rendering', className: 'bg-primary/10 text-primary border-primary/20', spin: true },
    completed: { icon: CheckCircle2, label: 'Delivered', className: 'bg-green-500/10 text-green-400 border-green-500/20' },
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

