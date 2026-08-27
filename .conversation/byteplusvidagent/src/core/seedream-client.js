// Seedream image generation client

import { SEEDREAM_MODELS, DEFAULT_BASE_URL } from "./config.js";

export class SeedreamClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.ARK_API_KEY;
    this.baseUrl = (options.baseUrl || process.env.ARK_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
    this.defaultVersion = options.version || "4.0";
    this.timeout = options.timeout || 180000;
  }

  _getModelId(version, modelOverride) {
    if (modelOverride) return modelOverride;
    const modelId = SEEDREAM_MODELS[version];
    if (!modelId) throw new Error(`Unknown Seedream version: ${version}. Available: ${Object.keys(SEEDREAM_MODELS).join(", ")}`);
    return modelId;
  }

  async generate(options) {
    if (!this.apiKey) throw new Error("ARK_API_KEY is required");
    if (!options.prompt) throw new Error("prompt is required");

    const version = options.version || this.defaultVersion;
    const model = this._getModelId(version, options.model);

    const body = {
      model,
      prompt: options.prompt,
      size: options.size || "2K",
      sequential_image_generation: options.sequential || "disabled",
      response_format: options.responseFormat || "url",
      watermark: options.watermark !== undefined ? options.watermark : true,
    };

    if (options.images && options.images.length > 0) {
      body.image = options.images;
    }

    if (options.seed !== undefined) {
      if (!Number.isInteger(options.seed)) throw new Error("seed must be an integer");
      body.seed = options.seed;
    }

    if (options.maxImages !== undefined) {
      if (body.sequential_image_generation !== "auto") {
        throw new Error("maxImages requires sequential: 'auto'");
      }
      const maxImages = Number(options.maxImages);
      if (!Number.isInteger(maxImages) || maxImages < 1 || maxImages > 15) {
        throw new Error("maxImages must be an integer from 1 to 15");
      }
      body.sequential_image_generation_options = { max_images: maxImages };
    }

    if (options.outputFormat) {
      if (version !== "5.0") throw new Error("outputFormat is only supported with version 5.0");
      if (!["png", "jpeg"].includes(options.outputFormat)) {
        throw new Error("outputFormat must be png or jpeg");
      }
      body.output_format = options.outputFormat;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/images/generations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const text = await response.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { message: text.slice(0, 1000) };
      }

      if (!response.ok) {
        throw new Error(`Seedream API ${response.status}: ${JSON.stringify(payload)}`);
      }

      return {
        ok: true,
        model: payload.model || body.model,
        created: payload.created,
        data: payload.data || [],
        usage: payload.usage,
      };
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Seedream request timed out; result is uncertain, do not retry automatically");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  // Convenience method for single image generation
  async generateImage(prompt, options = {}) {
    return this.generate({
      ...options,
      prompt,
      sequential: "disabled",
    });
  }

  // Convenience method for sequential image series
  async generateSeries(prompt, count, options = {}) {
    return this.generate({
      ...options,
      prompt,
      sequential: "auto",
      maxImages: count,
    });
  }

  // Dry run to inspect request body
  dryRun(options) {
    const version = options.version || this.defaultVersion;
    const model = this._getModelId(version, options.model);
    const body = {
      model,
      prompt: options.prompt || "",
      size: options.size || "2K",
      sequential_image_generation: options.sequential || "disabled",
      response_format: options.responseFormat || "url",
      watermark: options.watermark !== undefined ? options.watermark : true,
    };
    return { ok: true, dry_run: true, request: body };
  }
}
