import { createLazyFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Download, Film, Loader2, Plus, Trash2, Wand2,
  CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Eye, Pencil, Play,
  Sparkles, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { videoAgentStore, vaUid, type VideoProject, type VideoScene } from "@/lib/video-agent-store";

type HeyGenState = "idle" | "starting" | "polling" | "done" | "error";

type HeyGenAvatar = {
  id: string;
  avatar_name: string;
  preview_image_url?: string;
  gender?: string;
};

type HeyGenVoice = {
  voice_id: string;
  name: string;
  language?: string;
  gender?: string;
  preview_audio?: string;
};

export const Route = createLazyFileRoute("/video-agent-edit")({
  component: VideoEditor,
});

function VideoEditor() {
  const { id } = useSearch({ from: "/video-agent-edit" });
  const navigate = useNavigate();
  const [project, setProject] = useState<VideoProject | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview");
  const [exporting, setExporting] = useState(false);
  const [regenId, setRegenId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── HeyGen state ─────────────────────────────────────────────────────────
  const [heygenAvailable, setHeygenAvailable] = useState(false);
  const [heygenState, setHeygenState] = useState<HeyGenState>("idle");
  const [heygenSessionId, setHeygenSessionId] = useState<string | null>(null);
  const [heygenVideoUrl, setHeygenVideoUrl] = useState<string | null>(null);
  const [heygenError, setHeygenError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Avatar & voice picker
  const [avatars, setAvatars] = useState<HeyGenAvatar[]>([]);
  const [voices, setVoices] = useState<HeyGenVoice[]>([]);
  const [avatarsLoading, setAvatarsLoading] = useState(false);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);

  useEffect(() => {
    const p = videoAgentStore.get(id);
    if (p) {
      setProject(p);
      // Restore any previously-completed HeyGen video
      if (p.exportUrl) {
        setHeygenVideoUrl(p.exportUrl);
        setHeygenState("done");
      }
      if (p.heygenAvatarId) setSelectedAvatarId(p.heygenAvatarId);
      if (p.heygenVoiceId)  setSelectedVoiceId(p.heygenVoiceId);
    }
  }, [id]);

  // Check HeyGen API key availability once on mount
  useEffect(() => {
    fetch("/api/video-agent/heygen-available")
      .then((r) => r.json() as Promise<{ available: boolean }>)
      .then(({ available }) => setHeygenAvailable(available))
      .catch(() => {});
  }, []);

  // Fetch avatar looks + voices whenever HeyGen becomes available
  useEffect(() => {
    if (!heygenAvailable) return;

    let cancelled = false;

    const loadCatalogs = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? "";
      const authHeaders: Record<string, string> = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      setAvatarsLoading(true);
      setVoicesLoading(true);

      await Promise.all([
        fetch("/api/video-agent/avatars", { headers: authHeaders })
          .then((r) => {
            if (!r.ok) throw new Error(`avatars ${r.status}`);
            return r.json() as Promise<{ avatars: HeyGenAvatar[] }>;
          })
          .then(({ avatars }) => { if (!cancelled) setAvatars(avatars.slice(0, 24)); })
          .catch(() => {})
          .finally(() => { if (!cancelled) setAvatarsLoading(false); }),

        fetch("/api/video-agent/voices", { headers: authHeaders })
          .then((r) => {
            if (!r.ok) throw new Error(`voices ${r.status}`);
            return r.json() as Promise<{ voices: HeyGenVoice[] }>;
          })
          .then(({ voices }) => { if (!cancelled) setVoices(voices.slice(0, 30)); })
          .catch(() => {})
          .finally(() => { if (!cancelled) setVoicesLoading(false); }),
      ]);
    };

    loadCatalogs();
    return () => { cancelled = true; };
  }, [heygenAvailable]);

  // Poll HeyGen session status while generating
  useEffect(() => {
    if (heygenState !== "polling" || !heygenSessionId) return;

    const doPoll = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token ?? "";
        const res = await fetch(`/api/video-agent/heygen-status/${heygenSessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return; // retry next tick

        const payload = (await res.json()) as {
          status: string;
          videoUrl?: string;
          thumbnailUrl?: string;
          error?: string;
        };

        if (payload.status === "completed" && payload.videoUrl) {
          clearInterval(pollRef.current!);
          setHeygenVideoUrl(payload.videoUrl);
          setHeygenState("done");
          videoAgentStore.update(id, {
            exportUrl: payload.videoUrl,
            thumbnailUrl: payload.thumbnailUrl ?? null,
            status: "exported",
          });
          refresh();
          toast.success("HeyGen video is ready!");
        } else if (payload.status === "failed") {
          clearInterval(pollRef.current!);
          setHeygenError(payload.error ?? "Generation failed");
          setHeygenState("error");
          toast.error(`HeyGen failed: ${payload.error ?? "unknown error"}`);
        }
        // else still processing — keep polling
      } catch {
        // network hiccup — retry next tick
      }
    };

    doPoll(); // immediate first check
    pollRef.current = setInterval(doPoll, 6_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [heygenState, heygenSessionId, id]);

  function refresh() {
    const p = videoAgentStore.get(id);
    if (p) setProject(p);
  }

  function updateScene(sceneId: string, patch: Partial<VideoScene>) {
    const updated = videoAgentStore.updateScene(id, sceneId, patch);
    if (updated) setProject({ ...updated });
  }

  function updateTitle(title: string) {
    const updated = videoAgentStore.update(id, { title });
    if (updated) setProject({ ...updated });
  }

  function addScene() {
    const p = videoAgentStore.get(id);
    if (!p) return;
    const newScene: VideoScene = {
      id: vaUid(),
      index: p.scenes.length,
      title: `Scene ${p.scenes.length + 1}`,
      script: "",
      description: "",
      duration: 5,
      frame: null,
      frameStatus: "idle",
      voiceoverStatus: "idle",
    };
    const updated = videoAgentStore.update(id, { scenes: [...p.scenes, newScene] });
    if (updated) {
      setProject({ ...updated });
      setSelectedIdx(updated.scenes.length - 1);
    }
  }

  function removeScene(sceneId: string) {
    const p = videoAgentStore.get(id);
    if (!p) return;
    if (p.scenes.length <= 1) { toast.error("A video needs at least one scene"); return; }
    const updated = videoAgentStore.update(id, {
      scenes: p.scenes.filter((s) => s.id !== sceneId),
    });
    if (updated) {
      setProject({ ...updated });
      setSelectedIdx(Math.max(0, selectedIdx - 1));
    }
  }

  // ── Avatar / voice selection handlers ────────────────────────────────────────
  function handleSelectAvatar(avatarId: string | null) {
    setSelectedAvatarId(avatarId);
    videoAgentStore.update(id, { heygenAvatarId: avatarId });
  }

  function handleSelectVoice(voiceId: string | null) {
    setSelectedVoiceId(voiceId);
    videoAgentStore.update(id, { heygenVoiceId: voiceId });
  }

  // ── HeyGen generation handler ──────────────────────────────────────────────
  async function handleGenerateWithHeyGen() {
    if (!project) return;
    if (heygenState === "starting" || heygenState === "polling") return;

    setHeygenState("starting");
    setHeygenError(null);
    setHeygenVideoUrl(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      if (!token) throw new Error("Not signed in — please sign in and try again");

      const res = await fetch("/api/video-agent/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: project.title,
          scenes: project.scenes.map((sc) => ({
            title: sc.title,
            script: sc.script,
            description: sc.description,
            duration: sc.duration,
          })),
          avatarId: selectedAvatarId ?? undefined,
          voiceId: selectedVoiceId ?? undefined,
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Server error (${res.status})`);
      }

      const { sessionId } = (await res.json()) as { sessionId: string };
      setHeygenSessionId(sessionId);
      setHeygenState("polling");
      toast.success("HeyGen is generating your video — this typically takes 2–5 minutes.");
    } catch (err) {
      const msg = (err as Error).message;
      setHeygenError(msg);
      setHeygenState("error");
      toast.error(msg);
    }
  }

  async function regenFrame(scene: VideoScene) {
    if (!scene.description.trim()) { toast.error("Add a visual description first"); return; }
    setRegenId(scene.id);
    abortRef.current = new AbortController();
    updateScene(scene.id, { frameStatus: "loading" });

    const styleHints: Record<string, string> = {
      cinematic: "cinematic anamorphic, 35mm film grain",
      minimal: "clean minimal, soft light",
      vibrant: "vibrant, bold, energetic",
      documentary: "natural light, candid",
    };
    const styleHint = styleHints[project?.style ?? "cinematic"] ?? "cinematic";

    try {
      const frameRes = await fetch("/api/video-agent/generate-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: `${scene.description}. Style: ${styleHint}. Cinematic keyframe.` }),
        signal: abortRef.current.signal,
      });
      if (!frameRes.ok) throw new Error(`Frame generation failed: ${frameRes.status}`);
      const { url } = (await frameRes.json()) as { url: string };
      updateScene(scene.id, { frame: url, frameStatus: "done" });
      toast.success("Frame regenerated");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error((err as Error).message);
        updateScene(scene.id, { frameStatus: "error" });
      }
    } finally {
      setRegenId(null);
      refresh();
    }
  }

  async function handleExport() {
    setExporting(true);
    await delay(1800);
    videoAgentStore.update(id, { status: "exported" });
    refresh();
    setExporting(false);
    toast.success("Scenes exported! Use Lip Sync or Motion Control to render the final video.");
  }

  if (!project) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass rounded-xl p-10 text-center max-w-sm">
          <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">Project not found</h2>
          <Button className="mt-5" onClick={() => navigate({ to: "/video-agent" })}>
            Create new video
          </Button>
        </div>
      </div>
    );
  }

  const selectedScene = project.scenes[selectedIdx];

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center gap-3 h-11 px-4 border-b border-border/50 glass flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/video-agent" })}
          className="gap-1 text-muted-foreground h-7 px-2 text-xs"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Video Agent
        </Button>
        <div className="w-px h-4 bg-border" />
        <Input
          value={project.title}
          onChange={(e) => updateTitle(e.target.value)}
          className="h-7 w-52 text-sm font-medium glass border-transparent focus:border-border"
        />
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground hidden sm:block">{project.scenes.length} scenes</span>
        <div className="w-px h-4 bg-border hidden sm:block" />
        <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Export
        </Button>
      </div>

      {/* Scene strip / storyboard */}
      <div className="flex-shrink-0 border-b border-border/50 bg-background/60 px-4 py-2.5">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {project.scenes.map((sc, i) => (
            <button
              key={sc.id}
              onClick={() => setSelectedIdx(i)}
              aria-label={`Scene ${i + 1}: ${sc.title}`}
              className={`flex-shrink-0 relative rounded-md overflow-hidden transition-all border ${
                i === selectedIdx
                  ? "border-primary ring-1 ring-primary/60"
                  : "border-border/40 hover:border-border/80 opacity-60 hover:opacity-100"
              }`}
              style={{ width: `${Math.max(72, sc.duration * 12)}px` }}
            >
              <div className="aspect-video bg-muted/30 relative">
                {sc.frame ? (
                  <img src={sc.frame} alt={sc.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    {sc.frameStatus === "loading" ? (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    ) : (
                      <Film className="h-3 w-3 text-muted-foreground/30" />
                    )}
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-1 pb-0.5">
                  <div className="text-[8px] text-white/80 truncate">{sc.title}</div>
                </div>
                {sc.frameStatus === "done" && (
                  <CheckCircle2 className="absolute top-0.5 right-0.5 h-2.5 w-2.5 text-primary" />
                )}
              </div>
            </button>
          ))}
          <button
            onClick={addScene}
            className="flex-shrink-0 w-14 aspect-video rounded-md border border-dashed border-border/50 hover:border-primary/50 flex items-center justify-center transition"
            aria-label="Add scene"
          >
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Main editor */}
      {selectedScene ? (
        <div className="flex-1 min-h-0 grid lg:grid-cols-[1fr_340px] overflow-hidden">
          {/* Preview panel */}
          <div className="relative flex flex-col min-h-0 bg-background/20 p-4 gap-3">
            <div className="flex gap-1 self-start">
              {(["preview", "edit"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                    activeTab === tab
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "preview" ? <Eye className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 glass rounded-xl overflow-hidden relative">
              {selectedScene.frame ? (
                <img
                  src={selectedScene.frame}
                  alt={selectedScene.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Film className="h-10 w-10 opacity-20" />
                  <span className="text-xs">No frame yet — describe the scene and regenerate</span>
                </div>
              )}

              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur">
                  <Play className="h-5 w-5 text-white" />
                </div>
              </div>

              <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between">
                <Button size="sm" variant="secondary" className="h-7 w-7 p-0 glass"
                  disabled={selectedIdx === 0} onClick={() => setSelectedIdx(selectedIdx - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs glass px-2 py-0.5 rounded">
                  {selectedIdx + 1} / {project.scenes.length}
                </span>
                <Button size="sm" variant="secondary" className="h-7 w-7 p-0 glass"
                  disabled={selectedIdx === project.scenes.length - 1}
                  onClick={() => setSelectedIdx(selectedIdx + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Scene edit panel */}
          <div className="border-l border-border/50 flex flex-col overflow-y-auto">
            <div className="flex-1 p-4 space-y-5">
              <div className="flex items-center gap-2">
                <Input
                  value={selectedScene.title}
                  onChange={(e) => updateScene(selectedScene.id, { title: e.target.value })}
                  className="font-medium glass text-sm"
                  placeholder="Scene title"
                />
                <Button size="sm" variant="ghost"
                  className="text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => removeScene(selectedScene.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
                  Voice-over
                </label>
                <Textarea
                  value={selectedScene.script}
                  onChange={(e) => updateScene(selectedScene.id, { script: e.target.value })}
                  placeholder="What the narrator says in this scene…"
                  className="h-24 resize-none glass text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
                  What the camera sees
                </label>
                <Textarea
                  value={selectedScene.description}
                  onChange={(e) => updateScene(selectedScene.id, { description: e.target.value })}
                  placeholder="Describe the shot: subject, setting, lighting, motion…"
                  className="h-20 resize-none glass text-sm"
                />
                <Button size="sm" variant="secondary" className="mt-2 w-full gap-1.5 text-xs"
                  onClick={() => regenFrame(selectedScene)} disabled={regenId === selectedScene.id}>
                  {regenId === selectedScene.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5" />
                  )}
                  Regenerate frame
                </Button>
              </div>
            </div>

            {/* Avatar & voice picker */}
            {heygenAvailable && (
              <div className="mx-4 mb-2">
                <button
                  onClick={() => setPickerOpen((o) => !o)}
                  className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground py-1.5 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary/60" />
                    Customize avatar &amp; voice
                    {(selectedAvatarId || selectedVoiceId) && (
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] text-white">✓</span>
                    )}
                  </span>
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${pickerOpen ? "rotate-90" : ""}`} />
                </button>

                {pickerOpen && (
                  <div className="mt-1.5 space-y-3 rounded-xl border border-border/50 bg-muted/20 p-3">
                    {/* Avatar grid */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Avatar</label>
                        {selectedAvatarId && (
                          <button onClick={() => handleSelectAvatar(null)}
                            className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
                        )}
                      </div>
                      {avatarsLoading ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" /> Loading avatars…
                        </div>
                      ) : avatars.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No avatars available</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
                          {avatars.map((av) => (
                            <button
                              key={av.id}
                              onClick={() => handleSelectAvatar(av.id === selectedAvatarId ? null : av.id)}
                              title={av.avatar_name}
                              className={`relative rounded-lg overflow-hidden border transition-all ${
                                av.id === selectedAvatarId
                                  ? "border-primary ring-1 ring-primary/50"
                                  : "border-border/40 opacity-70 hover:opacity-100 hover:border-border"
                              }`}
                            >
                              {av.preview_image_url ? (
                                <img src={av.preview_image_url} alt={av.avatar_name}
                                  className="w-full aspect-square object-cover" />
                              ) : (
                                <div className="w-full aspect-square bg-muted/50 flex items-center justify-center">
                                  <span className="text-[10px] text-muted-foreground">{av.avatar_name.slice(0, 2)}</span>
                                </div>
                              )}
                              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-1 pb-0.5">
                                <span className="text-[8px] text-white/90 truncate block">{av.avatar_name}</span>
                              </div>
                              {av.id === selectedAvatarId && (
                                <CheckCircle2 className="absolute top-0.5 right-0.5 h-3 w-3 text-primary drop-shadow" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Voice list */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Voice</label>
                        {selectedVoiceId && (
                          <button onClick={() => handleSelectVoice(null)}
                            className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
                        )}
                      </div>
                      {voicesLoading ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" /> Loading voices…
                        </div>
                      ) : voices.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No voices available</p>
                      ) : (
                        <div className="space-y-0.5 max-h-36 overflow-y-auto pr-0.5">
                          {voices.map((v) => (
                            <button
                              key={v.voice_id}
                              onClick={() => handleSelectVoice(v.voice_id === selectedVoiceId ? null : v.voice_id)}
                              className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                                v.voice_id === selectedVoiceId
                                  ? "bg-primary/15 text-primary"
                                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                              }`}
                            >
                              <span className="flex-1 text-left truncate">{v.name}</span>
                              {v.gender && (
                                <span className="text-[9px] uppercase opacity-40 flex-shrink-0">
                                  {v.gender.slice(0, 1)}
                                </span>
                              )}
                              {v.preview_audio && (
                                <a href={v.preview_audio} target="_blank" rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  title="Preview voice"
                                  className="flex-shrink-0 text-muted-foreground hover:text-primary">
                                  <Play className="h-3 w-3" />
                                </a>
                              )}
                              {v.voice_id === selectedVoiceId && (
                                <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* HeyGen video result */}
            {heygenState === "done" && heygenVideoUrl && (
              <div className="mx-4 mb-3 rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> HeyGen Video Ready
                </div>
                <video
                  src={heygenVideoUrl}
                  controls
                  className="w-full rounded-lg border border-border/50"
                />
                <a
                  href={heygenVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary"
                >
                  <ExternalLink className="h-3 w-3" /> Open in new tab
                </a>
              </div>
            )}

            {heygenState === "error" && heygenError && (
              <div className="mx-4 mb-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                {heygenError}
              </div>
            )}

            <div className="border-t border-border/50 p-3 flex gap-2 flex-wrap">
              <Button size="sm" variant="secondary" className="flex-1 gap-1.5 text-xs"
                onClick={() => navigate({ to: "/video-agent" })}>
                New video
              </Button>
              <Button size="sm" className="flex-1 gap-1.5 text-xs"
                onClick={handleExport} disabled={exporting}>
                {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Export
              </Button>
              {heygenAvailable && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
                  onClick={handleGenerateWithHeyGen}
                  disabled={heygenState === "starting" || heygenState === "polling"}
                >
                  {heygenState === "starting" || heygenState === "polling" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {heygenState === "starting"
                    ? "Starting HeyGen…"
                    : heygenState === "polling"
                    ? "Generating with HeyGen…"
                    : heygenState === "done"
                    ? "Regenerate with HeyGen"
                    : "Generate with HeyGen"}
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Film className="mx-auto h-8 w-8 opacity-20 mb-3" />
            <p className="text-sm">No scenes yet — add one to get started.</p>
            <Button className="mt-4 gap-1.5" onClick={addScene}>
              <Plus className="h-4 w-4" /> Add scene
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
