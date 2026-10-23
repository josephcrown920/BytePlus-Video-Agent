import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { Router, type IRouter, type NextFunction, type Request, type Response as ExpressResponse } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { createClient } from "@supabase/supabase-js";
import {
  CancelMediaGenerationParams,
  CancelMediaGenerationResponse,
  CreateMediaGenerationBody,
  CreateMediaGenerationResponse,
  GetMediaGenerationParams,
  GetMediaGenerationResponse,
  StreamMediaGenerationParams,
} from "@workspace/api-zod";

type MediaKind = "image" | "video";
type MediaModel =
  | "seedream-4.5"
  | "flux-dev"
  | "nano-banana-pro"
  | "seedance-2.5"
  | "wan-2.5";
type JobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";

interface GenerationJob {
  id: string;
  providerRequestId: string;
  appPath: string;
  kind: MediaKind;
  model: MediaModel;
  status: JobStatus;
  progress: number;
  queuePosition: number | null;
  resultUrl: string | null;
  error: string | null;
  logs: string[];
  createdAt: string;
  ownerKey: string;
}

interface ResumePayload {
  version: 1;
  providerRequestId: string;
  appPath: string;
  kind: MediaKind;
  model: MediaModel;
  createdAt: string;
  ownerKey: string;
}

const router: IRouter = Router();
const connectors = new ReplitConnectors();
const jobs = new Map<string, GenerationJob>();
const requestWindows = new Map<string, { startedAt: number; count: number }>();
const REQUEST_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 3;
const MAX_ACTIVE_PER_CLIENT = 2;
const MAX_ACTIVE_GLOBAL = 6;
const JOB_TTL_MS = 24 * 60 * 60 * 1000;

const MODEL_CONFIG: Record<
  MediaModel,
  { kind: MediaKind; queuePath: string; appPath: string }
> = {
  "seedream-4.5": {
    kind: "image",
    queuePath: "/fal-ai/bytedance/seedream/v4.5/text-to-image",
    appPath: "/fal-ai/bytedance",
  },
  "flux-dev": {
    kind: "image",
    queuePath: "/fal-ai/flux/dev",
    appPath: "/fal-ai/flux",
  },
  "nano-banana-pro": {
    kind: "image",
    queuePath: "/fal-ai/nano-banana-pro",
    appPath: "/fal-ai/nano-banana-pro",
  },
  "seedance-2.5": {
    kind: "video",
    queuePath: "/bytedance/seedance-2.5/text-to-video",
    appPath: "/bytedance/seedance-2.5",
  },
  "wan-2.5": {
    kind: "video",
    queuePath: "/fal-ai/wan-25-preview/text-to-video",
    appPath: "/fal-ai/wan-25-preview",
  },
};

function makeSupabaseFetch(supabaseKey: string, userToken: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof globalThis.Request !== "undefined" && input instanceof globalThis.Request
        ? input.headers
        : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers as ConstructorParameters<typeof Headers>[0]).forEach((value, key) =>
        headers.set(key, value),
      );
    }
    const isNewKey = supabaseKey.startsWith("sb_publishable_") || supabaseKey.startsWith("sb_secret_");
    if (isNewKey && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    headers.set("Authorization", `Bearer ${userToken}`);
    return fetch(input as Parameters<typeof fetch>[0], { ...init, headers });
  };
}

async function requireMediaUser(req: Request, res: ExpressResponse, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Sign in to generate media." });
    return;
  }
  const supabaseUrl = process.env["SUPABASE_URL"];
  const supabaseKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!supabaseUrl || !supabaseKey) {
    res.status(503).json({ error: "Media authentication is not configured." });
    return;
  }
  const userToken = authHeader.slice(7);
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { fetch: makeSupabaseFetch(supabaseKey, userToken) },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(userToken);
  if (error || !data.user) {
    res.status(401).json({ error: "Your session has expired. Sign in again to generate media." });
    return;
  }
  res.locals.mediaUserId = data.user.id;
  next();
}

function isTerminal(status: JobStatus): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

function resumeKey(): Buffer | null {
  const secret = process.env["SESSION_SECRET"];
  return secret ? createHash("sha256").update(secret).digest() : null;
}

