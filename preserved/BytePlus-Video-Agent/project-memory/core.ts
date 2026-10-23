export type MemoryStatus = "DRAFT" | "PROPOSED" | "APPROVED" | "LOCKED" | "REJECTED" | "ARCHIVED";
export type ReferenceRole = "AUTHORITATIVE" | "SUPPORTING" | "EXPLORATORY" | "REJECTED";
export type NotebookType =
  | "character"
  | "identity"
  | "face"
  | "body"
  | "hair"
  | "tattoo"
  | "jewelry"
  | "wardrobe"
  | "location"
  | "world"
  | "prop"
  | "style"
  | "camera"
  | "lighting"
  | "prompt_recipe"
  | "playbook"
  | "story"
  | "scene"
  | "shot"
  | "reference"
  | "continuity_rule"
  | "approved_generation"
  | "rejected_generation"
  | "lesson"
  | "general"
  | "mode"
  | "shot_beat"
  | "hook_strategy"
  | "pacing_script"
  | "subtitle_style"
  | "delivery_manifest";

export type LockType =
  | "identity"
  | "face"
  | "body"
  | "hair"
  | "wardrobe"
  | "location"
  | "world"
  | "camera"
  | "style"
  | "composition"
  | "performance"
  | "audio"
  | "continuity"
  | "brand"
  | "custom";

export interface ReferenceAsset {
  id: string;
  title: string;
  uri: string;
  purpose: string;
  role: ReferenceRole;
  tags: string[];
}

export interface ContextSection {
  id: string;
  key: string;
  title: string;
  content: string;
  status: MemoryStatus;
  locked: boolean;
  referenceIds: string[];
  tags: string[];
  updatedAt: string;
}

export interface NotebookEntry {
  id: string;
  type: NotebookType;
  title: string;
  content: string;
  status: MemoryStatus;
  tags: string[];
  referenceIds: string[];
  linkedIds: string[];
  confidence: number;
  source?: string;
  updatedAt: string;
}

export interface ProductionLock {
  id: string;
  type: LockType;
  title: string;
  rule: string;
  status: "APPROVED" | "LOCKED";
  scope: string[];
  referenceIds: string[];
}

export interface AcceptanceCriterion {
  id: string;
  rule: string;
  required: boolean;
  scope: string[];
}

export interface GenerationRecord {
  id: string;
  taskType: string;
  prompt: string;
  contextIds: string[];
  notebookIds: string[];
  referenceIds: string[];
  lockIds: string[];
  modelId?: string;
  assetIds: string[];
  status: "GENERATED" | "APPROVED" | "REJECTED";
  failureCodes: string[];
  createdAt: string;
}

export interface ContinuityEvent {
  id: string;
  generationId: string;
  kind: string;
  detail: string;
  createdAt: string;
}

export interface ProjectMemory {
  projectId: string;
  context: ContextSection[];
  notebook: NotebookEntry[];
  references: ReferenceAsset[];
  locks: ProductionLock[];
  acceptance: AcceptanceCriterion[];
  generations: GenerationRecord[];
  continuity: ContinuityEvent[];
}

const n = (s: string) => s.toLowerCase().trim(),
  t = (s: string) => n(s).split(/[^a-z0-9]+/).filter(Boolean);

const K: Record<string, string[]> = {
  FACE_GENERATION: ["face", "identity", "hair"],
  CHARACTER_GENERATION: ["character", "identity", "face", "body", "hair", "tattoo", "jewelry"],
  WARDROBE_GENERATION: ["wardrobe", "jewelry", "hair"],
  LOCATION_GENERATION: ["location", "world", "lighting", "style"],
  PERFORMANCE_GENERATION: ["character", "performance", "wardrobe", "location", "camera"],
  LIP_SYNC_GENERATION: ["face", "identity", "hair", "wardrobe", "audio", "camera"],
  VIDEO_SHOT_GENERATION: ["character", "identity", "wardrobe", "location", "world", "camera", "style", "continuity"],
  STORYBOARD_GENERATION: ["story", "scene", "shot", "character", "location", "camera", "style"],
  CINEMATIC_GENERATION: ["camera", "lighting", "style", "continuity_rule", "shot", "scene"],
  VIRAL_GENERATION: ["hook_strategy", "pacing_script", "subtitle_style", "style", "shot"],
};

