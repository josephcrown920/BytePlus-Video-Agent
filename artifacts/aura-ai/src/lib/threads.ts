import { supabase } from "@/integrations/supabase/client";

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type StoredMessage = {
  id: string;
  role: string;
  parts: Json[];
};

export type ThreadSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

export async function listThreads(): Promise<ThreadSummary[]> {
  const { data, error } = await supabase
    .from("threads")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map((t) => ({ id: t.id, title: t.title, updatedAt: t.updated_at }));
}

export async function createThread(): Promise<ThreadSummary> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("threads")
    .insert({ user_id: user.id })
    .select("id, title, updated_at")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id, title: data.title, updatedAt: data.updated_at };
}

export async function deleteThread(id: string): Promise<void> {
  const { error } = await supabase.from("threads").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getThread(id: string): Promise<{
  thread: ThreadSummary;
  messages: StoredMessage[];
} | null> {
  const { data: thread, error } = await supabase
    .from("threads")
    .select("id, title, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!thread) return null;

  const { data: rows, error: rowsError } = await supabase
    .from("messages")
    .select("id, role, parts, created_at")
    .eq("thread_id", id)
    .order("created_at", { ascending: true });
  if (rowsError) throw new Error(rowsError.message);

  const messages: StoredMessage[] = (rows ?? []).map((row) => ({
    id: row.id,
    role: row.role,
    parts: (Array.isArray(row.parts) ? row.parts : []) as Json[],
  }));

  return {
    thread: { id: thread.id, title: thread.title, updatedAt: thread.updated_at },
    messages,
  };
}

export async function listMemories() {
  const { data, error } = await supabase
    .from("memories")
    .select("id, content, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function forgetMemory(id: string): Promise<void> {
  const { error } = await supabase.from("memories").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