function createGenerationId(payload: ResumePayload): string {
  const key = resumeKey();
  if (!key) throw new Error("SESSION_SECRET is required for recoverable media jobs.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  return `g1.${Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url")}`;
}

function recoverGeneration(id: string, ownerKey: string): GenerationJob | null {
  if (!id.startsWith("g1.") || id.length > 2048) return null;
  const key = resumeKey();
  if (!key) return null;
  try {
    const packed = Buffer.from(id.slice(3), "base64url");
    if (packed.length < 29) return null;
    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(12, 28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const payload = JSON.parse(
      Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString("utf8"),
    ) as Partial<ResumePayload>;
    const config =
      typeof payload.model === "string" ? MODEL_CONFIG[payload.model as MediaModel] : undefined;
    const createdAt = payload.createdAt;
    const createdAtMs = typeof createdAt === "string" ? Date.parse(createdAt) : NaN;
    if (
      payload.version !== 1 ||
      payload.ownerKey !== ownerKey ||
      !config ||
      config.kind !== payload.kind ||
      config.appPath !== payload.appPath ||
      typeof payload.providerRequestId !== "string" ||
      payload.providerRequestId.length < 1 ||
      payload.providerRequestId.length > 1024 ||
      typeof createdAt !== "string" ||
      !Number.isFinite(createdAtMs) ||
      Date.now() - createdAtMs > JOB_TTL_MS
    ) {
      return null;
    }
    const job: GenerationJob = {
      id,
      providerRequestId: payload.providerRequestId,
      appPath: payload.appPath,
      kind: payload.kind,
      model: payload.model as MediaModel,
      status: "queued",
      progress: 8,
      queuePosition: null,
      resultUrl: null,
      error: null,
      logs: ["Generation recovered after a service restart."],
      createdAt,
      ownerKey,
    };
    jobs.set(id, job);
    return job;
  } catch {
    return null;
  }
}

function ownedJob(id: string, ownerKey: string): GenerationJob | null {
  const job = jobs.get(id) ?? recoverGeneration(id, ownerKey);
  return job?.ownerKey === ownerKey ? job : null;
}

function publicJob(job: GenerationJob) {
  return {
    id: job.id,
    kind: job.kind,
    model: job.model,
    status: job.status,
    progress: job.progress,
    queuePosition: job.queuePosition,
    resultUrl: job.resultUrl,
    error: job.error,
    logs: job.logs.slice(-12),
    createdAt: job.createdAt,
  };
}

function cleanupJobs() {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of jobs) {
    if (Date.parse(job.createdAt) < cutoff && isTerminal(job.status)) jobs.delete(id);
  }
}

function rateLimit(res: ExpressResponse): boolean {
  cleanupJobs();
  const userId = String(res.locals.mediaUserId);
  const key = userId;
  const now = Date.now();
  const current = requestWindows.get(key);
  const window =
    !current || now - current.startedAt >= REQUEST_WINDOW_MS
      ? { startedAt: now, count: 0 }
      : current;

  if (window.count >= MAX_REQUESTS_PER_WINDOW) {
    res.setHeader("Retry-After", Math.ceil((REQUEST_WINDOW_MS - (now - window.startedAt)) / 1000));
    res.status(429).json({ error: "Generation limit reached. Wait a moment before trying again." });
    return false;
  }

  const activeForClient = [...jobs.values()].filter(
    (job) => job.ownerKey === userId && !isTerminal(job.status),
  ).length;
  const activeGlobal = [...jobs.values()].filter((job) => !isTerminal(job.status)).length;
  if (activeForClient >= MAX_ACTIVE_PER_CLIENT || activeGlobal >= MAX_ACTIVE_GLOBAL) {
    res.setHeader("Retry-After", "15");
    res.status(429).json({ error: "The render queue is busy. Try again when an active render finishes." });
    return false;
  }

  window.count += 1;
  requestWindows.set(key, window);
  return true;
}

function imageSize(aspectRatio: string): string {
  switch (aspectRatio) {
    case "9:16":
    case "3:4":
      return "portrait_16_9";
    case "4:3":
      return "landscape_4_3";
    case "1:1":
      return "square_hd";
    default:
      return "landscape_16_9";
  }
}

function providerInput(input: {
  model: MediaModel;
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
  duration?: number;
  resolution?: "standard" | "high";
}): Record<string, unknown> {
  const { model, prompt, negativePrompt, aspectRatio, duration, resolution } = input;
  if (model === "seedream-4.5") {
    return { prompt, image_size: imageSize(aspectRatio), num_images: 1, enable_safety_checker: true };
  }
  if (model === "flux-dev") {
    return { prompt, image_size: imageSize(aspectRatio), num_images: 1, enable_safety_checker: true };
  }
  if (model === "nano-banana-pro") {
    return {
      prompt,
      aspect_ratio: aspectRatio,
      resolution: resolution === "high" ? "2K" : "1K",
      num_images: 1,
      output_format: "webp",
    };
  }
  if (model === "seedance-2.5") {
    return {
      prompt,
      aspect_ratio: aspectRatio,
      duration: String(duration ?? 5),
      resolution: resolution === "high" ? "720p" : "480p",
      generate_audio: true,
    };
  }
  return {
    prompt,
    negative_prompt: negativePrompt?.trim() || undefined,
    aspect_ratio: ["16:9", "9:16", "1:1"].includes(aspectRatio) ? aspectRatio : "16:9",
    duration: String(duration === 10 ? 10 : 5),
    resolution: resolution === "high" ? "720p" : "480p",
    enable_safety_checker: true,
  };
}

async function falRequest(
  path: string,
  init: { method: "GET" | "POST" | "PUT"; headers?: Record<string, string>; body?: string },
): Promise<globalThis.Response> {
  return connectors.proxy("falai", path, init);
}

async function readProviderError(response: globalThis.Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as
    | { detail?: unknown; error?: unknown; message?: unknown }
    | null;
  const detail = body?.detail ?? body?.error ?? body?.message;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((entry) =>
        entry && typeof entry === "object" && "msg" in entry ? String(entry.msg) : String(entry),
      )
      .join("; ");
  }
  return `Generation provider returned ${response.status}`;
}

function extractResultUrl(body: unknown, kind: MediaKind): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (kind === "image" && Array.isArray(record.images)) {
    const first = record.images[0];
    if (first && typeof first === "object" && typeof (first as { url?: unknown }).url === "string") {
      return (first as { url: string }).url;
    }
  }
  if (kind === "video" && record.video && typeof record.video === "object") {
    const url = (record.video as { url?: unknown }).url;
    if (typeof url === "string") return url;
  }
  return null;
}

async function refreshJob(job: GenerationJob): Promise<void> {
  if (isTerminal(job.status)) return;
  const response = await falRequest(
    `${job.appPath}/requests/${encodeURIComponent(job.providerRequestId)}/status?logs=1`,
    { method: "GET" },
  );

  if (!response.ok) {
    if (response.status >= 500) {
      job.logs = [...job.logs, "Provider connection interrupted; retrying."].slice(-12);
      return;
    }
    job.status = "failed";
    job.error = await readProviderError(response);
    return;
  }

  const status = (await response.json()) as {
    status?: string;
    queue_position?: number;
    logs?: Array<{ message?: string }>;
    error?: string;
  };
  if (isTerminal(job.status)) return;
  if (Array.isArray(status.logs)) {
    const nextLogs = status.logs
      .map((entry) => entry.message)
      .filter((message): message is string => Boolean(message));
    job.logs = [...new Set([...job.logs, ...nextLogs])].slice(-12);
  }

  if (status.status === "IN_QUEUE") {
    job.status = "queued";
    job.progress = 12;
    job.queuePosition = typeof status.queue_position === "number" ? status.queue_position : null;
    return;
  }
  if (status.status === "IN_PROGRESS") {
    job.status = "processing";
    job.progress = Math.min(88, Math.max(job.progress + 7, 28));
    job.queuePosition = null;
    return;
  }
  if (status.status !== "COMPLETED") return;
  if (status.error) {
    job.status = "failed";
    job.progress = 100;
    job.error = status.error;
    return;
  }

  const resultResponse = await falRequest(
    `${job.appPath}/requests/${encodeURIComponent(job.providerRequestId)}`,
    { method: "GET" },
  );
  if (isTerminal(job.status)) return;
  if (!resultResponse.ok) {
    job.status = "failed";
    job.progress = 100;
    job.error = await readProviderError(resultResponse);
    return;
  }
  const resultBody = await resultResponse.json();
  if (isTerminal(job.status)) return;
  const resultUrl = extractResultUrl(resultBody, job.kind);
  if (!resultUrl) {
    job.status = "failed";
    job.progress = 100;
    job.error = "The model completed without returning a media file.";
    return;
  }
  job.status = "completed";
  job.progress = 100;
  job.queuePosition = null;
  job.resultUrl = resultUrl;
  job.logs = [...job.logs, "Render completed."].slice(-12);
}

router.use(requireMediaUser);

router.post("/generations", async (req: Request, res: ExpressResponse) => {
  const body =
    req.body && typeof req.body === "object"
      ? {
          ...req.body,
          prompt: typeof req.body.prompt === "string" ? req.body.prompt.trim() : req.body.prompt,
          negativePrompt:
            typeof req.body.negativePrompt === "string"
              ? req.body.negativePrompt.trim()
              : req.body.negativePrompt,
        }
      : req.body;
  const parsed = CreateMediaGenerationBody.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid generation request" });
    return;
  }
  const input = parsed.data;
  const config = MODEL_CONFIG[input.model as MediaModel];
  if (!config || config.kind !== input.kind) {
    res.status(400).json({ error: "The selected model does not support this media type." });
    return;
  }
  if (
    input.model === "wan-2.5" &&
    ((input.duration !== undefined && ![5, 10].includes(input.duration)) ||
      !["16:9", "9:16", "1:1"].includes(input.aspectRatio))
  ) {
    res.status(400).json({ error: "Wan 2.5 supports 5 or 10 seconds in 16:9, 9:16, or 1:1." });
    return;
  }
  if (!resumeKey()) {
    res.status(503).json({ error: "Recoverable media generation is not configured." });
    return;
  }
  if (!rateLimit(res)) return;

  try {
    const providerResponse = await falRequest(config.queuePath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Fal-Request-Timeout": "600",
        "X-Fal-Queue-Priority": "normal",
      },
      body: JSON.stringify(
        providerInput({
          model: input.model as MediaModel,
          prompt: input.prompt.trim(),
          negativePrompt: input.negativePrompt,
          aspectRatio: input.aspectRatio,
          duration: input.duration,
          resolution: input.resolution,
        }),
      ),
    });
    if (!providerResponse.ok) {
      const message = await readProviderError(providerResponse);
      res.status(providerResponse.status === 429 ? 429 : 502).json({ error: message });
      return;
    }
    const submitted = (await providerResponse.json()) as {
      request_id?: string;
      queue_position?: number;
    };
    if (!submitted.request_id) {
      res.status(502).json({ error: "Generation provider returned no request ID." });
      return;
    }

    const createdAt = new Date().toISOString();
    const ownerKey = String(res.locals.mediaUserId);
    const job: GenerationJob = {
      id: createGenerationId({
        version: 1,
        providerRequestId: submitted.request_id,
        appPath: config.appPath,
        kind: input.kind,
        model: input.model as MediaModel,
        createdAt,
        ownerKey,
      }),
      providerRequestId: submitted.request_id,
      appPath: config.appPath,
      kind: input.kind,
      model: input.model as MediaModel,
      status: "queued",
      progress: 8,
      queuePosition:
        typeof submitted.queue_position === "number" ? submitted.queue_position : null,
      resultUrl: null,
      error: null,
      logs: ["Request accepted by fal.ai."],
      createdAt,
      ownerKey,
    };
    jobs.set(job.id, job);
    res.status(201).json(CreateMediaGenerationResponse.parse(publicJob(job)));
  } catch (error) {
    req.log.error({ err: error }, "fal.ai generation submission failed");
    res.status(502).json({ error: "Could not reach the generation provider. Try again shortly." });
  }
});

router.get("/generations/:id", async (req: Request, res: ExpressResponse) => {
  const params = GetMediaGenerationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid generation ID." });
    return;
  }
  const job = ownedJob(params.data.id, String(res.locals.mediaUserId));
  if (!job) {
    res.status(404).json({ error: "Generation not found." });
    return;
  }
  try {
    await refreshJob(job);
  } catch (error) {
    req.log.warn({ err: error, generationId: job.id }, "fal.ai status refresh failed");
  }
  res.json(GetMediaGenerationResponse.parse(publicJob(job)));
});

router.get("/generations/:id/events", async (req: Request, res: ExpressResponse) => {
  const params = StreamMediaGenerationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid generation ID." });
    return;
  }
  const job = ownedJob(params.data.id, String(res.locals.mediaUserId));
  if (!job) {
    res.status(404).json({ error: "Generation not found." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  let closed = false;
  req.on("close", () => {
    closed = true;
  });

  const send = () => {
    res.write(`event: generation\ndata: ${JSON.stringify(publicJob(job))}\n\n`);
  };
  send();

  const startedAt = Date.now();
  while (!closed && !isTerminal(job.status) && Date.now() - startedAt < 10 * 60 * 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    if (closed) break;
    try {
      await refreshJob(job);
    } catch (error) {
      req.log.warn({ err: error, generationId: job.id }, "fal.ai event refresh failed");
    }
    send();
  }
  if (!closed) res.end();
});

router.post("/generations/:id/cancel", async (req: Request, res: ExpressResponse) => {
  const params = CancelMediaGenerationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid generation ID." });
    return;
  }
  const job = ownedJob(params.data.id, String(res.locals.mediaUserId));
  if (!job) {
    res.status(404).json({ error: "Generation not found." });
    return;
  }
  if (!isTerminal(job.status)) {
    try {
      const cancelResponse = await falRequest(
        `${job.appPath}/requests/${encodeURIComponent(job.providerRequestId)}/cancel`,
        { method: "PUT" },
      );
      if (!cancelResponse.ok) {
        res.status(502).json({ error: await readProviderError(cancelResponse) });
        return;
      }
      if (isTerminal(job.status)) {
        res.json(CancelMediaGenerationResponse.parse(publicJob(job)));
        return;
      }
      job.status = "cancelled";
      job.progress = 100;
      job.queuePosition = null;
      job.logs = [...job.logs, "Cancellation requested."].slice(-12);
    } catch (error) {
      req.log.warn({ err: error, generationId: job.id }, "fal.ai cancellation failed");
      res.status(502).json({ error: "Could not cancel this render. Check its status again." });
      return;
    }
  }
  res.json(CancelMediaGenerationResponse.parse(publicJob(job)));
});

export default router;