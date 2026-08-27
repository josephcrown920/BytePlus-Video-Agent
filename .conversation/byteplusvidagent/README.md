# BytePlus Video Agent (vidagent)

> 🎬 A complete cinematic AI video production pipeline powered by BytePlus Seedream and Seedance APIs.

The BytePlus Video Agent is a Hollywood-grade video generation system that turns text prompts into cinematic video productions. It orchestrates the entire production pipeline — from concept art and character design, through storyboarding, to final video generation — with built-in continuity management to ensure visual consistency across all assets.

## ✨ Features

- **🌐 Web UI** — Beautiful dark-mode interface for all generation controls
- **⚡ REST API** — Full API for integration into your own apps
- **🎨 Seedream Image Generation** — Photorealistic concept art, character designs, storyboard frames
- **🎥 Seedance Video Generation** — Cinematic video clips with multiple model versions (1.5 Pro, 2.0, 2.0 Fast)
- **🎞️ Multi-Shot Generation** — Create sequences of shots for full scenes
- **📝 Drafts System** — Save, duplicate, and manage generation ideas before committing
- **📖 Production Bible** — Built-in continuity system for character, style, scene, and narrative consistency
- **🎬 Cinematic Presets** — Ready-to-use presets for different formats (cinematic wide, theatrical, social, storyboard)
- **🔄 Full Pipeline** — Script → Concept Art → Storyboard → Video → Deliverables
- **💻 CLI Tool** — Command-line interface for quick generation and pipeline management
- **📦 Node.js Library** — Full programmatic API for integration into your own projects
- **📁 Organized Output** — Standardized asset directory structure
- **🚫 Zero Dependencies** — Pure Node.js + native fetch, no npm install needed

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- BytePlus ARK API key (`ARK_API_KEY` environment variable)

### Installation

```bash
# Clone the repository
git clone https://github.com/josephcrown920/Byteplusvidagent.git
cd Byteplusvidagent

# Set your API key
export ARK_API_KEY="your-api-key-here"

# Start the web server + UI
npm start
# or: node src/server/index.js

# Open in your browser
# 🌐 UI:  http://localhost:3000
# 📡 API: http://localhost:3000/api/status
```

**Zero dependencies required!** No `npm install` needed — everything uses native Node.js.

## 🌐 Web UI

The easiest way to use the Video Agent is through the web interface:

```bash
npm start
# 🌐 Open http://localhost:3000 in your browser
```

**UI Features:**
- 🎨 **Image Generator** — Seedream with model selection (4.0/4.5/5.0)
- 🎥 **Video Generator** — Seedance with 5 cinematic presets
- 🎞️ **Multi-Shot** — Sequences of multiple video shots
- 📝 **Drafts** — Save, duplicate, and manage generation ideas
- 📖 **Production Bible** — Characters, style, scenes, narrative
- ⚡ **Tasks** — Monitor generation progress with auto-refresh
- 🔧 **Pipeline** — Full concept→storyboard→video workflow

## 💻 CLI Usage

```bash
# Generate an image (dry-run preview first)
node src/cli/index.js image generate --prompt "A cinematic mountain landscape at golden hour" --version 5.0

# Generate for real (add --confirmed)
node src/cli/index.js image generate --prompt "A cinematic mountain landscape at golden hour" --version 5.0 --confirmed

# Generate a video (dry-run preview)
node src/cli/index.js video generate --prompt "Slow dolly shot through a neon city at night" --preset cinematic-wide

# Generate for real
node src/cli/index.js video generate --prompt "Slow dolly shot through a neon city at night" --preset cinematic-wide --confirmed

# List cinematic presets
node src/cli/index.js presets

# Show production bible status
node src/cli/index.js bible show

# Run the quickstart verification
node scripts/quickstart.js
```

## 🎛️ Cinematic Presets

