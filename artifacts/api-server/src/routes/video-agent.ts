import { Router, type Request, type Response } from "express";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createClient } from "@supabase/supabase-js";
import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import { isWeakHook } from "../lib/hook-quality.js";
import { runBrains, selectWinner, type BrainCandidate, type JudgeVerdict } from "../lib/aurora-brain.js";

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
  const baseUserMessage = `Video topic: ${prompt}
Visual style: ${style ?? "cinematic"}
Target duration: ${targetDuration ?? 60} seconds
Number of scenes: ${sceneCount}

Generate a complete professional video script with cinematic scene descriptions.`;

  /** Build the prompt for an explicit correction retry, naming the exact failure. */
  function correctionMessage(badDescription: string): string {
    return `${baseUserMessage}

CORRECTION REQUIRED: Your previous draft opened Scene 0 with a prohibited opener:
"${badDescription.slice(0, 200)}"

This violates the Cinematic Viralist blueprint. Scene 0 MUST be a genuine 0-3 second sensory shock — a visceral visual or auditory provocation that stops the scroll instantly. It must NOT be a title card, logo, establishing shot, fade-in, text overlay, or any form of introduction.

Replace Scene 0 with a concrete, sensory, action-first image: a close-up, an unexpected contrast, a fast cut, or a single arresting frame. Regenerate the full script now with this correction applied.`;
  }

  /** Run a generation attempt with the given prompt string. */
  async function runGeneration(userMessage: string) {
    const gateway = getGateway();
    const { object } = await generateObject({
      model: gateway("gpt-5.6-terra") as unknown as LanguageModel,
      system: SCRIPT_SYSTEM,
      prompt: userMessage,
      schema: ScriptSchema,
    });
    return object;
  }

  try {
    const object = await runGeneration(baseUserMessage);

    // ── Hook quality check ──────────────────────────────────────────────────
    const scene0 = object.scenes[0];
    const hookWeak = isWeakHook(scene0?.description ?? "", object.hook ?? "");

    if (hookWeak) {
      console.warn(
        "generate-script: Scene 0 failed hook-quality check — retrying with correction prompt. " +
        `description="${scene0?.description?.slice(0, 120)}"`
      );
      try {
        // Retry with an explicit correction message that identifies the exact failure.
        const retry = await runGeneration(correctionMessage(scene0?.description ?? ""));
        const retryScene0 = retry.scenes[0];
        const retryStillWeak = isWeakHook(retryScene0?.description ?? "", retry.hook ?? "");

        if (retryStillWeak) {
          // Retry also weak — surface with a warning badge so the user can act.
          console.warn(
            "generate-script: correction retry also failed hook-quality check — sending hookWarning=true. " +
            `description="${retryScene0?.description?.slice(0, 120)}"`
          );
          res.json({ ...retry, hookWarning: true });
        } else {
          // Correction succeeded — serve it cleanly.
          res.json(retry);
        }
      } catch (retryErr) {
        // Retry call itself failed — fall back to original result with warning.
        console.error("generate-script: correction retry error:", retryErr instanceof Error ? retryErr.message : retryErr);
        res.json({ ...object, hookWarning: true });
      }
      return;
    }

    res.json(object);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Script generation failed";
    console.error("generate-script error:", msg);
    res.status(502).json({ error: msg });
  }
});

