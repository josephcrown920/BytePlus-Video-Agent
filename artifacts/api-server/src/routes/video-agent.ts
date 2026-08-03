import { Router, type Request, type Response } from "express";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateObject } from "ai";
import { z } from "zod";

const router = Router();

function getGateway() {
  const baseURL = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
  const apiKey = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];
  if (!baseURL || !apiKey) throw new Error("Missing AI integration configuration");
  return createOpenAICompatible({
    name: "replit-openai",
    baseURL,
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

const SceneSchema = z.object({
  index: z.number(),
  title: z.string(),
  script: z.string(),
  description: z.string(),
  duration: z.number(),
});

const ScriptSchema = z.object({
  title: z.string(),
  scenes: z.array(SceneSchema).min(1),
});

const SCRIPT_SYSTEM = `You are a professional video scriptwriter and creative director for Aura, a premium AI content studio.
Given a user's video topic and parameters, generate a complete video production plan.

Return ONLY a JSON object with this exact structure:
{
  "title": "short engaging title for the video",
  "scenes": [
    {
      "index": 0,
      "title": "scene name",
      "script": "exact voiceover text for this scene (2-4 sentences)",
      "description": "detailed cinematic visual description: what the camera sees, lighting, motion, composition, color grade",
      "duration": 8
    }
  ]
}

Rules:
- Create 4-8 scenes depending on target duration
- Each scene voiceover should read naturally in its duration seconds
- Visual descriptions must be specific, cinematic, and detailed enough to generate a keyframe image
- Total scene durations should add up to approximately the target duration
- Match the visual style to the requested style parameter
- Make the content professional, engaging, and high-quality
- Return ONLY the JSON object`;

// POST /api/video-agent/generate-script
router.post("/generate-script", async (req: Request, res: Response) => {
  const { prompt, style, targetDuration } = req.body as {
    prompt: string;
    style: string;
    targetDuration: number;
  };

  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "Missing prompt" });
    return;
  }

  const sceneCount = Math.max(4, Math.round((targetDuration ?? 60) / 15));
  const userMessage = `Video topic: ${prompt}
Visual style: ${style ?? "cinematic"}
Target duration: ${targetDuration ?? 60} seconds
Number of scenes: ${sceneCount}

Generate a complete professional video script with cinematic scene descriptions.`;

  try {
    const gateway = getGateway();
    const { object } = await generateObject({
      model: gateway("gpt-5.6-terra"),
      system: SCRIPT_SYSTEM,
      prompt: userMessage,
      schema: ScriptSchema,
    });
    res.json(object);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Script generation failed";
    console.error("generate-script error:", msg);
    res.status(502).json({ error: msg });
  }
});

// POST /api/video-agent/generate-frame — uses Pollinations.ai (free, no key needed)
router.post("/generate-frame", async (req: Request, res: Response) => {
  const { prompt } = req.body as { prompt: string };

  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "Missing prompt" });
    return;
  }

  const encoded = encodeURIComponent(prompt.slice(0, 500));
  const seed = Math.floor(Math.random() * 999999);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=896&height=504&nologo=true&enhance=false&seed=${seed}`;

  try {
    const check = await fetch(url, { method: "HEAD" });
    if (!check.ok) throw new Error(`Pollinations returned ${check.status}`);
    res.json({ url });
  } catch {
    // Fallback with minimal params
    const fallback = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=288&nologo=true&seed=${seed}`;
    res.json({ url: fallback });
  }
});

export default router;
