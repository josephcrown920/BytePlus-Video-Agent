// Cinematic pipeline - orchestrates script-to-video production workflow

import fs from "fs";
import path from "path";
import { SeedreamClient } from "../core/seedream-client.js";
import { SeedanceClient } from "../core/seedance-client.js";
import { ProductionBible } from "../bible/production-bible.js";
import { CINEMATIC_PRESETS, DEFAULT_PATHS } from "../core/config.js";

export class CinematicPipeline {
  constructor(options = {}) {
    this.biblePath = options.biblePath || DEFAULT_PATHS.bible;
    this.assetsPath = options.assetsPath || "assets";
    this.deliverablesPath = options.deliverablesPath || DEFAULT_PATHS.deliverables;
    this.bible = new ProductionBible(this.biblePath);
    this.seedream = new SeedreamClient(options);
    this.seedance = new SeedanceClient(options);
    this.onProgress = options.onProgress || (() => {});
  }

  async init(projectConfig = {}) {
    this.bible.load();

    if (projectConfig.style) {
      this.bible.setStyle(projectConfig.style);
    }
    if (projectConfig.narrative) {
      this.bible.setNarrative(projectConfig.narrative);
    }
    if (projectConfig.characters) {
      for (const [name, details] of Object.entries(projectConfig.characters)) {
        this.bible.addCharacter(name, details);
      }
    }

    // Create directories
    const dirs = [
      this.assetsPath,
      path.join(this.assetsPath, "images"),
      path.join(this.assetsPath, "videos"),
      path.join(this.assetsPath, "vfx"),
      this.biblePath,
      this.deliverablesPath,
    ];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.bible.save();
    this.onProgress({ stage: "init", message: "Production bible initialized" });
    return this.bible.exportSummary();
  }

  // Generate concept art for a scene
  async generateConceptArt(sceneId, prompt, options = {}) {
    this.bible.load();

    const enhancedPrompt = this.bible.buildPrompt(prompt, {
      includeStyle: true,
      character: options.character,
    });

    this.onProgress({ stage: "concept-art", message: `Generating concept art for scene ${sceneId}`, prompt: enhancedPrompt });

    const result = await this.seedream.generateImage(enhancedPrompt, {
      version: options.seedreamVersion || "5.0",
      size: options.size || "2K",
      seed: options.seed,
    });

    // Save to bible references
    if (result.data && result.data.length > 0) {
      for (const img of result.data) {
        this.bible.addReference("concept-art", img.url || img.b64_json, {
          sceneId,
          model: result.model,
          prompt: enhancedPrompt,
        });
      }
      this.bible.addScene(sceneId, {
        conceptArt: result.data.length,
        prompt: enhancedPrompt,
        ...options,
      });
    }

    this.bible.save();
    return result;
  }

  // Generate character design
  async generateCharacterDesign(characterName, description, options = {}) {
    this.bible.load();

    const enhancedPrompt = `Character design sheet for ${characterName}. ${description}. Full body turnaround view, front, side, three-quarter view. Detailed character reference sheet, cinematic quality, consistent design, clean background.`;

    this.onProgress({ stage: "character-design", message: `Generating character design for ${characterName}` });

    const result = await this.seedream.generateImage(enhancedPrompt, {
      version: options.seedreamVersion || "5.0",
      size: "2K",
      seed: options.seed,
    });

    if (result.data && result.data.length > 0) {
      const char = {
        visualDescription: description,
        referenceImages: result.data.map((d) => d.url || d.b64_json),
      };
      this.bible.addCharacter(characterName, char);

      for (const img of result.data) {
        this.bible.addReference("character", img.url || img.b64_json, {
          character: characterName,
          model: result.model,
        });
      }
    }

    this.bible.save();
    return result;
  }

  // Generate storyboard frames
  async generateStoryboard(sceneId, shots, options = {}) {
    this.bible.load();
    const results = [];

    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i];
      const shotId = `${sceneId}-shot-${i + 1}`;
      const enhancedPrompt = this.bible.buildPrompt(shot.prompt, {
        includeStyle: true,
        character: shot.character,
      });

