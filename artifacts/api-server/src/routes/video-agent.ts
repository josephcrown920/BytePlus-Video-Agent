import { Router, type Request, type Response } from "express";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createClient } from "@supabase/supabase-js";
import { generateObject, type LanguageModel } from "ai";
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

/** Validates the bearer token and returns the authenticated user ID, or sends 401. */
async function requireAuth(req: Request, res: Response): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const userToken = authHeader.slice(7);

  const supabaseUrl = process.env["SUPABASE_URL"];
  const supabaseKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: "Server misconfiguration" });
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(userToken);
  if (userError || !userData.user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }

  return userData.user.id;
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
  /** 0-3 s sensory shock — the instant-stop moment that halts the scroll. */
  hook: z.string(),
  scenes: z.array(SceneSchema).min(1),
  /** Seamless loop line or stinger that makes the viewer replay. */
  close: z.string(),
  /** Detected energy level — used to pick a title template. */
  mood: z.enum(["high-energy", "calm", "dramatic", "inspirational"]).optional(),
});

// ─── Cinematic Viralist 3-step blueprint ─────────────────────────────────────
// Structure: Sensory Hook (0-3 s) → Narrative Mid-Roll (3-15 s) → Aesthetic Close (15 s+)
// Every generated script MUST follow this arc.
const CINEMATIC_VIRALIST_SNIPPET = `
## CINEMATIC VIRALIST BLUEPRINT (mandatory)

Every script you generate MUST follow this 3-step structure:

### STEP 1 — SENSORY HOOK (0-3 s)
The first frame must be a sensory shock — a visual or auditory provocation that stops the scroll in under one second.
Techniques: unexpected contrast, visceral close-up, fast cut on beat, a bold question, an unresolved action.
Do NOT open with a logo, a title card, a wide establishing shot, or any form of introduction.
Output this as the "hook" field: one punchy sentence describing the exact opening image or sound.

### STEP 2 — NARRATIVE MID-ROLL (3-15 s)
Build tension and meaning across 2-5 tightly edited scenes.
Each scene must earn its place: advance the story, deepen emotion, or raise a question.
No filler. No recaps. No transitions for their own sake.

### STEP 3 — AESTHETIC CLOSE (15 s+)
End on an image or line that creates a desire to loop or share — a seamless loop, a callback to the hook, or a stinger.
Output this as the "close" field: one sentence describing the final image or spoken line.

Energy detection: if the topic, style, or user language signals high-energy (hype, launch, sport, party, action, fast, epic, loud), set mood to "high-energy".
`;

const SCRIPT_SYSTEM = `You are a professional video scriptwriter and creative director for Aura, a premium AI content studio.
Given a user's video topic and parameters, generate a complete video production plan using the Cinematic Viralist blueprint.
${CINEMATIC_VIRALIST_SNIPPET}

Return ONLY a JSON object with this exact structure:
{
  "title": "short engaging title for the video",
  "hook": "one-sentence sensory shock — the opening 0-3 s image or sound that stops the scroll",
  "scenes": [
    {
      "index": 0,
      "title": "scene name",
      "script": "exact voiceover text for this scene (2-4 sentences)",
      "description": "detailed cinematic visual description: what the camera sees, lighting, motion, composition, color grade",
      "duration": 8
    }
  ],
  "close": "one-sentence description of the final image or spoken line — seamless loop or stinger",
  "mood": "high-energy | calm | dramatic | inspirational"
}

Rules:
- Create 4-8 scenes depending on target duration
- Scene at index 0 is the HOOK scene (0-3 s visceral opener)
- Middle scenes form the NARRATIVE MID-ROLL (build tension, earn every cut)
- Final scene is the AESTHETIC CLOSE (loop-worthy or stinger)
- Each scene voiceover should read naturally in its duration seconds
- Visual descriptions must be specific, cinematic, and detailed enough to generate a keyframe image
- Total scene durations should add up to approximately the target duration
- Match the visual style to the requested style parameter
- Make the content professional, engaging, and high-quality
- Return ONLY the JSON object`;

// POST /api/video-agent/generate-script
router.post("/generate-script", async (req: Request, res: Response) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

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
      model: gateway("gpt-5.6-terra") as unknown as LanguageModel,
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
  const userId = await requireAuth(req, res);
  if (!userId) return;

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