export function retrieveProjectMemory(m: ProjectMemory, type: string, q = "") {
  const k = new Set([...(K[type] ?? []), ...t(q)]),
    score = (s: string) => t(s).reduce((a, x) => a + (k.has(x) ? 1 : 0), 0);
  const context = m.context.filter((x) => x.locked || score(`${x.key} ${x.title} ${x.content} ${x.tags.join(" ")}`) > 0),
    notebook = m.notebook.filter(
      (x) => x.status === "APPROVED" || x.status === "LOCKED" || score(`${x.type} ${x.title} ${x.content} ${x.tags.join(" ")}`) > 0
    ),
    references = m.references.filter(
      (r) =>
        r.role !== "REJECTED" &&
        (context.some((c) => c.referenceIds.includes(r.id)) ||
          notebook.some((x) => x.referenceIds.includes(r.id)) ||
          score(`${r.title} ${r.purpose} ${r.tags.join(" ")}`) > 0)
    ),
    locks = m.locks.filter((l) => l.status === "LOCKED" || !l.scope.length || l.scope.some((s) => k.has(n(s)))),
    acceptance = m.acceptance.filter((a) => !a.scope.length || a.scope.some((s) => k.has(n(s))) || type.includes("VIDEO") || type.includes("LIP"));
  return { context, notebook, references, locks, acceptance, recentFailures: m.generations.filter((x) => x.status === "REJECTED").slice(-10) };
}

export function buildGenerationContext(m: ProjectMemory, type: string, userInstruction: string, mode?: string) {
  const memoryType = mode === "cinematic" ? "CINEMATIC_GENERATION" : mode === "viral" ? "VIRAL_GENERATION" : type;
  return {
    projectId: m.projectId,
    type,
    mode: mode ?? "standard",
    userInstruction,
    ...retrieveProjectMemory(m, memoryType, userInstruction),
    priority: [
      "HARD_LOCKS",
      "AUTHORITATIVE_REFERENCES",
      "ACCEPTANCE_CRITERIA",
      "ACTIVE_CONTEXT",
      "APPROVED_NOTEBOOK",
      "APPROVED_GENERATIONS",
      "GENERAL_NOTES",
      "USER_INSTRUCTION",
      "MODEL_DEFAULTS",
    ],
  };
}

export function checkLockConflicts(i: string, locks: ProductionLock[]) {
  const x = n(i);
  return locks.filter(
    (l) =>
      (n(l.rule).includes("no sunglasses") && x.includes("sunglasses")) ||
      (n(l.rule).includes("camera locked") && /(camera|pan|zoom|dolly|handheld|tracking)/.test(x))
  );
}

export function approveGeneration(m: ProjectMemory, id: string, assets: string[]) {
  const g = m.generations.find((x) => x.id === id);
  if (!g) throw Error(`Generation ${id} not found`);
  g.status = "APPROVED";
  g.assetIds = assets;
  return g;
}

export function rejectGeneration(m: ProjectMemory, id: string, codes: string[], detail = "") {
  const g = m.generations.find((x) => x.id === id);
  if (!g) throw Error(`Generation ${id} not found`);
  g.status = "REJECTED";
  g.failureCodes = codes;
  if (detail)
    m.continuity.push({
      id: `continuity-${Date.now()}`,
      generationId: id,
      kind: codes[0] ?? "OTHER",
      detail,
      createdAt: new Date().toISOString(),
    });
  return g;
}

export function toPromptContext(c: ReturnType<typeof buildGenerationContext>) {
  return [
    `PROJECT: ${c.projectId}`,
    `TASK: ${c.type}`,
    `PRODUCTION MODE: ${c.mode.toUpperCase()}`,
    "HARD LOCKS:",
    ...c.locks.map((x) => `- ${x.title}: ${x.rule}`),
    "ACCEPTANCE:",
    ...c.acceptance.map((x) => `- ${x.rule}`),
    "ACTIVE CONTEXT:",
    ...c.context.map((x) => `- ${x.title}: ${x.content}`),
    "APPROVED NOTEBOOK:",
    ...c.notebook.filter((x) => x.status === "APPROVED" || x.status === "LOCKED").map((x) => `- ${x.type}/${x.title}: ${x.content}`),
    "AUTHORITATIVE REFERENCES:",
    ...c.references.filter((x) => x.role === "AUTHORITATIVE").map((x) => `- ${x.title}: ${x.uri}`),
    "RECENT FAILURES TO AVOID:",
    ...c.recentFailures.flatMap((x) => x.failureCodes.map((f) => `- ${f}`)),
    `USER INSTRUCTION: ${c.userInstruction}`,
  ].join("\n");
}

