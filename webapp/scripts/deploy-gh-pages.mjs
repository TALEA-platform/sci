import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webappDir = resolve(scriptDir, '..');
const distDir = resolve(webappDir, 'dist');

if (!existsSync(distDir)) {
  console.error('Missing dist directory. Run "npm run build" before deploying.');
  process.exit(1);
}

function run(command, args, cwd) {
  execFileSync(command, args, { cwd, stdio: 'inherit' });
}

function read(command, args, cwd) {
  return execFileSync(command, args, { cwd, encoding: 'utf8' }).trim();
}

function tryReadGitConfig(key) {
  try {
    return read('git', ['config', key], webappDir);
  } catch {
    return '';
  }
}

const remoteUrl = read('git', ['remote', 'get-url', 'origin'], webappDir);
const publishDir = mkdtempSync(join(tmpdir(), 'sci-gh-pages-'));

try {
  run('git', ['init'], publishDir);
  run('git', ['checkout', '-b', 'gh-pages'], publishDir);

  const userName = tryReadGitConfig('user.name');
  const userEmail = tryReadGitConfig('user.email');
  if (userName) {
    run('git', ['config', 'user.name', userName], publishDir);
  }
  if (userEmail) {
    run('git', ['config', 'user.email', userEmail], publishDir);
  }

  run('git', ['remote', 'add', 'origin', remoteUrl], publishDir);

  for (const entry of readdirSync(distDir)) {
    cpSync(join(distDir, entry), join(publishDir, entry), { recursive: true });
  }

  writeFileSync(join(publishDir, '.nojekyll'), '');

  run('git', ['add', '--all'], publishDir);
  run('git', ['commit', '-m', 'Deploy site'], publishDir);
  run('git', ['push', '--force', 'origin', 'gh-pages'], publishDir);
} finally {
  rmSync(publishDir, { recursive: true, force: true });
}