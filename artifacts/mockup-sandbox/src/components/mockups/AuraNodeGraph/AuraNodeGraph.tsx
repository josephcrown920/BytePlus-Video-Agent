import React, { useState, useEffect, useRef } from 'react';
import { 
  Type, 
  Layers, 
  Image as ImageIcon, 
  Mic, 
  Cpu, 
  Film, 
  Play, 
  Settings2, 
  Plus, 
  Wand2, 
  GripHorizontal,
  Video
} from 'lucide-react';
import './AuraNodeGraph.css';

type NodeType = 'input_text' | 'input_select' | 'input_image' | 'input_voice' | 'process' | 'output';

interface NodeData {
  id: string;
  type: NodeType;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  data: any;
}

interface EdgeData {
  id: string;
  from: string;
  to: string;
}

const INITIAL_NODES: NodeData[] = [
  { id: 'concept', type: 'input_text', title: 'Core Concept', x: 80, y: 80, w: 320, h: 180, data: { value: 'The history of coffee, told as a fast-paced documentary.' } },
  { id: 'arc', type: 'input_select', title: 'Narrative Arc', x: 80, y: 300, w: 320, h: 130, data: { value: 'viral', options: ['Viral Hook', 'Educational', 'Vlog', 'Trailer'] } },
  { id: 'script', type: 'process', title: 'Script Engine', x: 500, y: 190, w: 240, h: 120, data: { status: 'idle', model: 'Aura-LLM-v2' } },
  { id: 'style', type: 'input_image', title: 'Visual Style', x: 80, y: 470, w: 320, h: 140, data: { value: 'Cinematic 35mm', img: '/__mockup/images/auranodegraph-cinematic.jpg' } },
  { id: 'visuals', type: 'process', title: 'Visual Engine', x: 500, y: 480, w: 240, h: 120, data: { status: 'idle', model: 'Aura-Vision-X' } },
  { id: 'voice', type: 'input_voice', title: 'AI Voiceover', x: 80, y: 650, w: 320, h: 130, data: { value: 'Adam (Deep)', img: '/__mockup/images/auranodegraph-avatar.jpg' } },
  { id: 'audio', type: 'process', title: 'Audio Engine', x: 500, y: 655, w: 240, h: 120, data: { status: 'idle', model: 'Aura-Voice-Gen' } },
  { id: 'render', type: 'output', title: 'Final Pipeline', x: 860, y: 450, w: 260, h: 180, data: { duration: '60s' } }
];

const EDGES: EdgeData[] = [
  { id: 'e1', from: 'concept', to: 'script' },
  { id: 'e2', from: 'arc', to: 'script' },
  { id: 'e3', from: 'script', to: 'visuals' },
  { id: 'e4', from: 'style', to: 'visuals' },
  { id: 'e5', from: 'script', to: 'audio' },
  { id: 'e6', from: 'voice', to: 'audio' },
  { id: 'e7', from: 'visuals', to: 'render' },
  { id: 'e8', from: 'audio', to: 'render' }
];

