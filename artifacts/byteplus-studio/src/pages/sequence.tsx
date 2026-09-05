import React, { useState } from 'react';
import { useStudio, SceneTemplate } from '@/lib/store';
import {
  GripVertical,
  Play,
  Clock,
  Scissors,
  Settings2,
  Plus,
  Download,
  Trash2,
  Type,
  Wand2,
  CheckCircle2,
  Sparkles,
  Zap,
  Film,
  Flame,
  LayoutTemplate,
} from 'lucide-react';

export default function Sequence() {
  const {
    mode,
    shots,
    reorderShots,
    updateShot,
    addShot,
    deleteShot,
    applyTemplate,
    addJob,
  } = useStudio();

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(shots[0]?.id ?? null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStage, setExportStage] = useState('sequence_assembly');
  const [exportProgress, setExportProgress] = useState(0);

  const activeShot = shots.find((s) => s.id === selectedShotId) || shots[0];

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    reorderShots(draggedIdx, index);
    setDraggedIdx(index);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  const totalDuration = shots.reduce((acc, shot) => acc + shot.duration, 0);

  const startFullRender = () => {
    if (shots.length === 0) return;
    setIsExporting(true);
    setExportProgress(0);
    setExportStage('sequence_assembly');
    addJob(`Sequence Export [${shots.length} shots, ${totalDuration}s]`);

    const interval = setInterval(() => {
      setExportProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setExportStage('delivered');
          return 100;
        }
        const next = p + 5;
        if (next > 75) setExportStage('qa_verification');
        else if (next > 45) setExportStage('audio_synthesis');
        else if (next > 20) setExportStage('video_rendering');
        return next;
      });
    }, 150);
  };

  return (
    <div className="h-full flex flex-col bg-background p-4 lg:p-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1 flex items-center gap-3">
            InVideo Sequence Studio
            <span
              className={`text-xs font-mono px-2.5 py-0.5 rounded border ${
                mode === 'cinematic'
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : mode === 'viral'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {mode.toUpperCase()} PIPELINE
            </span>
          </h1>
          <p className="text-muted-foreground text-xs font-mono flex items-center gap-4">
            <span>TOTAL SHOTS: {shots.length}</span>
            <span>DURATION: {totalDuration}s</span>
            <span>RESOLUTION: {mode === 'viral' ? '1080x1920 (9:16)' : '3840x2160 (16:9)'}</span>
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              const xmlData = `<sequence duration="${totalDuration}">${shots
                .map((s, i) => `<shot id="${s.id}" order="${i}" duration="${s.duration}" transition="${s.transition || 'Cut'}">${s.prompt}</shot>`)
                .join('')}</sequence>`;
              const blob = new Blob([xmlData], { type: 'text/xml' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'sequence-timeline.xml';
              a.click();
            }}
            className="px-3.5 py-2 bg-card border border-border hover:border-primary/50 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export XML
          </button>
          <button
            onClick={startFullRender}
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-semibold uppercase tracking-wider font-mono flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Render Final Sequence
          </button>
        </div>
      </div>

      {/* InVideo Scene Template Preset Selector */}
      <div className="flex items-center gap-2 mb-4 p-2 bg-card border border-border rounded-xl overflow-x-auto">
        <span className="text-xs font-mono text-muted-foreground uppercase flex items-center gap-1.5 px-2">
          <LayoutTemplate className="w-3.5 h-3.5 text-primary" />
          Scene Templates:
        </span>
        {[
          { id: 'cinematic_trailer', label: 'Cinematic Trailer 🎬', icon: Film },
          { id: 'faceless_short', label: 'Faceless Viral Short ⚡', icon: Flame },
          { id: 'promo', label: 'Product Promo 📣', icon: Zap },
          { id: 'ad', label: 'Social Ad 🎯', icon: Sparkles },
        ].map((tmpl) => (
          <button
            key={tmpl.id}
            onClick={() => applyTemplate(tmpl.id as SceneTemplate)}
            className="px-3 py-1.5 bg-background border border-border hover:border-primary/50 text-xs font-medium rounded-lg text-foreground transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            {tmpl.label}
          </button>
        ))}
      </div>

      {/* Storyboard Inspector & Preview Player */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 flex-1 min-h-0">
        {/* Main Shot Viewer */}
        <div className="lg:col-span-2 aspect-video bg-black border border-border rounded-xl overflow-hidden relative group flex flex-col justify-between">
          <img
            src={activeShot?.imageUrl}
            className="absolute inset-0 w-full h-full object-cover opacity-90 transition-all"
            alt={activeShot?.prompt}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

          {/* Subtitle Caption Overlay Preview */}
          {activeShot?.captionText && (
            <div className="absolute bottom-12 left-0 right-0 p-4 text-center z-10">
              <span className="inline-block px-4 py-2 bg-black/75 border border-amber-400/40 text-amber-300 font-bold text-base md:text-lg rounded-lg shadow-lg tracking-wide uppercase font-mono">
                {activeShot.captionText}
              </span>
            </div>
          )}

          <div className="relative p-3 flex justify-between items-center text-xs font-mono text-white/80">
            <span className="bg-black/60 px-2.5 py-1 rounded backdrop-blur-sm border border-white/10">
              SHOT {activeShot ? shots.findIndex((s) => s.id === activeShot.id) + 1 : 1} / {shots.length}: {activeShot?.beatType || 'Story Beat'}
            </span>
            <span className="bg-black/60 px-2.5 py-1 rounded backdrop-blur-sm border border-white/10">
              TRANSITION: {activeShot?.transition || 'Dissolve'}
            </span>
          </div>

          <div className="relative p-4 flex items-center justify-between text-white bg-gradient-to-t from-black/90 to-transparent">
            <p className="text-xs truncate max-w-md font-mono text-white/90">{activeShot?.prompt}</p>
            <div className="flex items-center gap-3">
              <button className="p-2 hover:text-primary transition-colors">
                <Scissors className="w-4 h-4" />
              </button>
              <button className="p-2.5 bg-primary text-primary-foreground rounded-full hover:scale-105 transition-all">
                <Play className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>
        </div>

        {/* Selected Shot Property Inspector */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between overflow-y-auto">
          {activeShot ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-mono uppercase font-semibold text-primary">
                  Shot Inspector (S{shots.findIndex((s) => s.id === activeShot.id) + 1})
                </span>
                <button
                  onClick={() => deleteShot(activeShot.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  title="Delete shot"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-muted-foreground uppercase">Beat Intent</label>
                <input
                  type="text"
                  value={activeShot.beatType || ''}
                  onChange={(e) => updateShot(activeShot.id, { beatType: e.target.value })}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none font-mono"
                  placeholder="e.g. Establishing Atmosphere"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-muted-foreground uppercase">Prompt Direction</label>
                <textarea
                  value={activeShot.prompt}
                  onChange={(e) => updateShot(activeShot.id, { prompt: e.target.value })}
                  className="w-full bg-background border border-border rounded p-2 text-xs text-foreground focus:border-primary focus:outline-none font-mono h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase">Duration (s)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={activeShot.duration}
                    onChange={(e) => updateShot(activeShot.id, { duration: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground font-mono focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase">Transition</label>
                  <select
                    value={activeShot.transition || 'Dissolve'}
                    onChange={(e) => updateShot(activeShot.id, { transition: e.target.value })}
                    className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground font-mono focus:border-primary focus:outline-none"
                  >
                    <option>Dissolve</option>
                    <option>Whip Pan</option>
                    <option>Glitch Cut</option>
                    <option>Match Cut</option>
                    <option>Zoom Flash</option>
                    <option>Snap</option>
                    <option>Cut</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-muted-foreground uppercase flex items-center gap-1">
                  <Type className="w-3 h-3 text-amber-400" /> Subtitle / Caption Text
                </label>
                <input
                  type="text"
                  value={activeShot.captionText || ''}
                  onChange={(e) => updateShot(activeShot.id, { captionText: e.target.value })}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-amber-300 font-mono focus:border-amber-400 focus:outline-none"
                  placeholder="Caption text overlay..."
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-xs font-mono">Select a shot to edit parameters</div>
          )}

          <button
            onClick={() => addShot()}
            className="w-full mt-3 py-2 bg-background border border-dashed border-border hover:border-primary rounded-lg text-xs font-medium text-foreground flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-primary" />
            Add New Scene Shot
          </button>
        </div>
      </div>

      {/* Timeline Track Area */}
      <div className="h-44 bg-card border border-border rounded-xl flex flex-col overflow-hidden relative">
        {/* Timeline Timecode Ruler */}
        <div className="h-7 border-b border-border bg-sidebar flex relative">
          <div className="w-10 border-r border-border flex-shrink-0" />
          <div
            className="flex-1 relative overflow-hidden flex"
            style={{
              backgroundImage: 'linear-gradient(90deg, var(--border) 1px, transparent 1px)',
              backgroundSize: '100px 100%',
            }}
          >
            {[...Array(12)].map((_, i) => (
              <div key={i} className="absolute top-1 text-[9px] font-mono text-muted-foreground" style={{ left: `${i * 100}px` }}>
                00:00:{i.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>
        </div>

        {/* Shot Blocks */}
        <div className="flex-1 flex overflow-x-auto p-3 gap-2 items-center bg-background/50">
          {shots.map((shot, index) => {
            const isSelected = shot.id === selectedShotId;
            return (
              <div
                key={shot.id}
                draggable
                onClick={() => setSelectedShotId(shot.id)}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  relative h-28 flex-shrink-0 rounded-lg overflow-hidden border-2 cursor-pointer transition-all
                  ${isSelected ? 'border-primary ring-2 ring-primary/40' : 'border-border hover:border-muted-foreground'}
                  ${draggedIdx === index ? 'opacity-50 scale-95' : ''}
                `}
                style={{ width: `${Math.max(120, shot.duration * 40)}px` }}
              >
                <img src={shot.imageUrl} alt={shot.prompt} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40 pointer-events-none" />

                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded text-[9px] font-mono text-white/90">
                  <GripVertical className="w-3 h-3 text-white/60" />
                  S{index + 1}
                </div>

                <div className="absolute top-1.5 right-1.5 font-mono text-[9px] text-white/80 bg-black/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {shot.duration}s
                </div>

                <div className="absolute bottom-1.5 left-1.5 right-1.5 text-[10px] text-white font-medium truncate">
                  {shot.beatType || shot.prompt}
                </div>
              </div>
            );
          })}

          <button
            onClick={() => addShot()}
            className="h-28 w-16 flex-shrink-0 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Render & Delivery Progress Overlay Modal */}
      {isExporting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full cinematic-shadow space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold flex items-center gap-2 text-foreground font-mono">
                <Wand2 className="w-4 h-4 text-primary animate-spin-slow" />
                INVIDEO RENDER & DELIVERY
              </h3>
              <span className="text-xs font-mono text-primary uppercase">{exportStage}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span>Progress</span>
                <span className="text-primary">{exportProgress}%</span>
              </div>
              <div className="h-2 bg-sidebar rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-primary shadow-[0_0_12px_rgba(0,229,255,0.6)] transition-all duration-150"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>

            <div className="space-y-2 border border-border bg-background p-3 rounded-lg text-xs font-mono">
              <div className="flex items-center justify-between">
                <span>1. Sequence Assembly:</span>
                <span className={exportProgress > 20 ? 'text-green-400' : 'text-muted-foreground'}>
                  {exportProgress > 20 ? 'COMPLETED' : 'IN PROGRESS'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>2. Video Synthesis:</span>
                <span className={exportProgress > 45 ? 'text-green-400' : 'text-muted-foreground'}>
                  {exportProgress > 45 ? 'COMPLETED' : 'QUEUED'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>3. Audio & Captions:</span>
                <span className={exportProgress > 75 ? 'text-green-400' : 'text-muted-foreground'}>
                  {exportProgress > 75 ? 'COMPLETED' : 'QUEUED'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>4. QA Verification:</span>
                <span className={exportProgress === 100 ? 'text-green-400' : 'text-muted-foreground'}>
                  {exportProgress === 100 ? 'PASSED' : 'PENDING'}
                </span>
              </div>
            </div>

            {exportProgress === 100 ? (
              <div className="space-y-3">
                <div className="p-2.5 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2 text-green-400 text-xs font-mono">
                  <CheckCircle2 className="w-4 h-4" />
                  DELIVERED TO CDN & PROJECT MEMORY!
                </div>
                <button
                  onClick={() => setIsExporting(false)}
                  className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs font-mono uppercase"
                >
                  Return to Studio
                </button>
              </div>
            ) : (
              <p className="text-center text-[11px] font-mono text-muted-foreground">
                Synthesizing multi-beat video render with zero frame loss...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