      this.onProgress({
        stage: "storyboard",
        message: `Generating storyboard for ${shotId} (${i + 1}/${shots.length})`,
        shot: shotId,
      });

      const result = await this.seedream.generateImage(enhancedPrompt, {
        version: options.seedreamVersion || "4.0",
        size: "2K",
        seed: options.seed ? options.seed + i : undefined,
      });

      results.push({
        shotId,
        shot,
        result,
      });

      if (result.data && result.data.length > 0) {
        for (const img of result.data) {
          this.bible.addReference("storyboard", img.url || img.b64_json, {
            sceneId,
            shotId,
            shotNumber: i + 1,
            model: result.model,
          });
        }
      }
    }

    // Update scene
    const scene = this.bible.getScene(sceneId) || {};
    this.bible.addScene(sceneId, {
      ...scene,
      storyboardShots: shots.length,
      shots,
    });

    this.bible.save();
    return results;
  }

  // Generate a video from text or first frame
  async generateVideo(sceneId, shotId, prompt, options = {}) {
    this.bible.load();

    const preset = options.preset ? CINEMATIC_PRESETS[options.preset] : null;
    const videoOptions = {
      version: preset ? preset.version : (options.version || "2.0"),
      ratio: preset ? preset.ratio : (options.ratio || "16:9"),
      duration: preset ? preset.duration : (options.duration || 5),
      resolution: preset ? preset.resolution : (options.resolution || "1080p"),
      firstFrame: options.firstFrame,
      lastFrame: options.lastFrame,
      referenceImages: options.referenceImages,
      generateAudio: options.generateAudio,
      seed: options.seed,
      pollInterval: options.pollInterval,
      maxWait: options.maxWait,
    };

    const enhancedPrompt = this.bible.buildPrompt(prompt, {
      includeStyle: true,
      character: options.character,
    });

    this.onProgress({
      stage: "video-generation",
      message: `Generating video for ${sceneId}/${shotId}`,
      prompt: enhancedPrompt,
      options: videoOptions,
    });

    const result = await this.seedance.generate({
      ...videoOptions,
      prompt: enhancedPrompt,
    });

    // Save reference
    if (result.ok && result.task) {
      const videoUrl = result.task.content?.video_url ||
        (result.task.content && result.task.content.find?.((c) => c.type === "video")?.url) ||
        "";
      if (videoUrl) {
        this.bible.addReference("video", videoUrl, {
          sceneId,
          shotId,
          taskId: result.task_id,
          model: result.task.model,
          duration: videoOptions.duration,
          ratio: videoOptions.ratio,
        });
      }
    }

    this.bible.save();
    return result;
  }

  // Full scene pipeline: concept -> storyboard -> video
  async runFullScenePipeline(sceneId, config) {
    const results = {};

    // Step 1: Concept art
    if (config.conceptPrompt) {
      results.conceptArt = await this.generateConceptArt(sceneId, config.conceptPrompt, {
        character: config.character,
        seedreamVersion: config.seedreamVersion,
      });
    }

    // Step 2: Storyboard frames
    if (config.shots && config.shots.length > 0) {
      results.storyboard = await this.generateStoryboard(sceneId, config.shots, {
        seedreamVersion: config.seedreamVersion,
        seed: config.seed,
      });
    }

    // Step 3: Video generation (using first storyboard frame as reference)
    if (config.generateVideo && config.videoPrompt) {
      const firstFrame = results.storyboard?.[0]?.result?.data?.[0]?.url;
      results.video = await this.generateVideo(sceneId, "main", config.videoPrompt, {
        firstFrame,
        version: config.seedanceVersion,
        duration: config.duration,
        ratio: config.ratio,
        resolution: config.resolution,
        character: config.character,
        generateAudio: config.generateAudio,
        preset: config.preset,
      });
    }

    return results;
  }

  // Get project status
  getStatus() {
    this.bible.load();
    const summary = this.bible.exportSummary();
    return {
      project: {
        characters: summary.characters,
        scenes: summary.scenes,
        references: summary.referenceCount,
      },
      style: summary.style,
      narrative: summary.narrative,
    };
  }
}
