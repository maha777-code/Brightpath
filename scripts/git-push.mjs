import { execSync } from 'node:child_process';
import { writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const log = path.join(root, 'sync-log.txt');

function run(cmd) {
  appendFileSync(log, `\n$ ${cmd}\n`);
  try {
    const out = execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    appendFileSync(log, out);
    return true;
  } catch (err) {
    appendFileSync(log, [err.stdout, err.stderr, err.message].filter(Boolean).join('\n'));
    return false;
  }
}

writeFileSync(log, `Sync started ${new Date().toISOString()}\n`);
run('git status --porcelain');
run('git add -A');
run('git commit -m "feat: add logout on home; fix dev build and CORS for local ports"');
run('git push origin main');
run('git log -1 --oneline');
appendFileSync(log, '\nDONE\n');
