// Aurora Brain — a multi-model content-planning co-creative partner.
//
// Runs several LLM "brains" in parallel on the same content-planning brief,
// each with its own creative angle, then a judge model scores every candidate
// and selects the strongest result. This mirrors the Aurora Orchestrator concept:
// cheap/strong models compete, and the best one wins.

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";

// ── Brain registry ───────────────────────────────────────────────────────────
// Each brain pairs a real available model with a creative angle so the same
// brief produces genuinely different drafts (not four identical answers).

export type BrainId = "gpt" | "claude" | "gemini-pro" | "gemini-flash";

export type Brain = {
  id: BrainId;
  label: string;
  angle: string;
  init: () => LanguageModel | null;
};

function openaiModel(): LanguageModel | null {
  const baseURL = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
  const apiKey = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];
  if (!baseURL || !apiKey) return null;
  const client = createOpenAICompatible({
    name: "replit-openai",
    baseURL,
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return client("gpt-5.6-terra") as unknown as LanguageModel;
}

function claudeModel(): LanguageModel | null {
  const baseURL = process.env["AI_INTEGRATIONS_ANTHROPIC_BASE_URL"];
  const apiKey = process.env["AI_INTEGRATIONS_ANTHROPIC_API_KEY"];
  if (!baseURL || !apiKey) return null;
  const anthropic = createAnthropic({ baseURL, apiKey });
  return anthropic("claude-sonnet-4-6") as unknown as LanguageModel;
}

function geminiModel(modelId: string): LanguageModel | null {
  const baseURL = process.env["AI_INTEGRATIONS_GEMINI_BASE_URL"];
  const apiKey = process.env["AI_INTEGRATIONS_GEMINI_API_KEY"];
  if (!baseURL || !apiKey) return null;
  const google = createGoogleGenerativeAI({ baseURL, apiKey });
  return google(modelId) as unknown as LanguageModel;
}

export const BRAINS: Brain[] = [
  {
    id: "gemini-pro",
    label: "Gemini 3.1 Pro",
    angle:
      "Deep cinematic planner. You think in camera moves, color grade and structure; you favor rich, layered visual storytelling with a strong narrative spine.",
    init: () => geminiModel("gemini-3.1-pro-preview"),
  },
  {
    id: "gpt",
    label: "GPT-5 Terra",
    angle:
      "Fast, punchy creative director. You lead with bold hooks, tight pacing and thumb-stopping energy; you favor action-first, high-contrast openings.",
    init: openaiModel,
  },
  {
    id: "claude",
    label: "Claude Sonnet 4.6",
    angle:
      "Precise editorial storyteller. You care about emotional logic, specificity and graceful transitions; your scenes feel deliberate and earned.",
    init: claudeModel,
  },
  {
    id: "gemini-flash",
    label: "Gemini Flash",
    angle:
      "Concise hook specialist. You strip every scene to its single most arresting image and write tight, quotable narration with minimal filler.",
    init: () => geminiModel("gemini-3-flash-preview"),
  },
];

/** The brains that are actually configured and usable in this environment. */
export function availableBrains(): Brain[] {
  return BRAINS.filter((b) => b.init() !== null);
}

// A typed result from one brain.
export type BrainCandidate = {
  brain: Brain;
  /** The structured script object produced by the brain. */
  object: Record<string, unknown>;
  /** Human-readable one-line pitch for the judge. */
  summary: string;
};

// ── Judge output schema ──────────────────────────────────────────────────────
const JudgeScoreSchema = z.object({
  brainId: z.string(),
  hook: z.number(),
  narrative: z.number(),
  fit: z.number(),
  originality: z.number(),
  total: z.number(),
});

const JudgeOutputSchema = z.object({
  scores: z.array(JudgeScoreSchema),
  winnerId: z.string(),
  rationale: z.string(),
});

export type JudgeVerdict = {
  scores: Array<{
    brainId: string;
    hook: number;
    narrative: number;
    fit: number;
    originality: number;
    total: number;
  }>;
  winnerId: string;
  rationale: string;
};

// ── Run the brains ───────────────────────────────────────────────────────────

/**
 * Runs every usable brain in parallel against the same system+prompt, each with
 * its own creative angle baked into the system prompt. Returns successful drafts.
 */
export async function runBrains(opts: {
  system: string;
  prompt: string;
  schema: z.ZodTypeAny;
}): Promise<BrainCandidate[]> {
  const brains = availableBrains();
  if (brains.length < 2) {
    throw new Error("Aurora Brain needs at least two configured models.");
  }

  const results = await Promise.allSettled(
    brains.map(async (brain): Promise<BrainCandidate> => {
      const model = brain.init()!;
      const angledSystem = `${opts.system}

## YOUR CREATIVE ANGLE
${brain.angle}
Write in that voice — it is your competitive advantage over the other brains. Do not just imitate the others; lean into your angle.`;

      const { object } = await generateObject({
        model,
        system: angledSystem,
        prompt: opts.prompt,
        schema: opts.schema,
      });
      const rec = object as unknown as Record<string, unknown>;
      return {
        brain,
        object: rec,
        summary: summarize(rec),
      };
    }),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<BrainCandidate> => r.status === "fulfilled")
    .map((r) => r.value);
}

// ── Judge ────────────────────────────────────────────────────────────────────

/**
 * Have a strong model score every candidate and pick the winner.
 * Falls back deterministically if the judge call itself fails.
 */
export async function selectWinner(opts: {
  brief: string;
  system: string;
  candidates: BrainCandidate[];
}): Promise<{ verdict: JudgeVerdict; winner: BrainCandidate }> {
  // Prefer the strongest available model as judge — default to OpenAI gateway
  // so the judge never depends on a brain being available.
  const baseURL = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
  const apiKey = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];

  const fallback = () =>
    scoreFallback(opts.candidates).verdict;

  if (baseURL && apiKey) {
    try {
      const client = createOpenAICompatible({
        name: "replit-openai",
        baseURL,
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const judgeModel = client("gpt-5.6-terra") as unknown as LanguageModel;

      const candidatesBlock = opts.candidates
        .map((c, i) => `[${i + 1}] brain="${c.brain.id}" label="${c.brain.label}"\n${c.summary}`)
        .join("\n\n");

      const judgmentPrompt = `You are the Aurora Orchestrator — a ruthless, senior creative director who picks the single strongest video plan.

BRIEF:
${opts.brief}

CANDIDATES (each from a different creative brain):
${candidatesBlock}

Score each candidate 0-10 on:
- hook: is Scene 1 a genuine 0-3s sensory shock (never a title card/logo/fade-in)?
- narrative: do the middle scenes build tension and each earn their place?
- fit: how well does it match the brief, style and target duration?
- originality: is it fresh and specific, not generic filler?
total = average of the four.

Choose the winner (best overall plan). Return ONLY JSON.`;

      const { object } = await generateObject({
        model: judgeModel,
        system:
          "You are the Aurora Orchestrator. You compare candidate video plans and return a JSON verdict with per-candidate scores, a winnerId (one of the candidate brain ids), and a brief rationale.",
        prompt: judgmentPrompt,
        schema: JudgeOutputSchema,
      });

      const verdict = object as JudgeVerdict;
      const winner = opts.candidates.find((c) => c.brain.id === verdict.winnerId);
      if (winner) return { verdict, winner };
    } catch (err) {
      console.warn("aurora-brain: judge call failed, falling back to heuristic", err instanceof Error ? err.message : err);
    }
  }

  return scoreFallback(opts.candidates);
}

// Deterministic fallback: prefer the candidate with the strongest hook text and
// the most scenes (a proxy for a complete plan) and no hookWarning.
function scoreFallback(candidates: BrainCandidate[]): { verdict: JudgeVerdict; winner: BrainCandidate } {
  const scores = candidates.map((c) => {
    const rec = c.object as {
      hook?: string;
      scenes?: Array<{ title?: string }>;
      close?: string;
    };
    const hookLen = (rec.hook ?? "").length;
    const hookScore = Math.min(10, 2 + hookLen / 14);
    const sceneCount = Array.isArray(rec.scenes) ? rec.scenes.length : 0;
    const narrative = Math.min(10, sceneCount >= 4 ? 8 + Math.min(2, sceneCount / 6) : 4);
    const closeScore = (rec.close ?? "").length > 0 ? 8 : 4;
    const total = (hookScore + narrative + fitHeuristic(rec) + closeScore) / 4;
    return {
      brainId: c.brain.id,
      hook: Math.round(hookScore * 10) / 10,
      narrative: Math.round(narrative * 10) / 10,
      fit: 7,
      originality: 7,
      total: Math.round(total * 10) / 10,
    };
  });

  const best = scores.reduce((a, b) => (b.total > a.total ? b : a), scores[0]);
  const winner = candidates.find((c) => c.brain.id === best.brainId) ?? candidates[0];
  return {
    verdict: {
      scores,
      winnerId: best.brainId,
      rationale: "Selected by heuristic fallback (strongest hook + most complete plan) because the judge model was unavailable.",
    },
    winner,
  };
}

function fitHeuristic(rec: {
  hook?: string;
  scenes?: Array<{ title?: string }>;
  close?: string;
}): number {
  const hasClose = (rec.close ?? "").length > 0;
  const sceneCount = Array.isArray(rec.scenes) ? rec.scenes.length : 0;
  if (hasClose && sceneCount >= 4) return 9;
  if (hasClose || sceneCount >= 4) return 7;
  return 4;
}

/** Build a concise, judge-friendly pitch for a candidate script object. */
function summarize(rec: Record<string, unknown>): string {
  const r = rec as {
    title?: string;
    hook?: string;
    close?: string;
    scenes?: Array<{ title?: string; script?: string }>;
  };
  const sceneTitles = (r.scenes ?? []).map((s) => s.title).join(" | ");
  return [
    `Title: ${r.title ?? "(untitled)"}`,
    `Hook: ${r.hook ?? "(missing)"}`,
    `Close: ${r.close ?? ""}`,
    `Scenes (${r.scenes?.length ?? 0}): ${sceneTitles}`,
  ].join("\n");
}
