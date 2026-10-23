import { supabase } from "@/integrations/supabase/client";

export type ContentType = "script" | "captions" | "storyboard";

export type ContentItem = {
  id: string;
  type: ContentType;
  title: string;
  created_at: string;
  thread_id: string | null;
};

export type ContentItemFull = ContentItem & {
  data: unknown;
};

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

export async function listContentItems(): Promise<ContentItem[]> {
  const headers = await authHeaders();
  const res = await fetch("/api/content", { headers });
  if (!res.ok) throw new Error("Failed to load content library");
  const json = (await res.json()) as { items: ContentItem[] };
  return json.items;
}

export async function getContentItem(id: string): Promise<ContentItemFull> {
  const headers = await authHeaders();
  const res = await fetch(`/api/content/${id}`, { headers });
  if (!res.ok) throw new Error("Failed to load content item");
  return res.json() as Promise<ContentItemFull>;
}

export async function renameContentItem(id: string, title: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`/api/content/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error("Failed to rename item");
}

export async function deleteContentItem(id: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`/api/content/${id}`, { method: "DELETE", headers });
  if (!res.ok) throw new Error("Failed to delete item");
}
