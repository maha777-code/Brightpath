#!/usr/bin/env node
/**
 * Moves legacy root-level web files into apps/web (one-time migration).
 * Run from repo root: npm run migrate:monorepo
 */
import { existsSync, mkdirSync, renameSync, cpSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const webRoot = join(root, 'apps', 'web');

const moves = ['src', 'public'];
const files = ['index.html', 'vite.config.ts', 'tsconfig.json', 'tsconfig.app.json'];

mkdirSync(webRoot, { recursive: true });

for (const dir of moves) {
  const from = join(root, dir);
  const to = join(webRoot, dir);
  if (existsSync(from) && !existsSync(to)) {
    renameSync(from, to);
    console.log(`Moved ${dir}/ → apps/web/${dir}/`);
  } else if (existsSync(from) && existsSync(to)) {
    console.log(`Skip ${dir}/ (already in apps/web)`);
  }
}

for (const file of files) {
  const from = join(root, file);
  const to = join(webRoot, file);
  if (existsSync(from) && !existsSync(to)) {
    renameSync(from, to);
    console.log(`Moved ${file} → apps/web/${file}`);
  }
}

console.log('\nDone. Run: npm install && npm run docker:up && npm run db:push');
