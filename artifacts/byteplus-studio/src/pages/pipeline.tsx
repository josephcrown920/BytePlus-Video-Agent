import React from 'react';
import { Play, ArrowRight, CheckCircle2, Film, Zap, ShieldCheck } from 'lucide-react';
import { useStudio } from '@/lib/store';
import renderFinalPlate from '@assets/generated_images/render-final-plate.jpg';

export default function Pipeline() {
  const { shots, mode, selectedTemplate, addJob } = useStudio();
  const totalDuration = shots.reduce((acc, shot) => acc + shot.duration, 0);

  const handleStartBuild = () => {
    addJob(`Full Pipeline Export (${mode.toUpperCase()}): ${selectedTemplate || 'Custom Sequence'}`);
  };

  return (
    <div className="h-full flex flex-col bg-background p-6 lg:p-8 overflow-y-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2 flex items-center gap-3">
            Build Pipeline & Manifest
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold uppercase bg-primary/10 border border-primary/20 text-primary flex items-center gap-1.5">
              {mode === 'cinematic' ? <Film className="w-3.5 h-3.5" /> : mode === 'viral' ? <Zap className="w-3.5 h-3.5" /> : null}
              {mode} MODE
            </span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Inspect build stages, delivery manifest targets, and retry policies before dispatching to cloud compute clusters.
          </p>
        </div>
      </div>

      {/* Visual Pipeline Representation - each stage shows what it actually outputs */}
      <div className="flex flex-col lg:flex-row items-stretch gap-4 mb-12">
        <PipelineStage title="Sequence Assembly" meta={`${shots.length} Shots · ${totalDuration}s Beat`} active>
          <div className="grid grid-cols-3 h-full gap-0.5">
            {shots.slice(0, 3).map((shot) => (
              <img key={shot.id} src={shot.imageUrl} alt={`Assembled shot: ${shot.prompt}`} className="h-full w-full object-cover" />
            ))}
          </div>
        </PipelineStage>

        <ArrowRight className="w-6 h-6 text-muted-foreground hidden lg:block flex-shrink-0 self-center" />

        <PipelineStage title="Pacing & Subtitles" meta={mode === 'viral' ? 'Hook First · High Pacing' : 'Cinematic Beat Sync'}>
          <Waveform />
        </PipelineStage>

        <ArrowRight className="w-6 h-6 text-muted-foreground hidden lg:block flex-shrink-0 self-center" />

        <PipelineStage title="Final Render & Delivery" meta="CDN Upload · ProRes / H.264">
          <img src={renderFinalPlate} alt="Preview of the final composited render" className="h-full w-full object-cover" />
        </PipelineStage>
      </div>

      {/* Export Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <SettingsIcon /> Output Configuration
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="pipeline-format" className="text-xs font-mono text-muted-foreground uppercase">
                  Format
                </label>
                <select
                  id="pipeline-format"
                  className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option>ProRes 422 (HQ) - Master</option>
                  <option>H.264 (MP4) - Web Streaming</option>
                  <option>H.265 (HEVC) - Mobile Viral</option>
                  <option>EXR Sequence - VFX</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="pipeline-resolution" className="text-xs font-mono text-muted-foreground uppercase">
                  Resolution & Aspect Ratio
                </label>
                <select
                  id="pipeline-resolution"
                  className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option>3840 x 2160 (4K 16:9 Cinematic)</option>
                  <option>1080 x 1920 (9:16 Vertical Reel)</option>
                  <option>1920 x 1080 (HD 16:9)</option>
                  <option>4096 x 2160 (DCI 4K Scope)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-medium mb-2 text-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-400" /> Customer Reliability Manifest
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Auto-retry policy: Up to 3 attempts with exponential backoff on GPU timeouts.
            </p>

            <div className="p-3 bg-background rounded border border-border font-mono text-xs text-muted-foreground space-y-1.5 mb-6">
              <div className="flex justify-between">
                <span>Active Mode:</span> <span className="text-foreground uppercase">{mode}</span>
              </div>
              <div className="flex justify-between">
                <span>Inputs:</span> <span className="text-foreground">{shots.length} Shot Beats</span>
              </div>
              <div className="flex justify-between">
                <span>Total Frames:</span> <span className="text-foreground">{totalDuration * 24} (24fps)</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Target:</span> <span className="text-foreground">https://cdn.byteplus.com/render</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartBuild}
            className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-md shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            Initialize & Queue Render
          </button>
        </div>
      </div>
    </div>
  );
}

function PipelineStage({ title, meta, active, children }: { title: string; meta: string; active?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex-1 rounded-xl border bg-card overflow-hidden cinematic-shadow ${active ? 'border-primary/50' : 'border-border'}`}>
      <div className="aspect-video relative overflow-hidden bg-sidebar">
        {children}
        {active && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded bg-primary/15 border border-primary/30 px-2 py-0.5 text-[10px] font-mono text-primary">
            <CheckCircle2 className="w-3 h-3" /> READY
          </span>
        )}
      </div>
      <div className="p-3">
        <span className="font-semibold text-sm block">{title}</span>
        <span className="text-[10px] font-mono text-muted-foreground">{meta}</span>
      </div>
    </div>
  );
}

function Waveform() {
  // Deterministic bar heights so the visualization stays stable across renders
  const bars = [30, 55, 40, 70, 45, 85, 50, 65, 35, 75, 40, 60, 30, 80, 45, 55, 65, 40, 70, 50];
  return (
    <div className="flex h-full w-full items-center justify-center gap-1 bg-gradient-to-b from-sidebar to-background px-4">
      {bars.map((height, index) => (
        <span
          key={index}
          className="w-1.5 rounded-full bg-primary/60"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
