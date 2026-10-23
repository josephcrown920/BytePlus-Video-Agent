import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ELEVENLABS_VOICES,
  getOpenAiSpeakingInstructions,
  getSpeakingStyleSettings,
  resolveElevenLabsVoice,
  synthesizeVoiceover,
} from "./chat.js";

describe("voiceover selection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves a curated ElevenLabs voice from its friendly name", () => {
    expect(resolveElevenLabsVoice("Rachel").voiceId).toBe("21m00Tcm4TlvDq8ikWAM");
    expect(resolveElevenLabsVoice("adam").voiceId).toBe("pNInz6obpgDQGcFmaJgB");
  });

  it("keeps an account-specific ElevenLabs voice ID available", () => {
    expect(resolveElevenLabsVoice("account-voice-id").voiceId).toBe("account-voice-id");
  });

  it("ships a compact curated ElevenLabs voice list", () => {
    expect(Object.keys(ELEVENLABS_VOICES)).toHaveLength(6);
  });

  it("maps speaking direction to ElevenLabs settings and OpenAI instructions", () => {
    expect(getSpeakingStyleSettings("energetic and upbeat")).toMatchObject({
      stability: 0.35,
      style: 0.55,
    });
    expect(getOpenAiSpeakingInstructions("calm and reassuring")).toContain(
      "calm and reassuring",
    );
  });

  it("uses OpenAI when ElevenLabs is not configured", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(Buffer.from("openai-audio"), { status: 200 }));

    const result = await synthesizeVoiceover(
      "A polished launch story.",
      "nova",
      undefined,
      "https://replit.example/v1",
      "test-key",
      "",
    );

    expect(result.provider).toBe("openai");
    expect(result.audioBuffer?.toString()).toBe("openai-audio");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://replit.example/v1/audio/speech",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("falls back to OpenAI when ElevenLabs is rate limited", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("rate limited", { status: 429 }))
      .mockResolvedValueOnce(new Response(Buffer.from("fallback-audio"), { status: 200 }));

    const result = await synthesizeVoiceover(
      "A resilient voiceover.",
      "Rachel",
      "warm and conversational",
      "https://replit.example/v1",
      "test-key",
      "eleven-test-key",
    );

    expect(result.provider).toBe("openai");
    expect(result.audioBuffer?.toString()).toBe("fallback-audio");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns no provider when both TTS providers fail", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("rate limited", { status: 429 }))
      .mockResolvedValueOnce(new Response("not found", { status: 404 }));

    const result = await synthesizeVoiceover(
      "This should not become a silent success.",
      undefined,
      undefined,
      "https://replit.example/v1/",
      "test-key",
      "eleven-test-key",
    );

    expect(result).toEqual({ audioBuffer: null, provider: "none" });
  });
});