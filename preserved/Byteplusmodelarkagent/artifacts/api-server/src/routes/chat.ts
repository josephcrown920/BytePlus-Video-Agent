import { Router, type Request, type Response } from "express";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, stepCountIs, streamText, tool, type LanguageModel, type UIMessage } from "ai";
import { z } from "zod";
import { isWeakHook } from "../lib/hook-quality.js";

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
      return xai("grok-3-mini") as unknown as LanguageModel;
    }
    default: {
      const gateway = createOpenAICompatible({
        name: "replit-openai",
        baseURL: openaiBaseUrl,
        headers: { Authorization: `Bearer ${openaiApiKey}` },
      });
      return gateway("gpt-5.6-terra") as unknown as LanguageModel;
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

const OPENAI_VOICES = {
  alloy: "Balanced and versatile",
  echo: "Clear and resonant",
  fable: "Expressive and story-driven",
  onyx: "Deep and authoritative",
  nova: "Warm and energetic",
  shimmer: "Bright and gentle",
} as const;

/** Curated built-in voices. The IDs are stable ElevenLabs public voice IDs. */
const ELEVENLABS_VOICES = {
  "21m00Tcm4TlvDq8ikWAM": {
    name: "Rachel",
    description: "Warm, professional, and conversational",
  },
  "pNInz6obpgDQGcFmaJgB": {
    name: "Adam",
    description: "Deep, confident, and authoritative",
  },
  "EXAVITQu4vr4xnSDxMaL": {
    name: "Bella",
    description: "Soft, friendly, and polished",
  },
  "ErXwobaYiN019PkySvjV": {
    name: "Antoni",
    description: "Well-rounded, clear, and engaging",
  },
  "TxGEqnHWrfWFTfGW9XjX": {
    name: "Josh",
    description: "Young, energetic, and dynamic",
  },
  "AZnzlk1XvdvUeBnXmlld": {
    name: "Domi",
    description: "Strong, expressive, and bold",
  },
} as const;

const SPEAKING_STYLE_GUIDE = [
  "warm and conversational",
  "authoritative and assured",
  "energetic and upbeat",
  "calm and reassuring",
  "cinematic and dramatic",
  "playful and light",
  "urgent and punchy",
] as const;

const OPENAI_VOICE_GUIDE = Object.entries(OPENAI_VOICES)
  .map(([voice, description]) => `${voice} (${description})`)
  .join(", ");
const ELEVENLABS_VOICE_GUIDE = Object.entries(ELEVENLABS_VOICES)
  .map(([voiceId, voice]) => `${voice.name} (${voice.description}; ID: ${voiceId})`)
  .join(", ");

function resolveElevenLabsVoice(voice?: string): {
  voiceId: string;
  requestedVoice: string | undefined;
} {
  const requestedVoice = voice?.trim() || undefined;
  if (!requestedVoice) {
    return { voiceId: "21m00Tcm4TlvDq8ikWAM", requestedVoice };
  }

  const curatedMatch = Object.entries(ELEVENLABS_VOICES).find(
    ([voiceId, details]) =>
      voiceId.toLowerCase() === requestedVoice.toLowerCase() ||
      details.name.toLowerCase() === requestedVoice.toLowerCase(),
  );
  // Accept a user-supplied ElevenLabs voice ID too, while the prompt exposes
  // a smaller curated set that is easier to choose from.
  return { voiceId: curatedMatch?.[0] ?? requestedVoice, requestedVoice };
}

function getSpeakingStyleSettings(speakingStyle?: string): {
  stability: number;
  similarity_boost: number;
  style: number;
} {
  const normalized = speakingStyle?.toLowerCase() ?? "";
  if (normalized.includes("energetic") || normalized.includes("upbeat") || normalized.includes("urgent")) {
    return { stability: 0.35, similarity_boost: 0.75, style: 0.55 };
  }
  if (normalized.includes("authoritative") || normalized.includes("assured")) {
    return { stability: 0.72, similarity_boost: 0.8, style: 0.2 };
  }
  if (normalized.includes("calm") || normalized.includes("reassuring")) {
    return { stability: 0.78, similarity_boost: 0.75, style: 0.1 };
  }
  if (normalized.includes("cinematic") || normalized.includes("dramatic")) {
    return { stability: 0.5, similarity_boost: 0.78, style: 0.45 };
  }
  if (normalized.includes("playful") || normalized.includes("light")) {
    return { stability: 0.42, similarity_boost: 0.72, style: 0.5 };
  }
  // Warm/conversational is the default and preserves the previous sound.
  return { stability: 0.5, similarity_boost: 0.75, style: 0.25 };
}

function getOpenAiSpeakingInstructions(speakingStyle?: string): string | undefined {
  const style = speakingStyle?.trim();
  return style ? `Speak in a ${style} style. Keep the delivery natural and suited to a polished video voiceover.` : undefined;
}

export type VoiceoverProvider = "elevenlabs" | "openai" | "none";

export type VoiceoverSynthesisResult = {
  audioBuffer: Buffer | null;
  provider: VoiceoverProvider;
};

// The first real OpenAI TTS request doubles as a reachability probe. Keeping
// this process-wide avoids repeating the warning for every video when the
// proxy does not expose /audio/speech.
let openAiTtsProbeCompleted = false;

function logOpenAiTtsProbe(response: globalThis.Response): void {
  if (openAiTtsProbeCompleted) return;
  openAiTtsProbeCompleted = true;

  if (response.ok) {
    console.info("OpenAI TTS endpoint probe succeeded.");
    return;
  }

  if (response.status === 404 || response.status === 405) {
    console.warn(
      `Voiceover warning: OpenAI TTS endpoint is not available on the configured AI integration proxy ` +
        `(HTTP ${response.status} at /audio/speech).`,
    );
    return;
  }

  console.warn(
    `Voiceover warning: OpenAI TTS endpoint probe returned HTTP ${response.status}; ` +
      "the OpenAI voiceover fallback may be unavailable.",
  );
}

function logOpenAiTtsProbeError(error: unknown): void {
  if (openAiTtsProbeCompleted) return;
  openAiTtsProbeCompleted = true;
  console.warn(
    "Voiceover warning: OpenAI TTS endpoint probe could not reach /audio/speech; " +
      "the OpenAI voiceover fallback may be unavailable.",
    error instanceof Error ? error.message : error,
  );
}

async function synthesizeOpenAiVoiceover(
  text: string,
  voice: string | undefined,
  speakingStyle: string | undefined,
  openaiBaseUrl: string,
  openaiApiKey: string,
): Promise<Buffer | null> {
  const openAiVoice =
    voice && Object.prototype.hasOwnProperty.call(OPENAI_VOICES, voice)
      ? voice
      : "alloy";
  const speakingInstructions = getOpenAiSpeakingInstructions(speakingStyle);

  try {
    const ttsRes = await fetch(`${openaiBaseUrl.replace(/\/$/, "")}/audio/speech`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: speakingStyle?.trim() ? "gpt-4o-mini-tts" : "tts-1",
        input: text,
        voice: openAiVoice,
        response_format: "mp3",
        ...(speakingInstructions ? { instructions: speakingInstructions } : {}),
      }),
    });
    logOpenAiTtsProbe(ttsRes);
    if (!ttsRes.ok) {
      console.warn(`Voiceover warning: OpenAI TTS synthesis failed (HTTP ${ttsRes.status}).`);
      return null;
    }
    const audioBuffer = Buffer.from(await ttsRes.arrayBuffer());
    return audioBuffer.length > 0 ? audioBuffer : null;
  } catch (error) {
    logOpenAiTtsProbeError(error);
    console.warn(
      "Voiceover warning: OpenAI TTS synthesis failed; no audio was returned.",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

export async function synthesizeVoiceover(
  text: string,
  voice: string | undefined,
  speakingStyle: string | undefined,
  openaiBaseUrl: string,
  openaiApiKey: string,
  elevenLabsKey = process.env["ELEVENLABS_API_KEY"],
): Promise<VoiceoverSynthesisResult> {
  if (elevenLabsKey) {
    try {
      const { voiceId } = resolveElevenLabsVoice(voice);
      const elRes = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": elevenLabsKey,
            "content-type": "application/json",
            accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_turbo_v2_5",
            voice_settings: getSpeakingStyleSettings(speakingStyle),
          }),
        },
      );
      if (elRes.ok) {
        const audioBuffer = Buffer.from(await elRes.arrayBuffer());
        if (audioBuffer.length > 0) {
          return { audioBuffer, provider: "elevenlabs" };
        }
      } else {
        console.warn(
          `Voiceover warning: ElevenLabs synthesis failed (HTTP ${elRes.status}); trying OpenAI TTS fallback.`,
        );
      }
    } catch (error) {
      console.warn(
        "Voiceover warning: ElevenLabs synthesis failed; trying OpenAI TTS fallback.",
        error instanceof Error ? error.message : error,
      );
    }
  }

  const audioBuffer = await synthesizeOpenAiVoiceover(
    text,
    voice,
    speakingStyle,
    openaiBaseUrl,
    openaiApiKey,
  );
  return audioBuffer
    ? { audioBuffer, provider: "openai" }
    : { audioBuffer: null, provider: "none" };
}

