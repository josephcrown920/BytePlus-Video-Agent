import jsPDF from "jspdf";

// ── Constants ─────────────────────────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ── Types ─────────────────────────────────────────────────────────────────
export type ScriptScene = {
  scene: number;
  description: string;
  dialogue: string;
  duration_seconds: number;
};
export type ScriptData = {
  title: string;
  format: string;
  total_duration_seconds: number;
  scenes: ScriptScene[];
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
export function downloadScriptPdf(script: ScriptData): void {
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
  const titleLines = doc.splitTextToSize(script.title, CONTENT_W) as string[];
  doc.text(titleLines, MARGIN, y);
  y += titleLines.length * 9 + 2;

  // Meta line
  const formatLabel: Record<string, string> = { video: "Video", ad: "Ad", reel: "Reel" };
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(130, 120, 160);
  doc.text(
    `${formatLabel[script.format] ?? script.format}  ·  ${script.total_duration_seconds}s total  ·  ${script.scenes.length} scenes`,
    MARGIN,
    y,
  );
  y += 5;

  // Rule
  doc.setDrawColor(210, 205, 235);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 9;

  const formatLabel2: Record<string, string> = { video: "Video", ad: "Ad", reel: "Reel" };
  void formatLabel2;

  for (const scene of script.scenes) {
    doc.setFontSize(10);
    const descLines = doc.splitTextToSize(scene.description, CONTENT_W - 8) as string[];
    const dialogLines = scene.dialogue
      ? (doc.splitTextToSize(`"${scene.dialogue}"`, CONTENT_W - 18) as string[])
      : [];

    const blockH =
      8 + descLines.length * 5.2 + (dialogLines.length > 0 ? dialogLines.length * 5 + 5 : 0) + 10;
    checkPage(blockH);

    // Scene badge
    doc.setFillColor(110, 86, 207);
    doc.roundedRect(MARGIN, y - 4.5, 22, 6.5, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(`SCENE ${scene.scene}`, MARGIN + 2, y + 0.5);

    // Duration
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 140, 175);
    doc.text(`${scene.duration_seconds}s`, MARGIN + 26, y + 0.5);
    y += 8;

    // Description
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(25, 22, 45);
    doc.text(descLines, MARGIN + 4, y);
    y += descLines.length * 5.2 + 2;

    // Dialogue
    if (dialogLines.length > 0) {
      doc.setDrawColor(150, 120, 220);
      doc.setLineWidth(0.6);
      doc.line(MARGIN + 4, y - 1, MARGIN + 4, y + dialogLines.length * 5.2 - 1);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(110, 100, 155);
      doc.text(dialogLines, MARGIN + 8, y);
      y += dialogLines.length * 5.2 + 4;
    }

    // Inter-scene gap + light rule
    y += 5;
    if (scene !== script.scenes[script.scenes.length - 1]) {
      doc.setDrawColor(235, 232, 248);
      doc.setLineWidth(0.2);
      doc.line(MARGIN + 14, y - 3, PAGE_W - MARGIN - 14, y - 3);
    }
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