// POST /api/video-agent/brain-script — Aurora Brain co-creative content planner.
// Runs several LLM "brains" in parallel on the same brief, a judge picks the
// strongest plan, and the winner still passes the hook-quality guard.
router.post("/brain-script", async (req: Request, res: Response) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  const { prompt, style, targetDuration } = req.body as {
    prompt: string;
    style?: string;
    targetDuration?: number;
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
    // ── 1. Run every brain in parallel ─────────────────────────────────────
    const candidates: BrainCandidate[] = await runBrains({
      system: SCRIPT_SYSTEM,
      prompt: userMessage,
      schema: ScriptSchema,
    });

    // ── 2. Judge picks the winner ──────────────────────────────────────────
    const { verdict, winner } = await selectWinner({
      brief: `Topic: ${prompt}\nStyle: ${style ?? "cinematic"}\nTarget: ${targetDuration ?? 60}s`,
      system: SCRIPT_SYSTEM,
      candidates,
    });

    // ── 3. Hook-quality guard on the winner ────────────────────────────────
    const winRec = winner.object as {
      title: string;
      hook?: string;
      scenes: Array<{ index: number; title: string; script: string; description: string; duration: number }>;
      close?: string;
      mood?: string;
    };

    const scene0 = winRec.scenes?.[0];
    const hookWeak = isWeakHook(scene0?.description ?? "", winRec.hook ?? "");

    // ── 4. Build the report the UI can render ──────────────────────────────
    const report = {
      ...verdict,
      winnerLabel: winner.brain.label,
      candidates: verdict.scores.map((s) => ({
        id: s.brainId,
        label: availableLabel(s.brainId),
        score: Math.round(s.total * 10) / 10,
      })),
    };

    res.json({
      ...winRec,
      hookWarning: hookWeak || undefined,
      brain: report,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Aurora Brain failed";
    console.error("brain-script error:", msg);
    res.status(502).json({ error: msg });
  }
});

function availableLabel(id: string): string {
  const m: Record<string, string> = {
    "gemini-pro": "Gemini 3.1 Pro",
    gpt: "GPT-5 Terra",
    claude: "Claude Sonnet 4.6",
    "gemini-flash": "Gemini Flash",
  };
  return m[id] ?? id;
}

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

// ── HeyGen Integration ────────────────────────────────────────────────────────

const HEYGEN_BASE_URL = "https://api.heygen.com";

function getHeyGenApiKey(): string | null {
  return process.env["HEYGEN_API_KEY"] ?? null;
}

function heygenHeaders(apiKey: string): Record<string, string> {
  return {
    "X-Api-Key": apiKey,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/**
 * GET /api/video-agent/heygen-available
 * No auth required — safe capability probe for the frontend.
 */
router.get("/heygen-available", (_req, res) => {
  res.json({ available: !!getHeyGenApiKey() });
});

/**
 * GET /api/video-agent/avatars
 * Proxies HeyGen GET /v3/avatar-looks and returns the public looks list.
 * Returns { avatars: [{ id, avatar_name, preview_image_url?, gender? }] }
 */
router.get("/avatars", async (req: Request, res: Response) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  const apiKey = getHeyGenApiKey();
  if (!apiKey) {
    res.status(503).json({ error: "HeyGen API key not configured" });
    return;
  }

  try {
    const r = await fetch(`${HEYGEN_BASE_URL}/v3/avatar-looks`, {
      headers: heygenHeaders(apiKey),
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) {
      res.status(502).json({ error: `HeyGen returned ${r.status}` });
      return;
    }
    const data = (await r.json()) as {
      data?: {
        avatar_looks?: Array<{
          id: string;
          avatar_name: string;
          preview_image_url?: string;
          gender?: string;
        }>;
      };
    };
    res.json({ avatars: data.data?.avatar_looks ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch avatars";
    res.status(502).json({ error: msg });
  }
});

/**
 * GET /api/video-agent/voices
 * Proxies HeyGen GET /v3/voices, filtered to English by default.
 * Returns { voices: [{ voice_id, name, language?, gender?, preview_audio? }] }
 */
router.get("/voices", async (req: Request, res: Response) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  const apiKey = getHeyGenApiKey();
  if (!apiKey) {
    res.status(503).json({ error: "HeyGen API key not configured" });
    return;
  }

  const language = typeof req.query.language === "string" ? req.query.language : "en";

  try {
    const r = await fetch(
      `${HEYGEN_BASE_URL}/v3/voices?language=${encodeURIComponent(language)}`,
      {
        headers: heygenHeaders(apiKey),
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!r.ok) {
      res.status(502).json({ error: `HeyGen returned ${r.status}` });
      return;
    }
    const data = (await r.json()) as {
      data?: {
        voices?: Array<{
          voice_id: string;
          name: string;
          language?: string;
          gender?: string;
          preview_audio?: string;
        }>;
      };
    };
    res.json({ voices: data.data?.voices ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch voices";
    res.status(502).json({ error: msg });
  }
});

/**
 * POST /api/video-agent/generate-video
 * Assembles the project's script into a single prompt and creates a HeyGen
 * Video Agent session (mode: generate). Returns { sessionId } immediately;
 * the frontend should poll /heygen-status/:sessionId for completion.
 */
router.post("/generate-video", async (req: Request, res: Response) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  const apiKey = getHeyGenApiKey();
  if (!apiKey) {
    res.status(503).json({
      error: "HeyGen API key not configured. Add HEYGEN_API_KEY to environment secrets.",
    });
    return;
  }

  const { title, scenes, avatarId, voiceId } = req.body as {
    title: string;
    scenes: Array<{ title: string; script: string; description: string; duration: number }>;
    avatarId?: string;
    voiceId?: string;
  };

  if (!Array.isArray(scenes) || scenes.length === 0) {
    res.status(400).json({ error: "scenes array is required and must not be empty" });
    return;
  }

  // Build a rich prompt from title + per-scene script and visual direction
  const promptLines: string[] = [
    `Video Title: ${title || "Untitled"}`,
    "",
    "Script:",
    "",
  ];
  for (const sc of scenes) {
    promptLines.push(`[${sc.title}] (${sc.duration}s)`);
    if (sc.script)       promptLines.push(sc.script);
    if (sc.description)  promptLines.push(`Visual: ${sc.description}`);
    promptLines.push("");
  }
  // Trim to HeyGen's safe prompt length
  const prompt = promptLines.join("\n").slice(0, 4000);

  try {
    const createRes = await fetch(`${HEYGEN_BASE_URL}/v3/video-agents`, {
      method: "POST",
      headers: heygenHeaders(apiKey),
      body: JSON.stringify({
        mode: "generate",
        prompt,
        ...(avatarId ? { avatar_id: avatarId } : {}),
        ...(voiceId  ? { voice_id:  voiceId  } : {}),
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!createRes.ok) {
      const body = await createRes.text().catch(() => "");
      res
        .status(502)
        .json({ error: `HeyGen returned ${createRes.status}${body ? `: ${body.slice(0, 300)}` : ""}` });
      return;
    }

    const data = (await createRes.json()) as { data?: { session_id?: string } };
    const sessionId = data.data?.session_id;
    if (!sessionId) {
      res.status(502).json({ error: "HeyGen did not return a session_id" });
      return;
    }

    console.info(`[heygen] session started: ${sessionId} for user ${userId}`);
    res.json({ sessionId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to start HeyGen generation";
    console.error("heygen generate-video error:", msg);
    res.status(502).json({ error: msg });
  }
});

/**
 * GET /api/video-agent/heygen-status/:sessionId
 * Proxies the HeyGen Video Agent status check. When completed, also fetches
 * the video record to return videoUrl and thumbnailUrl.
 * Returns { status, videoUrl?, thumbnailUrl?, error? }
 */
router.get("/heygen-status/:sessionId", async (req: Request, res: Response) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  const apiKey = getHeyGenApiKey();
  if (!apiKey) {
    res.status(503).json({ error: "HeyGen API key not configured" });
    return;
  }

  const { sessionId } = req.params;

  try {
    const statusRes = await fetch(`${HEYGEN_BASE_URL}/v3/video-agents/${sessionId}`, {
      headers: heygenHeaders(apiKey),
      signal: AbortSignal.timeout(15_000),
    });

    if (!statusRes.ok) {
      res.status(502).json({ error: `HeyGen status check failed (${statusRes.status})` });
      return;
    }

    const statusData = (await statusRes.json()) as {
      data?: { status?: string; video_id?: string; error_message?: string; error?: string };
    };

    const agentStatus = statusData.data?.status ?? "processing";
    const videoId = statusData.data?.video_id;

    if ((agentStatus === "completed" || agentStatus === "success") && videoId) {
      // Fetch the video record for the URL
      const videoRes = await fetch(`${HEYGEN_BASE_URL}/v3/videos/${videoId}`, {
        headers: heygenHeaders(apiKey),
        signal: AbortSignal.timeout(10_000),
      });

      if (!videoRes.ok) {
        // Completed but URL not ready yet — keep polling
        res.json({ status: "processing" });
        return;
      }

      const videoData = (await videoRes.json()) as {
        data?: { video_url?: string; thumbnail_url?: string };
      };

      res.json({
        status: "completed",
        videoUrl: videoData.data?.video_url ?? null,
        thumbnailUrl: videoData.data?.thumbnail_url ?? null,
      });
    } else if (agentStatus === "failed" || agentStatus === "error") {
      const reason =
        statusData.data?.error_message ?? statusData.data?.error ?? "Video generation failed";
      res.json({ status: "failed", error: reason });
    } else {
      res.json({ status: agentStatus });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Status check failed";
    res.status(502).json({ error: msg });
  }
});

export default router;