export {
  ELEVENLABS_VOICES,
  OPENAI_VOICES,
  getOpenAiSpeakingInstructions,
  getSpeakingStyleSettings,
  resolveElevenLabsVoice,
};

const SYSTEM = `You are Aura, a premium autonomous AI agent for designers, founders and engineers.

You have real tools. Use them proactively instead of guessing:
- web_search + fetch_url for anything current, factual, or link-based. Always cite sources as markdown links.
- generate_image whenever a visual is requested. After it returns, embed the image with markdown: ![alt](imageUrl).
- generate_video whenever someone asks for a video clip, reel, animation or moving visual. After it returns, embed with HTML: <video src="videoUrl" controls autoplay loop muted style="max-width:100%;border-radius:12px"></video>. When the user asks for an ad, reel, or any video with narration, always include a voiceover_text with the script dialogue — never leave it empty for ads. If the result includes voiceover_provider, tell the user whether ElevenLabs or OpenAI supplied the narration; if it is "none", explain that the video is silent.
- For ads, branded videos, reels, or any narrated video, offer a concise voice choice before generating when the user has not specified one. Explain that the voice character and speaking style can be customized, then use the user's selection in generate_video. Use the provider-specific voice options included below. If the user does not care, choose a fitting option and state what you chose.
- previs to create a full interactive pre-visualization animatic: script → per-scene images → timed MP4 the user can scrub through. Use whenever someone asks for a previs, animatic, shot preview, visual development, or to "see what the video will look like". After it returns, embed the video the same way as generate_video; the UI will automatically show the interactive scene strip.
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
  const voiceProviderPreamble = `

