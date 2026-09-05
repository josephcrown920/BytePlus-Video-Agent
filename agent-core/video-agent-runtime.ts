/** Runtime seam: memory + skill routing + ModelArk + Cinematic/Viral Directing. */
import { buildGenerationContext, toPromptContext, type ProjectMemory } from "../project-memory/core";
import { selectVideoSkills } from "./video-agent-skills";
import { resolvePresetForMode } from "./video-agent-presets";
import { streamModelArkChat, generateModelArkImage, generateModelArkVideo, hasModelArkKey } from "./modelark";
import type { VideoMode } from "./production";

export function prepareVideoRequest(r: {
  instruction: string;
  taskType: string;
  memory: ProjectMemory;
  preset?: string;
  mode?: VideoMode;
}) {
  const mode = r.mode ?? "standard";
  const c = buildGenerationContext(r.memory, r.taskType, r.instruction, mode);
  const modeDirectives =
    mode === "cinematic"
      ? "CINEMATIC MODE ACTIVE: Enforce 3-act beat breakdown, anamorphic/prime lens aesthetics, volumetric key lighting, and camera motion continuity."
      : mode === "viral"
      ? "VIRAL MODE ACTIVE: Enforce 1.5s thumb-stop hook, rapid pacing cuts, bold pop captions, and faceless visual overlay structure."
      : "STANDARD MODE ACTIVE: Balanced storyboard to timeline composition.";

  return {
    ...r,
    mode,
    context: c,
    skills: selectVideoSkills(r.instruction, mode),
    preset: r.preset ? resolvePresetForMode(r.preset, mode) : resolvePresetForMode("", mode),
    system: `Aurora Autonomous Video Director [Mode: ${mode.toUpperCase()}].\n${modeDirectives}\nHard locks > authoritative refs > acceptance > approved memory > user request. Prefer targeted revisions.\n${toPromptContext(c)}`,
    modelArkAvailable: hasModelArkKey(),
  };
}

export async function* streamVideoRequest(r: {
  instruction: string;
  taskType: string;
  memory: ProjectMemory;
  preset?: string;
  mode?: VideoMode;
  model?: string;
}) {
  const p = prepareVideoRequest(r);
  yield { type: "start", provider: "modelark", mode: p.mode };
  for await (const text of streamModelArkChat({
    model: r.model,
    messages: [
      { role: "system", content: p.system },
      { role: "user", content: r.instruction },
    ],
  }))
    yield { type: "delta", text };
  yield { type: "done" };
}

export const generateReference = generateModelArkImage;
export const generateShot = generateModelArkVideo;

