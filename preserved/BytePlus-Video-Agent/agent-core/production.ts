export type Modality="video"|"image"|"voice"|"music"|"sfx"|"avatar"|"upscale";
export type Provider="fal"|"replicate"|"modelark"|"vast_comfyui"|"elevenlabs"|"heygen"|"ffmpeg";
export type VideoMode="cinematic"|"viral"|"standard";

export interface CinematicMetadata {
  beatIntent: string;
  cameraFraming: string;
  cameraMovement: string;
  lensStyle: string;
  lightingMood: string;
  continuityFocus?: string;
}

export interface ViralMetadata {
  hookType: string;
  pacingRhythm: string;
  subtitleStyle: string;
  facelessTemplate?: string;
  targetDurationSec?: number;
}

export interface ShotBeat {
  order: number;
  beatType: string;
  prompt: string;
  durationSec: number;
  camera?: string;
  motion?: string;
  transition?: string;
  captionText?: string;
}

export interface ShotPlan {
  mode: VideoMode;
  title: string;
  summary: string;
  totalDurationSec: number;
  aspectRatio: string;
  shots: ShotBeat[];
  recommendedPreset?: string;
}

export interface GenerationRequest {
  modality: Modality;
  prompt: string;
  negativePrompt?: string;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  references?: string[];
  identityReferences?: string[];
  camera?: string;
  motion?: string;
  preferredModel?: string;
  qualityBudget?: number;
  costBudget?: number;
  taskType?: string;
  mode?: VideoMode;
  cinematic?: CinematicMetadata;
  viral?: ViralMetadata;
}

export interface Candidate {
  id: string;
  provider: Provider;
  model: string;
  score: number;
  identity: number;
  promptFit: number;
  temporal: number;
  camera: number;
  anatomy: number;
  lighting: number;
  composition: number;
  status: "generated" | "approved" | "rejected";
  retryCount?: number;
  deliveryStatus?: "pending" | "rendering" | "qa_passed" | "delivered" | "failed_retryable";
}

export const DEFAULT_CHAIN: Provider[] = ["modelark", "fal", "replicate", "vast_comfyui"];

export const normalize = (r: GenerationRequest): GenerationRequest => ({
  ...r,
  mode: r.mode ?? "standard",
  duration: r.duration ?? (r.mode === "viral" ? 3 : 5),
  width: r.width ?? (r.mode === "viral" ? 1080 : 1920),
  height: r.height ?? (r.mode === "viral" ? 1920 : 1080),
  fps: r.fps ?? 24,
  references: r.references ?? [],
  identityReferences: r.identityReferences ?? [],
});

export function route(r: GenerationRequest, a: Set<Provider>, q: Record<string, number> = {}): Provider {
  const x = normalize(r);
  return DEFAULT_CHAIN.map((p) => {
    let scoreVal = a.has(p) ? 20 - (q[p] ?? 0) : -1;
    if (scoreVal >= 0) {
      if (p === "modelark") {
        scoreVal += (x.modality === "video" || x.modality === "image") ? 18 : 8;
        if (x.mode === "cinematic") scoreVal += 10;
        if (x.taskType?.includes("reason") || x.taskType?.includes("seedance") || x.taskType?.includes("seedream")) scoreVal += 30;
      }
      if (p === "fal" && x.mode === "viral") scoreVal += 12;
      if (p === "vast_comfyui" && x.identityReferences?.length) scoreVal += 30;
    }
    return { p, s: scoreVal };
  }).sort((u, v) => v.s - u.s)[0]?.p ?? "modelark";
}

export function score(c: Candidate, mode: VideoMode = "standard") {
  if (mode === "cinematic") {
    // Cinematic scoring prioritizes lighting, camera, composition, and temporal continuity
    c.score = Math.round(
      c.identity * 0.2 +
      c.promptFit * 0.15 +
      c.camera * 0.2 +
      c.lighting * 0.2 +
      c.composition * 0.15 +
      c.temporal * 0.1
    );
  } else if (mode === "viral") {
    // Viral scoring prioritizes prompt fit, temporal rhythm, and subject/anatomy appeal
    c.score = Math.round(
      c.promptFit * 0.35 +
      c.temporal * 0.25 +
      c.identity * 0.15 +
      c.anatomy * 0.15 +
      c.composition * 0.1
    );
  } else {
    c.score = Math.round(
      c.identity * 0.25 +
      c.promptFit * 0.2 +
      c.temporal * 0.15 +
      c.camera * 0.15 +
      c.anatomy * 0.1 +
      c.lighting * 0.1 +
      c.composition * 0.05
    );
  }
  return c;
}

export const hardFail = (c: Candidate) => c.identity < 40 || c.anatomy < 40 || c.temporal < 35;

export const selectWinner = (cs: Candidate[], mode: VideoMode = "standard") =>
  cs
    .map((c) => score(c, mode))
    .filter((c) => !hardFail(c) && c.status !== "rejected")
    .sort((a, b) => b.score - a.score)[0] ?? null;

export type Edit = {
  type: "trim" | "split" | "reorder" | "replace_shot" | "regenerate_shot" | "caption" | "voice" | "music" | "reframe";
  reason: string;
  value?: string | number;
};

