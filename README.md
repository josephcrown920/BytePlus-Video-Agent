# Aurora BytePlus / ModelArk Video Agent

Direct ModelArk-oriented video agent for Seedance/Seedream workflows with persistent project memory, reference-aware generation, native response streaming, asynchronous media jobs, candidate QA and targeted repair.

## Production modes

Every request resolves to a first-class **production mode** that reshapes planning, pacing, skill routing and presets — not just cosmetic labels:

- **Cinematic Mode** — continuity-aware shot-beat planning (intent, camera framing/movement, lens style, lighting/mood), slower pacing (default 6s/beat), 16:9, and a curated preset shortlist (`anamorphic_35mm`, `golden_hour_grade`, `volumetric_dolly`, `continuity_lockstep`, …). Prioritizes the storyboard/timeline (`chengfeng-finished-video`) and SVG motion skills.
- **Viral Mode** — hook-first beat structure, rapid pacing (default 2s/beat), 9:16, faceless/trend-friendly b-roll beats, and viral presets (`HOOK_FIRST_FACELESS`, `CAPTION_PUNCH_CUT`, `TREND_REMIX`, …). Prioritizes the captioning/cut (`chengfeng-cut`) and storyboard skills so output stays caption-ready.
- **Standard Mode** — balanced, general-purpose pacing and defaults.

Modes are resolved explicitly (`mode: "cinematic" | "viral" | "standard"`) or inferred from the task type/instruction via `resolveProductionMode` in `agent-core/production.ts`, and selection changes the actual plan: `planShotBeats` produces mode-specific `ShotPlan`s, `selectVideoSkills(instruction, mode)` changes routed skills, and `presetsForMode(mode)` changes suggested presets. The Studio UI exposes an explicit Cinematic/Viral/Standard mode selector that drives aspect ratio, placeholder copy, and style modifiers.

## Production loop

```text
Brief → Context → Plan (mode-aware shot beats) → References → ModelArk route
      → Generate → Inspect → Approve/Reject → Repair
      → Slate → QA → Render → Verify → Deliver
```

## Backend

`agent-core/modelark.ts` provides:

- OpenAI-compatible Chat Completions with `stream: true` SSE;
- incremental text deltas with `[DONE]` termination;
- Seedream image generation;
- Seedance task creation and polling;
- reference image support;
- configurable model IDs and regional endpoints;
- retry handling for rate limits and transient provider failures.

`agent-core/video-agent-runtime.ts` adds `streamProductionJob`, an async generator that streams truthful staged progress for a full media job by calling the real ModelArk image/video endpoints — no stage is emitted before the work it names has actually started, and failures surface as a `failed` stage plus a retryable error event rather than a fake success.

## Environment

```text
ARK_API_KEY=...
ARK_BASE_URL=https://ark.ap-southeast.bytepluses.com/api/v3
MODELARK_TEXT_MODEL=<active text model or endpoint>
MODELARK_IMAGE_MODEL=<active Seedream model or endpoint>
MODELARK_VIDEO_MODEL=<active Seedance model or endpoint>
```

Keep all secrets server-side and use your deployment secret manager.

## Streaming policy

Chat/agent responses stream directly from ModelArk, token by token, via `streamModelArkChat`/`streamVideoRequest`. Long video jobs emit truthful progress events rather than fake completion, using the shared stage vocabulary: `planning`, `routing`, `generating`, `inspecting`, `revising`, `rendering`, `verifying`, `delivering`, `completed`, `retrying`, `failed`. `streamProductionJob` (see `agent-core/video-agent-runtime.ts`) implements this for full media jobs, and the Studio's render queue narrates the same stage vocabulary live (see "Agent narration" below) instead of a fake instant progress bar.

## Agent narration

While a job runs, the agent surfaces short, plain-language narration lines per stage (e.g. "Routing to the cinematic pipeline: storyboard + timeline skills, ModelArk Seedance/Seedream.") so the workflow feels transparent rather than opaque. Narration is mode-aware: cinematic narration talks about continuity/lighting/lens, viral narration talks about hooks/pacing/captions. Narration is always paired with the real stage the system is in — it is never used to imply progress that hasn't happened. Failed jobs keep their narration log and expose a retry action that re-enters `planning` with the same locks/references rather than starting over silently.

## Agent behavior

Use project memory and locked references before every generation. Score candidates for identity, prompt fit, camera, anatomy, lighting, composition and temporal continuity. Repair only the failed unit. Never silently substitute a user-pinned model. Mode selection (cinematic/viral/standard) is a first-class input to planning, skill routing and preset selection — the same instruction produces a materially different plan depending on mode.

## Skills

Video routing includes the supplied HeyGen Avatar, HeyGen Video, HeyGen Translate, Chengfeng 剪口播, Chengfeng 口播成片, Ian Xiaohei SVG Motion and Chengfeng 自进化 skill families. Mode changes which of these are prioritized: see `selectVideoSkills` in `agent-core/video-agent-skills.ts`.

## Acceptance

A feature is complete only after the domain contract, API/workflow, provider boundary, observable status, failure path, revision path and verifiable output exist.

## Development

```bash
npm install
npx tsc --noEmit
npm run build
```

## Production boundary

Direct ModelArk execution requires a valid API key and activated model/endpoints. Rendering, storage and queue infrastructure are also deployment responsibilities.

## Aurora Global

ModelArk backend and streaming improvements are propagated into Aurora Global's product-facing video agents and exported surfaces.

