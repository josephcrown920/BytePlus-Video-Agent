import React, { useState } from 'react';
import { useStudio } from '@/lib/store';
import { BookmarkPlus, Sparkles, SlidersHorizontal, Image as ImageIcon, Camera, Wand2, Maximize2, Zap, Film, Rocket, Layers } from 'lucide-react';
import cyberpunkShot from '@assets/generated_images/shot-cyberpunk.jpg';
import astronautShot from '@assets/generated_images/shot-astronaut.jpg';
import desertShot from '@assets/generated_images/shot-desert.jpg';
import charElara from '@assets/generated_images/char-elara.jpg';

const MODES = [
  { id: 'cinematic' as const, label: 'Cinematic', icon: Film, description: 'Structured beats, camera/lens/lighting continuity, 16:9.' },
  { id: 'viral' as const, label: 'Viral', icon: Rocket, description: 'Hook-first, fast pacing, faceless/caption-ready, 9:16.' },
  { id: 'standard' as const, label: 'Standard', icon: Layers, description: 'Balanced, general-purpose delivery.' },
];

const MODE_STYLE_TAGS: Record<'cinematic' | 'viral' | 'standard', string[]> = {
  cinematic: ['Cinematic', '35mm Lens', 'Volumetric Lighting', 'Color Graded', 'Film Grain'],
  viral: ['Hook-first', 'High Energy', 'Caption-Ready', 'Fast Cuts', 'Faceless B-roll'],
  standard: ['Balanced', 'Natural Light', 'Clean Grade'],
};

const STAGE_LABEL: Record<string, string> = {
  planning: 'PLANNING',
  routing: 'ROUTING',
  generating: 'GENERATING',
  inspecting: 'INSPECTING',
  verifying: 'VERIFYING',
  delivering: 'DELIVERING',
  completed: 'COMPLETED',
  failed: 'FAILED',
};

