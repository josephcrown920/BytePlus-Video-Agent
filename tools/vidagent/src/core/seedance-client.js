// Seedance video generation client

import { SEEDANCE_MODELS, DEFAULT_BASE_URL, SUPPORTED_RATIOS, SUPPORTED_RESOLUTIONS, DURATION_RANGES } from "./config.js";

export class SeedanceClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.ARK_API_KEY;
    this.baseUrl = (options.baseUrl || process.env.ARK_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
    this.defaultVersion = options.version || "1.5-pro";
    this.pollInterval = options.pollInterval || 10;
    this.maxWait = options.maxWait || 900;
  }

  _getModelId(version, modelOverride) {
    if (modelOverride) return modelOverride;
    const modelId = SEEDANCE_MODELS[version];
    if (!modelId) throw new Error(`Unknown Seedance version: ${version}. Available: ${Object.keys(SEEDANCE_MODELS).join(", ")}`);
    return modelId;
  }

  _getCapabilityVersion(model, version) {
    if (model.includes("seedance-2-5")) return "2.5";
    if (model.includes("seedance-2-0")) return "2.0";
    if (model.includes("dreamina-seedance-2")) return "2.0";
    if (version.startsWith("2.5")) return "2.5";
    if (version.startsWith("2.")) return "2.0";
    return "1.5";
  }

  _validateHttpsUrl(value, name) {
    if (value === undefined) return;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:") throw new Error();
    } catch {
      throw new Error(`${name} must be a valid HTTPS URL`);
    }
  }

  async _request(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });
      const text = await response.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { message: text.slice(0, 1000) };
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(payload)}`);
      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }

  async submit(options) {
    if (!this.apiKey) throw new Error("ARK_API_KEY is required");
    if (!options.prompt) throw new Error("prompt is required");

    const version = options.version || this.defaultVersion;
    const model = this._getModelId(version, options.model);
    const capabilityVersion = this._getCapabilityVersion(model, version);
    const ratio = options.ratio || "16:9";
    const duration = Number(options.duration || 5);
    const resolution = options.resolution || "1080p";

    if (!SUPPORTED_RATIOS.includes(ratio)) {
      throw new Error(`Unsupported ratio: ${ratio}. Must be one of: ${SUPPORTED_RATIOS.join(", ")}`);
    }

    const range = DURATION_RANGES[capabilityVersion];
    if (!Number.isInteger(duration) || duration < range.min || duration > range.max) {
      throw new Error(`Duration must be an integer from ${range.min} to ${range.max} for ${capabilityVersion} models`);
    }

    if (!SUPPORTED_RESOLUTIONS.includes(resolution)) {
      throw new Error(`Unsupported resolution: ${resolution}. Must be one of: ${SUPPORTED_RESOLUTIONS.join(", ")}`);
    }

    this._validateHttpsUrl(options.firstFrame, "firstFrame");
    this._validateHttpsUrl(options.lastFrame, "lastFrame");
    if (options.referenceImages) {
      for (const image of options.referenceImages) {
        this._validateHttpsUrl(image, "referenceImages");
      }
    }

    const content = [
      { type: "text", text: options.prompt },
    ];

    if (options.firstFrame) {
      content.push({
        type: "image_url",
        image_url: { url: options.firstFrame },
        role: "first_frame",
      });
    }
    if (options.lastFrame) {
      content.push({
        type: "image_url",
        image_url: { url: options.lastFrame },
        role: "last_frame",
      });
    }
    if (options.referenceImages && options.referenceImages.length > 0) {
      for (const url of options.referenceImages) {
        content.push({
          type: "image_url",
          image_url: { url },
          role: "reference_image",
        });
      }
    }

    const body = {
      model,
      content,
      ratio,
      duration,
      resolution,
    };

    if (options.returnLastFrame) body.return_last_frame = true;
    if (options.generateAudio) {
      if (model.includes("seedance-1-0")) {
        throw new Error("generateAudio is not supported by Seedance 1.0 models");
      }
      body.generate_audio = true;
    }
    if (options.watermark !== undefined) body.watermark = options.watermark;
    if (options.seed !== undefined) {
      const seed = Number(options.seed);
      if (!Number.isInteger(seed)) throw new Error("seed must be an integer");
      body.seed = seed;
    }

    let created;
    try {
      created = await this._request("/contents/generations/tasks", {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new Error(`Task submission failed or result is uncertain; do not retry automatically: ${error.message}`);
    }

    const taskId = created.id;
    if (!taskId) throw new Error("Task submission response did not contain an id; result is uncertain, do not retry automatically");

    return {
      ok: true,
      task_id: taskId,
      status: "submitted",
    };
  }

  async poll(taskId, options = {}) {
    if (!this.apiKey) throw new Error("ARK_API_KEY is required");

    const interval = Math.max(2, Number(options.pollInterval || this.pollInterval));
    const maxWait = Math.max(interval, Number(options.maxWait || this.maxWait));

    if (!Number.isFinite(interval) || !Number.isFinite(maxWait)) {
      throw new Error("Polling values must be numbers");
    }

    const deadline = Date.now() + maxWait * 1000;

    while (true) {
      let task;
      try {
        task = await this._request(`/contents/generations/tasks/${encodeURIComponent(taskId)}`);
      } catch (error) {
        throw new Error(`Task query failed: ${error.message}`);
      }

      if (["succeeded", "failed", "cancelled"].includes(task.status)) {
        return {
          ok: task.status === "succeeded",
          task_id: taskId,
          status: task.status,
          task,
        };
      }

      if (Date.now() >= deadline) {
        return {
          ok: false,
          task_id: taskId,
          status: task.status,
          error: "Local wait limit reached; query this task ID later instead of creating a new task",
        };
      }

      await new Promise((resolve) => setTimeout(resolve, interval * 1000));
    }
  }

  async generate(options) {
    const submitted = await this.submit(options);
    if (!submitted.ok) return submitted;
    return this.poll(submitted.task_id, {
      pollInterval: options.pollInterval,
      maxWait: options.maxWait,
    });
  }

  dryRun(options) {
    const version = options.version || this.defaultVersion;
    const model = this._getModelId(version, options.model);
    const capabilityVersion = this._getCapabilityVersion(model, version);

    const content = [{ type: "text", text: options.prompt || "" }];
    if (options.firstFrame) {
      content.push({ type: "image_url", image_url: { url: options.firstFrame }, role: "first_frame" });
    }

    const body = {
      model,
      content,
      ratio: options.ratio || "16:9",
      duration: Number(options.duration || 5),
      resolution: options.resolution || "1080p",
    };

    return {
      ok: true,
      dry_run: true,
      capabilityVersion,
      request: body,
    };
  }
}
