import { useState } from "react";

const THREADS = [
  { id: "1", title: "Best AI design tools 2026", active: false },
  { id: "2", title: "Neon Tokyo ad campaign", active: true },
  { id: "3", title: "Product launch video script", active: false },
  { id: "4", title: "Brand identity for fintech", active: false },
  { id: "5", title: "Storyboard: electric car", active: false },
];

const MODELS = [
  { id: "gpt",    label: "GPT-5 Terra",     badge: "OpenAI",    color: "from-emerald-500 to-teal-400",     dot: "#10b981" },
  { id: "claude", label: "Claude Sonnet",   badge: "Anthropic", color: "from-orange-400 to-amber-300",     dot: "#f97316" },
  { id: "gemini", label: "Gemini Flash",    badge: "Google",    color: "from-blue-500 to-cyan-400",        dot: "#3b82f6" },
  { id: "grok",   label: "Grok-3 Mini",     badge: "xAI",       color: "from-violet-500 to-purple-400",   dot: "#8b5cf6" },
];

const TOOLS = [
  { icon: "🔍", name: "web_search",      label: "Web Search",    active: false },
  { icon: "🖼", name: "generate_image",  label: "Image Gen",     active: true  },
  { icon: "🎬", name: "generate_video",  label: "Video Gen",     active: false },
  { icon: "📝", name: "generate_script", label: "Scriptwriter",  active: false },
  { icon: "🧠", name: "remember",        label: "Memory",        active: true  },
  { icon: "⚡", name: "calculate",       label: "Calculator",    active: false },
];

const MESSAGES = [
  { role: "user", text: "Create a cinematic storyboard for a Neon Tokyo ad campaign targeting Gen Z designers." },
  { role: "assistant", text: "I'll break this into 3 punchy scenes with reference images.\n\n**Scene 1 — The Arrival**\nA lone figure steps from a maglev train onto a rain-slicked platform. Neon kanji bleeds into puddles. Wide shot, anamorphic lens flare.\n\n**Scene 2 — The Workspace**\nClose-up on hands flying across a holographic design surface. UI glows violet. Camera rotates 90° in one continuous move.\n\n**Scene 3 — The Product Drop**\nThe device materialises from light particles in the centre of a crowd. Time-lapse of reactions. Smash cut to black." },
];

export default function AuraChatThreeColumn() {
  const [selected, setSelected] = useState("claude");
  const [input, setInput] = useState("");

  const activeModel = MODELS.find(m => m.id === selected)!;

  return (
    <div className="flex h-screen bg-[#070710] text-[#e8e8f0] font-sans overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Col 1: Thread list ──────────────────────────────── */}
      <aside className="w-[220px] flex-shrink-0 border-r border-white/[0.06] flex flex-col bg-[#0a0a16]">
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center text-[10px]">✦</div>
            <span className="font-semibold text-sm tracking-tight">Aura</span>
          </div>
          <button className="w-full text-left text-[11px] text-white/40 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 hover:bg-white/[0.07] transition-colors">
            + New conversation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <p className="px-4 py-1.5 text-[9px] uppercase tracking-widest text-white/25 font-semibold">Recents</p>
          {THREADS.map(t => (
            <button
              key={t.id}
              className={`w-full text-left px-4 py-2.5 text-[11px] truncate transition-colors ${
                t.active
                  ? "bg-white/[0.07] text-white border-r-2 border-violet-500"
                  : "text-white/40 hover:bg-white/[0.03] hover:text-white/60"
              }`}
            >{t.title}</button>
          ))}
        </div>
        <div className="p-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-[9px] font-bold">AJ</div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium truncate">alex@studio.io</p>
              <p className="text-[9px] text-white/30">Pro plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Col 2: Chat ─────────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <div className="h-11 flex items-center gap-3 px-5 border-b border-white/[0.06] bg-[#070710]/80 backdrop-blur-xl flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: activeModel.dot }} />
          <span className="text-[11px] text-white/40">Using <span className="text-white/70 font-medium">{activeModel.label}</span> · tools active</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {MESSAGES.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className={`mt-0.5 w-7 h-7 flex-shrink-0 rounded-full bg-gradient-to-tr ${activeModel.color} flex items-center justify-center text-[10px] font-bold text-white`}>A</div>
              )}
              <div className={`max-w-[78%] text-[13px] leading-relaxed ${
                msg.role === "user"
                  ? "bg-violet-600/80 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm"
                  : "text-white/80"
              }`}>
                {msg.text.split("\n").map((line, j) => (
                  <p key={j} className={line.startsWith("**") ? "font-semibold text-white mt-2" : "mt-0.5"}>
                    {line.replace(/\*\*/g, "")}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-white/[0.06]">
          <div className="flex items-end gap-2 bg-[#0e0e1c] border border-white/[0.08] rounded-2xl px-4 py-3 focus-within:border-violet-500/40 transition-colors">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask Aura anything…"
              rows={1}
              className="flex-1 bg-transparent resize-none text-[13px] text-white/80 placeholder-white/25 focus:outline-none leading-relaxed"
              style={{ minHeight: 22, maxHeight: 100 }}
            />
            <button
              disabled={!input.trim()}
              className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                input.trim() ? "bg-white text-black shadow-lg" : "bg-white/10 text-white/30"
              }`}
            >↑</button>
          </div>
          <p className="text-center text-[9px] text-white/20 mt-2">Enter to send · Shift+Enter for new line</p>
        </div>
      </main>

      {/* ── Col 3: Model + Tools panel ──────────────────────── */}
      <aside className="w-[230px] flex-shrink-0 border-l border-white/[0.06] flex flex-col bg-[#0a0a16] overflow-y-auto">
        {/* Model picker */}
        <div className="p-4 border-b border-white/[0.06]">
          <p className="text-[9px] uppercase tracking-widest text-white/30 font-semibold mb-3">Brain</p>
          <div className="space-y-1.5">
            {MODELS.map(m => (
              <button
                key={m.id}
                onClick={() => setSelected(m.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  selected === m.id
                    ? "bg-white/[0.08] border border-white/[0.14]"
                    : "hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                <div className={`w-7 h-7 flex-shrink-0 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center text-[10px] font-bold text-white`}>
                  {m.id === "gpt" ? "G" : m.id === "claude" ? "C" : m.id === "gemini" ? "G" : "X"}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium truncate">{m.label}</p>
                  <p className="text-[9px] text-white/35">{m.badge}</p>
                </div>
                {selected === m.id && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tools */}
        <div className="p-4 border-b border-white/[0.06]">
          <p className="text-[9px] uppercase tracking-widest text-white/30 font-semibold mb-3">Tools</p>
          <div className="space-y-1">
            {TOOLS.map(t => (
              <div key={t.name} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.04]">
                <span className="text-sm leading-none">{t.icon}</span>
                <span className="text-[11px] text-white/60 flex-1">{t.label}</span>
                <div className={`w-7 h-4 rounded-full flex items-center transition-colors ${t.active ? "bg-violet-600 justify-end" : "bg-white/10 justify-start"}`}>
                  <div className="w-3 h-3 rounded-full bg-white mx-0.5" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Memory */}
        <div className="p-4">
          <p className="text-[9px] uppercase tracking-widest text-white/30 font-semibold mb-3">Memory</p>
          <div className="space-y-1.5">
            {["Uses TanStack + Tailwind", "Founder, ships premium products", "Prefers dark UI"].map(m => (
              <div key={m} className="flex items-start gap-1.5 text-[10px] text-white/40">
                <span className="mt-0.5 flex-shrink-0 text-violet-400/70">·</span>
                <span>{m}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
