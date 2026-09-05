/** Installed video skill router: HeyGen + Chengfeng video-cut pack + Cinematic & Viral Engines. */
export const VIDEO_SKILLS = {
  "cinematic-director": [
    "beat breakdown",
    "camera framing & movement",
    "lens optics & depth of field",
    "volumetric lighting & mood",
    "continuity-aware color script",
  ],
  "viral-growth-engine": [
    "thumb-stop hook analysis",
    "fast-pacing rhythm cut",
    "faceless visual automation",
    "bold pop subtitle sync",
    "trending audio-visual pairing",
  ],
  "heygen-video": ["prompt-to-video", "interactive storyboard/revision", "styles/references", "assets", "batch"],
  "heygen-avatar": ["avatar looks", "digital twin", "photo avatar", "cinematic avatar", "audio-to-video", "lip-sync"],
  "heygen-translate": ["video translation", "voice cloning", "lip-sync", "proofread"],
  "chengfeng-cut": [
    "transcription",
    "word timing",
    "stutter/silence detection",
    "review",
    "targeted cut",
    "post-cut retranscription",
    "AI subtitle correction",
  ],
  "chengfeng-finished-video": [
    "semantic storyboard",
    "timeline preview",
    "HTML/SVG modules",
    "ratio-aware composition",
    "final MP4",
  ],
  "xiaohei-svg-motion": ["semantic SVG layers", "GSAP motion", "cue alignment", "static + motion review"],
  "chengfeng-self-evolution": ["feedback extraction", "methodology integration", "rule updates", "event logging"],
} as const;

export const VIDEO_SKILL_RULES = [
  "In Cinematic Mode, maintain strict character, lighting, and camera axis continuity across adjacent shots.",
  "In Viral Mode, hook the viewer within the first 1.5 seconds and enforce rapid visual pacing with bold kinetic captions.",
  "Never reuse original subtitles after a cut; retranscribe the cut video first.",
  "Keep high-risk deletions reviewable and preserve later repetitions when resolving duplicates.",
  "Prefer real source footage/screenshots when they are evidence; use animation for concepts.",
  "Preview and final render must share the same logical canvas.",
  "Do not auto-vectorize raster images into path soup; use semantic SVG groups.",
  "Durable feedback becomes an integrated rule, not a loose note.",
  "Provider keys remain server-only.",
];

export function selectVideoSkills(instruction: string, mode?: "cinematic" | "viral" | "standard") {
  const q = instruction.toLowerCase();
  const selected = new Set<string>();

  if (mode === "cinematic" || /cinematic|film|anamorphic|lens|lighting|movie|trailer/.test(q)) {
    selected.add("cinematic-director");
    selected.add("chengfeng-finished-video");
  }

  if (mode === "viral" || /viral|hook|tiktok|reel|short|faceless|caption|trending/.test(q)) {
    selected.add("viral-growth-engine");
    selected.add("chengfeng-cut");
  }

  Object.keys(VIDEO_SKILLS).forEach((id) => {
    if (q.includes(id.replaceAll("-", " ")) || (id === "chengfeng-cut" && /stutter|silence|subtitle|talking.?head/.test(q))) {
      selected.add(id);
    }
  });

  if (selected.size === 0) {
    selected.add("chengfeng-finished-video");
  }

  return Array.from(selected);
}

