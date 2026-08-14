import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

export const DEFAULT_PROFILE_HOME = join(homedir(), '.codex', 'frontend-workflow', 'projects');

export function parseArgs(argv) {
  const options = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      options._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith('--')) {
      options[key] = true;
      continue;
    }
    index += 1;
    if (options[key] === undefined) options[key] = next;
    else if (Array.isArray(options[key])) options[key].push(next);
    else options[key] = [options[key], next];
  }
  return options;
}

export function values(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function gitRoot(path) {
  let probe = resolve(path);
  while (!existsSync(probe)) {
    const parent = dirname(probe);
    if (parent === probe) return null;
    probe = parent;
  }
  if (!statSync(probe).isDirectory()) probe = dirname(probe);
  const result = spawnSync('git', ['-C', probe, 'rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
  });
  return result.status === 0 ? realpathSync(result.stdout.trim()) : null;
}

export function requireProjectRoot(path) {
  const root = gitRoot(path);
  if (!root) throw new Error(`Project is not inside a Git worktree: ${resolve(path)}`);
  return root;
}

export function assertOutsideGit(path, label = 'Private profile location') {
  const root = gitRoot(path);
  if (root) throw new Error(`${label} must be outside every Git worktree (found ${root}).`);
}

export function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, path);
}

function projectId(projectRoot) {
  const slug = basename(projectRoot).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'project';
  const digest = createHash('sha256').update(projectRoot).digest('hex').slice(0, 10);
  return `${slug}-${digest}`;
}

export function profileFor(projectPath, homePath = DEFAULT_PROFILE_HOME, create = false) {
  const projectRoot = requireProjectRoot(projectPath);
  const home = resolve(homePath);
  assertOutsideGit(home);
  const registryPath = join(home, 'registry.json');
  const registry = readJson(registryPath, { schemaVersion: 1, projects: {} });
  let id = registry.projects[projectRoot];
  if (!id && create) {
    id = projectId(projectRoot);
    registry.projects[projectRoot] = id;
    writeJson(registryPath, registry);
  }
  if (!id) throw new Error(`Project is not initialized. Run scripts/init.mjs in ${projectRoot}.`);
  const profileDir = join(home, id);
  assertOutsideGit(profileDir);
  return { home, profileDir, projectRoot, registry, registryPath, id };
}

export function fingerprint(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function fail(error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${message}\n`);
  process.exitCode = 1;
}