export default function Studio() {
  const { activePrompt, setActivePrompt, activeMode, setActiveMode, addJob, saveDraft, queue } = useStudio();
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImage, setPreviewImage] = useState(cyberpunkShot);
  const [trackedJobId, setTrackedJobId] = useState<string | null>(null);

  const trackedJob = queue.find(j => j.id === trackedJobId);
  const progress = trackedJob?.progress ?? 0;
  const currentStage = trackedJob?.stage;
  const narrationLog = trackedJob?.narration ?? [];

  React.useEffect(() => {
    if (!trackedJob) return;
    if (trackedJob.status === 'completed') {
      setIsGenerating(false);
      const images = [cyberpunkShot, astronautShot, desertShot];
      setPreviewImage(images[Math.floor(Math.random() * images.length)]);
    } else if (trackedJob.status === 'failed') {
      setIsGenerating(false);
    }
  }, [trackedJob?.status]);

  const handleGenerate = () => {
    if (!activePrompt.trim()) return;
    setIsGenerating(true);
    const id = addJob(activePrompt, activeMode);
    setTrackedJobId(id);
  };

  const saveCurrentFrame = () => {
    saveDraft({
      title: activePrompt.slice(0, 34).trim() || 'Untitled direction',
      prompt: activePrompt,
      imageUrl: previewImage,
      status: 'concept',
    });
  };

  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 bg-background relative overflow-hidden">

        {/* Mode Selector */}
        <div className="flex items-center gap-2 mb-4" role="tablist" aria-label="Production mode">
          {MODES.map(({ id, label, icon: Icon, description }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeMode === id}
              title={description}
              onClick={() => setActiveMode(id)}
              className={`px-3 py-1.5 text-xs font-mono rounded border flex items-center gap-2 transition-colors ${
                activeMode === id
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
              }`}
            >
              <Icon className="w-3 h-3" />
              {label} Mode
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-xs font-mono rounded bg-card border border-border hover:border-primary/50 text-foreground transition-colors flex items-center gap-2">
              <Camera className="w-3 h-3" />
              {activeMode === 'viral' ? '9:16 Vertical' : '16:9 Cinema'}
            </button>
            <button className="px-3 py-1.5 text-xs font-mono rounded bg-card border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
              <ImageIcon className="w-3 h-3" />
              8K RAW
            </button>
          </div>
          <button type="button" aria-label="Expand preview" className="p-2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Viewer */}
        <div className="flex-1 relative rounded-lg border border-border bg-card cinematic-shadow overflow-hidden flex items-center justify-center mb-6">
          
          {isGenerating ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 z-20 backdrop-blur-sm px-6">
              <div className="scanline" />
              <div className="relative w-64 h-2 bg-sidebar rounded-full overflow-hidden mb-4 border border-border">
                <div 
                  className="absolute top-0 left-0 h-full bg-primary shadow-[0_0_10px_rgba(0,229,255,0.5)] transition-all duration-300 ease-out" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
              <div className="font-mono text-primary text-sm tracking-widest flex items-center gap-2 mb-3">
                <Wand2 className="w-4 h-4 animate-spin-slow" />
                {currentStage ? STAGE_LABEL[currentStage] : 'QUEUED'} {progress}%
              </div>
              {/* Agent narration: truthful, stage-by-stage commentary of what is actually happening */}
              <div className="w-full max-w-md text-center text-xs text-muted-foreground font-mono space-y-1 max-h-20 overflow-y-auto">
                {narrationLog.slice(-3).map((n, i) => (
                  <div key={i}>{n.message}</div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Crosshairs & Safe Area Overlay */}
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center opacity-30">
             <div className="w-[90%] h-[90%] border border-white/20 border-dashed rounded-sm" />
             <div className="absolute w-px h-full bg-white/10" />
             <div className="absolute h-px w-full bg-white/10" />
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border border-primary/50 rounded-full" />
          </div>

          <img 
            src={previewImage} 
            alt="Preview" 
            className={`w-full h-full object-cover transition-opacity duration-1000 ${isGenerating ? 'opacity-20 blur-sm' : 'opacity-100'}`}
          />
        </div>

        {/* Prompt Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <textarea 
            value={activePrompt}
            onChange={(e) => setActivePrompt(e.target.value)}
            placeholder={activeMode === 'viral' ? 'Describe the hook and payoff for a short-form clip...' : activeMode === 'cinematic' ? 'Describe the scene, beat, and camera intent...' : 'Describe the shot...'}
            className="w-full bg-card border border-border rounded-lg pl-12 pr-32 py-4 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none font-mono text-sm h-24 shadow-inner"
          />
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button 
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !activePrompt.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded font-medium flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,229,255,0.3)] hover:shadow-[0_0_25px_rgba(0,229,255,0.5)]"
            >
              <Zap className="w-4 h-4" />
              Generate
            </button>
            <button
              type="button"
              onClick={saveCurrentFrame}
              className="border border-border bg-card px-3 py-2 rounded text-muted-foreground hover:text-primary hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
              aria-label="Save current frame to drafts"
              title="Save current frame to drafts"
            >
              <BookmarkPlus className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Right Sidebar - Parameters */}
      <div className="w-full md:w-80 border-l border-border bg-card/50 flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          Parameters
        </div>

        <div className="p-4 space-y-8">
          
          {/* Model Selection */}
          <div className="space-y-3">
            <label className="text-xs font-mono text-muted-foreground uppercase">Core Model</label>
            <div className="grid grid-cols-2 gap-2">
              <button className="bg-primary/10 border border-primary text-primary px-3 py-2 rounded text-xs font-medium">Lumiere v2</button>
              <button className="bg-background border border-border text-muted-foreground hover:text-foreground px-3 py-2 rounded text-xs font-medium transition-colors">Sora Engine</button>
            </div>
          </div>

          {/* Camera Motion */}
          <div className="space-y-4">
            <label className="text-xs font-mono text-muted-foreground uppercase flex justify-between">
              Camera Motion
              <span className="text-primary">{activeMode === 'viral' ? 'Rapid' : 'Dynamic'}</span>
            </label>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Pan</span>
                  <span className="font-mono">Right +2.4</span>
                </div>
                <div className="h-1.5 bg-background rounded-full overflow-hidden border border-border">
                  <div className="h-full bg-primary/50 w-2/3 ml-auto rounded-full" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Zoom</span>
                  <span className="font-mono">In -1.0</span>
                </div>
                <div className="h-1.5 bg-background rounded-full overflow-hidden border border-border">
                  <div className="h-full bg-accent w-1/3 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Style Modifiers */}
          <div className="space-y-3">
            <label className="text-xs font-mono text-muted-foreground uppercase">Style Modifiers</label>
            <div className="flex flex-wrap gap-2">
              {MODE_STYLE_TAGS[activeMode].map(tag => (
                <span key={tag} className="px-2 py-1 rounded bg-background border border-border text-xs text-foreground cursor-pointer hover:border-primary/50 transition-colors">
                  {tag}
                </span>
              ))}
              <span className="px-2 py-1 rounded border border-dashed border-border text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1">
                + Add
              </span>
            </div>
          </div>

          {/* Bible References */}
          <div className="space-y-3">
            <label className="text-xs font-mono text-muted-foreground uppercase flex justify-between items-center">
              Active References
              <button className="text-primary hover:underline">Edit</button>
            </label>
            <div className="p-3 rounded-lg border border-border bg-background flex gap-3 items-center">
              <img src={charElara} alt="Elara" className="w-10 h-10 rounded object-cover border border-border" />
              <div>
                <div className="text-sm font-medium">Elara Vane</div>
                <div className="text-xs text-muted-foreground font-mono">Character ID: CH-82</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
