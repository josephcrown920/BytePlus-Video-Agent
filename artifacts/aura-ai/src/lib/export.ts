import jsPDF from "jspdf";
import JSZip from "jszip";

// ── Constants ─────────────────────────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ── Types ─────────────────────────────────────────────────────────────────
export type ScriptScene = {
  // Legacy chat-agent fields
  scene?: number;
  description: string;
  dialogue?: string;
  duration_seconds?: number;
  // Video-agent fields
  index?: number;
  title?: string;
  script?: string;
  duration?: number;
};
export type ScriptData = {
  title: string;
  format?: string;
  total_duration_seconds?: number;
  scenes: ScriptScene[];
  /** 0-3 s sensory shock — Cinematic Viralist hook */
  hook?: string;
  /** Seamless loop line or stinger — Cinematic Viralist close */
  close?: string;
  mood?: string;
};

export type StoryboardScene = {
  scene: number;
  title: string;
  description: string;
  image_prompt: string;
  imageUrl: string | null;
};
export type StoryboardData = {
  title: string;
  concept: string;
  scenes: StoryboardScene[];
};

export type CaptionItem = {
  platform: string;
  caption: string;
  hashtags: string[];
};
export type CaptionsData = {
  topic: string;
  captions: CaptionItem[];
};

// ── Helpers ───────────────────────────────────────────────────────────────
function safeName(name: string): string {
  return name
    .replace(/[^a-z0-9\s-]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 60);
}

async function fetchImageBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── Script PDF ────────────────────────────────────────────────────────────

/** Returns "Hook" | "Narrative" | "Close" for a scene at position i out of total. */
function sceneRole(i: number, total: number): "Hook" | "Narrative" | "Close" {
  if (i === 0) return "Hook";
  if (i === total - 1) return "Close";
  return "Narrative";
}

