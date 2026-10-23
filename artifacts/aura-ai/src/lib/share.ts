import { supabase } from "@/integrations/supabase/client";

export type ShareableContentType = "script" | "storyboard";

type ShareResponse = {
  id: string;
  url: string;
};

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard access is unavailable");
}

export async function createShareLink(
  type: ShareableContentType,
  data: Record<string, unknown>,
): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sign in to share this content");

  const response = await fetch("/api/share", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type, data }),
  });
  const result = (await response.json().catch(() => ({}))) as Partial<ShareResponse> & {
    error?: string;
  };
  if (!response.ok || !result.url) {
    throw new Error(result.error ?? "Failed to create share link");
  }

  const url = new URL(result.url, window.location.origin).toString();
  await copyToClipboard(url);
  return url;
}

export type SharedContent = {
  id: string;
  type: ShareableContentType;
  title: string;
  data: unknown;
  created_at: string;
};

export async function getSharedContent(id: string): Promise<SharedContent | null> {
  const response = await fetch(`/api/share/${encodeURIComponent(id)}`);
  if (response.status === 404) return null;
  const result = (await response.json().catch(() => ({}))) as SharedContent & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Failed to load shared content");
  return result;
}