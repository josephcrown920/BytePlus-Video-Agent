# Aurora BytePlus / ModelArk Video Agent

Direct ModelArk-oriented video agent for Seedance/Seedream workflows with persistent project memory, reference-aware generation, native response streaming, asynchronous media jobs, candidate QA and targeted repair.

## Production loop

```text
Brief → Context → Plan → References → ModelArk route
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

Video routing includes the supplied HeyGen Avatar, HeyGen Video, HeyGen Translate, Chengfeng 剪口播, Chengfeng 口播成片, Ian Xiaohei SVG Motion and Chengfeng 自进化 skill families.

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
