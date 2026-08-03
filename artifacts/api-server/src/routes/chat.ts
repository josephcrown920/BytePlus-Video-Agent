import { Router, type Request, type Response } from "express";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";

const router = Router();

const SYSTEM = `You are Aura, a premium autonomous AI agent for designers, founders and engineers.

You have real tools. Use them proactively instead of guessing:
- web_search + fetch_url for anything current, factual, or link-based. Always cite sources as markdown links.
- generate_image whenever a visual is requested. After it returns, embed the image with markdown: ![alt](imageUrl).
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
      new Headers(init.headers as HeadersInit).forEach((value, key) =>
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
    return fetch(input as RequestInfo, { ...init, headers });
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
  const { messages, id: threadId } = req.body as {
    messages?: unknown;
    id?: unknown;
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

  // ── AI gateway ────────────────────────────────────────────────────────────
  const gateway = createOpenAICompatible({
    name: "replit-openai",
    baseURL: openaiBaseUrl,
    headers: { Authorization: `Bearer ${openaiApiKey}` },
  });

  // ── Agent tools ───────────────────────────────────────────────────────────
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
        "Generate a structured video/ad/reel script with numbered scenes, visual descriptions and dialogue. Use whenever the user asks for a script, screenplay, or shot list.",
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
Return ONLY valid JSON (no markdown fences) in this exact shape:
{
  "title": "string",
  "format": "${format}",
  "total_duration_seconds": number,
  "scenes": [
    { "scene": 1, "description": "what the viewer sees on screen", "dialogue": "voiceover or spoken words (empty string if none)", "duration_seconds": number }
  ]
}
Use 3-6 scenes. Be vivid, cinematic, and specific.`;

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
          return JSON.parse(content) as {
            title: string;
            format: string;
            total_duration_seconds: number;
            scenes: {
              scene: number;
              description: string;
              dialogue: string;
              duration_seconds: number;
            }[];
          };
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
          return JSON.parse(content) as {
            topic: string;
            captions: { platform: string; caption: string; hashtags: string[] }[];
          };
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
          const scenesWithImages = await Promise.all(
            board.scenes.map(async (scene) => {
              try {
                const imgRes = await fetch(`${openaiBaseUrl}/images/generations`, {
                  method: "POST",
                  headers: {
                    "content-type": "application/json",
                    Authorization: `Bearer ${openaiApiKey}`,
                  },
                  body: JSON.stringify({
                    model: "gpt-image-1",
                    prompt: scene.image_prompt,
                    size: "1024x1024",
                  }),
                });
                if (!imgRes.ok) return { ...scene, imageUrl: null };
                const imgJson = (await imgRes.json()) as {
                  data?: { b64_json?: string }[];
                };
                const base64 = imgJson.data?.[0]?.b64_json;
                if (!base64) return { ...scene, imageUrl: null };
                const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
                const path = `${userId}/${Date.now()}-sb${scene.scene}-${Math.random().toString(36).slice(2, 6)}.png`;
                const { error: uploadError } = await supabase.storage
                  .from("artifacts")
                  .upload(path, bytes, { contentType: "image/png" });
                if (uploadError) return { ...scene, imageUrl: null };
                const { data: signed } = await supabase.storage
                  .from("artifacts")
                  .createSignedUrl(path, 60 * 60 * 24 * 365);
                return { ...scene, imageUrl: signed?.signedUrl ?? null };
              } catch {
                return { ...scene, imageUrl: null };
              }
            }),
          );

          return { ...board, scenes: scenesWithImages };
        } catch (err) {
          return { error: `Storyboard generation failed: ${(err as Error).message}` };
        }
      },
    }),
  };

  // ── Stream ─────────────────────────────────────────────────────────────────
  const result = streamText({
    model: gateway("gpt-5.6-terra"),
    system: SYSTEM + memoryPreamble,
    messages: await convertToModelMessages(uiMessages),
    tools,
    stopWhen: stepCountIs(50),
  });

  const aiResponse = result.toUIMessageStreamResponse({
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
    onError: (err) => {
      console.error("chat stream error", err);
      const detail = err as { message?: string; responseBody?: string; statusCode?: number };
      const text = `${detail?.statusCode ?? ""} ${detail?.message ?? ""} ${detail?.responseBody ?? ""}`;
      if (text.includes("429")) return "Rate limit reached. Try again in a moment.";
      return "Generation failed. Please try again.";
    },
  });

  // ── Pipe web Response → Express response ───────────────────────────────────
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
