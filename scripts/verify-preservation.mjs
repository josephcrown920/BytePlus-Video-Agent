import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, lstatSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(path.join(root, 'preserved/manifest.json'), 'utf8'));
let total = 0;
for (const source of manifest.sources) {
  const rows = execFileSync('git', ['ls-tree', '-rz', source.commit], { cwd: root }).toString().split('\0').filter(Boolean);
  assert.equal(rows.length, source.files.length, `${source.repository}: manifest file count`);
  const recorded = new Map(source.files.map(file => [file.path, file]));
  for (const row of rows) {
    const [metadata, relative] = row.split('\t');
    const [mode, kind, blob] = metadata.split(' ');
    assert.equal(kind, 'blob', `Unsupported Git entry: ${relative}`);
    const record = recorded.get(relative);
    assert.ok(record, `Missing manifest entry: ${relative}`);
    assert.equal(record.blob, blob);
    assert.equal(record.mode, mode);
    const filename = path.join(root, source.snapshot, relative);
    const content = readFileSync(filename);
    const hash = createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex');
    assert.equal(hash, blob, `Original content changed: ${filename}`);
    assert.equal(createHash('sha256').update(content).digest('hex'), record.sha256);
    assert.equal(Boolean(lstatSync(filename).mode & 0o111), mode === '100755', `Executable mode: ${relative}`);
    total++;
  }
  const bundle = path.join(root, 'preserved/git', `${source.repository.split('/')[1]}.bundle`);
  execFileSync('git', ['bundle', 'verify', bundle], { cwd: root, stdio: 'pipe' });
  console.log(`${source.repository}: ${source.files.length} original files and Git bundle verified`);
}
console.log(`${total} original files preserved byte for byte.`);
