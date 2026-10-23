// BytePlus Video Agent - Main library entry point
// Export all core modules for programmatic usage

export { SeedreamClient } from "./core/seedream-client.js";
export { SeedanceClient } from "./core/seedance-client.js";
export { CinematicPipeline } from "./pipeline/cinematic-pipeline.js";
export { ProductionBible } from "./bible/production-bible.js";
export {
  SEEDREAM_MODELS,
  SEEDANCE_MODELS,
  CINEMATIC_PRESETS,
  SUPPORTED_RATIOS,
  SUPPORTED_RESOLUTIONS,
  DURATION_RANGES,
  DEFAULT_PATHS,
  DEFAULT_BASE_URL,
} from "./core/config.js";
