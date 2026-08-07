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
 * Body: { prompt: string }
 * Auth: Bearer <supabase-access-token>
 * Returns: { imageUrl: string }
 *
 * Used by StoryboardCard to retry individual failed scene frames.
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

  const { prompt } = req.body as { prompt?: unknown };
  if (typeof prompt !== "string" || !prompt.trim()) {
    res.status(400).json({ error: "prompt (string) is required" });
    return;
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

  res.json({ imageUrl });
});

export default router;
