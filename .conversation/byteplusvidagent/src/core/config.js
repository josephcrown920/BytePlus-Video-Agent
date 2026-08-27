// Core configuration and constants for BytePlus Video Agent

export const DEFAULT_BASE_URL = "https://ark.ap-southeast.bytepluses.com/api/v3";

// Seedream model mappings
export const SEEDREAM_MODELS = {
  "3.0": "seedream-3-0-t2i-250415",
  "4.0": "seedream-4-0-250828",
  "4.5": "seedream-4-5-251128",
  "5.0": "seedream-5-0-260128",
  "5.0-pro": "dola-seedream-5-0-pro-260628",
};

// Seedance model mappings
export const SEEDANCE_MODELS = {
  "1.0-lite": "seedance-1-0-lite-t2v-250428",
  "1.0-pro": "seedance-1-0-pro-250528",
  "1.5-pro": "seedance-1-5-pro-251215",
  "2.0": "dreamina-seedance-2-0-260128",
  "2.0-fast": "dreamina-seedance-2-0-fast-260128",
  "2.0-mini": "dreamina-seedance-2-0-mini-260615",
  "2.5": "dreamina-seedance-2-5-260628",
};

// Supported aspect ratios for video
export const SUPPORTED_RATIOS = ["16:9", "9:16", "4:3", "3:4", "1:1", "2:1", "21:9", "adaptive"];

// Supported resolutions
export const SUPPORTED_RESOLUTIONS = ["480p", "720p", "1080p"];

// Duration ranges by model capability
export const DURATION_RANGES = {
  "1.5": { min: 2, max: 12 },
  "2.0": { min: 4, max: 15 },
  "2.5": { min: 3, max: 15 },
};

// Cinematic preset configurations
export const CINEMATIC_PRESETS = {
  "cinematic-wide": {
    ratio: "21:9",
    resolution: "1080p",
    duration: 8,
    version: "2.5",
    description: "Ultra-wide cinematic scope, 2.39:1 equivalent (Seedance 2.5)",
  },
  "theatrical": {
    ratio: "16:9",
    resolution: "1080p",
    duration: 10,
    version: "2.5",
    description: "Standard theatrical widescreen presentation (Seedance 2.5)",
  },
  "social-portrait": {
    ratio: "9:16",
    resolution: "1080p",
    duration: 5,
    version: "2.0",
    description: "Vertical format for TikTok/Reels/Shorts",
  },
  "social-landscape": {
    ratio: "16:9",
    resolution: "720p",
    duration: 5,
    version: "1.5-pro",
    description: "Landscape social media format",
  },
  "storyboard": {
    ratio: "16:9",
    resolution: "480p",
    duration: 3,
    version: "2.0-fast",
    description: "Fast preview for storyboarding and iteration",
  },
  "pro-cinematic": {
    ratio: "16:9",
    resolution: "1080p",
    duration: 10,
    version: "2.5",
    description: "Highest quality cinematic output (Seedance 2.5)",
  },
};

// Default paths
export const DEFAULT_PATHS = {
  assets: {
    images: "assets/images",
    videos: "assets/videos",
    vfx: "assets/vfx",
  },
  bible: "production-bible",
  scenes: "scripts/scenes",
  deliverables: "deliverables",
  reports: "reports",
};
