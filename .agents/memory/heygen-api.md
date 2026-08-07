---
name: HeyGen API
description: HeyGen developer platform — auth ladder, key endpoints, video agent, avatars, voices, lipsync, translation, batching. Reference when building any HeyGen integration.
---

# HeyGen API — Durable Reference

**Why:** User uploaded official HeyGen llms.txt and wants the agent to know HeyGen integration patterns.

## Auth Ladder (always follow this order)

1. `HEYGEN_API_KEY` env var → `heygen` CLI or REST `X-Api-Key` header (production/scale)
2. OAuth via MCP / `heygen auth login --oauth` (trial-scale only, bills subscription credits)

Never ask the user to paste an API key into chat. Never write curl scripts before auth is verified.

## Key endpoints

- `POST /v3/videos` — create video (type: avatar | image | cinematic_avatar | studio)
- `POST /v3/video-agents` — prompt-to-video agent (mode: generate | chat)
- `GET /v3/video-agents/{id}` — poll session status
- `POST /v3/video-translate` — 30+ language lip-synced translation
- `POST /v3/lipsync` — speed or precision lipsync
- `POST /v3/ai-clipping` — long video → short viral clips
- `POST /v3/hyperframes/renders` — HTML composition → MP4
- Batch: up to 100 payloads per call, single batch_id to poll

## Defaults for POST /v3/videos

```json
{ "aspect_ratio": "auto", "resolution": "1080p" }
```
cinematic_avatar: only 16:9/9:16/1:1 (no auto)

## Rendering engines

- Avatar IV (default) — broadest support
- Avatar V — highest fidelity, opt-in per look
- Avatar III — best for photo/digital twin avatars

## Brand

- Video Agent → `brand_kit_id`
- Studio/Templates/Translation → `brand_glossary_id`

## MCP endpoint

`https://mcp.heygen.com` — supports Claude Code, Claude Web, Cursor, Gemini CLI, Grok, Lovable, OpenAI

## How to apply

When user wants HeyGen video generation in Aura, read `.local/custom_skills/heygen-api/SKILL.md` for the full reference.
