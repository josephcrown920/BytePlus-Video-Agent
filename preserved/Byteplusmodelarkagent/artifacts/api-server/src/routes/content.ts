import { Router, type Request, type Response } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

function isNewKey(k: string) {
  return k.startsWith("sb_publishable_") || k.startsWith("sb_secret_");
}

function makeSupabaseFetch(supabaseKey: string, userToken: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers as ConstructorParameters<typeof Headers>[0]).forEach((v, k) =>
        headers.set(k, v),
      );
    }
    if (isNewKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    headers.set("Authorization", `Bearer ${userToken}`);
    return fetch(input as Parameters<typeof fetch>[0], { ...init, headers });
  };
}

async function getAuthedClient(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const userToken = authHeader.slice(7);
  const supabaseUrl = process.env["SUPABASE_URL"];
  const supabaseKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: "Missing Supabase configuration" });
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient<any>(supabaseUrl, supabaseKey, {
    global: { fetch: makeSupabaseFetch(supabaseKey, userToken) },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(userToken);
  if (userError || !userData.user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }
  return { supabase, userId: userData.user.id };
}

/** GET /api/content — list all content items for the authenticated user */
router.get("/", async (req: Request, res: Response) => {
  const ctx = await getAuthedClient(req, res);
  if (!ctx) return;
  const { supabase, userId } = ctx;

  const { data, error } = await supabase
    .from("content_items")
    .select("id, type, title, created_at, thread_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ items: data ?? [] });
});

/** GET /api/content/:id — get full item data */
router.get("/:id", async (req: Request, res: Response) => {
  const ctx = await getAuthedClient(req, res);
  if (!ctx) return;
  const { supabase, userId } = ctx;

  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", req.params["id"])
    .eq("user_id", userId)
    .maybeSingle();

  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Not found" }); return; }
  res.json(data);
});

/** PATCH /api/content/:id — rename an item */
router.patch("/:id", async (req: Request, res: Response) => {
  const ctx = await getAuthedClient(req, res);
  if (!ctx) return;
  const { supabase, userId } = ctx;

  const { title } = req.body as { title?: unknown };
  if (typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "title (string) is required" });
    return;
  }

  const { error } = await supabase
    .from("content_items")
    .update({ title: title.trim() })
    .eq("id", req.params["id"])
    .eq("user_id", userId);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
});

/** DELETE /api/content/:id — delete an item */
router.delete("/:id", async (req: Request, res: Response) => {
  const ctx = await getAuthedClient(req, res);
  if (!ctx) return;
  const { supabase, userId } = ctx;

  const { error } = await supabase
    .from("content_items")
    .delete()
    .eq("id", req.params["id"])
    .eq("user_id", userId);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
});

export default router;
