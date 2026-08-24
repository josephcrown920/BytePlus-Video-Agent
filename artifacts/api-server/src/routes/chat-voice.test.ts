import { describe, expect, it } from "vitest";
import {
  ELEVENLABS_VOICES,
  getOpenAiSpeakingInstructions,
  getSpeakingStyleSettings,
  resolveElevenLabsVoice,
} from "./chat.js";

describe("voiceover selection", () => {
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
});