export default function AuraNodeGraph() {
  const [nodes, setNodes] = useState<NodeData[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<EdgeData[]>(EDGES);
  
  // Canvas Pan & Zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panStartOffset, setPanStartOffset] = useState({ x: 0, y: 0 });

  // Node Drag state
  const [dragInfo, setDragInfo] = useState<{ id: string, startX: number, startY: number, startNodeX: number, startNodeY: number } | null>(null);

  // Connection dragging state
  const [connecting, setConnecting] = useState<{ fromId: string, startX: number, startY: number, currentX: number, currentY: number } | null>(null);

  // Animation state
  const [isPlaying, setIsPlaying] = useState(false);

  // Refs for tracking DOM elements
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDownCanvas = (e: React.PointerEvent) => {
    // Only pan on middle click or left click on background
    if (e.target === containerRef.current || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setPanStartOffset({ x: pan.x, y: pan.y });
    }
  };

  const handlePointerMoveCanvas = (e: React.PointerEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan({ x: panStartOffset.x + dx, y: panStartOffset.y + dy });
    } else if (dragInfo) {
      const dx = e.clientX - dragInfo.startX;
      const dy = e.clientY - dragInfo.startY;
      setNodes(prev => prev.map(n => n.id === dragInfo.id ? { ...n, x: dragInfo.startNodeX + dx, y: dragInfo.startNodeY + dy } : n));
    } else if (connecting) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setConnecting({
          ...connecting,
          currentX: e.clientX - rect.left - pan.x,
          currentY: e.clientY - rect.top - pan.y
        });
      }
    }
  };

  const handlePointerUpCanvas = () => {
    setIsPanning(false);
    setDragInfo(null);
    setConnecting(null);
  };

  const onNodePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    
    // Bring node to front by moving it to the end of the array
    setNodes(prev => {
      const filtered = prev.filter(n => n.id !== id);
      return [...filtered, node];
    });

    setDragInfo({
      id,
      startX: e.clientX,
      startY: e.clientY,
      startNodeX: node.x,
      startNodeY: node.y
    });
  };

  const updateNodeData = (id: string, newData: any) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, ...newData } } : n));
  };

  const getPath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.max(Math.abs(x2 - x1) * 0.5, 50);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  // Render individual node content
  const renderNodeContent = (node: NodeData) => {
    switch (node.type) {
      case 'input_text':
        return (
          <div className="p-4 flex flex-col h-full">
            <textarea
              className="w-full flex-1 bg-black/40 border border-white/5 rounded-lg p-3 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none transition-all"
              value={node.data.value}
              onChange={(e) => updateNodeData(node.id, { value: e.target.value })}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="Describe your video concept..."
            />
          </div>
        );
      
      case 'input_select':
        return (
          <div className="p-4 flex flex-col h-full justify-center">
            <div className="grid grid-cols-2 gap-2">
              {node.data.options.map((opt: string) => (
                <button
                  key={opt}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => updateNodeData(node.id, { value: opt })}
                  className={`py-2 px-3 rounded-lg text-xs transition-colors text-left ${
                    node.data.value === opt 
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 border' 
                      : 'bg-black/40 border-white/5 text-zinc-400 border hover:border-white/20'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        );

      case 'input_image':
        return (
          <div className="p-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 relative group">
              <img src={node.data.img} alt={node.data.value} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <Settings2 className="w-4 h-4 text-white" />
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider mb-1">Selected Style</div>
              <div className="text-sm font-medium text-zinc-200">{node.data.value}</div>
            </div>
          </div>
        );

      case 'input_voice':
        return (
          <div className="p-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-black relative group flex items-center justify-center">
              <img src={node.data.img} alt={node.data.value} className="w-full h-full object-cover opacity-80 mix-blend-screen" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-0.5 h-4">
                  {[1, 3, 2, 4, 2].map((h, i) => (
                    <div key={i} className="w-1 bg-amber-400 rounded-full animate-pulse" style={{ height: `${h * 4}px`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer pointer-events-auto">
                <Settings2 className="w-4 h-4 text-white" />
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider mb-1">Voice Profile</div>
              <div className="text-sm font-medium text-zinc-200">{node.data.value}</div>
            </div>
          </div>
        );

      case 'process':
        return (
          <div className="p-4 flex flex-col items-center justify-center h-full">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-colors ${
              isPlaying ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-black/50 text-zinc-500 border border-white/5'
            }`}>
              {node.id === 'script' && <Type className="w-5 h-5" />}
              {node.id === 'visuals' && <ImageIcon className="w-5 h-5" />}
              {node.id === 'audio' && <Mic className="w-5 h-5" />}
            </div>
            <div className="text-xs font-mono text-zinc-500">{node.data.model}</div>
            {isPlaying && (
              <div className="mt-2 text-[10px] text-amber-500 uppercase tracking-widest animate-pulse">Processing...</div>
            )}
          </div>
        );

      case 'output':
        return (
          <div className="p-5 flex flex-col h-full justify-between">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-mono">Target Duration</div>
              <div className="flex gap-2 mb-6">
                {['15s', '30s', '60s'].map(d => (
                  <button 
                    key={d} 
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => updateNodeData(node.id, { duration: d })}
                    className={`flex-1 py-1.5 text-xs rounded-md border font-mono transition-colors ${
                      node.data.duration === d 
                        ? 'border-amber-500 text-amber-500 bg-amber-500/10' 
                        : 'border-white/10 text-zinc-400 hover:bg-white/5'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <button 
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setIsPlaying(!isPlaying)}
              className={`w-full py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                isPlaying 
                  ? 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20' 
                  : 'bg-amber-500 text-amber-950 hover:bg-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]'
              }`}
            >
              {isPlaying ? (
                <>Stop Execution</>
              ) : (
                <><Play className="w-4 h-4 fill-current" /> Execute Pipeline</>
              )}
            </button>
          </div>
        );
    }
  };

  const getIconForType = (type: NodeType) => {
    switch (type) {
      case 'input_text': return <Type className="w-3.5 h-3.5" />;
      case 'input_select': return <Layers className="w-3.5 h-3.5" />;
      case 'input_image': return <ImageIcon className="w-3.5 h-3.5" />;
      case 'input_voice': return <Mic className="w-3.5 h-3.5" />;
      case 'process': return <Cpu className="w-3.5 h-3.5" />;
      case 'output': return <Video className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div 
      className="w-full h-[100dvh] bg-[#0a0a0a] relative overflow-hidden font-sans select-none"
      ref={containerRef}
      onPointerDown={handlePointerDownCanvas}
      onPointerMove={handlePointerMoveCanvas}
      onPointerUp={handlePointerUpCanvas}
      onPointerLeave={handlePointerUpCanvas}
    >
      {/* Background Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{
          backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          backgroundPosition: `${pan.x}px ${pan.y}px`
        }}
      />

      {/* Top Navbar */}
      <div className="absolute top-0 left-0 right-0 h-16 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-amber-500 text-amber-950 flex items-center justify-center">
            <Wand2 className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-medium text-zinc-100">The History of Coffee</h1>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Unsaved Changes</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
            <Plus className="w-4 h-4" /> Add Node
          </button>
          <div className="w-px h-4 bg-white/10" />
          <button className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
            <Settings2 className="w-4 h-4" /> Settings
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div 
        className="absolute inset-0 origin-top-left"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
      >
        {/* SVG Edges */}
        <svg className="absolute inset-0 overflow-visible pointer-events-none" style={{ zIndex: 0 }}>
          {edges.map(edge => {
            const fromNode = nodes.find(n => n.id === edge.from);
            const toNode = nodes.find(n => n.id === edge.to);
            if (!fromNode || !toNode) return null;

            const startX = fromNode.x + fromNode.w;
            const startY = fromNode.y + fromNode.h / 2;
            const endX = toNode.x;
            const endY = toNode.y + toNode.h / 2;

            const path = getPath(startX, startY, endX, endY);

            return (
              <g key={edge.id}>
                {/* Invisible wider path for hit detection if we wanted to make edges clickable */}
                <path d={path} stroke="transparent" strokeWidth="15" fill="none" />
                
                {/* Background static line */}
                <path 
                  d={path} 
                  stroke="rgba(255,255,255,0.05)" 
                  strokeWidth="2" 
                  fill="none" 
                  className="transition-colors duration-300"
                />
                
                {/* Animated flowing line when playing */}
                <path 
                  d={path} 
                  stroke={isPlaying ? "rgba(245, 158, 11, 0.6)" : "rgba(245, 158, 11, 0)"}
                  strokeWidth="2" 
                  fill="none" 
                  strokeDasharray="8 8"
                  className={isPlaying ? "edge-flow transition-opacity duration-300" : "transition-opacity duration-300"}
                />
                
                {/* Connection points */}
                <circle cx={startX} cy={startY} r="4" fill="#111" stroke={isPlaying ? "#f59e0b" : "rgba(255,255,255,0.2)"} strokeWidth="2" className="transition-colors duration-300" />
                <circle cx={endX} cy={endY} r="4" fill="#111" stroke={isPlaying ? "#f59e0b" : "rgba(255,255,255,0.2)"} strokeWidth="2" className="transition-colors duration-300" />
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map(node => {
          const hasInputPort = node.type === 'process' || node.type === 'output';
          const hasOutputPort = node.type.startsWith('input') || node.type === 'process';
          
          return (
            <div
              key={node.id}
              className={`absolute flex flex-col bg-[#111111]/90 backdrop-blur-xl border shadow-2xl transition-[border-color,box-shadow] duration-200 ${
                dragInfo?.id === node.id 
                  ? 'border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.15)] z-40' 
                  : 'border-white/10 hover:border-white/20 z-10'
              }`}
              style={{
                left: node.x,
                top: node.y,
                width: node.w,
                height: node.h,
                borderRadius: '16px'
              }}
            >
              {/* Node Header (Draggable Area) */}
              <div 
                className="h-10 px-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02] cursor-grab active:cursor-grabbing rounded-t-[15px]"
                onPointerDown={(e) => onNodePointerDown(e, node.id)}
              >
                <div className="flex items-center gap-2 text-zinc-400">
                  {getIconForType(node.type)}
                  <span className="text-[11px] font-mono uppercase tracking-wider">{node.title}</span>
                </div>
                <GripHorizontal className="w-4 h-4 text-zinc-600" />
              </div>

              {/* Node Content */}
              <div className="flex-1 overflow-hidden">
                {renderNodeContent(node)}
              </div>

              {/* Input Port (Left) */}
              {hasInputPort && (
                <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#111] border-2 border-zinc-600 z-20 group">
                  <div className="absolute inset-0 rounded-full bg-amber-500 scale-0 group-hover:scale-100 transition-transform" />
                </div>
              )}

              {/* Output Port (Right) */}
              {hasOutputPort && (
                <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#111] border-2 border-zinc-600 z-20 group cursor-crosshair">
                  <div className="absolute inset-0 rounded-full bg-amber-500 scale-0 group-hover:scale-100 transition-transform" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Toolbar (Bottom Center) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-full p-2 flex items-center gap-2 shadow-2xl z-50">
        <button 
          onClick={() => setPan({ x: 0, y: 0 })}
          className="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-zinc-100 hover:bg-white/5 rounded-full transition-colors"
        >
          Reset View
        </button>
        <div className="w-px h-4 bg-white/10 mx-1" />
        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          className={`px-4 py-2 text-xs font-mono rounded-full transition-colors flex items-center gap-2 ${
            isPlaying ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
          }`}
        >
          {isPlaying ? (
            <><div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Simulating Flow</>
          ) : (
            <><Play className="w-3 h-3" /> Test Flow</>
          )}
        </button>
      </div>

    </div>
  );
}
