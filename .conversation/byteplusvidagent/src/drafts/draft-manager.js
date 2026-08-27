// File-backed draft storage for the studio UI.
// Draft ids are generated here and never derived from a user supplied path.
import fs from "fs";
import path from "path";
import crypto from "crypto";

const DRAFT_TYPES = new Set(["image", "video", "multishot", "pipeline", "scene"]);
const DRAFT_STATUS = new Set(["draft", "submitted", "completed"]);

export class DraftManager {
  constructor(directory = "drafts") {
    this.directory = path.resolve(process.cwd(), directory);
    fs.mkdirSync(this.directory, { recursive: true });
  }

  create(type, data = {}) {
    if (!DRAFT_TYPES.has(type)) {
      throw new Error(`Unsupported draft type: ${type}`);
    }
    const now = new Date().toISOString();
    const draft = {
      id: `draft_${crypto.randomUUID()}`,
      type,
      status: "draft",
      data: this.#safeData(data),
      createdAt: now,
      updatedAt: now,
    };
    this.#write(draft);
    return draft;
  }

  list({ type, status } = {}) {
    return this.#all()
      .filter((draft) => (!type || draft.type === type) && (!status || draft.status === status))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  get(id) {
    return this.#read(id);
  }

  update(id, data = {}) {
    const draft = this.#read(id);
    if (!draft) return null;
    const updated = { ...draft, data: this.#safeData(data), updatedAt: new Date().toISOString() };
    this.#write(updated);
    return updated;
  }

  delete(id) {
    const file = this.#fileFor(id);
    if (!file || !fs.existsSync(file)) return false;
    fs.unlinkSync(file);
    return true;
  }

  duplicate(id) {
    const source = this.#read(id);
    if (!source) return null;
    return this.create(source.type, source.data);
  }

  setStatus(id, status, extraData = {}) {
    if (!DRAFT_STATUS.has(status)) {
      throw new Error(`Unsupported draft status: ${status}`);
    }
    const draft = this.#read(id);
    if (!draft) return null;
    const updated = {
      ...draft,
      status,
      data: { ...draft.data, ...this.#safeData(extraData) },
      updatedAt: new Date().toISOString(),
    };
    this.#write(updated);
    return updated;
  }

  #all() {
    return fs.readdirSync(this.directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => this.#read(entry.name.slice(0, -5)))
      .filter(Boolean);
  }

  #read(id) {
    const file = this.#fileFor(id);
    if (!file || !fs.existsSync(file)) return null;
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      return null;
    }
  }

  #write(draft) {
    const file = this.#fileFor(draft.id);
    if (!file) throw new Error("Invalid draft id");
    fs.writeFileSync(file, JSON.stringify(draft, null, 2), "utf8");
  }

  #fileFor(id) {
    if (typeof id !== "string" || !/^draft_[a-f0-9-]{36}$/i.test(id)) return null;
    return path.join(this.directory, `${id}.json`);
  }

  #safeData(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    // JSON serialization detaches values from request prototypes and prevents
    // functions or other runtime-only values from entering persisted drafts.
    return JSON.parse(JSON.stringify(data));
  }
}