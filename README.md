# Aurora BytePlus / ModelArk Video Agent

Direct ModelArk-oriented video agent for Seedance/Seedream workflows with persistent project memory, reference-aware generation, native response streaming, asynchronous media jobs, candidate QA, targeted repair, and first-class Cinematic and Viral generation modes.

## Production loop

```text
Brief → Context → Mode Selection (Cinematic / Viral / Standard)
      → Plan (Shot Beats / Hook & Rhythm) → References → ModelArk route
      → Generate → Inspect → Approve/Reject → Repair
      → Sequence Timeline → QA → Render & CDN Deliver → Verify → Graceful Retry
```

## Generation Modes

### 🎬 Cinematic Mode
- Dedicated mode for high-production-value structured scenes and narrative storytelling.
- Shot Beat Breakdown: Establishes atmosphere, character focus, action climax, and resolving outcome.
- Metadata & Optics: Lens controls (Anamorphic 2.39:1, 35mm Prime, 85mm Portrait), Volumetric rim key lighting, and camera movement directives (Slow Push In, Crane Up, Arc Orbit, Dolly Zoom).
- Continuity-aware scoring emphasizing temporal stability, lighting consistency, and camera composition.

### ⚡ Viral Mode
- Optimized for short-form content (TikTok, Reels, Shorts) with hook-first structures and fast-paced editing.
- Hook Strategy: Visual shock, pattern interrupt, mystery loop, and bold statement hooks.
- Pacing & Faceless Flows: Rapid cuts (1.0s - 2.0s beat rhythm), faceless/trend-focused workflows, bold pop karaoke caption overlays, and thumb-stop visual triggers.
- Scoring weighted heavily for immediate visual appeal, pacing rhythm, and prompt-fit shock value.

## InVideo-like Product Flow

The BytePlus Studio UI (`artifacts/byteplus-studio`) provides an approachable, editor-style product experience:
- **Storyboard → Timeline → Render**: Drag-and-drop shot reordering, transition controls (Dissolve, Whip Pan, Flash, Zoom Blur), and real-time canvas safe-zone overlays for 16:9 widescreen, 9:16 vertical reel, and 1:1 square formats.
- **Scene Block Templates**: Instant application of pre-built templates for Cinematic Trailers, Faceless Shorts, Product Promos, and Social Ads.
- **Shot Inspector**: Granular control over beat intent, lens optics, camera motion, lighting mood, and subtitle caption overlays per shot beat.

## Customer Readiness & Reliability

- **Delivery Lifecycle**: Explicit multi-stage status tracking (`queued` → `sequence_assembly` → `audio_synthesis` → `final_render` → `delivered` / `failed`).
- **CDN Manifest & Links**: Automated CDN delivery URL generation for verified renders.
- **Graceful Retries**: Exponential backoff retry policies for GPU timeout handling with single-click manual retry actions in the Render Queue and Sequence Studio.
- **Persistent Project Memory**: Automatic persistence of user project drafts, shot sequences, and active mode settings across sessions.

## Backend

`agent-core/modelark.ts` provides:

- OpenAI-compatible Chat Completions with `stream: true` SSE;
- incremental text deltas with `[DONE]` termination;
- Seedream image generation;
- Seedance task creation and polling;
- reference image support;
- configurable model IDs and regional endpoints;
- retry handling for rate limits and transient provider failures.

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

Chat/agent responses stream directly from ModelArk. Long video jobs emit truthful progress events rather than fake completion: `accepted`, `planning`, `routing`, `generating`, `inspecting`, `revising`, `rendering`, `completed`, `retrying`, `failed`.

## Agent behavior

Use project memory and locked references before every generation. Score candidates for identity, prompt fit, camera, anatomy, lighting, composition and temporal continuity. Repair only the failed unit. Never silently substitute a user-pinned model.

## Skills

Video routing includes dedicated `cinematic-director` and `viral-growth-engine` skills alongside HeyGen Avatar, HeyGen Video, HeyGen Translate, Chengfeng 剪口播, Chengfeng 口播成片, Ian Xiaohei SVG Motion and Chengfeng 自进化 skill families.

## Acceptance

A feature is complete only after the domain contract, API/workflow, provider boundary, observable status, failure path, revision path and verifiable output exist.

## Development

```bash
pnpm install
pnpm run typecheck
PORT=3000 BASE_PATH=/ pnpm run build
npx tsx --test agent-core/video-agent.test.ts
```

## Production boundary

Direct ModelArk execution requires a valid API key and activated model/endpoints. Rendering, storage and queue infrastructure are also deployment responsibilities.

## Aurora Global

ModelArk backend and streaming improvements are propagated into Aurora Global's product-facing video agents and exported surfaces.
