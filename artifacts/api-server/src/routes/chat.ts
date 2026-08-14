import { Router, type Request, type Response } from "express";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, stepCountIs, streamText, tool, type LanguageModel, type UIMessage } from "ai";
import { z } from "zod";

export type ModelId = "gpt" | "claude" | "gemini" | "grok";

export const MODEL_LABELS: Record<ModelId, string> = {
  gpt: "GPT-5 Terra",
  claude: "Claude Sonnet",
  gemini: "Gemini Flash",
  grok: "Grok-3 Mini",
};

function resolveModel(modelId: ModelId, openaiBaseUrl: string, openaiApiKey: string): LanguageModel {
  switch (modelId) {
    case "claude": {
      const baseURL = process.env["AI_INTEGRATIONS_ANTHROPIC_BASE_URL"];
      const apiKey = process.env["AI_INTEGRATIONS_ANTHROPIC_API_KEY"];
      if (!baseURL || !apiKey) throw new Error("Claude is not configured");
      const anthropic = createAnthropic({ baseURL, apiKey });
      return anthropic("claude-sonnet-4-6");
    }
    case "gemini": {
      const baseURL = process.env["AI_INTEGRATIONS_GEMINI_BASE_URL"];
      const apiKey = process.env["AI_INTEGRATIONS_GEMINI_API_KEY"];
      if (!baseURL || !apiKey) throw new Error("Gemini is not configured");
      const google = createGoogleGenerativeAI({ baseURL, apiKey });
      return google("gemini-3-flash-preview");
    }
    case "grok": {
      const apiKey = process.env["XAI_API_KEY"];
      if (!apiKey) throw new Error("xAI API key not configured — add XAI_API_KEY to secrets");
      const xai = createOpenAICompatible({
        name: "xai",
        baseURL: "https://api.x.ai/v1",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return xai("grok-3-mini");
    }
    default: {
      const gateway = createOpenAICompatible({
        name: "replit-openai",
        baseURL: openaiBaseUrl,
        headers: { Authorization: `Bearer ${openaiApiKey}` },
      });
      return gateway("gpt-5.6-terra");
    }
  }
}

// ── Shared image helper ───────────────────────────────────────────────────

/** Minimal storage interface — avoids tying the helper to a concrete Supabase schema type. */
interface StorageBucket {
  upload(
    path: string,
    data: Uint8Array,
    options?: { contentType?: string },
  ): Promise<{ error: { message: string } | null }>;
  createSignedUrl(
    path: string,
    expiresIn: number,
  ): Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
}
interface MinimalSupabase {
  storage: { from(bucket: string): StorageBucket };
}

/** Generate one scene image with up to maxAttempts retries and back-off. Returns null if all fail. */
async function generateSceneImage(
  prompt: string,
  userId: string,
  openaiBaseUrl: string,
  openaiApiKey: string,
  supabase: MinimalSupabase,
  sceneIndex: number,
  maxAttempts = 2,
  backoffMs = 1500,
): Promise<string | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) await new Promise((r) => setTimeout(r, backoffMs));
      const imgRes = await fetch(`${openaiBaseUrl}/images/generations`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({ model: "gpt-image-1", prompt, size: "1024x1024" }),
      });
      if (!imgRes.ok) continue;
      const imgJson = (await imgRes.json()) as { data?: { b64_json?: string }[] };
      const base64 = imgJson.data?.[0]?.b64_json;
      if (!base64) continue;
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const path = `${userId}/${Date.now()}-sb${sceneIndex}-${Math.random().toString(36).slice(2, 6)}.png`;
      const { error: uploadError } = await supabase.storage
        .from("artifacts")
        .upload(path, bytes, { contentType: "image/png" });
      if (uploadError) continue;
      const { data: signed } = await supabase.storage
        .from("artifacts")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed?.signedUrl) return signed.signedUrl;
    } catch { /* retry */ }
  }
  return null;
}

export { generateSceneImage };

const router = Router();

