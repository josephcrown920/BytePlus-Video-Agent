// Shared timed-animatic renderer.
// Downloads one image per scene, cross-fades between them with per-scene
// timing, and encodes a single 1280x720 MP4. Callers are responsible for
// uploading the output and cleaning up the temp directory.

import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import path from "path";
import fs from "fs/promises";

const execFileAsync = promisify(execFile);

export type AnimaticFrame = {
  imageUrl: string;
  /** Seconds this frame stays on screen before the next cross-fade. */
  durationSeconds: number;
};

export type AnimaticResult = {
  /** Absolute path to the rendered MP4. */
  filePath: string;
  /** Temp dir holding the frames + output — caller must remove it. */
  tmpDir: string;
};

/**
 * Render a timed animatic MP4 from scene frame images.
 * Throws if fewer than 2 images can be downloaded/encoded.
 */
export async function renderAnimaticToFile(frames: AnimaticFrame[]): Promise<AnimaticResult> {
  const tmpDir = await fs.mkdtemp(path.join(tmpdir(), "aura-animatic-"));
  const outputPath = path.join(tmpDir, "animatic.mp4");
  const framePaths: string[] = [];

  const cleanup = () => fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});

  try {
    for (let i = 0; i < frames.length; i++) {
      const img = await fetch(frames[i].imageUrl, { signal: AbortSignal.timeout(30_000) });
      if (!img.ok) continue;
      const buf = Buffer.from(await img.arrayBuffer());
      const p = path.join(tmpDir, `scene${i}.jpg`);
      await fs.writeFile(p, buf);
      framePaths.push(p);
    }

    if (framePaths.length < 2) throw new Error("Not enough scene images to render previs.");

    const fadeDuration = 0.4;
    const durations = framePaths.map((_, i) =>
      Math.max(2, frames[i]?.durationSeconds ?? 3),
    );

    // Each input loops for scene duration + fade so xfade has overlap material
    const inputs = framePaths.flatMap((p, i) => [
      "-loop", "1",
      "-t", String(durations[i] + fadeDuration),
      "-i", p,
    ]);

    // Scale every frame to 1280x720 with letterboxing
    const scaleFilters = framePaths.map(
      (_, i) =>
        `[${i}:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}]`,
    );

    let filterComplex: string;
    let mapArg: string;

    if (framePaths.length === 1) {
      filterComplex = scaleFilters[0];
      mapArg = "[v0]";
    } else {
      const xfadeFilters: string[] = [];
      let prev = "v0";
      let cumulativeOffset = 0;
      for (let i = 1; i < framePaths.length; i++) {
        cumulativeOffset += durations[i - 1];
        const offset = cumulativeOffset - fadeDuration;
        const out = i === framePaths.length - 1 ? "out" : `xf${i}`;
        xfadeFilters.push(
          `[${prev}][v${i}]xfade=transition=fade:duration=${fadeDuration}:offset=${Math.max(0, offset)}[${out}]`,
        );
        prev = out;
      }
      filterComplex = [...scaleFilters, ...xfadeFilters].join(";");
      mapArg = "[out]";
    }

    const totalDuration = durations.reduce((a, b) => a + b, 0) - fadeDuration;

    try {
      await execFileAsync(
        "ffmpeg",
        [
          ...inputs,
          "-filter_complex", filterComplex,
          "-map", mapArg,
          "-c:v", "libx264",
          "-pix_fmt", "yuv420p",
          "-t", String(Math.max(1, totalDuration)),
          "-y", outputPath,
        ],
        { timeout: 180_000 },
      );
    } catch (ffErr) {
      const stderr = (ffErr as { stderr?: string }).stderr?.slice(-600) ?? "";
      throw new Error(`Animatic encoding failed.${stderr ? ` FFmpeg: ${stderr}` : ""}`);
    }

    return { filePath: outputPath, tmpDir };
  } catch (err) {
    await cleanup();
    throw err;
  }
}