/** Draw a small role badge (Hook / Narrative / Close) and return the right-edge x. */
function drawRoleBadge(
  doc: jsPDF,
  role: "Hook" | "Narrative" | "Close",
  x: number,
  y: number, // baseline
): number {
  const label = role.toUpperCase();
  const badgeW = role === "Narrative" ? 28 : 20;

  // Fill colour: orange for Hook, indigo for Narrative, violet for Close
  if (role === "Hook") doc.setFillColor(249, 115, 22);       // orange-500
  else if (role === "Narrative") doc.setFillColor(99, 102, 241); // indigo-500
  else doc.setFillColor(139, 92, 246);                           // violet-500

  doc.roundedRect(x, y - 4.5, badgeW, 6.5, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text(label, x + badgeW / 2, y + 0.3, { align: "center" });
  return x + badgeW + 3;
}

export function downloadScriptPdf(script: ScriptData): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  const checkPage = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // ── Title ────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(18, 14, 40);
  const titleLines = doc.splitTextToSize(script.title, CONTENT_W) as string[];
  doc.text(titleLines, MARGIN, y);
  y += titleLines.length * 9 + 2;

  // ── Meta line ────────────────────────────────────────────────────────────
  const formatLabel: Record<string, string> = { video: "Video", ad: "Ad", reel: "Reel" };
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(130, 120, 160);
  const metaParts: string[] = [];
  if (script.format) metaParts.push(formatLabel[script.format] ?? script.format);
  if (script.total_duration_seconds != null) metaParts.push(`${script.total_duration_seconds}s total`);
  metaParts.push(`${script.scenes.length} scenes`);
  metaParts.push("Hook → Narrative → Close");
  doc.text(metaParts.join("  ·  "), MARGIN, y);
  y += 5;

  // ── Divider ──────────────────────────────────────────────────────────────
  doc.setDrawColor(210, 205, 235);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  // ── Sensory Hook banner ──────────────────────────────────────────────────
  if (script.hook) {
    const hookLines = doc.splitTextToSize(script.hook, CONTENT_W - 24) as string[];
    const bannerH = hookLines.length * 5 + 12;
    checkPage(bannerH);

    doc.setFillColor(255, 247, 237); // orange-50
    doc.roundedRect(MARGIN, y, CONTENT_W, bannerH, 3, 3, "F");
    doc.setDrawColor(249, 115, 22);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y, MARGIN, y + bannerH);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(234, 88, 12); // orange-600
    doc.text("SENSORY HOOK  ·  0 – 3 s", MARGIN + 5, y + 5.5);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(154, 52, 18); // orange-900
    doc.text(hookLines, MARGIN + 5, y + 10.5);
    y += bannerH + 6;
  }

  // ── Scenes ───────────────────────────────────────────────────────────────
  const total = script.scenes.length;

  for (let i = 0; i < total; i++) {
    const scene = script.scenes[i];
    const role = sceneRole(i, total);
    const sceneNum = scene.scene ?? scene.index ?? i;
    const sceneTitle = scene.title;
    const durationSec = scene.duration_seconds ?? scene.duration;

    // Primary text: prefer the voiceover script, fall back to description
    const voiceover = scene.script || scene.dialogue;
    const descText = scene.description;

    doc.setFontSize(10);
    const descLines = descText
      ? (doc.splitTextToSize(descText, CONTENT_W - 8) as string[])
      : [];
    const voiceLines = voiceover
      ? (doc.splitTextToSize(`"${voiceover}"`, CONTENT_W - 18) as string[])
      : [];
    const titleLineCount = sceneTitle ? 1 : 0;

    const blockH =
      10 +
      titleLineCount * 5.5 +
      descLines.length * 5.2 +
      (voiceLines.length > 0 ? voiceLines.length * 5 + 5 : 0) +
      8;
    checkPage(blockH);

    // Role badge
    let badgeRight = drawRoleBadge(doc, role, MARGIN, y);

    // Scene number
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 140, 175);
    doc.text(`Scene ${sceneNum}`, badgeRight, y + 0.5);
    badgeRight += 18;

    // Duration
    if (durationSec != null) {
      doc.text(`${durationSec}s`, badgeRight, y + 0.5);
    }
    y += 8;

    // Scene title (if present)
    if (sceneTitle) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(18, 14, 40);
      doc.text(sceneTitle, MARGIN + 4, y);
      y += 5.5;
    }

    // Description (visual direction)
    if (descLines.length > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(25, 22, 45);
      doc.text(descLines, MARGIN + 4, y);
      y += descLines.length * 5.2 + 2;
    }

    // Voiceover / dialogue
    if (voiceLines.length > 0) {
      doc.setDrawColor(150, 120, 220);
      doc.setLineWidth(0.6);
      doc.line(MARGIN + 4, y - 1, MARGIN + 4, y + voiceLines.length * 5.2 - 1);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(110, 100, 155);
      doc.text(voiceLines, MARGIN + 8, y);
      y += voiceLines.length * 5.2 + 4;
    }

    // Inter-scene gap + light rule
    y += 4;
    if (i < total - 1) {
      doc.setDrawColor(235, 232, 248);
      doc.setLineWidth(0.2);
      doc.line(MARGIN + 14, y - 2, PAGE_W - MARGIN - 14, y - 2);
      y += 4;
    }
  }

  // ── Aesthetic Close banner ───────────────────────────────────────────────
  if (script.close) {
    const closeLines = doc.splitTextToSize(script.close, CONTENT_W - 24) as string[];
    const bannerH = closeLines.length * 5 + 12;
    checkPage(bannerH + 6);
    y += 4;

    doc.setFillColor(245, 243, 255); // violet-50
    doc.roundedRect(MARGIN, y, CONTENT_W, bannerH, 3, 3, "F");
    doc.setDrawColor(139, 92, 246);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y, MARGIN, y + bannerH);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(109, 40, 217); // violet-700
    doc.text("AESTHETIC CLOSE  ·  Loop / Stinger", MARGIN + 5, y + 5.5);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(76, 29, 149); // violet-900
    doc.text(closeLines, MARGIN + 5, y + 10.5);
    y += bannerH;
  }

  const pdfBlob = doc.output("blob");
  triggerDownload(pdfBlob, `${safeName(script.title)}-script.pdf`);
}