export function compileEdit(command: string): Edit[] {
  const c = command.toLowerCase(),
    o: Edit[] = [];
  if (/remove|delete|cut/.test(c)) o.push({ type: "trim", reason: command });
  if (/replace|swap/.test(c)) o.push({ type: "replace_shot", reason: command });
  if (/regenerate|redo/.test(c)) o.push({ type: "regenerate_shot", reason: command });
  if (/vertical|9:16|reframe/.test(c)) o.push({ type: "reframe", value: "9:16", reason: command });
  if (/caption|subtitle/.test(c)) o.push({ type: "caption", reason: command });
  if (/voice|narration/.test(c)) o.push({ type: "voice", reason: command });
  if (/music|soundtrack/.test(c)) o.push({ type: "music", reason: command });
  return o;
}

export const campaignVariants = (id: string) => [
  { id: `${id}:16x9`, format: "16:9" },
  { id: `${id}:9x16`, format: "9:16" },
  { id: `${id}:1x1`, format: "1:1" },
  { id: `${id}:4x5`, format: "4:5" },
  { id: `${id}:thumbnail`, format: "thumbnail" },
];

export const acceptanceGate = (x: {
  providerReady: boolean;
  jobObserved: boolean;
  qaPassed: boolean;
  renderVerified: boolean;
}) => Object.values(x).every(Boolean);

export function generateModePlan(mode: VideoMode, instruction: string): ShotPlan {
  if (mode === "cinematic") {
    return {
      mode: "cinematic",
      title: "Cinematic Sequence Plan",
      summary: `Structured multi-beat cinematic story: ${instruction}`,
      totalDurationSec: 15,
      aspectRatio: "16:9",
      recommendedPreset: "slow_push_in",
      shots: [
        {
          order: 1,
          beatType: "Establishing Atmosphere",
          prompt: `Cinematic wide shot establishing context for: ${instruction}`,
          durationSec: 5,
          camera: "Slow Push In",
          motion: "Subtle atmospheric movement, 24fps",
          transition: "Dissolve",
        },
        {
          order: 2,
          beatType: "Character / Focus Beat",
          prompt: `Medium close-up portrait shot, rich key lighting, anamorphic lens flare for: ${instruction}`,
          durationSec: 5,
          camera: "Parallax Tracking",
          motion: "Emotional performance beat",
          transition: "Match Cut",
        },
        {
          order: 3,
          beatType: "Climax / Key Reveal",
          prompt: `Dramatic low-angle tracking shot, high volumetric depth for: ${instruction}`,
          durationSec: 5,
          camera: "Vertigo Zoom / Crane Rise",
          motion: "Peak action or emotional resonance",
          transition: "Fade to Black",
        },
      ],
    };
  }

  if (mode === "viral") {
    return {
      mode: "viral",
      title: "Viral Short-Form Plan",
      summary: `Hook-first fast-paced viral video: ${instruction}`,
      totalDurationSec: 9,
      aspectRatio: "9:16",
      recommendedPreset: "BOOT DOMINANCE",
      shots: [
        {
          order: 1,
          beatType: "Thumb-Stop Hook",
          prompt: `High energy visual shock hook for: ${instruction}`,
          durationSec: 2,
          camera: "Dynamic Whip Zoom",
          motion: "Fast speed ramp",
          transition: "Glitch Cut",
          captionText: "STOP SCROLLING! 🚨",
        },
        {
          order: 2,
          beatType: "Core Value / Pacing Beat",
          prompt: `Faceless trending B-roll illustration of: ${instruction}`,
          durationSec: 4,
          camera: "Rapid Pan",
          motion: "Punchy movement",
          transition: "Zoom Flash",
          captionText: "Here is what you need to know...",
        },
        {
          order: 3,
          beatType: "Call To Action",
          prompt: `High contrast bold graphic call-to-action for: ${instruction}`,
          durationSec: 3,
          camera: "Center Punch Zoom",
          motion: "Text pop animation",
          transition: "Snap",
          captionText: "Follow for more 💥",
        },
      ],
    };
  }

  return {
    mode: "standard",
    title: "Standard Storyboard Plan",
    summary: instruction,
    totalDurationSec: 10,
    aspectRatio: "16:9",
    shots: [
      {
        order: 1,
        beatType: "Opening Scene",
        prompt: `Opening shot: ${instruction}`,
        durationSec: 5,
        camera: "Pan Right",
        transition: "Dissolve",
      },
      {
        order: 2,
        beatType: "Main Scene",
        prompt: `Continuation shot: ${instruction}`,
        durationSec: 5,
        camera: "Static",
        transition: "Cut",
      },
    ],
  };
}

export function evaluateRetryAndDelivery(candidate: Candidate, maxRetries = 3) {
  const currentRetries = candidate.retryCount ?? 0;
  const isFailed = hardFail(candidate);

  if (isFailed && currentRetries < maxRetries) {
    return {
      shouldRetry: true,
      nextAttempt: currentRetries + 1,
      status: "failed_retryable" as const,
      reason: `Quality score low (identity: ${candidate.identity}, anatomy: ${candidate.anatomy}, temporal: ${candidate.temporal}). Scheduling retry attempt ${currentRetries + 1}/${maxRetries}.`,
    };
  }

  if (isFailed) {
    return {
      shouldRetry: false,
      nextAttempt: currentRetries,
      status: "rejected" as const,
      reason: `Exceeded maximum retry limit (${maxRetries}). Candidate rejected.`,
    };
  }

  return {
    shouldRetry: false,
    nextAttempt: currentRetries,
    status: candidate.score >= 70 ? ("delivered" as const) : ("qa_passed" as const),
    reason: candidate.score >= 70 ? "Passed QA with high score and marked ready for delivery." : "Passed acceptance gate.",
  };
}