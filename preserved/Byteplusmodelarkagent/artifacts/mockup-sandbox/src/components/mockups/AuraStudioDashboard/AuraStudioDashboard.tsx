import React, { useState } from 'react';
import { 
  Film, 
  Wand2, 
  LayoutTemplate, 
  Mic, 
  Clock, 
  Play, 
  Settings2, 
  ChevronRight,
  Sparkles,
  Grid,
  Library,
  Layers,
  ArrowRight,
  X,
  Plus
} from 'lucide-react';

export default function AuraStudioDashboard() {
  const [activeTab, setActiveTab] = useState('styles');
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<{id: string, name: string, img: string} | null>(null);
  const [selectedArc, setSelectedArc] = useState<{id: string, name: string, desc: string} | null>(null);
  const [duration, setDuration] = useState('60s');

  const STYLES = [
    { id: 'cinematic', name: 'Cinematic 35mm', img: '/__mockup/images/aurastudiodashboard-cinematic.jpg', desc: 'Teal & orange, shallow depth of field' },
    { id: 'anime', name: 'Studio Animation', img: '/__mockup/images/aurastudiodashboard-anime.jpg', desc: 'Lush colors, painted backgrounds' },
    { id: 'documentary', name: 'Raw Documentary', img: '/__mockup/images/aurastudiodashboard-documentary.jpg', desc: 'Natural light, handheld motion' },
    { id: 'vaporwave', name: 'Synthwave', img: '/__mockup/images/aurastudiodashboard-vaporwave.jpg', desc: 'Neon grids, retro aesthetics' },
  ];

  const ARCS = [
    { id: 'viral', name: 'The Viral Hook', desc: 'Starts with an extreme claim, follows with rapid pacing, ends on a cliffhanger.' },
    { id: 'edu', name: 'Educational Deep-Dive', desc: 'Poses a question, breaks down the answer in 3 points, summarizes.' },
    { id: 'vlog', name: 'Day in the Life', desc: 'Chronological timeline with natural transitions and casual voiceover.' },
    { id: 'trailer', name: 'Cinematic Trailer', desc: 'Slow build, massive climax, dramatic pauses, title card finish.' },
  ];

  return (
    <div className="flex h-[100dvh] w-full bg-[#0a0a0a] text-zinc-300 font-sans overflow-hidden">
      
      {/* LEFT PANEL: The Builder */}
      <div className="w-[380px] shrink-0 border-r border-white/10 bg-[#111111] flex flex-col z-10 shadow-2xl relative">
        <div className="p-6 flex items-center gap-3 border-b border-white/5 shrink-0">
          <div className="w-8 h-8 rounded bg-amber-500/20 text-amber-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-zinc-100 font-medium leading-none">Aura Studio</h1>
            <p className="text-xs text-zinc-500 mt-1 font-mono uppercase tracking-wider">New Project</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          {/* Core Concept */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-100 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Core Concept
              </label>
            </div>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="What is this video about? e.g. The history of coffee..."
              className="w-full h-32 bg-[#1a1a1a] border border-white/5 rounded-xl p-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none transition-all"
            />
          </div>

          {/* Configuration Slots */}
          <div className="space-y-4">
            <label className="text-xs font-semibold text-zinc-100 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Parameters
            </label>

            {/* Style Slot */}
            <div className="group rounded-xl border border-white/5 bg-[#1a1a1a] p-1.5 hover:border-white/10 transition-colors flex items-stretch min-h-[72px]">
              {selectedStyle ? (
                <>
                  <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden relative">
                    <img src={selectedStyle.img} alt={selectedStyle.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 pl-3 py-2 flex flex-col justify-center">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Visual Style</div>
                    <div className="text-sm text-zinc-200 font-medium">{selectedStyle.name}</div>
                  </div>
                  <button 
                    onClick={() => setSelectedStyle(null)}
                    className="w-8 flex items-center justify-center text-zinc-600 hover:text-zinc-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setActiveTab('styles')}
                  className="flex-1 flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 border border-dashed border-white/10 rounded-lg hover:bg-white/5 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Visual Style
                </button>
              )}
            </div>

            {/* Arc Slot */}
            <div className="group rounded-xl border border-white/5 bg-[#1a1a1a] p-1.5 hover:border-white/10 transition-colors flex items-stretch min-h-[72px]">
              {selectedArc ? (
                <>
                  <div className="w-16 h-16 shrink-0 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div className="flex-1 pl-3 py-2 flex flex-col justify-center min-w-0">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Narrative Arc</div>
                    <div className="text-sm text-zinc-200 font-medium truncate">{selectedArc.name}</div>
                  </div>
                  <button 
                    onClick={() => setSelectedArc(null)}
                    className="w-8 flex items-center justify-center text-zinc-600 hover:text-zinc-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setActiveTab('arcs')}
                  className="flex-1 flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 border border-dashed border-white/10 rounded-lg hover:bg-white/5 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Narrative Arc
                </button>
              )}
            </div>

            {/* Duration Selector */}
            <div className="rounded-xl border border-white/5 bg-[#1a1a1a] p-3">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">Target Duration</div>
              <div className="flex gap-2">
                {['15s', '30s', '60s', '90s'].map(d => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-mono transition-colors ${
                      duration === d ? 'bg-zinc-800 text-zinc-100' : 'bg-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Generate Button Area */}
        <div className="p-6 border-t border-white/5 bg-[#111111]/80 backdrop-blur-md">
          <button 
            className={`w-full py-3.5 rounded-xl flex items-center justify-center gap-2 font-medium transition-all ${
              prompt.trim() 
                ? 'bg-amber-500 text-amber-950 hover:bg-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]' 
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <Wand2 className="w-4 h-4" />
            <span>Generate Video Pipeline</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT: The Library */}
      <div className="flex-1 flex flex-col bg-[#0a0a0a] relative overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        
        {/* Header / Tabs */}
        <div className="h-20 shrink-0 px-10 flex items-center justify-between border-b border-white/5 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-8">
            <button 
              onClick={() => setActiveTab('styles')}
              className={`text-sm tracking-wide transition-colors relative h-20 flex items-center ${activeTab === 'styles' ? 'text-zinc-100 font-medium' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Styles & Moods
              {activeTab === 'styles' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500 rounded-t-full"></div>}
            </button>
            <button 
              onClick={() => setActiveTab('arcs')}
              className={`text-sm tracking-wide transition-colors relative h-20 flex items-center ${activeTab === 'arcs' ? 'text-zinc-100 font-medium' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Narrative Arcs
              {activeTab === 'arcs' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500 rounded-t-full"></div>}
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`text-sm tracking-wide transition-colors relative h-20 flex items-center ${activeTab === 'history' ? 'text-zinc-100 font-medium' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Recent Projects
              {activeTab === 'history' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500 rounded-t-full"></div>}
            </button>
          </div>
          
          <div className="flex items-center gap-4 text-zinc-500">
            <button className="hover:text-zinc-300 transition-colors">
              <Library className="w-5 h-5" />
            </button>
            <button className="hover:text-zinc-300 transition-colors">
              <Settings2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-10 z-10">
          
          {activeTab === 'styles' && (
            <div className="max-w-5xl">
              <h2 className="text-2xl font-light text-zinc-100 mb-2">Visual Direction</h2>
              <p className="text-sm text-zinc-500 mb-10">Select a foundational aesthetic for your video. The AI will adapt cinematography and color grading.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {STYLES.map(style => (
                  <button 
                    key={style.id}
                    onClick={() => setSelectedStyle(style)}
                    className={`group relative aspect-[4/3] rounded-2xl overflow-hidden border text-left transition-all ${
                      selectedStyle?.id === style.id ? 'border-amber-500 ring-4 ring-amber-500/20' : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <img src={style.img} alt={style.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                      <h3 className="text-lg font-medium text-white mb-1">{style.name}</h3>
                      <p className="text-xs text-white/70 line-clamp-2">{style.desc}</p>
                    </div>
                    {selectedStyle?.id === style.id && (
                      <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-amber-500 text-black flex items-center justify-center">
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'arcs' && (
            <div className="max-w-5xl">
              <h2 className="text-2xl font-light text-zinc-100 mb-2">Story Structure</h2>
              <p className="text-sm text-zinc-500 mb-10">Choose how the AI should pace and organize your script.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ARCS.map(arc => (
                  <button
                    key={arc.id}
                    onClick={() => setSelectedArc(arc)}
                    className={`flex items-start gap-4 p-6 rounded-2xl border text-left transition-all ${
                      selectedArc?.id === arc.id ? 'border-indigo-500 bg-indigo-500/5 ring-4 ring-indigo-500/10' : 'border-white/10 bg-[#141414] hover:border-white/30 hover:bg-[#1a1a1a]'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      selectedArc?.id === arc.id ? 'bg-indigo-500 text-white' : 'bg-white/5 text-zinc-400'
                    }`}>
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-zinc-100 mb-2">{arc.name}</h3>
                      <p className="text-sm text-zinc-500 leading-relaxed">{arc.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="max-w-5xl flex flex-col items-center justify-center h-full text-center text-zinc-500 pt-20">
              <Film className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg">No recent projects</p>
              <p className="text-sm mt-2 opacity-70">Videos you create will appear here for easy remixing.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
