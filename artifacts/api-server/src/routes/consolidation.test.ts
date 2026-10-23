import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import app from '../app';

let server: Server;
let base: string;
beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', error => error ? reject(error) : resolve());
    server.once('error', reject);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing server address');
  base = `http://127.0.0.1:${address.port}/api`;
});
afterAll(async () => { if (server) await new Promise<void>(resolve => server.close(() => resolve())); });

describe('unified route registration', () => {
  it('keeps the original health contract', async () => {
    const response = await fetch(`${base}/healthz`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });
  it('adds cinematic planning without replacing ModelArk routes', async () => {
    const response = await fetch(`${base}/video/plan`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction: 'A city at dusk', mode: 'cinematic' }),
    });
    const plan = await response.json() as { mode: string; shots: unknown[]; totalDurationSec: number; aspectRatio: string; recommendedPreset: string };
    expect(response.status).toBe(200);
    expect(plan.mode).toBe('cinematic');
    expect(plan.shots).toHaveLength(3);
    expect(plan.totalDurationSec).toBe(15);
  });
  it('retains viral planning and existing preset overrides', async () => {
    const response = await fetch(`${base}/video/plan`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction: 'A short hook', mode: 'viral', preset: 'neon_drip' }),
    });
    const plan = await response.json() as { mode: string; shots: unknown[]; totalDurationSec: number; aspectRatio: string; recommendedPreset: string };
    expect(plan.mode).toBe('viral');
    expect(plan.aspectRatio).toBe('9:16');
    expect(plan.recommendedPreset).toBe('neon_drip');
  });
  it('keeps the existing video-agent integration route available', async () => {
    const response = await fetch(`${base}/video-agent/heygen-available`);
    expect(response.status).toBe(200);
    expect(typeof ((await response.json()) as { available: boolean }).available).toBe('boolean');
  });
});