| Preset | Description | Ratio | Resolution | Duration | Model |
|---|---|---|---|---|---|
| `cinematic-wide` | Ultra-wide cinematic scope, 2.39:1 equivalent | 21:9 | 1080p | 8s | 2.0 |
| `theatrical` | Standard theatrical widescreen | 16:9 | 1080p | 10s | 2.0 |
| `social-portrait` | Vertical for TikTok/Reels/Shorts | 9:16 | 1080p | 5s | 1.5-pro |
| `social-landscape` | Landscape social media | 16:9 | 720p | 5s | 1.5-pro |
| `storyboard` | Fast preview for iteration | 16:9 | 480p | 3s | 2.0-fast |

## 📖 Production Bible

The Production Bible is the single source of truth for all creative decisions. It ensures continuity across every generated asset:

- **Character Bible** — Visual specs for every character
- **Style Bible** — Color palette, lighting, lens characteristics, film grain
- **Scene Bible** — Locations, time of day, props, set dressing
- **Narrative Bible** — Plot points, character arcs, story beats
- **Reference Library** — All approved concept art and generated assets

```bash
# Add a character to the bible
vidagent bible add-character --name "Detective K" --description "Weary detective, cybernetic eye, trench coat"

# Set overall visual style
vidagent bible set-style --style "cyberpunk neon, Blade Runner 2049 aesthetic, dramatic lighting"

# Check continuity of a description
vidagent bible check --text "Detective K walks through the alley"
```

## 🔧 Programmatic Usage

The BytePlus Video Agent can be used as a Node.js library:

```javascript
import { SeedreamClient, SeedanceClient, CinematicPipeline } from "byteplus-vidagent";

// Generate an image
const seedream = new SeedreamClient();
const image = await seedream.generateImage("A cinematic landscape", {
  version: "5.0",
  size: "2K",
});

// Generate a video
const seedance = new SeedanceClient();
const video = await seedance.generate({
  prompt: "Slow dolly shot through a neon city",
  version: "2.0",
  ratio: "21:9",
  duration: 8,
  resolution: "1080p",
});

// Full pipeline
const pipeline = new CinematicPipeline({
  onProgress: (p) => console.log(`[${p.stage}] ${p.message}`),
});

await pipeline.init({
  style: {
    colorPalette: "neon cyan and magenta, deep blacks",
    lighting: "dramatic neon, volumetric fog",
    lens: "anamorphic lens, 35mm",
  },
});

await pipeline.generateCharacterDesign("Detective K", "...");
await pipeline.generateStoryboard("scene-1", shots);
await pipeline.generateVideo("scene-1", "main", "...");
```

## 📡 REST API

All functionality is available via a REST API:

| Endpoint | Method | Description |
|---|---|---|
| `/api/status` | GET | Server status and API key check |
| `/api/image/generate` | POST | Generate an image with Seedream |
| `/api/image/series` | POST | Generate a series of images |
| `/api/image/presets` | GET | Available image presets and options |
| `/api/video/generate` | POST | Generate a video with Seedance |
| `/api/video/multishot` | POST | Generate multiple video shots |
| `/api/video/tasks` | GET | List all active tasks |
| `/api/video/tasks/:id` | GET | Poll a specific task |
| `/api/video/presets` | GET | Available video presets |
| `/api/drafts` | GET/POST | List or create drafts |
| `/api/drafts/:id` | GET/PUT/DELETE | Get, update, or delete a draft |
| `/api/drafts/:id/duplicate` | POST | Duplicate a draft |
| `/api/drafts/:id/submit` | POST | Mark draft as submitted |
| `/api/bible` | GET | Full bible summary |
| `/api/bible/characters` | GET/POST | List or add characters |
| `/api/bible/style` | GET/POST | Get or set style |
| `/api/bible/scenes` | GET/POST | List or add scenes |
| `/api/bible/narrative` | GET/POST | Get or set narrative |
| `/api/bible/references` | GET | List references |
| `/api/bible/check` | POST | Continuity check |
| `/api/bible/build-prompt` | POST | Build enhanced prompt |
| `/api/pipeline/init` | POST | Initialize production pipeline |
| `/api/pipeline/concept` | POST | Generate concept art |
| `/api/pipeline/character` | POST | Generate character design |
| `/api/pipeline/storyboard` | POST | Generate storyboard frames |
| `/api/pipeline/video` | POST | Generate video via pipeline |
| `/api/pipeline/scene` | POST | Run full scene pipeline |
| `/api/pipeline/status` | GET | Pipeline status |