const SYSTEM = `You are Aura, a premium autonomous AI agent for designers, founders and engineers.

You have real tools. Use them proactively instead of guessing:
- web_search + fetch_url for anything current, factual, or link-based. Always cite sources as markdown links.
- generate_image whenever a visual is requested. After it returns, embed the image with markdown: ![alt](imageUrl).
- generate_video whenever someone asks for a video clip, reel, animation or moving visual. After it returns, embed with HTML: <video src="videoUrl" controls autoplay loop muted style="max-width:100%;border-radius:12px"></video>. When the user asks for an ad, reel, or any video with narration, always include a voiceover_text with the script dialogue — never leave it empty for ads.
- generate_script to produce a structured video/ad/reel script with scenes and dialogue.
- generate_captions to craft platform-optimised social captions for TikTok, Instagram and LinkedIn.
- storyboard to break a concept into numbered visual scenes, each with a reference image.
- calculate for any arithmetic.
- current_time for anything date or time sensitive.
- remember to store durable user preferences and facts; recall_memories to look them up.

Work in multiple steps: plan, call tools, read results, then answer. Reply in vivid, concise, well-structured markdown. Be specific and useful, never generic.`;

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function makeSupabaseFetch(supabaseKey: string, userToken?: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers as ConstructorParameters<typeof Headers>[0]).forEach((value, key) =>
        headers.set(key, value),
      );
    }
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    if (userToken) {
      headers.set("Authorization", `Bearer ${userToken}`);
    }
    return fetch(input as Parameters<typeof fetch>[0], { ...init, headers });
  };
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function safeMath(expression: string): number {
  if (!/^[0-9+\-*/%().,\s^eE]*$/.test(expression)) {
    throw new Error("Only numbers and + - * / % ( ) ^ are allowed.");
  }
  const js = expression.replace(/\^/g, "**");
  // eslint-disable-next-line no-new-func
  const value = Function(`"use strict"; return (${js});`)() as unknown;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("That expression did not evaluate to a finite number.");
  }
  return value;
}

