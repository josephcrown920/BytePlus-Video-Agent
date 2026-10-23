# API Reference

All API endpoints are under `/api/`. All responses are JSON.

## Status

### `GET /api/status`
Check server status and API key configuration.

```json
{
  "ok": true,
  "status": "running",
  "service": "BytePlus Video Agent API",
  "version": "1.0.0",
  "apiKeyConfigured": true
}
```

---

## Image Generation

### `POST /api/image/generate`
Generate a single image with Seedream.

**Body:**
```json
{
  "prompt": "A cinematic mountain landscape",
  "version": "5.0",
  "size": "2K",
  "seed": 42,
  "images": ["https://..."],
  "outputFormat": "png",
  "confirmed": true
}
```

### `POST /api/image/series`
Generate a sequential series of images.

**Body:**
```json
{
  "prompt": "A cinematic landscape",
  "count": 3,
  "version": "5.0",
  "confirmed": true
}
```

### `GET /api/image/presets`
Get available image generation options.

---

## Video Generation

### `POST /api/video/generate`
Generate a video with Seedance.

**Body:**
```json
{
  "prompt": "Slow dolly shot through neon city",
  "version": "2.0",
  "ratio": "16:9",
  "duration": 5,
  "resolution": "1080p",
  "firstFrame": "https://...",
  "lastFrame": "https://...",
  "referenceImages": ["https://..."],
  "generateAudio": false,
  "preset": "cinematic-wide",
  "noWait": false,
  "confirmed": true
}
```

### `POST /api/video/multishot`
Generate multiple video shots in sequence.

**Body:**
```json
{
  "shots": [
    { "id": "shot-1", "prompt": "Wide establishing shot" },
    { "id": "shot-2", "prompt": "Medium shot of character" }
  ],
  "version": "2.0",
  "ratio": "16:9",
  "duration": 5,
  "resolution": "1080p",
  "confirmed": true
}
```

### `GET /api/video/tasks`
List all active generation tasks.

### `GET /api/video/tasks/:id?maxWait=5`
Poll a specific task for status.

### `GET /api/video/presets`
Get available video presets and options.

---

## Drafts

### `GET /api/drafts?type=video&status=draft`
List all drafts, optionally filtered.

### `POST /api/drafts`
Create a new draft.

```json
{
  "type": "video",
  "data": {
    "prompt": "...",
    "duration": 5
  }
}
```

### `GET /api/drafts/:id`
Get a specific draft.

### `PUT /api/drafts/:id`
Update a draft.

```json
{
  "data": { "prompt": "updated prompt" }
}
```

### `DELETE /api/drafts/:id`
Delete a draft.

### `POST /api/drafts/:id/duplicate`
Duplicate a draft.

### `POST /api/drafts/:id/submit`
Mark a draft as submitted.

---

## Production Bible

### `GET /api/bible`
Full bible summary.

### Characters
- `GET /api/bible/characters` — List all characters
- `POST /api/bible/characters` — Add a character `{ "name": "...", "details": {} }`
- `GET /api/bible/characters/:name` — Get a character

### Style
- `GET /api/bible/style` — Get style config
- `POST /api/bible/style` — Update style

### Scenes
- `GET /api/bible/scenes` — List all scenes
- `POST /api/bible/scenes` — Add a scene

### Narrative
- `GET /api/bible/narrative` — Get narrative
- `POST /api/bible/narrative` — Update narrative

### References
- `GET /api/bible/references?type=video` — List references

### `POST /api/bible/check`
Continuity check on text.

```json
{ "text": "Detective K walks through the alley", "assetType": "text" }
```

### `POST /api/bible/build-prompt`
Build an enhanced prompt with style and character references.

```json
{ "prompt": "A scene", "includeStyle": true, "character": "Detective K" }
```

---

## Pipeline

### `POST /api/pipeline/init`
Initialize the production pipeline.

### `POST /api/pipeline/concept`
Generate concept art for a scene.

### `POST /api/pipeline/character`
Generate a character design.

### `POST /api/pipeline/storyboard`
Generate storyboard frames.

### `POST /api/pipeline/video`
Generate video via the pipeline.

### `POST /api/pipeline/scene`
Run full scene pipeline (concept + storyboard + video).

### `GET /api/pipeline/status`
Get current pipeline status.