**Example API call:**
```bash
curl -X POST http://localhost:3000/api/image/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"A cinematic landscape","version":"5.0","confirmed":true}'
```

## 📁 Project Structure

```
Byteplusvidagent/
├── src/
│   ├── cli/index.js              # CLI entry point
│   ├── server/
│   │   ├── index.js              # Server startup
│   │   ├── server.js             # HTTP server + router
│   │   ├── static.js             # Static file serving
│   │   └── routes/
│   │       ├── image-routes.js   # Image generation API
│   │       ├── video-routes.js   # Video generation API (incl. multishot)
│   │       ├── pipeline-routes.js # Pipeline API
│   │       ├── bible-routes.js   # Production Bible API
│   │       └── draft-routes.js   # Drafts API
│   ├── core/
│   │   ├── config.js             # Configuration, presets, constants
│   │   ├── seedream-client.js    # Seedream image generation API client
│   │   └── seedance-client.js    # Seedance video generation API client
│   ├── pipeline/
│   │   └── cinematic-pipeline.js # Full production pipeline orchestration
│   ├── bible/
│   │   └── production-bible.js   # Continuity and production bible system
│   ├── drafts/
│   │   └── draft-manager.js      # Draft saving and management
│   └── index.js                  # Main library entry point
├── public/
│   ├── index.html                # Web UI
│   ├── styles.css                # UI styles
│   └── app.js                    # UI logic
├── examples/
│   ├── basic-image.js            # Simple image generation example
│   ├── basic-video.js            # Simple video generation example
│   └── full-pipeline.js          # Complete cinematic pipeline example
├── assets/
│   ├── images/                   # Generated images
│   ├── videos/                   # Generated videos
│   └── vfx/                      # VFX elements
├── production-bible/             # Production bible JSON files
├── drafts/                       # Saved generation drafts
├── deliverables/                 # Final deliverables
├── reports/                      # Continuity reports and logs
├── scripts/
│   ├── quickstart.js             # Setup verification script
│   └── scenes/scene-template.json
└── package.json
```

## 🎚️ Models

### Seedream (Image Generation)
- **4.0** — `doubao-seedream-4-0-250828` — Default, great all-around
- **4.5** — `doubao-seedream-4-5-251128` — Improved quality
- **5.0** — `doubao-seedream-5-0-260128` — Latest, supports PNG/JPEG output format

### Seedance (Video Generation)
- **1.5-pro** — `doubao-seedance-1-5-pro-251215` — Default, reliable quality, 2-12s
- **2.0** — `doubao-seedance-2-0-260128` — Highest quality, complex scenes, 4-15s
- **2.0-fast** — `doubao-seedance-2-0-fast-260128` — Fast preview, rapid iteration

## ⚠️ Important Notes

- **API Charges**: Both Seedream and Seedance API calls incur charges. Always use dry-run mode first to verify your prompts.
- **Task Non-Idempotency**: Never resubmit a task after a timeout or network failure — the task may still be processing. Use the `--task-id` flag to poll existing tasks.
- **Security**: Never hardcode your API key. Use environment variables (`ARK_API_KEY`).
- **Service URLs**: URLs returned by the API are service-hosted and may expire. Download and persist important assets.

## 🔗 API Reference

### Seedream API Endpoint
- Base URL: `https://ark.ap-southeast.bytepluses.com/api/v3`
- Endpoint: `POST /images/generations`

### Seedance API Endpoint
- Base URL: `https://ark.ap-southeast.bytepluses.com/api/v3`
- Create: `POST /contents/generations/tasks`
- Poll: `GET /contents/generations/tasks/{taskId}`

## 📜 License

MIT License

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

---

Built with 🎬 by Aurora Cinematic Studio