Voiceover options for this request:
- OpenAI voices: ${OPENAI_VOICE_GUIDE}.
${process.env["ELEVENLABS_API_KEY"]
  ? `- ElevenLabs curated voices: ${ELEVENLABS_VOICE_GUIDE}.`
  : "- ElevenLabs is not configured, so only the OpenAI voices are available."}
- Speaking styles: ${SPEAKING_STYLE_GUIDE.join(", ")}.`;

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

  /** Emit a transient progress label into the UI stream badge. Safe to call from any tool. */
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
        type ScriptResult = {
          title: string;
          format: string;
          total_duration_seconds: number;
          hook: string;
          scenes: { scene: number; description: string; dialogue: string; duration_seconds: number }[];
          close: string;
          mood?: string;
          hookWarning?: boolean;
        };

        const basePrompt = `Write a ${format} script about: "${topic}".${duration_seconds ? ` Target duration: ${duration_seconds} seconds.` : ""}

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

        /** Call the model with the given messages and return the parsed script, or throw. */
        async function callScriptModel(
          messages: { role: "user" | "assistant"; content: string }[],
        ): Promise<ScriptResult> {
          const res = await fetch(`${openaiBaseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              Authorization: `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages,
              response_format: { type: "json_object" },
              temperature: 0.8,
            }),
          });
          if (!res.ok) {
            const detail = await res.text();
            throw new Error(`Script generation failed (${res.status}): ${detail.slice(0, 200)}`);
          }
          const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
          const content = json.choices?.[0]?.message?.content;
          if (!content) throw new Error("No script returned from model.");
          return JSON.parse(content) as ScriptResult;
        }

        try {
          // ── First attempt ─────────────────────────────────────────────────
          const firstMessages = [{ role: "user" as const, content: basePrompt }];
          let scriptResult = await callScriptModel(firstMessages);

          // ── Hook quality guard ────────────────────────────────────────────
          const scene1Desc = scriptResult.scenes?.[0]?.description ?? "";
          if (isWeakHook(scene1Desc, scriptResult.hook ?? "")) {
            console.warn(
              "generate_script (chat): Scene 1 failed hook-quality check — retrying with correction. " +
              `description="${scene1Desc.slice(0, 120)}"`,
            );
            try {
              // Pass the bad draft back to the model with an explicit correction instruction.
              const correctionMessages = [
                { role: "user" as const, content: basePrompt },
                { role: "assistant" as const, content: JSON.stringify(scriptResult) },
                {
                  role: "user" as const,
                  content:
                    `CORRECTION REQUIRED: Scene 1 opened with a prohibited opener: ` +
                    `"${scene1Desc.slice(0, 200)}". ` +
                    `This violates the Cinematic Viralist blueprint — it must NOT be a title card, logo, ` +
                    `establishing shot, fade-in, or any form of introduction. ` +
                    `Replace Scene 1 with a concrete, action-first, sensory image: a close-up, an unexpected ` +
                    `contrast, a fast cut, or a single arresting frame that stops the scroll in under 1 second. ` +
                    `Regenerate the full script now with this correction applied. Return ONLY the corrected JSON.`,
                },
              ];
              const retryResult = await callScriptModel(correctionMessages);
              const retryScene1Desc = retryResult.scenes?.[0]?.description ?? "";

              if (isWeakHook(retryScene1Desc, retryResult.hook ?? "")) {
                // Correction retry also weak — flag it so the UI can warn the user.
                console.warn(
                  "generate_script (chat): correction retry also failed hook-quality check — setting hookWarning=true. " +
                  `description="${retryScene1Desc.slice(0, 120)}"`,
                );
                scriptResult = { ...retryResult, hookWarning: true };
              } else {
                scriptResult = retryResult;
              }
            } catch (retryErr) {
              // Retry call itself failed — keep original result and flag it.
              console.error(
                "generate_script (chat): correction retry error:",
                retryErr instanceof Error ? retryErr.message : retryErr,
              );
              scriptResult = { ...scriptResult, hookWarning: true };
            }
          }

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

          // Step 2: Emit initial board metadata immediately so the UI can show
          // skeletons for all scenes before any images have finished.
          try {
            videoProgressWriter?.write({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              type: "data-storyboard_init" as any,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data: {
                title: board.title,
                concept: board.concept,
                scenes: board.scenes.map((s) => ({ ...s, imageUrl: null })),
              } as any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);
          } catch { /* stream may not be ready */ }

          writeProgress(`Generating ${count} scene images…`);

          // Step 3: Generate images in parallel, emitting each scene as soon as
          // its image is ready so the frontend can progressively fill the grid.
          const scenesWithImages = await Promise.all(
            board.scenes.map(async (scene, idx) => {
              const imageUrl = await generateSceneImage(
                scene.image_prompt,
                userId,
                openaiBaseUrl,
                openaiApiKey,
                supabase,
                scene.scene,
              );
              // Emit this individual scene as soon as the image is ready
              try {
                videoProgressWriter?.write({
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  type: "data-storyboard_scene" as any,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  data: { index: idx, imageUrl } as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any);
              } catch { /* stream may be closing */ }
              writeProgress(`Scene ${idx + 1}/${count} ready…`);
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
        `Generate a short AI video clip from a text prompt. Creates a real MP4 video by generating cinematic key-frame images and blending them together with smooth crossfade transitions. Optionally adds an AI voiceover narration to the video. Use whenever someone asks for a video, reel, clip, short film, or animated visual — especially ads, reels, or branded content where a voiceover would enhance the output. Returns a URL to the MP4 file plus voiceover_provider ("elevenlabs", "openai", or "none"). Report the provider to the user, and if voiceover_provider is "none", report that the video is silent. When voiceover is requested, honor the selected voice and speaking style. OpenAI voice options: ${OPENAI_VOICE_GUIDE}. If ElevenLabs is active, use a curated voice name or ID from: ${ELEVENLABS_VOICE_GUIDE}.`,
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
        voice: z
          .string()
          .optional()
          .describe(
            `Voice character for the narration. OpenAI values: ${Object.keys(OPENAI_VOICES).join(", ")}. With ElevenLabs, use a curated name (Rachel, Adam, Bella, Antoni, Josh, Domi), its voice ID, or another voice ID available to the account.`,
          ),
        speaking_style: z
          .string()
          .optional()
          .describe(
            `How the narration should be delivered, such as ${SPEAKING_STYLE_GUIDE.join(", ")}. Use the user's wording when they request a different direction.`,
          ),
      }),
      execute: async ({ prompt, style, voiceover_text, voice, speaking_style }) => {
        try {
          const styleHint = style ? ` Visual style: ${style}.` : "";
          const frameCount = 3;

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

          // Step 2: Generate an image for each scene sequentially, reporting progress per frame.
          // Each fetch has a hard 55 s deadline via AbortSignal.timeout so a stalled request
          // cannot block the pipeline indefinitely.
          type FrameFailReason = "rate_limit" | "timeout" | "error";
          const imageBuffers: (Buffer | null)[] = [];
          const frameFailReasons: FrameFailReason[] = [];

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
                signal: AbortSignal.timeout(55_000),
              });
              if (!imgRes.ok) {
                frameFailReasons.push(imgRes.status === 429 ? "rate_limit" : "error");
                imageBuffers.push(null);
                continue;
              }
              const json = (await imgRes.json()) as {
                data?: { b64_json?: string }[];
              };
              const base64 = json.data?.[0]?.b64_json;
              const buf = base64 ? Buffer.from(base64, "base64") : null;
              if (!buf) frameFailReasons.push("error");
              imageBuffers.push(buf);
            } catch (frameErr) {
              const isTimeout =
                frameErr instanceof Error &&
                (frameErr.name === "TimeoutError" || frameErr.name === "AbortError");
              frameFailReasons.push(isTimeout ? "timeout" : "error");
              imageBuffers.push(null);
            }
          }

          const validBuffers = imageBuffers.filter((b) => b !== null) as Buffer[];
          const failedCount = validScenes.length - validBuffers.length;
          const rateLimitedCount = frameFailReasons.filter((r) => r === "rate_limit").length;
          const timedOutCount = frameFailReasons.filter((r) => r === "timeout").length;

          // Always require ≥2 valid frames — a 1-frame "video" is not useful
          if (validBuffers.length < 2) {
            if (rateLimitedCount > 0) {
              return { error: "Image rate limit reached — try again in a moment." };
            }
            if (timedOutCount > 0) {
              return { error: `Frame generation timed out (${timedOutCount} of ${validScenes.length} frames) — try again.` };
            }
            if (validBuffers.length === 0) {
              return { error: "Failed to generate any video frames." };
            }
            return {
              error: `Only ${validBuffers.length} of ${validScenes.length} frame${validScenes.length !== 1 ? "s" : ""} succeeded — try again for a better result.`,
            };
          }

          // 2+ frames ready — if any frames failed for any reason, surface an explicit degradation note
          if (failedCount > 0) {
            const reasons: string[] = [];
            if (rateLimitedCount > 0) reasons.push(`${rateLimitedCount} rate-limited`);
            if (timedOutCount > 0) reasons.push(`${timedOutCount} timed out`);
            const otherErrors = failedCount - rateLimitedCount - timedOutCount;
            if (otherErrors > 0) reasons.push(`${otherErrors} failed`);
            writeProgress(
              `Rendering with ${validBuffers.length}/${validScenes.length} frames (${reasons.join(", ")})…`,
            );
          }

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

            try {
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
            } catch (ffmpegErr) {
              const stderr = (ffmpegErr as { stderr?: string }).stderr?.slice(-800) ?? "";
              return { error: `Video encoding failed.${stderr ? ` FFmpeg: ${stderr}` : ""}` };
            }

            // Step 4 (optional): Synthesize voiceover and mux into the video
            let finalVideoPath = outputPath;
            let voiceoverProvider: VoiceoverProvider = "none";
            if (voiceover_text?.trim()) {
              writeProgress("Synthesizing voiceover…");
              const voiceoverResult = await synthesizeVoiceover(
                voiceover_text,
                voice,
                speaking_style,
                openaiBaseUrl,
                openaiApiKey,
              );
              voiceoverProvider = voiceoverResult.provider;
              if (!voiceoverResult.audioBuffer) {
                console.error("Voiceover unavailable: both TTS providers failed.");
                return {
                  error: "Voiceover unavailable — video is silent",
                  voiceover_provider: "none" as const,
                };
              }

              const audioPath = path.join(tmpDir, "voiceover.mp3");
              const muxedPath = path.join(tmpDir, "video_with_audio.mp4");
              try {
                await fsp.writeFile(audioPath, voiceoverResult.audioBuffer);
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
              } catch (voiceErr) {
                console.error("Voiceover mux failed; refusing to upload a silent video:", voiceErr);
                return {
                  error: "Voiceover unavailable — video is silent",
                  voiceover_provider: "none" as const,
                };
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

            return { prompt, videoUrl: signed.signedUrl, voiceover_provider: voiceoverProvider };
          } finally {
            // Remove the entire temp dir (handles frames, silent video, voiceover, and muxed output)
            await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
          }
        } catch (err) {
          return { error: `Video generation failed: ${(err as Error).message}` };
        }
      },
    }),

    previs: tool({
      description:
        "Create a full interactive pre-visualization (animatic) from a concept or brief. Generates a Cinematic Viralist script with per-scene durations, produces a reference image for each scene, then renders them into a timed animatic MP4. Returns a playable videoUrl plus a scenes array with imageUrl and startTime for each scene — the UI shows an interactive scene strip so users can scrub to any shot. Use whenever someone asks for a previs, animatic, shot-by-shot preview, visual development, or to see what a video will look like.",
      inputSchema: z.object({
        topic: z.string().describe("The concept, story, campaign, or brief to pre-visualize"),
        format: z
          .enum(["video", "ad", "reel"])
          .optional()
          .describe("Target format: video (long-form), ad (30-60s), reel (15-30s). Defaults to reel."),
      }),
      execute: async ({ topic, format = "reel" }) => {
        type PrevisScene = {
          scene: number;
          description: string;
          image_prompt: string;
          dialogue: string;
          duration_seconds: number;
        };
        type PrevisScript = { title: string; scenes: PrevisScene[] };

        /** Call the model for a previs script with the given messages. */
        async function callPrevisScriptModel(
          messages: { role: "user" | "assistant"; content: string }[],
        ): Promise<PrevisScript> {
          const res = await fetch(`${openaiBaseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              Authorization: `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages,
              response_format: { type: "json_object" },
              temperature: 0.8,
            }),
          });
          if (!res.ok) throw new Error(`Script generation failed (${res.status})`);
          const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
          const content = json.choices?.[0]?.message?.content;
          if (!content) throw new Error("No script returned from model.");
          return JSON.parse(content) as PrevisScript;
        }

        try {
          // ── Step 1: Generate structured script ────────────────────────────
          writeProgress("Developing script…");
          const scriptPrompt = `Write a ${format} script about: "${topic}".

## CINEMATIC VIRALIST BLUEPRINT (mandatory)
STEP 1 — SENSORY HOOK (0-3 s): Scene 1 must be a visceral sensory shock that stops the scroll. No logos, title cards, or introductions.
STEP 2 — NARRATIVE MID-ROLL: Middle scenes build tension and meaning. Each must earn its place.
STEP 3 — AESTHETIC CLOSE: End on an image or line that creates desire to loop or share.

Return ONLY valid JSON (no markdown fences):
{
  "title": "string",
  "scenes": [
    {
      "scene": 1,
      "description": "what the viewer sees — composition, lighting, action, mood",
      "image_prompt": "detailed cinematic image generation prompt for this exact scene",
      "dialogue": "voiceover or spoken words (empty string if none)",
      "duration_seconds": number
    }
  ]
}
Use 3-5 scenes. Be vivid and specific. Assign realistic durations (2-6 s each for reels, 3-8 s each for ads/videos).`;

          let script = await callPrevisScriptModel([{ role: "user", content: scriptPrompt }]);
          let hookWarning = false;

          // ── Hook quality guard ────────────────────────────────────────────
          const scene1Desc = script.scenes?.[0]?.description ?? "";
          if (isWeakHook(scene1Desc, "")) {
            console.warn(
              "previs: Scene 1 failed hook-quality check — retrying with correction. " +
              `description="${scene1Desc.slice(0, 120)}"`,
            );
            try {
              const correctionMessages: { role: "user" | "assistant"; content: string }[] = [
                { role: "user", content: scriptPrompt },
                { role: "assistant", content: JSON.stringify(script) },
                {
                  role: "user",
                  content:
                    `CORRECTION REQUIRED: Scene 1 opened with a prohibited opener: ` +
                    `"${scene1Desc.slice(0, 200)}". ` +
                    `This violates the Cinematic Viralist blueprint — Scene 1 must NOT be a title card, logo, ` +
                    `establishing shot, fade-in, or any introduction. ` +
                    `Replace Scene 1 with a concrete, action-first, sensory image: a close-up, unexpected ` +
                    `contrast, a fast cut, or a single arresting frame that stops the scroll in under 1 second. ` +
                    `Regenerate the full script now with this fix applied. Return ONLY the corrected JSON.`,
                },
              ];
              const retryScript = await callPrevisScriptModel(correctionMessages);
              const retryScene1Desc = retryScript.scenes?.[0]?.description ?? "";

              if (isWeakHook(retryScene1Desc, "")) {
                console.warn(
                  "previs: correction retry also failed hook-quality check — proceeding with hookWarning=true. " +
                  `description="${retryScene1Desc.slice(0, 120)}"`,
                );
                script = retryScript;
                hookWarning = true;
              } else {
                script = retryScript;
              }
            } catch (retryErr) {
              console.error(
                "previs: correction retry error — proceeding with original script + hookWarning=true:",
                retryErr instanceof Error ? retryErr.message : retryErr,
              );
              hookWarning = true;
            }
          }

          const sceneCount = script.scenes?.length ?? 0;
          if (sceneCount === 0) return { error: "Script has no scenes." };

          // ── Step 2: Generate one image per scene in parallel ──────────────
          writeProgress(`Generating ${sceneCount} scene images…`);
          const scenesWithImages = await Promise.all(
            script.scenes.map(async (scene, i) => {
              const imageUrl = await generateSceneImage(
                scene.image_prompt,
                userId,
                openaiBaseUrl,
                openaiApiKey,
                supabase,
                scene.scene,
                /* maxAttempts */ 2,
                /* backoffMs */ 1000,
              );
              writeProgress(`Scene ${i + 1}/${sceneCount} ready…`);
              return { ...scene, imageUrl };
            }),
          );

          // ── Step 3: Compute cumulative start times ────────────────────────
          let elapsed = 0;
          const timedScenes = scenesWithImages.map((scene) => {
            const startTime = elapsed;
            elapsed += Math.max(2, scene.duration_seconds ?? 3);
            return { ...scene, startTime };
          });

          // ── Step 4: Render animatic with FFmpeg ───────────────────────────
          writeProgress("Compositing animatic…");
          const validScenes = timedScenes.filter((s) => s.imageUrl !== null);
          if (validScenes.length < 2) {
            return { error: "Not enough scene images to render previs — try again." };
          }

          // ── Step 4b: Render animatic via the shared renderer ─────────────
          writeProgress("Compositing animatic…");
          const fsp = await import("fs/promises");
          const { renderAnimaticToFile } = await import("../lib/animatic");

          const { filePath: outputPath, tmpDir } = await renderAnimaticToFile(
            validScenes.map((s) => ({
              imageUrl: s.imageUrl!,
              durationSeconds: Math.max(2, s.duration_seconds ?? 3),
            })),
          );

          try {
            // ── Step 5: Upload and sign ───────────────────────────────────
            writeProgress("Uploading previs…");
            const videoBuffer = await fsp.readFile(outputPath);
            const storagePath = `${userId}/${Date.now()}-previs-${Math.random().toString(36).slice(2, 6)}.mp4`;

            const { error: uploadError } = await supabase.storage
              .from("artifacts")
              .upload(storagePath, videoBuffer, { contentType: "video/mp4" });
            if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

            const { data: signed, error: signError } = await supabase.storage
              .from("artifacts")
              .createSignedUrl(storagePath, 60 * 60 * 24 * 365);
            if (signError || !signed?.signedUrl) {
              return { error: `Could not create previs URL: ${signError?.message ?? "unknown"}` };
            }

            return {
              title: script.title,
              videoUrl: signed.signedUrl,
              scenes: timedScenes,
              ...(hookWarning ? { hookWarning: true } : {}),
            };
          } finally {
            await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
          }
        } catch (err) {
          return { error: `Previs failed: ${(err as Error).message}` };
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
        system: SYSTEM + voiceProviderPreamble + memoryPreamble,
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
