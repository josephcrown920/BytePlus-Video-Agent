---
name: Aurora Brain multi-model planner
description: Multi-LLM content-planning co-creative — N models compete, a judge picks the winner; wire new routes through lib/aurora-brain.ts
---

The Aurora Brain is the multi-model "co-creative partner" for content planning. It runs several LLM candidate "brains" in parallel on one brief, then a judge model scores each and selects the strongest plan.

**Pattern:** `artifacts/api-server/src/lib/aurora-brain.ts` exports `BRAINS`, `runBrains()`, and `selectWinner()`. Brains are declared with an `id`, human `label`, a creative `angle` (injected into the system prompt so drafts differ), and an `init()` that builds the provider model from `AI_INTEGRATIONS_*` env vars, returning `null` when unconfigured so that brain is skipped. `availableBrains()` filters to configured ones.

**Provider model IDs (verified in this env):**
- OpenAI (openai-compatible gateway): `gpt-5.6-terra`
- Anthropic: `claude-sonnet-4-6`
- Google (via createGoogleGenerativeAI): `gemini-3.1-pro-preview`, `gemini-3-flash-preview`

Keep brain model ids to models actually available on the Replit AI proxy — do not switch to unlisted ids.

**Judge:** `selectWinner()` calls OpenAI `gpt-5.6-terra` as judge (independent of which brains succeeded) with a `JudgeVerdict` zod schema (per-candidate scores + winnerId + rationale). If the judge call fails, it falls back to a deterministic heuristic (strongest hook length + most scenes + has close).

**Route:** `POST /api/video-agent/brain-script` runs the brains on the `SCRIPT_SYSTEM` / `ScriptSchema` prompt, judges, then applies the existing hook-quality guard (`isWeakHook`) to the winner and returns `{ ...winnerScript, hookWarning?, brain: { winnerLabel, rationale, candidates:[{id,label,score}] } }`.

**Why:** The user's directive ("use 4-5 LLMs good at content planning, select what's better") maps to the Aurora Orchestrator concept in the design briefs — cheap/strong models compete and the best wins, rather than a single hardcoded model.

**How to apply:** Any new "generate content, pick the best" surface in Aura (scripting, hook ideas, captions) should reuse `runBrains` + `selectWinner` from this module instead of inlining a single-model call. The UI reads the `brain` report from the response to show which brain won and the ranked scores.
