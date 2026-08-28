import { Router, type Request, type Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { generateSceneImage } from "./chat";

const router = Router();

function makeSupabaseFetch(supabaseKey: string, userToken?: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers as ConstructorParameters<typeof Headers>[0]).forEach((v, k) =>
        headers.set(k, v),
      );
    }
    const isNew = supabaseKey.startsWith("sb_publishable_") || supabaseKey.startsWith("sb_secret_");
    if (isNew && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    if (userToken) headers.set("Authorization", `Bearer ${userToken}`);
    return fetch(input as Parameters<typeof fetch>[0], { ...init, headers });
  };
}

/**
 * POST /api/images/generate
 * Body: {
 *   prompt: string;
 *   messageId?: string;
 *   toolCallId?: string;
 *   sceneIndex?: number;
 * }
 * Auth: Bearer <supabase-access-token>
 * Returns: { imageUrl: string }
 *
 * Used by StoryboardCard to retry individual failed scene frames. When the
 * message metadata is provided, the regenerated prompt and URL are also
 * written back to the owning assistant message.
 */
router.post("/generate", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userToken = authHeader.slice(7);

  const supabaseUrl = process.env["SUPABASE_URL"];
  const supabaseKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const openaiBaseUrl = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
  const openaiApiKey = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];
  if (!supabaseUrl || !supabaseKey || !openaiBaseUrl || !openaiApiKey) {
    res.status(500).json({ error: "Missing configuration" });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { fetch: makeSupabaseFetch(supabaseKey, userToken) },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(userToken);
  if (userError || !userData.user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const { prompt, messageId, toolCallId, sceneIndex } = req.body as {
    prompt?: unknown;
    messageId?: unknown;
    toolCallId?: unknown;
    sceneIndex?: unknown;
  };
  if (typeof prompt !== "string" || !prompt.trim()) {
    res.status(400).json({ error: "prompt (string) is required" });
    return;
  }

  const hasPersistenceContext =
    messageId !== undefined || toolCallId !== undefined || sceneIndex !== undefined;
  if (hasPersistenceContext) {
    if (typeof messageId !== "string" || !messageId) {
      res.status(400).json({ error: "messageId (string) is required with persistence context" });
      return;
    }
    if (typeof toolCallId !== "string" || !toolCallId) {
      res.status(400).json({ error: "toolCallId (string) is required with persistence context" });
      return;
    }
    if (
      typeof sceneIndex !== "number" ||
      !Number.isInteger(sceneIndex) ||
      sceneIndex < 0
    ) {
      res
        .status(400)
        .json({
          error:
            "sceneIndex (non-negative integer) is required with persistence context",
        });
      return;
    }
  }

  const imageUrl = await generateSceneImage(
    prompt,
    userData.user.id,
    openaiBaseUrl,
    openaiApiKey,
    supabase,
    Date.now(),
    2,
    1500,
  );

  if (!imageUrl) {
    res.status(503).json({ error: "Image generation failed after retries — try again shortly" });
    return;
  }

  if (hasPersistenceContext) {
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("id, role, parts")
      .eq("id", messageId as string)
      .eq("role", "assistant")
      .maybeSingle();

    if (messageError) {
      console.error("failed to load storyboard message for frame update", messageError);
      res.status(500).json({ error: "Could not load storyboard message for update" });
      return;
    }
    if (!message) {
      res.status(404).json({ error: "Storyboard message not found" });
      return;
    }

    const parts = Array.isArray(message.parts) ? message.parts : [];
    const toolPartIndex = parts.findIndex((part) => {
      if (!part || typeof part !== "object" || Array.isArray(part)) return false;
      const candidate = part as { type?: unknown; toolName?: unknown; toolCallId?: unknown };
      const isStoryboard =
        candidate.toolName === "storyboard" || candidate.type === "tool-storyboard";
      return isStoryboard && candidate.toolCallId === toolCallId;
    });

    if (toolPartIndex < 0) {
      res.status(404).json({ error: "Storyboard tool call not found" });
      return;
    }

    const toolPart = parts[toolPartIndex] as {
      output?: { scenes?: unknown };
    };
    const output = toolPart.output;
    if (!output || typeof output !== "object" || !Array.isArray(output.scenes)) {
      res.status(409).json({ error: "Storyboard output is not ready for updates" });
      return;
    }
    if ((sceneIndex as number) >= output.scenes.length) {
      res.status(400).json({ error: "sceneIndex is outside the storyboard" });
      return;
    }
    const targetScene = output.scenes[sceneIndex as number];
    if (
      !targetScene ||
      typeof targetScene !== "object" ||
      Array.isArray(targetScene)
    ) {
      res.status(409).json({ error: "Storyboard scene is not ready for updates" });
      return;
    }

    const scenes = output.scenes.map((scene, index) => {
      if (index !== sceneIndex) return scene;
      return {
        ...(scene as Record<string, unknown>),
        image_prompt: prompt.trim(),
        imageUrl,
      };
    });
    const updatedParts = parts.map((part, index) => {
      if (index !== toolPartIndex) return part;
      return {
        ...(part as Record<string, unknown>),
        output: { ...output, scenes },
      };
    });

    const { data: updatedMessage, error: updateError } = await supabase
      .from("messages")
      .update({ parts: updatedParts as never })
      .eq("id", messageId as string)
      .select("id")
      .maybeSingle();
    if (updateError || !updatedMessage) {
      console.error("failed to persist regenerated storyboard frame", updateError);
      res.status(500).json({ error: "Could not save regenerated storyboard frame" });
      return;
    }
  }

  res.json({ imageUrl });
});

export default router;
