import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const TYPES = new Set(['image', 'video', 'pipeline', 'scene']);

export class DraftManager {
  constructor(directory = 'drafts') {
    this.directory = path.resolve(directory);
  }

  filename(id) {
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) return null;
    return path.join(this.directory, `${id}.json`);
  }

  get(id) {
    const filename = this.filename(id);
    if (!filename) return null;
    try { return JSON.parse(fs.readFileSync(filename, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }

  write(draft) {
    fs.mkdirSync(this.directory, { recursive: true });
    const filename = this.filename(draft.id);
    if (!filename) throw new Error('Invalid draft ID');
    const temporary = `${filename}.${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, JSON.stringify(draft, null, 2) + '\n', { mode: 0o600 });
      fs.renameSync(temporary, filename);
    } finally {
      fs.rmSync(temporary, { force: true });
    }
    return draft;
  }

  create(type, data = {}) {
    if (!TYPES.has(type)) throw new Error('Unsupported draft type');
    const now = new Date().toISOString();
    return this.write({ id: randomUUID(), type, status: 'draft', data, createdAt: now, updatedAt: now });
  }

  list({ type, status } = {}) {
    if (!fs.existsSync(this.directory)) return [];
    return fs.readdirSync(this.directory).filter(file => file.endsWith('.json'))
      .map(file => this.get(file.slice(0, -5)))
      .filter(draft => draft && (!type || draft.type === type) && (!status || draft.status === status))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  update(id, data) {
    const draft = this.get(id);
    return draft ? this.write({ ...draft, data: { ...draft.data, ...data }, updatedAt: new Date().toISOString() }) : null;
  }

  delete(id) {
    const filename = this.filename(id);
    if (!filename) return false;
    try { fs.unlinkSync(filename); return true; }
    catch (error) { if (error.code === 'ENOENT') return false; throw error; }
  }

  duplicate(id) {
    const draft = this.get(id);
    return draft ? this.create(draft.type, draft.data) : null;
  }

  setStatus(id, status, data = {}) {
    const draft = this.get(id);
    return draft ? this.write({ ...draft, status, data: { ...draft.data, ...data }, updatedAt: new Date().toISOString() }) : null;
  }
}