// ── Storyboard PDF ────────────────────────────────────────────────────────
export async function downloadStoryboardPdf(board: StoryboardData): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  const checkPage = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(18, 14, 40);
  const titleLines = doc.splitTextToSize(board.title, CONTENT_W) as string[];
  doc.text(titleLines, MARGIN, y);
  y += titleLines.length * 9 + 2;

  // Concept
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(130, 120, 160);
  const conceptLines = doc.splitTextToSize(board.concept, CONTENT_W) as string[];
  doc.text(conceptLines, MARGIN, y);
  y += conceptLines.length * 5.2 + 4;

  // Rule
  doc.setDrawColor(210, 205, 235);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 9;

  const IMG_W = 52;
  const IMG_H = 52;
  const TEXT_X = MARGIN + IMG_W + 7;
  const TEXT_W = CONTENT_W - IMG_W - 7;

  for (const scene of board.scenes) {
    doc.setFontSize(11);
    const scTitleLines = doc.splitTextToSize(scene.title, TEXT_W) as string[];
    doc.setFontSize(9);
    const descLines = doc.splitTextToSize(scene.description, TEXT_W) as string[];

    const textH = scTitleLines.length * 5.5 + 3 + descLines.length * 4.8;
    const blockH = Math.max(IMG_H, textH) + 12;
    checkPage(blockH);

    // Image or placeholder
    if (scene.imageUrl) {
      const b64 = await fetchImageBase64(scene.imageUrl);
      if (b64) {
        const fmt = b64.startsWith("data:image/png") ? "PNG" : "JPEG";
        try {
          doc.addImage(b64, fmt, MARGIN, y, IMG_W, IMG_H);
        } catch {
          drawPlaceholder(doc, MARGIN, y, IMG_W, IMG_H);
        }
      } else {
        drawPlaceholder(doc, MARGIN, y, IMG_W, IMG_H);
      }
    } else {
      drawPlaceholder(doc, MARGIN, y, IMG_W, IMG_H);
    }

    // Frame label bar
    doc.setFillColor(0, 0, 0);
    doc.setGState(doc.GState({ opacity: 0.55 }));
    doc.rect(MARGIN, y + IMG_H - 7, IMG_W, 7, "F");
    doc.setGState(doc.GState({ opacity: 1 }));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(`Frame ${scene.scene}`, MARGIN + 2.5, y + IMG_H - 1.8);

    // Scene title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(18, 14, 40);
    doc.text(scTitleLines, TEXT_X, y + 5);
    const afterTitle = y + 5 + scTitleLines.length * 5.5 + 3;

    // Description
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 75, 110);
    doc.text(descLines, TEXT_X, afterTitle);

    y += blockH;
  }

  const pdfBlob = doc.output("blob");
  triggerDownload(pdfBlob, `${safeName(board.title)}-storyboard.pdf`);
}

/** Download the available storyboard images as sequentially named PNG files in a ZIP. */
export async function downloadStoryboardImages(board: StoryboardData): Promise<void> {
  const zip = new JSZip();
  const skippedFrames: string[] = [];
  const imageResults = await Promise.all(
    board.scenes.map(async (scene, index) => {
      const frameName = `frame-${index + 1}.png`;

      if (!scene.imageUrl) {
        skippedFrames.push(`${frameName} (no image URL)`);
        return null;
      }

      try {
        const response = await fetch(scene.imageUrl);
        if (!response.ok) {
          skippedFrames.push(`${frameName} (image request failed)`);
          return null;
        }

        return { frameName, blob: await response.blob() };
      } catch {
        skippedFrames.push(`${frameName} (image request failed)`);
        return null;
      }
    }),
  );

  for (const result of imageResults) {
    if (result) {
      zip.file(result.frameName, result.blob);
    }
  }

  const readmeLines = [
    "STORYBOARD IMAGES",
    "",
    "Each available storyboard frame is included as a PNG file.",
  ];
  if (skippedFrames.length > 0) {
    readmeLines.push(
      "",
      "Skipped frames:",
      ...skippedFrames.map((frame) => `- ${frame}`),
    );
  }
  zip.file("README.txt", `${readmeLines.join("\n")}\n`);

  const zipBlob = await zip.generateAsync({ type: "blob", mimeType: "application/zip" });
  triggerDownload(zipBlob, `${safeName(board.title)}-storyboard-images.zip`);
}

function drawPlaceholder(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  doc.setFillColor(235, 233, 248);
  doc.roundedRect(x, y, w, h, 3, 3, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(170, 160, 210);
  doc.text("No image", x + w / 2, y + h / 2, { align: "center" });
}

// ── Captions TXT ──────────────────────────────────────────────────────────
export function downloadCaptionsTxt(data: CaptionsData): void {
  const SEP = "─".repeat(44);
  const lines: string[] = [
    `SOCIAL CAPTIONS`,
    data.topic ? `Topic: ${data.topic}` : "",
    "",
    SEP,
    "",
  ];

  for (const c of data.captions) {
    lines.push(c.platform.toUpperCase());
    lines.push("");
    lines.push(c.caption);
    if (c.hashtags.length > 0) {
      lines.push("");
      lines.push(c.hashtags.map((h) => `#${h}`).join(" "));
    }
    lines.push("");
    lines.push(SEP);
    lines.push("");
  }

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  triggerDownload(blob, `${safeName(data.topic || "captions")}-captions.txt`);
}
