import { useCallback, useEffect, useState } from "react";

export type Draft = {
  id: string;
  title: string;
  prompt: string;
  createdAt: number;
};

const STORAGE_KEY = "aura.drafts.v1";

function read(): Draft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Draft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useDrafts() {
  const [drafts, setDrafts] = useState<Draft[]>([]);

  useEffect(() => {
    setDrafts(read());
  }, []);

  const persist = useCallback((next: Draft[]) => {
    setDrafts(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 30)));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const saveDraft = useCallback(
    (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed) return;
      const draft: Draft = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed,
        prompt: trimmed,
        createdAt: Date.now(),
      };
      persist([draft, ...read().filter((d) => d.prompt !== trimmed)]);
    },
    [persist],
  );

  const removeDraft = useCallback(
    (id: string) => persist(read().filter((d) => d.id !== id)),
    [persist],
  );

  const clearDrafts = useCallback(() => persist([]), [persist]);

  return { drafts, saveDraft, removeDraft, clearDrafts };
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
