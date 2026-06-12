#!/usr/bin/env node
// Runs the API server and the Vite frontend together for local development.
// The frontend proxies /api to the server (see frontend/vite.config.ts).

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const procs = [
  { name: 'server', cwd: join(root, 'server'), args: ['run', 'dev'], color: '\x1b[36m' },
  { name: 'web', cwd: join(root, 'frontend'), args: ['run', 'dev'], color: '\x1b[35m' },
];

const children = procs.map(({ name, cwd, args, color }) => {
  const child = spawn('npm', args, { cwd, shell: false });
  const tag = `${color}[${name}]\x1b[0m `;
  const pipe = (stream, out) =>
    stream.on('data', (d) =>
      d.toString().split('\n').filter(Boolean).forEach((l) => out.write(tag + l + '\n'))
    );
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => {
    process.stdout.write(`${tag}exited with code ${code}\n`);
    shutdown();
  });
  return child;
});

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) c.kill('SIGTERM');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
