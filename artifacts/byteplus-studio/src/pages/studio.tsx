import React, { useState } from 'react';
import { useStudio, VideoMode } from '@/lib/store';
import {
  BookmarkPlus,
  Sparkles,
  SlidersHorizontal,
  ImageIcon,
  Camera,
  Wand2,
  Maximize2,
  Zap,
  Film,
  Flame,
  Layers,
  Type,
  Eye,
  Video,
} from 'lucide-react';
import cyberpunkShot from '@assets/generated_images/shot-cyberpunk.jpg';
import astronautShot from '@assets/generated_images/shot-astronaut.jpg';
import desertShot from '@assets/generated_images/shot-desert.jpg';
import charElara from '@assets/generated_images/char-elara.jpg';

export default function Studio() {
  const {
    mode,
    setMode,
    activePrompt,
    setActivePrompt,
    cinematicOptions,
    updateCinematicOptions,
    viralOptions,
    updateViralOptions,
    addJob,
    saveDraft,
  } = useStudio();

  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImage, setPreviewImage] = useState(cyberpunkShot);
  const [progress, setProgress] = useState(0);

  const handleGenerate = () => {
    if (!activePrompt.trim()) return;

    setIsGenerating(true);
    setProgress(0);
    addJob(activePrompt);

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          const images = [cyberpunkShot, astronautShot, desertShot];
          setPreviewImage(images[Math.floor(Math.random() * images.length)]);
          return 100;
        }
        return p + 4;
      });
    }, 50);
  };

  const saveCurrentFrame = () => {
    saveDraft({
      title: activePrompt.slice(0, 34).trim() || 'Untitled direction',
      prompt: activePrompt,
      imageUrl: previewImage,
      status: 'concept',
      mode,
    });
  };

  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 bg-background relative overflow-hidden">
        {/* Mode Selector Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-2 rounded-xl bg-card border border-border">
          <div className="flex gap-1.5 p-1 bg-background/80 rounded-lg border border-border">
            <button
              onClick={() => setMode('cinematic')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-2 transition-all ${
                mode === 'cinematic'
                  ? 'bg-primary text-primary-foreground shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              Cinematic Mode
            </button>
            <button
              onClick={() => setMode('viral')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-2 transition-all ${
                mode === 'viral'
                  ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              Viral Mode
            </button>
            <button
              onClick={() => setMode('standard')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-2 transition-all ${
                mode === 'standard'
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              InVideo Studio
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-sidebar border border-border text-muted-foreground uppercase flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  mode === 'cinematic'
                    ? 'bg-primary animate-pulse'
                    : mode === 'viral'
                    ? 'bg-amber-500 animate-ping'
                    : 'bg-green-400'
                }`}
              />
              {mode === 'cinematic'
                ? 'Anamorphic 3-Act Director'
                : mode === 'viral'
                ? 'Hook-First Social Engine'
                : 'Timeline Storyboard Workflow'}
            </span>
            <button
              type="button"
              aria-label="Expand preview"
              className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewer */}
        <div className="flex-1 relative rounded-xl border border-border bg-card cinematic-shadow overflow-hidden flex items-center justify-center mb-6">
          {isGenerating ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 z-20 backdrop-blur-sm">
              <div className="scanline" />
              <div className="relative w-64 h-2 bg-sidebar rounded-full overflow-hidden mb-4 border border-border">
                <div
                  className={`absolute top-0 left-0 h-full transition-all duration-75 ease-out ${
                    mode === 'viral' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-primary shadow-[0_0_10px_rgba(0,229,255,0.5)]'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="font-mono text-xs tracking-widest flex items-center gap-2 text-foreground">
                <Wand2 className="w-4 h-4 animate-spin-slow text-primary" />
                SYNTHESIZING [{mode.toUpperCase()} SHOT] {progress}%
              </div>
            </div>
          ) : null}

          {/* Overlay Grid / Crosshairs */}
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center opacity-30">
            <div className="w-[90%] h-[90%] border border-white/20 border-dashed rounded-sm" />
            <div className="absolute w-px h-full bg-white/10" />
            <div className="absolute h-px w-full bg-white/10" />
            {mode === 'viral' && (
              <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[10px] px-2 py-0.5 rounded uppercase">
                Safe Subtitle Zone
              </div>
            )}
          </div>

          <img
            src={previewImage}
            alt="Preview"
            className={`w-full h-full object-cover transition-opacity duration-700 ${
              isGenerating ? 'opacity-20 blur-sm' : 'opacity-100'
            }`}
          />
        </div>

        {/* Prompt Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Sparkles className={`w-5 h-5 ${mode === 'viral' ? 'text-amber-400' : 'text-primary'}`} />
          </div>
          <textarea
            value={activePrompt}
            onChange={(e) => setActivePrompt(e.target.value)}
            placeholder={
              mode === 'cinematic'
                ? 'Describe the cinematic beat, lighting, framing, and mood...'
                : mode === 'viral'
                ? 'Write your thumb-stopping hook or short-form script...'
                : 'Describe the scene for the storyboard timeline...'
            }
            className="w-full bg-card border border-border rounded-lg pl-12 pr-32 py-4 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none font-mono text-sm h-24 shadow-inner"
          />
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !activePrompt.trim()}
              className={`px-5 py-2 rounded font-medium flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-wider font-mono ${
                mode === 'viral'
                  ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(0,229,255,0.3)]'
              }`}
            >
              <Zap className="w-4 h-4 fill-current" />
              Generate {mode}
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

      {/* Right Sidebar - Mode Parameters */}
      <div className="w-full md:w-80 border-l border-border bg-card/50 flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between text-sm font-semibold tracking-wide uppercase">
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
            {mode} Controls
          </span>
          <span className="text-[10px] font-mono text-primary border border-primary/30 px-1.5 py-0.5 rounded bg-primary/10">
            v2.4
          </span>
        </div>

        <div className="p-4 space-y-6">
          {mode === 'cinematic' && (
            <>
              {/* Lens Selection */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase flex justify-between">
                  Lens Optics
                  <span className="text-primary">{cinematicOptions.lens}</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Anamorphic 2.39:1', '35mm Prime', '85mm Portrait', 'Macro Lens'].map((lens) => (
                    <button
                      key={lens}
                      onClick={() => updateCinematicOptions({ lens })}
                      className={`px-2.5 py-1.5 rounded text-xs font-mono border transition-colors ${
                        cinematicOptions.lens === lens
                          ? 'bg-primary/15 border-primary text-primary font-semibold'
                          : 'bg-background border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {lens}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lighting & Mood */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase flex justify-between">
                  Lighting & Key Style
                  <span className="text-primary truncate ml-2">{cinematicOptions.lighting}</span>
                </label>
                <div className="space-y-1.5">
                  {[
                    'Film Noir Key + Volumetric Rim',
                    'Golden Hour Atmospheric Dust',
                    'Sci-Fi Cyber Neon Dual-Tone',
                    'Soft Rembrandt Warm Key',
                  ].map((light) => (
                    <button
                      key={light}
                      onClick={() => updateCinematicOptions({ lighting: light })}
                      className={`w-full text-left px-3 py-2 rounded text-xs border transition-colors ${
                        cinematicOptions.lighting === light
                          ? 'bg-primary/10 border-primary text-foreground font-medium'
                          : 'bg-background border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {light}
                    </button>
                  ))}
                </div>
              </div>

              {/* Camera Motion */}
              <div className="space-y-3">
                <label className="text-xs font-mono text-muted-foreground uppercase">Camera Movement</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Slow Push In', 'Parallax Tracking', 'Vertigo Zoom', 'Crane Rise'].map((mvt) => (
                    <button
                      key={mvt}
                      onClick={() => updateCinematicOptions({ movement: mvt })}
                      className={`px-2.5 py-1.5 rounded text-xs border transition-colors ${
                        cinematicOptions.movement === mvt
                          ? 'bg-primary/15 border-primary text-primary font-medium'
                          : 'bg-background border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {mvt}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {mode === 'viral' && (
            <>
              {/* Hook Strategy */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-amber-400 uppercase flex justify-between">
                  Hook Strategy
                  <span className="text-foreground">{viralOptions.hookType}</span>
                </label>
                <div className="space-y-1.5">
                  {[
                    'Thumb-Stop Visual Shock',
                    'Question Interrupt',
                    'Curiosity Gap Teaser',
                    'Shocking Statement Callout',
                  ].map((hook) => (
                    <button
                      key={hook}
                      onClick={() => updateViralOptions({ hookType: hook })}
                      className={`w-full text-left px-3 py-2 rounded text-xs border transition-colors ${
                        viralOptions.hookType === hook
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-medium'
                          : 'bg-background border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {hook}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pacing Rhythm */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase flex justify-between">
                  Pacing Rhythm
                  <span className="text-amber-400 font-mono">{viralOptions.pacing}</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['1.5s Rapid Cut', 'Speed Ramp Runway', 'Energetic Beat', 'Punchy Montage'].map((pacing) => (
                    <button
                      key={pacing}
                      onClick={() => updateViralOptions({ pacing })}
                      className={`px-2.5 py-1.5 rounded text-xs border transition-colors ${
                        viralOptions.pacing === pacing
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-medium'
                          : 'bg-background border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {pacing}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subtitle Style */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase flex justify-between">
                  Caption / Subtitle Theme
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Bold Pop Karaoke', 'Neon Glow', 'Clean Minimalist', 'Kinetic Sans'].map((cap) => (
                    <button
                      key={cap}
                      onClick={() => updateViralOptions({ captionStyle: cap })}
                      className={`px-2.5 py-1.5 rounded text-xs border transition-colors ${
                        viralOptions.captionStyle === cap
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-medium'
                          : 'bg-background border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {cap}
                    </button>
                  ))}
                </div>
              </div>

              {/* Faceless Toggle */}
              <div className="p-3 bg-background rounded-lg border border-border flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium">Faceless B-Roll Automation</div>
                  <div className="text-[10px] text-muted-foreground">AI stock + dynamic text overlays</div>
                </div>
                <input
                  type="checkbox"
                  checked={viralOptions.faceless}
                  onChange={(e) => updateViralOptions({ faceless: e.target.checked })}
                  className="rounded border-border text-amber-500 focus:ring-amber-500 w-4 h-4"
                />
              </div>
            </>
          )}

          {mode === 'standard' && (
            <>
              {/* Aspect Ratio */}
              <div className="space-y-3">
                <label className="text-xs font-mono text-muted-foreground uppercase">Aspect Ratio</label>
                <div className="grid grid-cols-3 gap-2">
                  <button className="px-3 py-2 bg-primary/10 border border-primary text-primary rounded text-xs font-medium">
                    16:9 Cinema
                  </button>
                  <button className="px-3 py-2 bg-background border border-border text-muted-foreground hover:text-foreground rounded text-xs font-medium">
                    9:16 Vertical
                  </button>
                  <button className="px-3 py-2 bg-background border border-border text-muted-foreground hover:text-foreground rounded text-xs font-medium">
                    1:1 Square
                  </button>
                </div>
              </div>

              {/* Engine */}
              <div className="space-y-3">
                <label className="text-xs font-mono text-muted-foreground uppercase">Core Model</label>
                <div className="grid grid-cols-2 gap-2">
                  <button className="bg-primary/10 border border-primary text-primary px-3 py-2 rounded text-xs font-medium">
                    Lumiere v2
                  </button>
                  <button className="bg-background border border-border text-muted-foreground hover:text-foreground px-3 py-2 rounded text-xs font-medium">
                    Sora Engine
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Active Reference Asset */}
          <div className="space-y-3 pt-2 border-t border-border">
            <label className="text-xs font-mono text-muted-foreground uppercase flex justify-between items-center">
              Active References
              <span className="text-primary hover:underline cursor-pointer">Edit</span>
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

