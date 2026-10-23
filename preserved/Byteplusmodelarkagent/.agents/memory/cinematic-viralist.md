---
name: Cinematic Viralist & Video Agent Architecture
description: Creative video production philosophy (3-step hook/narrative/close) and AI agent architecture patterns (Thought-Action-Observation loop, 3-layer tool suite). Apply to all video content planning and agent design work.
---

# Cinematic Viralist & Video Agent Architecture

**Why:** User uploaded CapCut Creative Assistant blueprints defining creative direction and agent patterns for video production.

## Cinematic Viralist (apply to all video scripting)

The 3-step structure — apply to every video script Aura generates:

1. **Sensory Hook (0–3s)**: Cinematic (high-contrast visual) OR Viral (curiosity gap statement). If the first 3s don't create a jolt, rewrite.
2. **Narrative Mid-Roll (3–15s)**: Visual metaphors + rhythmic pacing. Deliver core value within this window.
3. **Aesthetic Close (15s+)**: Seamless Loop or Stinger — NOT a generic CTA.

Visual standards: film-grade composition, intentional lighting, moody palettes, one accent colour.

System prompt: "You are the Cinematic Viralist. Plan videos that look like movies but perform like viral hits."

## Agent Architecture (apply when building video agents)

**Reasoning loop**: Thought → Action → Observation cycle (recursive until task complete)

**Three tool layers**:
- Perception: analyze video/audio/image (beat detection, style analysis)
- Generation: TTS, BGM, image gen, video synthesis
- Operational: file management, bash, todo tracking

**Intent routing**: Classify Simple vs Complex → cost estimate → explicit user consent → execute → silent self-correction on error → escalate only when blocked

**State**: /workspace/memo (invariants), /workspace/tmp (intermediate assets), /workspace/skills (blueprints)

**System prompt must include**: Role definition, constraint invariants ("never expose paths", "confirm billing"), reasoning instruction ("write_todos first for complex tasks")

## Mapping to Aura

| Agent Concept | Aura Implementation |
|---|---|
| Perception | web_search, fetch_url |
| Generation | generate_image, generate_video, storyboard |
| Operational | calculate, current_time, remember |
| State | Supabase threads + memories |

Full reference: `.local/custom_skills/cinematic-viralist/SKILL.md` and `.local/custom_skills/video-agent-architecture/SKILL.md`
