import { useCallback, useEffect, useRef, useState } from "react";
import {
  cancelMediaGeneration,
  createMediaGeneration,
  getMediaGeneration,
  type CreateMediaGenerationRequest,
  type MediaGeneration,
} from "@workspace/api-client-react";
import { getSharedSupabaseAccessToken } from "@/lib/shared-auth";

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

function messageFromError(error: unknown): string {
  if (!(error instanceof Error)) return "Generation could not be started. Try again.";
  const message = error.message.replace(/^HTTP \d+\s*[^:]*:\s*/i, "").trim();
  return message || "Generation could not be started. Try again.";
}

export function useMediaGeneration(onUpdate?: (generation: MediaGeneration) => void) {
  const [generation, setGeneration] = useState<MediaGeneration | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const onUpdateRef = useRef(onUpdate);
  const generationRef = useRef<MediaGeneration | null>(null);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const applyUpdate = useCallback((next: MediaGeneration) => {
    const current = generationRef.current;
    if (
      current?.id === next.id &&
      TERMINAL_STATUSES.has(current.status) &&
      !TERMINAL_STATUSES.has(next.status)
    ) {
      return;
    }
    generationRef.current = next;
    setGeneration(next);
    onUpdateRef.current?.(next);
  }, []);

  const start = useCallback(
    async (request: CreateMediaGenerationRequest) => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        const created = await createMediaGeneration(request);
        applyUpdate(created);
        return created;
      } catch (error) {
        const message = messageFromError(error);
        setSubmitError(message);
        throw new Error(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [applyUpdate],
  );

  const cancel = useCallback(async () => {
    if (!generation || TERMINAL_STATUSES.has(generation.status)) return;
    try {
      applyUpdate(await cancelMediaGeneration(generation.id));
    } catch (error) {
      setSubmitError(messageFromError(error));
    }
  }, [applyUpdate, generation]);

  const reset = useCallback(() => {
    generationRef.current = null;
    setGeneration(null);
    setSubmitError(null);
  }, []);

  const resume = useCallback(async (id: string) => {
    const next = await getMediaGeneration(id);
    applyUpdate(next);
    return next;
  }, [applyUpdate]);

  useEffect(() => {
    if (!generation || TERMINAL_STATUSES.has(generation.status)) return;
    let stopped = false;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();

    const applyEventData = (data: string) => {
      try {
        const next = JSON.parse(data) as MediaGeneration;
        applyUpdate(next);
      } catch {
        setSubmitError("Live progress was interrupted. The render is still safe in the pipeline.");
      }
    };

    const poll = async () => {
      if (stopped) return;
      try {
        const next = await getMediaGeneration(generation.id);
        applyUpdate(next);
        if (TERMINAL_STATUSES.has(next.status)) return;
      } catch {
        // A later poll can recover from a transient proxy or workflow restart.
      }
      pollTimer = setTimeout(poll, 2_000);
    };

    const stream = async () => {
      const token = getSharedSupabaseAccessToken();
      if (!token) {
        setSubmitError("Sign in through Aura before starting a generation.");
        return;
      }
      try {
        const response = await fetch(`/api/media/generations/${generation.id}/events`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error("Progress stream unavailable");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!stopped) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let boundary = buffer.indexOf("\n\n");
          while (boundary >= 0) {
            const frame = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const data = frame
              .split("\n")
              .filter(line => line.startsWith("data:"))
              .map(line => line.slice(5).trim())
              .join("\n");
            if (data) applyEventData(data);
            boundary = buffer.indexOf("\n\n");
          }
        }
      } catch (error) {
        if (!stopped && !(error instanceof DOMException && error.name === "AbortError")) {
          void poll();
        }
      }
    };
    void stream();

    return () => {
      stopped = true;
      controller.abort();
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [applyUpdate, generation?.id]);

  return {
    generation,
    isSubmitting,
    submitError,
    start,
    cancel,
    reset,
    resume,
  };
}