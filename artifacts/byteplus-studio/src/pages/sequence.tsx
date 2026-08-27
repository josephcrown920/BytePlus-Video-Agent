import React, { useState } from 'react';
import { useStudio } from '@/lib/store';
import { GripVertical, Play, Clock, Scissors, Settings2, Plus, Download } from 'lucide-react';

export default function Sequence() {
  const { shots, reorderShots } = useStudio();
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    reorderShots(draggedIdx, index);
    setDraggedIdx(index); // Update dragged index to current position
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  const totalDuration = shots.reduce((acc, shot) => acc + shot.duration, 0);

  return (
    <div className="h-full flex flex-col bg-background p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Sequence Timeline</h1>
          <p className="text-muted-foreground text-sm font-mono flex items-center gap-4">
            <span>TOTAL SHOTS: {shots.length}</span>
            <span>DURATION: {totalDuration}s</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-card border border-border hover:border-primary/50 rounded-md text-sm font-medium flex items-center gap-2 transition-colors">
            <Download className="w-4 h-4" />
            Export XML
          </button>
          <button className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(0,229,255,0.2)]">
            <Play className="w-4 h-4" />
            Render Sequence
          </button>
        </div>
      </div>

      {/* Mini Viewer */}
      <div className="w-full max-w-3xl mx-auto aspect-video bg-black border border-border rounded-lg mb-8 overflow-hidden relative group">
        <img src={shots[0]?.imageUrl} className="w-full h-full object-cover opacity-80" alt="Viewer" />
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-4 text-white">
            <button className="p-2 hover:text-primary transition-colors"><Scissors className="w-5 h-5" /></button>
            <button className="p-3 bg-white text-black rounded-full hover:bg-primary transition-colors"><Play className="w-6 h-6 fill-current" /></button>
            <button className="p-2 hover:text-primary transition-colors"><Settings2 className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="absolute top-4 left-4 font-mono text-xs text-white/70 bg-black/50 px-2 py-1 rounded">00:00:00:00</div>
      </div>

      {/* Timeline Track */}
      <div className="flex-1 bg-card border border-border rounded-lg flex flex-col overflow-hidden relative">
        {/* Timeline Header (Timecode) */}
        <div className="h-8 border-b border-border bg-sidebar flex relative">
          <div className="w-12 border-r border-border flex-shrink-0" />
          <div className="flex-1 relative overflow-hidden flex" style={{ backgroundImage: 'linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '100px 100%' }}>
            {[...Array(10)].map((_, i) => (
              <div key={i} className="absolute top-1 text-[10px] font-mono text-muted-foreground" style={{ left: `${i * 100}px` }}>
                00:00:{i.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>
        </div>

        {/* Video Track */}
        <div className="flex-1 flex overflow-x-auto relative p-4 gap-2 items-center bg-background/50">
          {shots.map((shot, index) => (
            <div
              key={shot.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`
                relative h-32 flex-shrink-0 rounded-md overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-transform
                ${draggedIdx === index ? 'opacity-50 scale-95 border-primary' : 'border-border hover:border-muted-foreground'}
              `}
              style={{ width: `${shot.duration * 50}px` }} // Width based on duration
            >
              <img src={shot.imageUrl} alt={shot.prompt} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-2 left-2 right-2 text-xs text-white truncate font-medium">
                S{index + 1}: {shot.prompt}
              </div>
              <div className="absolute top-2 left-2 flex items-center justify-center w-6 h-6 bg-black/50 rounded backdrop-blur-sm">
                <GripVertical className="w-3 h-3 text-white/70" />
              </div>
              <div className="absolute top-2 right-2 font-mono text-[10px] text-white/70 bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {shot.duration}s
              </div>
            </div>
          ))}
          
          <button className="h-32 w-16 flex-shrink-0 rounded-md border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors">
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
