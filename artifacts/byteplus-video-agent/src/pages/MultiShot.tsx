import { useState } from "react";
import { ArrowDown, ArrowUp, Copy, Download, ImageIcon, ListVideo, Plus, Trash2, Video, Wand2 } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const ratios = ["16:9", "9:16", "1:1"].map(value => ({ label: value, value }));
const cameras = ["static", "pan_right", "pan_left", "zoom_in", "zoom_out"].map(value => ({ label: value.replace("_", " "), value }));

export default function MultiShot() {
  const workspace = useWorkspace();
  const { activeProject } = workspace;
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState(activeProject.shots[0]?.id ?? "");
  const duration = activeProject.shots.reduce((sum, shot) => sum + shot.duration, 0);

  const savePlan = () => {
    const ready = activeProject.shots.filter(shot => shot.prompt.trim());
    if (!ready.length) {
      toast({ title: "Add a shot prompt first", variant: "destructive" });
      return;
    }
    workspace.addTask({
      type: "multi-shot",
      prompt: `${activeProject.name}: ${ready.length}-shot production plan`,
      metadata: {
        projectName: activeProject.name,
        duration: `${duration}s`,
        ratio: ready[0].ratio,
        shots: ready.map(shot => ({ ...shot })),
      },
    });
    ready.forEach(shot => workspace.updateShot(shot.id, { status: "requires_api" }));
    toast({ title: "Offline batch plan saved", description: "Connect a server-side BytePlus API later to execute it.", variant: "api" });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 flex-col gap-3 border-b border-border bg-card/30 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <ListVideo className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <h1 className="truncate font-semibold">{activeProject.name}</h1>
            <p className="text-sm text-muted-foreground">{activeProject.shots.length} shots · {duration}s · Autosaved locally</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="min-h-11 flex-1 gap-2 lg:flex-none" onClick={() => workspace.addShot("image")}><ImageIcon className="h-4 w-4" /> Image</Button>
          <Button variant="outline" className="min-h-11 flex-1 gap-2 lg:flex-none" onClick={() => workspace.addShot("video")}><Video className="h-4 w-4" /> Video</Button>
          <Button variant="outline" className="min-h-11 gap-2" onClick={() => workspace.exportProject(activeProject.id)}><Download className="h-4 w-4" /> Export</Button>
          <Button variant="cinematic" className="min-h-11 gap-2" onClick={savePlan}><Wand2 className="h-4 w-4" /> Save batch plan</Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <section aria-label="Sequence timeline" className="border-b border-border bg-black/40 p-4 md:p-6">
          <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground"><span>Visual sequence</span><span>{duration}s total</span></div>
          <div className="flex min-h-28 gap-2 overflow-x-auto pb-2">
            {activeProject.shots.map((shot, index) => (
              <button key={shot.id} onClick={() => setSelectedId(shot.id)} className={`min-w-36 flex-1 rounded-md border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selectedId === shot.id ? "border-primary bg-primary/15" : "border-border bg-card/50"}`}>
                <span className="text-xs text-muted-foreground">SHOT {index + 1} · {shot.duration}s</span>
                <span className="mt-8 block truncate text-sm font-medium">{shot.prompt || "Untitled shot"}</span>
                <Badge variant={shot.status === "requires_api" ? "warning" : "secondary"} className="mt-2">{shot.status.replace("_", " ")}</Badge>
              </button>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl space-y-4 p-4 md:p-6" aria-label="Storyboard shot editor">
          {activeProject.shots.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <Plus className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h2 className="font-semibold">Start your sequence</h2><p className="mt-1 text-sm text-muted-foreground">Add an image or video shot above.</p>
            </div>
          )}
          {activeProject.shots.map((shot, index) => (
            <Card key={shot.id} className={`overflow-hidden border ${selectedId === shot.id ? "border-primary/70" : "border-border/60"}`}>
              <div className="grid md:grid-cols-[180px_1fr]">
                <button onClick={() => setSelectedId(shot.id)} className="relative min-h-40 border-b border-border bg-black/50 p-4 text-left md:border-b-0 md:border-r">
                  <div className="absolute inset-0 cinematic-grid opacity-30" />
                  <div className="relative flex h-full flex-col justify-between">
                    <Badge variant="outline">Shot {index + 1}</Badge>
                    <div>{shot.type === "video" ? <Video className="h-8 w-8 text-primary" /> : <ImageIcon className="h-8 w-8 text-primary" />}<p className="mt-2 text-sm capitalize">{shot.type} frame</p></div>
                  </div>
                </button>
                <div className="space-y-4 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant={shot.status === "requires_api" ? "warning" : shot.prompt.trim() ? "success" : "secondary"}>{shot.prompt.trim() ? shot.status.replace("_", " ") : "needs prompt"}</Badge>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" aria-label={`Move shot ${index + 1} up`} disabled={index === 0} onClick={() => workspace.moveShot(shot.id, -1)}><ArrowUp className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" aria-label={`Move shot ${index + 1} down`} disabled={index === activeProject.shots.length - 1} onClick={() => workspace.moveShot(shot.id, 1)}><ArrowDown className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" aria-label={`Duplicate shot ${index + 1}`} onClick={() => workspace.duplicateShot(shot.id)}><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" aria-label={`Delete shot ${index + 1}`} onClick={() => workspace.removeShot(shot.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div><label htmlFor={`prompt-${shot.id}`} className="mb-2 block text-sm font-medium">Shot prompt</label><Textarea id={`prompt-${shot.id}`} value={shot.prompt} onChange={e => workspace.updateShot(shot.id, { prompt: e.target.value })} className="min-h-24 bg-black/30" placeholder="Describe this shot…" /></div>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <div><label htmlFor={`type-${shot.id}`} className="mb-2 block text-sm">Type</label><Select id={`type-${shot.id}`} options={[{label:"Image",value:"image"},{label:"Video",value:"video"}]} value={shot.type} onChange={e => workspace.updateShot(shot.id, { type: e.target.value as "image" | "video" })} /></div>
                    <div><label htmlFor={`duration-${shot.id}`} className="mb-2 block text-sm">Duration</label><Input id={`duration-${shot.id}`} type="number" min={1} max={30} value={shot.duration} onChange={e => workspace.updateShot(shot.id, { duration: Math.max(1, Number(e.target.value)) })} /></div>
                    <div><label htmlFor={`ratio-${shot.id}`} className="mb-2 block text-sm">Ratio</label><Select id={`ratio-${shot.id}`} options={ratios} value={shot.ratio} onChange={e => workspace.updateShot(shot.id, { ratio: e.target.value })} /></div>
                    <div><label htmlFor={`camera-${shot.id}`} className="mb-2 block text-sm">Camera</label><Select id={`camera-${shot.id}`} options={cameras} value={shot.camera} onChange={e => workspace.updateShot(shot.id, { camera: e.target.value })} /></div>
                  </div>
                  <div><label htmlFor={`notes-${shot.id}`} className="mb-2 block text-sm font-medium">Continuity notes</label><Input id={`notes-${shot.id}`} value={shot.continuityNotes} onChange={e => workspace.updateShot(shot.id, { continuityNotes: e.target.value })} placeholder="Wardrobe, lighting, prop, or character continuity…" /></div>
                </div>
              </div>
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}