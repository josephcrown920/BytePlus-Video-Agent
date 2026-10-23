import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apps = {
  video: 'byteplus-video-agent',
  studio: 'byteplus-studio',
  aura: 'aura-ai',
};
const app = apps[process.argv[2] ?? 'video'];
if (!app) throw new Error('Choose video, studio, or aura.');
const port = Number(process.env.PORT ?? 3100);
const apiPort = Number(process.env.API_PORT ?? 5100);
if (![port, apiPort].every(p => Number.isInteger(p) && p > 0 && p < 65536) || port === apiPort) {
  throw new Error('PORT and API_PORT must be distinct valid TCP ports.');
}
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
function run(args, cwd, env) {
  const child = spawn('pnpm', args, { cwd, env: { ...process.env, ...env }, stdio: 'inherit' });
  children.push(child);
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { if (!stopping) stop(code ?? 1); });
  return child;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
// Build only the API here; Vite compiles frontend changes on demand.
const build = spawn('pnpm', ['--filter', '@workspace/api-server', 'run', 'build'], { cwd: root, stdio: 'inherit' });
const built = await new Promise(resolve => {
  build.on('error', error => { console.error(error.message); resolve(1); });
  build.on('exit', resolve);
});
if (built !== 0) process.exit(built ?? 1);
if (!stopping) {
  run(['--filter', '@workspace/api-server', 'run', 'start'], root, { PORT: String(apiPort) });
  run(['exec', 'vite', '--host', '127.0.0.1'], path.join(root, 'artifacts', app), {
    PORT: String(port), BASE_PATH: '/', API_PORT: String(apiPort),
  });
}
