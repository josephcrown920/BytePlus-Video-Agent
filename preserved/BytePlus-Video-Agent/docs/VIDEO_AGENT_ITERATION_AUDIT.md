# Video Agent Iteration Audit

Shared baseline now includes project memory, production routing, ModelArk-first video/image preference with FAL/Replicate/Vast fallbacks, ModelArk SSE, supplied preset index, and video-skill routing.

Acceptance path: `UI → API → agent memory/context → provider router → provider job → progress → QA → targeted revision → render → verified artifact`.

Open items are deliberately visible: live ModelArk model activation must be supplied through server secrets; UI-to-SSE end-to-end smoke testing is still required per product surface; real frame-level QA and durable queue behavior depend on deployed vision/Redis/Postgres/render workers. ModelArk is a preferred backend, not a hard lock.

## Iteration: cinematic/viral modes + agentic streaming

- Added first-class `ProductionMode` ("cinematic" | "viral" | "standard") to `agent-core/production.ts`, with mode-aware shot-beat planning (`planShotBeats`), pacing, aspect ratio, and hook-first ordering (`hookFirstOrder`) for viral content.
- Added cinematic preset index (`CINEMATIC_PRESET_IDS`) and expanded viral presets, plus `presetsForMode` to surface mode-appropriate suggestions.
- `selectVideoSkills` now takes an optional `mode` and layers mode-default skills (storyboard/timeline + SVG motion for cinematic; cut/caption + storyboard for viral) on top of instruction-matched skills.
- `project-memory/core.ts` gained mode-aware retrieval keywords (`CINEMATIC_SHOT_GENERATION`, `VIRAL_SHOT_GENERATION`) and an optional `mode` field on `GenerationRecord`.
- `agent-core/video-agent-runtime.ts` gained `streamProductionJob`, an async generator that streams the truthful stage vocabulary (planning → routing → generating → inspecting → verifying → delivering → completed, or → failed) around the real ModelArk image/video calls, so streaming and agent narration are grounded in actual backend state rather than simulated.
- The Studio UI (`artifacts/byteplus-studio`) gained an explicit Cinematic/Viral/Standard mode selector, mode-aware style tags/placeholders/aspect ratio, and the render queue/generation view now narrate the same staged vocabulary (with a real failure/retry path) instead of an instantaneous fake progress bar.

Still open: the Studio UI's job simulation is still local-only (no live network calls into `streamProductionJob` yet) — wiring the UI to a real SSE endpoint backed by `streamProductionJob` remains the next integration step once server infrastructure (queue/persistence) is deployed.
