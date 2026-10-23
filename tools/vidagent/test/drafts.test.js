import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DraftManager } from '../src/drafts/draft-manager.js';

test('drafts persist, filter, update, duplicate, submit, and delete without losing data', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'unified-drafts-'));
  try {
    const manager = new DraftManager(directory);
    const original = manager.create('video', { prompt: 'A city', ratio: '16:9' });
    const restored = new DraftManager(directory);
    assert.deepEqual(restored.get(original.id), original);
    assert.equal(restored.list({ type: 'image' }).length, 0);
    assert.equal(restored.list({ type: 'video', status: 'draft' }).length, 1);
    assert.equal(restored.update(original.id, { prompt: 'A night city' }).data.ratio, '16:9');
    const copy = restored.duplicate(original.id);
    assert.notEqual(copy.id, original.id);
    assert.equal(copy.data.prompt, 'A night city');
    assert.equal(restored.setStatus(copy.id, 'submitted', { jobId: 'job-1' }).status, 'submitted');
    assert.equal(restored.get(copy.id).data.jobId, 'job-1');
    assert.equal(restored.delete(original.id), true);
    assert.equal(restored.get(original.id), null);
    assert.equal(restored.get('../outside'), null);
    assert.equal(restored.delete('../outside'), false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
