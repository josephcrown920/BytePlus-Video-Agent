import { useMemo, useState } from "react";
import { Check, Layers3, ScanFace, Sparkles } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type BoardMode = "layers" | "character" | "angles" | "moodboard" | "storyboard";

const base = import.meta.env.BASE_URL;
const image = (filename: string) => `${base}references/${filename}`;
const references = {
  character: image("IMG_4236_2_1787834811633.webp"),
  characterAlt: image("IMG_2452_1787834811633.webp"),
  angles: image("IMG_2365_1787834811633.webp"),
  angleProfile: image("IMG_2366_1787834811633.webp"),
  hero: image("IMG_2004_1787834811633.webp"),
  layersPanel: image("IMG_2005_1787834811633.webp"),
  story: image("IMG_2012_1787834811633.webp"),
  mood: image("IMG_1935_1787834811634.webp"),
  moodAlt: image("IMG_1931_1787834811634.webp"),
  storyboard: image("IMG_1929_1787834811634.webp"),
  videoBoard: image("IMG_2069_1787834811633.webp"),
};

const modes: { id: BoardMode; label: string; short: string }[] = [
  { id: "layers", label: "Layers", short: "Decompose & direct" },
  { id: "character", label: "Character Sheet", short: "Lock identity" },
  { id: "angles", label: "Angles", short: "Front to profile" },
  { id: "moodboard", label: "Shot Moodboard", short: "Build the look" },
  { id: "storyboard", label: "Storyboard", short: "Sequence shots" },
];

