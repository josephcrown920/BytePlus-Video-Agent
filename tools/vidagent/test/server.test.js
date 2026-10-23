import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server/server.js';
import { SeedreamClient, SeedanceClient } from '../src/index.js';

test('standalone server serves health, UI, and validates director authentication', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const previous = process.env.AURORA_MCP_TOKEN;
  delete process.env.AURORA_MCP_TOKEN;
  try {
    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).ok, true);
    const ui = await fetch(base);
    assert.equal(ui.status, 200);
    assert.match(await ui.text(), /<html/i);
    const director = await fetch(`${base}/api/modelark-director`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction: 'Plan a scene' }),
    });
    assert.equal(director.status, 503);
    assert.match((await director.json()).error, /AURORA_MCP_TOKEN/);
  } finally {
    if (previous === undefined) delete process.env.AURORA_MCP_TOKEN;
    else process.env.AURORA_MCP_TOKEN = previous;
    await new Promise(resolve => server.close(resolve));
  }
});

test('both standalone provider clients retain dry-run behavior', () => {
  const image = new SeedreamClient().dryRun({ prompt: 'A cinematic landscape', version: '5.0' });
  const video = new SeedanceClient().dryRun({ prompt: 'A cinematic landscape', version: '2.0' });
  for (const result of [image, video]) {
    assert.equal(result.ok, true);
    assert.equal(result.dry_run, true);
    assert.ok(result.request.model);
  }
});
