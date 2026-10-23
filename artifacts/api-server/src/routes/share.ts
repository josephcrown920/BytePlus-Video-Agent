import { Router, type Request, type Response } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isNewKey(key: string) {
  return key.startsWith("sb_publishable_") || key.startsWith("sb_secret_");
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
    if (isNewKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    if (userToken) headers.set("Authorization", `Bearer ${userToken}`);
    return fetch(input as Parameters<typeof fetch>[0], { ...init, headers });
  };
}

function getSupabaseConfig() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  return url && key ? { url, key } : null;
}

function sendConfigurationError(res: Response) {
  res.status(500).json({ error: "Missing Supabase configuration" });
}

/**
 * POST /api/share
 * Creates an immutable, public snapshot of a script or storyboard.
 */
router.post("/", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const config = getSupabaseConfig();
  if (!config) {
    sendConfigurationError(res);
    return;
  }

  const userToken = authHeader.slice(7);
  const supabase = createClient(config.url, config.key, {
    global: { fetch: makeSupabaseFetch(config.key, userToken) },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(userToken);
  if (userError || !userData.user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const body = req.body as { type?: unknown; data?: unknown };
  if (body.type !== "script" && body.type !== "storyboard") {
    res.status(400).json({ error: "type must be script or storyboard" });
    return;
  }
  if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) {
    res.status(400).json({ error: "data must be a JSON object" });
    return;
  }

  const data = body.data as { title?: unknown };
  const title =
    typeof data.title === "string" && data.title.trim()
      ? data.title.trim().slice(0, 200)
      : body.type === "script"
        ? "Shared script"
        : "Shared storyboard";

  const { data: shared, error } = await supabase
    .from("shared_content")
    .insert({
      user_id: userData.user.id,
      type: body.type,
      title,
      data: body.data,
    })
    .select("id")
    .single();

  if (error || !shared) {
    res.status(500).json({ error: error?.message ?? "Failed to create share link" });
    return;
  }

  res.status(201).json({ id: shared.id, url: `/share/${shared.id}` });
});

/**
 * GET /api/share/:id
 * Public read-only access to a previously created share snapshot.
 */
router.get("/:id", async (req: Request, res: Response) => {
  const id = typeof req.params["id"] === "string" ? req.params["id"] : "";
  if (!UUID_PATTERN.test(id)) {
    res.status(404).json({ error: "Shared content not found" });
    return;
  }

  const config = getSupabaseConfig();
  if (!config) {
    sendConfigurationError(res);
    return;
  }

  const supabase = createClient(config.url, config.key, {
    global: { fetch: makeSupabaseFetch(config.key) },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("shared_content")
    .select("id, type, title, data, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Shared content not found" });
    return;
  }

  res.json(data);
});

export default router;