router.post("/", async (req: Request, res: Response) => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userToken = authHeader.slice(7);

  const supabaseUrl = process.env["SUPABASE_URL"];
  const supabaseKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: "Missing Supabase configuration" });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { fetch: makeSupabaseFetch(supabaseKey, userToken) },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Validate the JWT by fetching the user
  const { data: userData, error: userError } = await supabase.auth.getUser(userToken);
  if (userError || !userData.user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  const userId = userData.user.id;

  // ── Parse body ────────────────────────────────────────────────────────────
  const { messages, id: threadId, model: modelId = "gpt" } = req.body as {
    messages?: unknown;
    id?: unknown;
    model?: ModelId;
  };
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: "messages array is required" });
    return;
  }
  if (typeof threadId !== "string" || !threadId) {
    res.status(400).json({ error: "id (thread id) is required" });
    return;
  }

  // ── Verify thread belongs to user ─────────────────────────────────────────
  const { data: thread, error: threadError } = await supabase
    .from("threads")
    .select("id, title")
    .eq("id", threadId)
    .maybeSingle();
  if (threadError) {
    res.status(500).json({ error: threadError.message });
    return;
  }
  if (!thread) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  // ── AI credentials ────────────────────────────────────────────────────────
  const openaiBaseUrl = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
  const openaiApiKey = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];
  if (!openaiBaseUrl || !openaiApiKey) {
    res.status(500).json({ error: "Missing AI integration configuration" });
    return;
  }

  const uiMessages = messages as UIMessage[];

  // ── Persist user message + auto-title ─────────────────────────────────────
  const lastUser = [...uiMessages].reverse().find((m) => m.role === "user");
  if (lastUser) {
    const { error: insertError } = await supabase.from("messages").insert({
      thread_id: threadId,
      user_id: userId,
      role: "user",
      client_message_id: lastUser.id,
      parts: lastUser.parts as unknown as never,
    });
    if (insertError && !insertError.message.includes("duplicate key")) {
      console.error("failed to save user message", insertError);
    }

    const firstText = lastUser.parts.find((p) => p.type === "text");
    if (thread.title === "New conversation" && firstText && "text" in firstText) {
      const raw = String(firstText.text).trim().replace(/\s+/g, " ");
      await supabase
        .from("threads")
        .update({ title: raw.length > 60 ? `${raw.slice(0, 60)}…` : raw || "New conversation" })
        .eq("id", threadId);
    }
  }

  // ── Load memories for system prompt ───────────────────────────────────────
  let memoryPreamble = "";
  const { data: memData } = await supabase
    .from("memories")
    .select("content")
    .order("created_at", { ascending: false })
    .limit(20);
  if (memData && memData.length > 0) {
    memoryPreamble = `\n\nLong-term memory about this user:\n${memData.map((m) => `- ${m.content}`).join("\n")}`;
  }

  // ── Resolve AI model ──────────────────────────────────────────────────────
  let model: LanguageModel;
  try {
    model = resolveModel((modelId as ModelId) ?? "gpt", openaiBaseUrl, openaiApiKey);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  // ── Agent tools ───────────────────────────────────────────────────────────
  // Shared writer — set synchronously inside createUIMessageStream.execute (before any tool runs)
  // eslint-disable-next-line prefer-const
  let videoProgressWriter: { write: (part: unknown) => void } | undefined;

  const tools = {
    web_search: tool({
      description:
        "Search the live web for current information, news, prices, docs or anything after your training cutoff. Returns titles, URLs and snippets.",
      inputSchema: z.object({ query: z.string().describe("The search query") }),
      execute: async ({ query }) => {
        try {
          const searchRes = await fetch("https://html.duckduckgo.com/html/", {
            method: "POST",
            headers: {
              "content-type": "application/x-www-form-urlencoded",
              "user-agent": "Mozilla/5.0 (compatible; AuraAgent/1.0)",
            },
            body: new URLSearchParams({ q: query }).toString(),
          });
          if (!searchRes.ok) return { error: `Search failed with status ${searchRes.status}` };
          const html = await searchRes.text();
          const results: { title: string; url: string; snippet: string }[] = [];
          const blocks = html.split('class="result__body"').slice(1, 9);
          for (const block of blocks) {
            const link = /href="([^"]+)"/.exec(block)?.[1] ?? "";
            const decoded = decodeURIComponent(
              /uddg=([^&"]+)/.exec(link)?.[1] ?? link.replace(/&amp;/g, "&"),
            );
            const title = stripHtml(/result__a[^>]*>([\s\S]*?)<\/a>/.exec(block)?.[1] ?? "");
            const snippet = stripHtml(
              /result__snippet[^>]*>([\s\S]*?)<\/a>/.exec(block)?.[1] ?? "",
            ).slice(0, 400);
            if (title && decoded.startsWith("http")) results.push({ title, url: decoded, snippet });
          }
          if (results.length === 0) return { results: [], note: "No results found." };
          return { results: results.slice(0, 6) };
        } catch (err) {
          return { error: `Search failed: ${(err as Error).message}` };
        }
      },
    }),

    fetch_url: tool({
      description:
        "Fetch a web page or API endpoint and return its readable text content. Use after web_search to read a source in depth.",
      inputSchema: z.object({ url: z.string().describe("Absolute http(s) URL to fetch") }),
      execute: async ({ url }) => {
        try {
          if (!/^https?:\/\//i.test(url)) return { error: "URL must start with http:// or https://" };
          const fetchRes = await fetch(url, {
            headers: { "user-agent": "Mozilla/5.0 (compatible; AuraAgent/1.0)" },
          });
          const type = fetchRes.headers.get("content-type") ?? "";
          const body = await fetchRes.text();
          const text = type.includes("html") ? stripHtml(body) : body;
          return { status: fetchRes.status, url, content: text.slice(0, 12000) };
        } catch (err) {
          return { error: `Fetch failed: ${(err as Error).message}` };
        }
      },
    }),

    calculate: tool({
      description:
        "Evaluate an arithmetic expression exactly. Use this instead of doing mental math.",
      inputSchema: z.object({ expression: z.string().describe("e.g. (1240 * 0.19) + 45") }),
      execute: async ({ expression }) => {
        try {
          return { expression, result: safeMath(expression) };
        } catch (err) {
          return { error: (err as Error).message };
        }
      },
    }),

    current_time: tool({
      description: "Get the current UTC date and time. Use for anything time sensitive.",
      inputSchema: z.object({}),
      execute: async () => ({ iso: new Date().toISOString() }),
    }),

    generate_image: tool({
      description:
        "Generate an image from a text prompt. Use whenever the user asks for a visual, illustration, mockup, logo or concept art. Returns a URL you should present to the user.",
      inputSchema: z.object({
        prompt: z.string().describe("Rich, detailed description of the image to create"),
      }),
      execute: async ({ prompt }) => {
        try {
          const imgRes = await fetch(`${openaiBaseUrl}/images/generations`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              Authorization: `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-image-1",
              prompt,
              size: "1024x1024",
            }),
          });
          if (!imgRes.ok) {
            const detail = await imgRes.text();
            if (imgRes.status === 429) return { error: "Rate limited. Try again shortly." };
            return { error: `Image generation failed (${imgRes.status}): ${detail.slice(0, 200)}` };
          }
          const json = (await imgRes.json()) as {
            data?: { b64_json?: string }[];
          };
          const base64 = json.data?.[0]?.b64_json;
          if (!base64) return { error: "The model returned no image." };
          const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
          const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
          const { error: uploadError } = await supabase.storage
            .from("artifacts")
            .upload(path, bytes, { contentType: "image/png" });
          if (uploadError) return { error: `Could not store image: ${uploadError.message}` };

          const { data: signed, error: signError } = await supabase.storage
            .from("artifacts")
            .createSignedUrl(path, 60 * 60 * 24 * 365);
          if (signError || !signed?.signedUrl) {
            return { error: `Could not link image: ${signError?.message ?? "unknown error"}` };
          }
          return { prompt, imageUrl: signed.signedUrl };
        } catch (err) {
          return { error: `Image generation failed: ${(err as Error).message}` };
        }
      },
    }),

    remember: tool({
      description:
        "Save a durable fact or preference about the user so you recall it in future conversations. Keep each memory to one short sentence.",
      inputSchema: z.object({ fact: z.string().describe("The fact to remember") }),
      execute: async ({ fact }) => {
        const { error: memError } = await supabase
          .from("memories")
          .insert({ user_id: userId, content: fact });
        if (memError) return { error: `Could not save memory: ${memError.message}` };
        return { saved: fact };
      },
    }),

    recall_memories: tool({
      description: "List everything you have remembered about this user.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data: mems, error: recallError } = await supabase
          .from("memories")
          .select("content, created_at")
          .order("created_at", { ascending: false })
          .limit(50);
        if (recallError) return { error: recallError.message };
        return { memories: mems ?? [] };
      },
    }),

    generate_script: tool({
      description:
        "Generate a structured video/ad/reel script with numbered scenes, visual descriptions and dialogue. Enforces the Cinematic Viralist 3-step arc: Sensory Hook (0-3s) → Narrative Mid-Roll → Aesthetic Close. Use whenever the user asks for a script, screenplay, or shot list.",
      inputSchema: z.object({
        topic: z.string().describe("Topic, brief, or concept for the script"),
        format: z
          .enum(["video", "ad", "reel"])
          .describe("Script format: video (long-form), ad (30-60s), or reel (15-30s short-form)"),
        duration_seconds: z.number().optional().describe("Target total duration in seconds"),
      }),
      execute: async ({ topic, format, duration_seconds }) => {
        try {
          const userPrompt = `Write a ${format} script about: "${topic}".${duration_seconds ? ` Target duration: ${duration_seconds} seconds.` : ""}

## CINEMATIC VIRALIST BLUEPRINT (mandatory)
Every script MUST follow this 3-step structure:

STEP 1 — SENSORY HOOK (0-3 s): Scene 1 must be a sensory shock — a visual or auditory provocation that stops the scroll in under one second. Techniques: unexpected contrast, visceral close-up, fast cut on beat, a bold question, an unresolved action. Do NOT open with a logo, title card, wide establishing shot, or any introduction.

STEP 2 — NARRATIVE MID-ROLL (3-15 s): Middle scenes build tension and meaning. Each scene must earn its place — advance the story, deepen emotion, or raise a question. No filler or recaps.

STEP 3 — AESTHETIC CLOSE (final scene): End on an image or line that creates a desire to loop or share — a seamless loop, a callback to the hook, or a stinger.

Return ONLY valid JSON (no markdown fences) in this exact shape:
{
  "title": "string",
  "format": "${format}",
  "total_duration_seconds": number,
  "hook": "one-sentence sensory shock — the exact opening image or sound that stops the scroll (0-3 s)",
  "scenes": [
    { "scene": 1, "description": "what the viewer sees on screen", "dialogue": "voiceover or spoken words (empty string if none)", "duration_seconds": number }
  ],
  "close": "one-sentence description of the final loop-worthy image or stinger line",
  "mood": "high-energy | calm | dramatic | inspirational"
}
Use 3-6 scenes. Scene 1 is the Hook (visceral, no title cards). The final scene is the Close (loop or stinger). Be vivid, cinematic, and specific. Detect mood: if the topic signals hype, launch, sport, or action, set mood to "high-energy".`;

          const res = await fetch(`${openaiBaseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              Authorization: `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: userPrompt }],
              response_format: { type: "json_object" },
              temperature: 0.8,
            }),
          });
          if (!res.ok) {
            const detail = await res.text();
            return { error: `Script generation failed (${res.status}): ${detail.slice(0, 200)}` };
          }
          const json = (await res.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const content = json.choices?.[0]?.message?.content;
          if (!content) return { error: "No script returned from model." };
          const scriptResult = JSON.parse(content) as {
            title: string;
            format: string;
            total_duration_seconds: number;
            hook: string;
            scenes: { scene: number; description: string; dialogue: string; duration_seconds: number }[];
            close: string;
            mood?: string;
          };
          if (scriptResult.title) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            void (supabase as any).from("content_items").insert({
              user_id: userId, thread_id: threadId, type: "script",
              title: scriptResult.title, data: scriptResult,
            });
          }
          return scriptResult;
        } catch (err) {
          return { error: `Script generation failed: ${(err as Error).message}` };
        }
      },
    }),

    generate_captions: tool({
      description:
        "Produce platform-optimised social media captions (TikTok, Instagram, LinkedIn) with hashtags for a topic or content piece.",
      inputSchema: z.object({
        topic: z.string().describe("Topic, content piece, or brief to write captions for"),
        platforms: z
          .array(z.enum(["tiktok", "instagram", "linkedin"]))
          .optional()
          .describe("Platforms to generate captions for (defaults to all three)"),
      }),
      execute: async ({ topic, platforms }) => {
        const targetPlatforms = platforms ?? ["tiktok", "instagram", "linkedin"];
        try {
          const userPrompt = `Write social media captions for: "${topic}".
Generate one caption for each of these platforms: ${targetPlatforms.join(", ")}.
Return ONLY valid JSON (no markdown fences) in this exact shape:
{
  "topic": "string",
  "captions": [
    { "platform": "tiktok", "caption": "string", "hashtags": ["string"] }
  ]
}
Platform guidelines:
- TikTok: punchy, energetic, 1-3 sentences, 5-8 trending hashtags
- Instagram: visual storytelling, 2-4 sentences, 8-12 niche hashtags
- LinkedIn: professional narrative, 3-5 sentences, 3-5 industry hashtags
Only include the requested platforms.`;

          const res = await fetch(`${openaiBaseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              Authorization: `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: userPrompt }],
              response_format: { type: "json_object" },
              temperature: 0.9,
            }),
          });
          if (!res.ok) {
            const detail = await res.text();
            return { error: `Caption generation failed (${res.status}): ${detail.slice(0, 200)}` };
          }
          const json = (await res.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const content = json.choices?.[0]?.message?.content;
          if (!content) return { error: "No captions returned from model." };
          const captionsResult = JSON.parse(content) as {
            topic: string;
            captions: { platform: string; caption: string; hashtags: string[] }[];
          };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          void (supabase as any).from("content_items").insert({
            user_id: userId, thread_id: threadId, type: "captions",
            title: captionsResult.topic || "Social Captions", data: captionsResult,
          });
          return captionsResult;
        } catch (err) {
          return { error: `Caption generation failed: ${(err as Error).message}` };
        }
      },
    }),

    storyboard: tool({
      description:
        "Break a concept into a numbered visual storyboard with scene descriptions and AI-generated reference images. Use when someone asks for a storyboard, shot breakdown, or visual treatment.",
      inputSchema: z.object({
        concept: z.string().describe("The concept, story, or campaign to storyboard"),
        scene_count: z
          .number()
          .min(2)
          .max(4)
          .optional()
          .describe("Number of scenes to generate (2–4, defaults to 3)"),
      }),
      execute: async ({ concept, scene_count }) => {
        const count = Math.min(4, Math.max(2, scene_count ?? 3));
        try {
          // Step 1: generate scene breakdown
          const userPrompt = `Create a ${count}-scene storyboard for: "${concept}".
Return ONLY valid JSON (no markdown fences):
{
  "title": "string",
  "concept": "string",
  "scenes": [
    {
      "scene": 1,
      "title": "string",
      "description": "what the viewer sees — composition, lighting, action, mood",
      "image_prompt": "detailed cinematic image generation prompt for this exact scene"
    }
  ]
}`;

          const planRes = await fetch(`${openaiBaseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              Authorization: `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: userPrompt }],
              response_format: { type: "json_object" },
              temperature: 0.8,
            }),
          });
          if (!planRes.ok) {
            const detail = await planRes.text();
            return { error: `Storyboard generation failed (${planRes.status}): ${detail.slice(0, 200)}` };
          }
          const planJson = (await planRes.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const planContent = planJson.choices?.[0]?.message?.content;
          if (!planContent) return { error: "No storyboard returned from model." };

          const board = JSON.parse(planContent) as {
            title: string;
            concept: string;
            scenes: {
              scene: number;
              title: string;
              description: string;
              image_prompt: string;
            }[];
          };

          // Step 2: generate a reference image for each scene in parallel
          // Each scene gets up to 2 attempts with 1.5 s back-off before falling back to null.
          const scenesWithImages = await Promise.all(
            board.scenes.map(async (scene) => {
              const imageUrl = await generateSceneImage(
                scene.image_prompt,
                userId,
                openaiBaseUrl,
                openaiApiKey,
                supabase,
                scene.scene,
              );
              return { ...scene, imageUrl };
            }),
          );

          const finalBoard = { ...board, scenes: scenesWithImages };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          void (supabase as any).from("content_items").insert({
            user_id: userId, thread_id: threadId, type: "storyboard",
            title: board.title, data: finalBoard,
          });
          return finalBoard;
        } catch (err) {
          return { error: `Storyboard generation failed: ${(err as Error).message}` };
        }
      },
    }),

    generate_video: tool({
      description:
        "Generate a short AI video clip from a text prompt. Creates a real MP4 video by generating cinematic key-frame images and blending them together with smooth crossfade transitions. Optionally adds an AI voiceover narration to the video. Use whenever someone asks for a video, reel, clip, short film, or animated visual — especially ads, reels, or branded content where a voiceover would enhance the output. Returns a URL to the MP4 file.",
      inputSchema: z.object({
        prompt: z.string().describe("Describe the video scene or concept to generate"),
        style: z
          .string()
          .optional()
          .describe(
            "Visual style, e.g. 'cinematic 4K', 'anime', 'photorealistic', 'neon noir', 'golden hour'",
          ),
        voiceover_text: z
          .string()
          .optional()
          .describe(
            "Script text to synthesize as an AI voiceover narration and mix into the video audio track. Provide this whenever the user asks for an ad, reel, or video with narration or voice.",
          ),
      }),
      execute: async ({ prompt, style, voiceover_text }) => {
        try {
          const styleHint = style ? ` Visual style: ${style}.` : "";
          const frameCount = 3;

          // Helper to emit live progress into the stream badge
          const writeProgress = (label: string) => {
            try {
              videoProgressWriter?.write({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                type: "data-video_progress" as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                data: { label } as any,
                transient: true,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any);
            } catch {
              /* stream may already be closed */
            }
          };

          // Step 1: Generate distinct cinematic scene prompts with GPT
          writeProgress("Planning video scenes…");
          const planRes = await fetch(`${openaiBaseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              Authorization: `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "user",
                  content: `Create ${frameCount} cinematic image prompts for a short video about: "${prompt}".${styleHint}
Each frame should flow naturally into the next — showing progression, movement or different angles of the same scene.
Return ONLY valid JSON (no markdown fences):
{ "scenes": [{ "image_prompt": "highly detailed cinematic image generation prompt" }] }
Make each prompt vivid, specific, and optimised for AI image generation. Include lighting, mood, composition details.`,
                },
              ],
              response_format: { type: "json_object" },
              temperature: 0.8,
            }),
          });

          if (!planRes.ok) return { error: "Failed to plan video scenes" };
          const planJson = (await planRes.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const planContent = planJson.choices?.[0]?.message?.content;
          if (!planContent) return { error: "No scene plan returned from model." };

          const { scenes } = JSON.parse(planContent) as {
            scenes: { image_prompt: string }[];
          };
          const validScenes = (scenes ?? []).slice(0, frameCount);
          if (validScenes.length === 0) return { error: "No scenes generated." };

          // Step 2: Generate an image for each scene sequentially, reporting progress per frame
          const imageBuffers: (Buffer | null)[] = [];
          for (let i = 0; i < validScenes.length; i++) {
            writeProgress(`Generating frame ${i + 1}/${validScenes.length}…`);
            try {
              const imgRes = await fetch(`${openaiBaseUrl}/images/generations`, {
                method: "POST",
                headers: {
                  "content-type": "application/json",
                  Authorization: `Bearer ${openaiApiKey}`,
                },
                body: JSON.stringify({
                  model: "gpt-image-1",
                  prompt: validScenes[i].image_prompt,
                  size: "1536x1024",
                }),
              });
              if (!imgRes.ok) {
                imageBuffers.push(null);
                continue;
              }
              const json = (await imgRes.json()) as {
                data?: { b64_json?: string }[];
              };
              const base64 = json.data?.[0]?.b64_json;
              imageBuffers.push(base64 ? Buffer.from(base64, "base64") : null);
            } catch {
              imageBuffers.push(null);
            }
          }

          const validBuffers = imageBuffers.filter((b) => b !== null) as Buffer[];
          if (validBuffers.length === 0) return { error: "Failed to generate any video frames." };

          writeProgress("Encoding video…");

          // Step 3: Write frames to temp dir and render MP4 with FFmpeg
          const fsp = await import("fs/promises");
          const { execFile } = await import("child_process");
          const { promisify } = await import("util");
          const { tmpdir } = await import("os");
          const path = await import("path");
          const execFileAsync = promisify(execFile);

          const tmpDir = await fsp.mkdtemp(path.join(tmpdir(), "aura-video-"));
          const framePaths: string[] = [];
          const outputPath = path.join(tmpDir, "video.mp4");

          try {
            for (let i = 0; i < validBuffers.length; i++) {
              const p = path.join(tmpDir, `frame${i}.png`);
              await fsp.writeFile(p, validBuffers[i]);
              framePaths.push(p);
            }

            const frameDuration = 4; // seconds per frame
            const fadeDuration = 0.5;

            // Each input loops for frameDuration + fadeDuration so xfade has material to work with
            const inputs = framePaths.flatMap((p) => [
              "-loop",
              "1",
              "-t",
              String(frameDuration + fadeDuration),
              "-i",
              p,
            ]);

            // Scale every frame to 1280×720 with letterboxing
            const scaleFilters = framePaths.map(
              (_, i) =>
                `[${i}:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}]`,
            );

            let filterComplex: string;
            let mapArg: string;

            if (framePaths.length === 1) {
              filterComplex = scaleFilters[0];
              mapArg = "[v0]";
            } else {
              const xfadeFilters: string[] = [];
              let prev = "v0";
              for (let i = 1; i < framePaths.length; i++) {
                const offset = i * frameDuration - fadeDuration;
                const out = i === framePaths.length - 1 ? "out" : `xf${i}`;
                xfadeFilters.push(
                  `[${prev}][v${i}]xfade=transition=fade:duration=${fadeDuration}:offset=${offset}[${out}]`,
                );
                prev = out;
              }
              filterComplex = [...scaleFilters, ...xfadeFilters].join(";");
              mapArg = "[out]";
            }

            const totalDuration = framePaths.length * frameDuration - fadeDuration;

            await execFileAsync(
              "ffmpeg",
              [
                ...inputs,
                "-filter_complex",
                filterComplex,
                "-map",
                mapArg,
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-t",
                String(totalDuration),
                "-y",
                outputPath,
              ],
              { timeout: 120_000 },
            );

            // Step 4 (optional): Synthesize voiceover and mux into the video
            let finalVideoPath = outputPath;
            if (voiceover_text?.trim()) {
              writeProgress("Synthesizing voiceover…");
              try {
                const audioPath = path.join(tmpDir, "voiceover.mp3");
                const muxedPath = path.join(tmpDir, "video_with_audio.mp4");

                // Prefer ElevenLabs if key is present, otherwise use OpenAI TTS
                const elevenLabsKey = process.env["ELEVENLABS_API_KEY"];
                let audioBuffer: Buffer | null = null;

                if (elevenLabsKey) {
                  // ElevenLabs TTS — Rachel voice (professional, warm)
                  const elRes = await fetch(
                    "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
                    {
                      method: "POST",
                      headers: {
                        "xi-api-key": elevenLabsKey,
                        "content-type": "application/json",
                        accept: "audio/mpeg",
                      },
                      body: JSON.stringify({
                        text: voiceover_text,
                        model_id: "eleven_turbo_v2_5",
                        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
                      }),
                    },
                  );
                  if (elRes.ok) {
                    audioBuffer = Buffer.from(await elRes.arrayBuffer());
                  }
                }

                if (!audioBuffer) {
                  // OpenAI TTS fallback (alloy voice)
                  const ttsRes = await fetch(`${openaiBaseUrl}/audio/speech`, {
                    method: "POST",
                    headers: {
                      "content-type": "application/json",
                      Authorization: `Bearer ${openaiApiKey}`,
                    },
                    body: JSON.stringify({
                      model: "tts-1",
                      input: voiceover_text,
                      voice: "alloy",
                      response_format: "mp3",
                    }),
                  });
                  if (ttsRes.ok) {
                    audioBuffer = Buffer.from(await ttsRes.arrayBuffer());
                  }
                }

                if (audioBuffer && audioBuffer.length > 0) {
                  await fsp.writeFile(audioPath, audioBuffer);
                  writeProgress("Mixing audio…");

                  // Mux: copy video stream + re-encode audio to AAC, stop at shortest stream
                  await execFileAsync(
                    "ffmpeg",
                    [
                      "-i", outputPath,
                      "-i", audioPath,
                      "-c:v", "copy",
                      "-c:a", "aac",
                      "-map", "0:v:0",
                      "-map", "1:a:0",
                      "-shortest",
                      "-y",
                      muxedPath,
                    ],
                    { timeout: 60_000 },
                  );
                  finalVideoPath = muxedPath;
                }
              } catch (voiceErr) {
                // Voiceover failure is non-fatal — fall back to silent video
                console.error("Voiceover mux failed, using silent video:", voiceErr);
              }
            }

            // Step 5: Upload MP4 to Supabase Storage
            writeProgress("Uploading video…");
            const videoBuffer = await fsp.readFile(finalVideoPath);
            const storagePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`;

            const { error: uploadError } = await supabase.storage
              .from("artifacts")
              .upload(storagePath, videoBuffer, { contentType: "video/mp4" });

            if (uploadError) return { error: `Failed to store video: ${uploadError.message}` };

            const { data: signed, error: signError } = await supabase.storage
              .from("artifacts")
              .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

            if (signError || !signed?.signedUrl) {
              return { error: `Failed to create video URL: ${signError?.message ?? "unknown"}` };
            }

            return { prompt, videoUrl: signed.signedUrl };
          } finally {
            // Remove the entire temp dir (handles frames, silent video, voiceover, and muxed output)
            await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
          }
        } catch (err) {
          return { error: `Video generation failed: ${(err as Error).message}` };
        }
      },
    }),
  };

  // ── Stream ─────────────────────────────────────────────────────────────────
  const modelMessages = await convertToModelMessages(uiMessages);

  // createUIMessageStream's execute runs synchronously, so videoProgressWriter is
  // set before any tool execute() is called during streaming.
  const uiStream = createUIMessageStream({
    execute: ({ writer }) => {
      videoProgressWriter = writer;

      const result = streamText({
        model,
        system: SYSTEM + memoryPreamble,
        messages: modelMessages,
        tools,
        stopWhen: stepCountIs(50),
      });

      writer.merge(
        result.toUIMessageStream({
          originalMessages: uiMessages,
          onFinish: async ({ responseMessage }) => {
            const { error: saveErr } = await supabase.from("messages").insert({
              thread_id: threadId,
              user_id: userId,
              role: "assistant",
              client_message_id: responseMessage.id,
              parts: responseMessage.parts as unknown as never,
            });
            if (saveErr) console.error("failed to save assistant message", saveErr);
            await supabase
              .from("threads")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", threadId);
          },
        }),
      );
    },
    onError: (err) => {
      console.error("chat stream error", err);
      const detail = err as { message?: string; responseBody?: string; statusCode?: number };
      const text = `${detail?.statusCode ?? ""} ${detail?.message ?? ""} ${detail?.responseBody ?? ""}`;
      if (text.includes("429")) return "Rate limit reached. Try again in a moment.";
      return "Generation failed. Please try again.";
    },
  });

  // ── Pipe web Response → Express response ───────────────────────────────────
  const aiResponse = createUIMessageStreamResponse({ stream: uiStream });

  res.status(aiResponse.status);
  aiResponse.headers.forEach((value: string, key: string) => res.setHeader(key, value));

  if (aiResponse.body) {
    const reader = aiResponse.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          return;
        }
        res.write(Buffer.from(value));
      }
    };
    pump().catch((err: unknown) => {
      console.error("Stream pipe error:", err);
      res.end();
    });
  } else {
    res.end();
  }
});

export default router;
