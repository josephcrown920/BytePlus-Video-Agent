import { Router, type IRouter } from "express";

const router: IRouter = Router();

export type VideoMode = "cinematic" | "viral" | "standard";

function buildApiModePlan(mode: VideoMode, instruction: string) {
  if (mode === "cinematic") {
    return {
      mode,
      title: "Cinematic Sequence Plan",
      summary: `Structured 3-act cinematic breakdown: ${instruction}`,
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
          prompt: `Medium close-up portrait shot, rich key lighting for: ${instruction}`,
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
      mode,
      title: "Viral Short-Form Plan",
      summary: `Hook-first fast-paced viral video: ${instruction}`,
      totalDurationSec: 9,
      aspectRatio: "9:16",
      recommendedPreset: "HOOK_THUMB_STOP",
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
    mode: "standard" as const,
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

router.post("/video/plan", (req, res) => {
  const { instruction, mode, preset } = req.body || {};
  const selectedMode: VideoMode = mode === "cinematic" ? "cinematic" : mode === "viral" ? "viral" : "standard";
  const plan = buildApiModePlan(selectedMode, instruction || "New video project");
  if (preset) {
    plan.recommendedPreset = preset;
  }
  res.json(plan);
});

export default router;

