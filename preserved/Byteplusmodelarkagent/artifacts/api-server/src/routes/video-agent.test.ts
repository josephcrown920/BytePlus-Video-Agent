import express from "express";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────
// `generateObject` is the only boundary to the LLM — mock it so the route's
// retry logic can be driven deterministically without a real network call.
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, generateObject: vi.fn() };
});

// `requireAuth` calls Supabase to validate the bearer token — mock it so every
// request with an Authorization header resolves to a fixed test user.
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "test-user-id" } },
        error: null,
      }),
    },
  })),
}));

import { generateObject } from "ai";

const generateObjectMock = vi.mocked(generateObject);

// ── Fixtures ─────────────────────────────────────────────────────────────────

function scriptWith(scene0Description: string, hook = "A punchy sensory opener") {
  return {
    title: "Test Video",
    hook,
    scenes: [
      { index: 0, title: "Hook", script: "Voiceover for hook.", description: scene0Description, duration: 3 },
      { index: 1, title: "Mid", script: "Voiceover for mid-roll.", description: "Tense montage of hands working.", duration: 10 },
    ],
    close: "A seamless loop back to the first frame.",
    mood: "high-energy" as const,
  };
}

const WEAK_SCRIPT = scriptWith("A title card fades in showing the brand logo");
const GOOD_SCRIPT = scriptWith("Extreme macro close-up: a droplet of ink explodes against white paper");

// ── Test server ──────────────────────────────────────────────────────────────

let baseUrl: string;
let server: ReturnType<express.Express["listen"]>;

beforeAll(async () => {
  process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"] = "https://example.test/v1";
  process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] = "test-key";
  process.env["SUPABASE_URL"] = "https://example.test";
  process.env["SUPABASE_PUBLISHABLE_KEY"] = "test-publishable-key";

  const { default: videoAgentRouter } = await import("./video-agent.js");
  const app = express();
  app.use(express.json());
  app.use("/api/video-agent", videoAgentRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(() => {
  server?.close();
});

beforeEach(() => {
  generateObjectMock.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

interface GenerateScriptResponse {
  title: string;
  hook: string;
  scenes: Array<{ index: number; title: string; script: string; description: string; duration: number }>;
  close: string;
  mood?: string;
  hookWarning?: boolean;
}

async function postGenerateScript() {
  const res = await fetch(`${baseUrl}/api/video-agent/generate-script`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
    body: JSON.stringify({ prompt: "a viral product launch", style: "cinematic", targetDuration: 30 }),
  });
  const body = (await res.json()) as GenerateScriptResponse;
  return { status: res.status, body };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("POST /generate-script — hook-quality retry", () => {
  it("retries once and serves the clean result with no hookWarning when attempt 1 is weak and attempt 2 passes", async () => {
    generateObjectMock
      .mockResolvedValueOnce({ object: WEAK_SCRIPT } as never)
      .mockResolvedValueOnce({ object: GOOD_SCRIPT } as never);

    const { status, body } = await postGenerateScript();

    expect(status).toBe(200);
    expect(generateObjectMock).toHaveBeenCalledTimes(2);
    expect(body.scenes[0].description).toBe(GOOD_SCRIPT.scenes[0]!.description);
    expect(body.hookWarning).toBeUndefined();

    // The retry call must name the exact failure so the model can self-correct.
    const retryPrompt = generateObjectMock.mock.calls[1]?.[0]?.prompt as string;
    expect(retryPrompt).toContain("CORRECTION REQUIRED");
    expect(retryPrompt).toContain("title card");
  });

  it("returns hookWarning: true when both the original attempt and the correction retry are weak", async () => {
    generateObjectMock
      .mockResolvedValueOnce({ object: WEAK_SCRIPT } as never)
      .mockResolvedValueOnce({ object: scriptWith("Another logo reveal on a black background") } as never);

    const { status, body } = await postGenerateScript();

    expect(status).toBe(200);
    expect(generateObjectMock).toHaveBeenCalledTimes(2);
    expect(body.hookWarning).toBe(true);
  });

  it("does not retry and has no hookWarning when the first attempt already passes", async () => {
    generateObjectMock.mockResolvedValueOnce({ object: GOOD_SCRIPT } as never);

    const { status, body } = await postGenerateScript();

    expect(status).toBe(200);
    expect(generateObjectMock).toHaveBeenCalledTimes(1);
    expect(body.hookWarning).toBeUndefined();
    expect(body.scenes[0].description).toBe(GOOD_SCRIPT.scenes[0]!.description);
  });
});