export default function VisualBoards() {
  const { activeProject } = useWorkspace();
  const [mode, setMode] = useState<BoardMode>("layers");
  const [selectedLayers, setSelectedLayers] = useState(["Subject", "Wardrobe"]);
  const [angle, setAngle] = useState("Profile");
  const moodImages = useMemo(() => [references.hero, references.mood, references.moodAlt, references.story, references.videoBoard, references.angleProfile], []);

  const toggleLayer = (name: string) => setSelectedLayers(current => current.includes(name) ? current.filter(item => item !== name) : [...current, name]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#080a08] text-white">
      <header className="sticky top-0 z-20 border-b border-lime-300/15 bg-[#080a08]/95 px-4 py-4 backdrop-blur-xl md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="border border-lime-300/40 bg-lime-300/10 font-mono text-lime-300">VISUAL DEVELOPMENT</Badge>
            <h1 className="mt-3 text-3xl font-black uppercase tracking-[-0.05em] md:text-5xl">Build the world.<br /><span className="text-lime-300">Keep it consistent.</span></h1>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-white/60">Reference-led boards for {activeProject.name}. Every frame, angle, layer, and continuity choice stays visible before generation.</p>
        </div>
        <nav aria-label="Visual board modes" className="mx-auto mt-5 flex max-w-7xl gap-2 overflow-x-auto pb-1">
          {modes.map(item => (
            <button key={item.id} onClick={() => setMode(item.id)} className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300 ${mode === item.id ? "border-lime-300 bg-lime-300 text-black" : "border-white/15 bg-white/5 text-white/70 hover:border-lime-300/60"}`}>
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-8">
        {mode === "layers" && (
          <section>
            <BoardTitle eyebrow="01 / DECOMPOSE" title="One image. Every element." description="Turn a flat reference into a visual layer plan. Select what changes while everything else remains locked." />
            <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
              <div className="relative overflow-hidden rounded-[28px] border border-lime-300/40 bg-black">
                <img src={references.hero} alt="Two people sharing an ice cream, used as the source composition for layer planning" fetchPriority="high" decoding="async" className="h-full min-h-[520px] w-full object-cover" />
                <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/15 bg-black/80 p-3 backdrop-blur">
                  <p className="text-xs font-mono text-lime-300">ACTIVE EDIT</p>
                  <p className="mt-1 text-lg font-semibold">Change wardrobe. Preserve pose, light, and framing.</p>
                </div>
              </div>
              <div className="space-y-4">
                <Card className="overflow-hidden rounded-[28px] border-lime-300/25 bg-[#111410] p-5 text-white">
                  <div className="flex items-center justify-between"><div><p className="text-xs font-mono text-lime-300">LAYER STACK</p><h2 className="mt-1 text-2xl font-black">20+ editable elements</h2></div><Layers3 className="h-7 w-7 text-lime-300" /></div>
                  <div className="mt-5 space-y-2">
                    {["Subject", "Wardrobe", "Accessories", "Background", "Lighting", "Typography"].map((layer, index) => {
                      const selected = selectedLayers.includes(layer);
                      return <button key={layer} onClick={() => toggleLayer(layer)} className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left ${selected ? "border-lime-300 bg-lime-300/10" : "border-white/10 bg-white/[.03]"}`}>
                        <span className="font-mono text-xs text-white/40">{String(index + 1).padStart(2, "0")}</span><span className="flex-1 font-medium">{layer}</span>{selected && <Check className="h-4 w-4 text-lime-300" />}
                      </button>;
                    })}
                  </div>
                </Card>
                <img src={references.layersPanel} alt="Reference showing a dark layer decomposition interface with lime accents" loading="lazy" decoding="async" className="w-full rounded-[28px] border border-white/15" />
              </div>
            </div>
          </section>
        )}

        {mode === "character" && (
          <section>
            <BoardTitle eyebrow="02 / IDENTITY LOCK" title="One character. Every detail." description="Build a contact sheet that keeps face, wardrobe, accessories, and body details consistent across scenes." />
            <div className="grid gap-5 lg:grid-cols-[1fr_.72fr]">
              <img src={references.character} alt="Character reference sheet with front, back, profile, face, tattoo, and accessory details" loading="lazy" decoding="async" className="w-full rounded-[30px] border border-white/15 bg-white object-cover" />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
                <img src={references.characterAlt} alt="Illustrated character wardrobe and accessory sheet" loading="lazy" decoding="async" className="w-full rounded-[30px] border border-lime-300/25 bg-white" />
                <Card className="rounded-[30px] border-lime-300/25 bg-[#111410] p-6 text-white">
                  <ScanFace className="h-8 w-8 text-lime-300" />
                  <h2 className="mt-8 text-3xl font-black uppercase">Identity anchors</h2>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    {["Face detail", "Front view", "Back view", "Profile", "Wardrobe", "Accessories"].map(item => <div key={item} className="rounded-xl border border-white/10 bg-white/5 p-3">{item}</div>)}
                  </div>
                </Card>
              </div>
            </div>
          </section>
        )}

        {mode === "angles" && (
          <section>
            <BoardTitle eyebrow="03 / CAMERA COVERAGE" title="Choose the angle. Hold the identity." description="Map the views a sequence needs before writing motion. The chosen angle becomes a visible continuity instruction." />
            <div className="grid gap-5 lg:grid-cols-[.72fr_1fr]">
              <div className="space-y-5">
                <img src={references.angles} alt="Wardrobe, accessory, and portrait angle reference board" loading="lazy" decoding="async" className="w-full rounded-[30px] border border-white/20" />
                <div className="grid grid-cols-2 gap-2">
                  {["Front", "Three-quarter", "Profile", "Back"].map(item => <button key={item} onClick={() => setAngle(item)} className={`min-h-12 rounded-xl border px-3 font-semibold ${angle === item ? "border-lime-300 bg-lime-300 text-black" : "border-white/15 bg-white/5"}`}>{item}</button>)}
                </div>
              </div>
              <div className="relative overflow-hidden rounded-[30px] border border-lime-300/30 bg-black">
                <img src={references.angleProfile} alt="Black and white profile portrait demonstrating the selected profile angle" loading="lazy" decoding="async" className="h-full min-h-[620px] w-full object-cover" />
                <div className="absolute left-4 top-4 rounded-full bg-lime-300 px-4 py-2 text-sm font-black text-black">{angle.toUpperCase()} VIEW</div>
                <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/15 bg-black/80 p-5 backdrop-blur">
                  <p className="text-xs font-mono text-lime-300">SCENE CONTEXT</p>
                  <p className="mt-2 text-lg">A silhouette catches soft side light while wardrobe and facial identity remain locked.</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {mode === "moodboard" && (
          <section>
            <BoardTitle eyebrow="04 / LOOK DEVELOPMENT" title="Shots before prompts." description="Arrange visual references by color, lens, emotion, wardrobe, and movement so the sequence speaks before the production brief is read." />
            <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
              {moodImages.map((src, index) => (
                <figure key={src} className="group relative mb-4 break-inside-avoid overflow-hidden rounded-[24px] border border-white/15 bg-white/5">
                  <img src={src} alt={`Shot moodboard reference ${index + 1}`} loading="lazy" decoding="async" className="w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
                  <figcaption className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-xl bg-black/75 px-3 py-2 backdrop-blur">
                    <span className="text-xs font-mono">REF {String(index + 1).padStart(2, "0")}</span><Sparkles className="h-4 w-4 text-lime-300" />
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {mode === "storyboard" && (
          <section>
            <BoardTitle eyebrow="05 / SEQUENCE" title="See the cut before generation." description="Each project shot becomes a visual production card with framing, duration, prompt, and continuity context." />
            <div className="mb-5 overflow-hidden rounded-[28px] border border-lime-300/25">
              <img src={references.storyboard} alt="Editorial storyboard reference with multiple colorful scene panels" loading="lazy" decoding="async" className="max-h-[430px] w-full object-cover object-top" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activeProject.shots.map((shot, index) => (
                <Card key={shot.id} className="overflow-hidden rounded-[24px] border-white/15 bg-[#111410] text-white">
                  <div className="relative aspect-video overflow-hidden">
                    <img src={moodImages[index % moodImages.length]} alt={`Visual reference for shot ${index + 1}`} loading="lazy" decoding="async" className="h-full w-full object-cover opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                    <Badge className="absolute left-3 top-3 bg-lime-300 text-black">SHOT {String(index + 1).padStart(2, "0")}</Badge>
                    <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs">{shot.duration}s · {shot.ratio}</span>
                  </div>
                  <div className="p-5">
                    <p className="line-clamp-2 font-semibold">{shot.prompt || "Add a shot prompt in Multi-Shot"}</p>
                    <p className="mt-3 text-sm text-white/50">{shot.camera.replace("_", " ")} · {shot.continuityNotes || "No continuity note yet"}</p>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function BoardTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-7 grid gap-4 lg:grid-cols-[1fr_.6fr] lg:items-end">
      <div><p className="font-mono text-xs tracking-[.3em] text-lime-300">{eyebrow}</p><h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.045em] md:text-6xl">{title}</h2></div>
      <p className="border-l border-lime-300/40 pl-4 text-sm leading-relaxed text-white/60">{description}</p>
    </div>
  );
}