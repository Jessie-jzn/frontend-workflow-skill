#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fail, parseArgs, requireProjectRoot } from './profile-lib.mjs';

const FRONTEND = /\.(?:[cm]?[jt]sx?|vue|svelte)$/i;
const SHARED = /(?:^|\/)(?:components|hooks|composables|utils|lib|store|state|router|routes|styles)(?:\/|$)/i;

function git(root, args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  return { status: result.status ?? 1, stdout: result.stdout, stderr: result.stderr };
}

function packageCommand(root, name, files) {
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    if (!pkg.scripts?.[name]) return null;
    const manager = existsSync(join(root, 'pnpm-lock.yaml')) ? 'pnpm' : existsSync(join(root, 'yarn.lock')) ? 'yarn' : 'npm';
    if (name === 'lint' && files.length) return `${manager} run lint -- ${files.join(' ')}`;
    return `${manager} run ${name}`;
  } catch { return null; }
}

try {
  const options = parseArgs(process.argv.slice(2));
  const root = requireProjectRoot(resolve(options.project || process.cwd()));
  const base = options.base;
  const names = new Set();
  const diffArgs = base ? ['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`] : ['diff', '--name-only', '--diff-filter=ACMR', 'HEAD'];
  const diffNames = git(root, diffArgs);
  if (diffNames.status !== 0) throw new Error(diffNames.stderr.trim() || 'Unable to read changed files.');
  for (const file of diffNames.stdout.split(/\r?\n/).filter(Boolean)) names.add(file);
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard']);
  for (const file of untracked.stdout.split(/\r?\n/).filter(Boolean)) names.add(file);
  const changedFiles = [...names].sort();
  const frontendFiles = changedFiles.filter((file) => FRONTEND.test(file));
  const sharedRiskFiles = changedFiles.filter((file) => SHARED.test(file));
  const diffCheck = git(root, base ? ['diff', '--check', `${base}...HEAD`] : ['diff', '--check', 'HEAD']);
  let untrackedWhitespace = false;
  for (const file of changedFiles) {
    if (!existsSync(join(root, file))) continue;
    if (readFileSync(join(root, file), 'utf8').split(/\r?\n/).some((line) => /[ \t]+$/.test(line))) untrackedWhitespace = true;
  }
  const diffCheckPassed = diffCheck.status === 0 && !untrackedWhitespace;
  const suggestedChecks = [packageCommand(root, 'lint', frontendFiles), packageCommand(root, 'typecheck', []), packageCommand(root, 'test', [])].filter(Boolean);
  const report = { root, changedFiles, frontendFiles, sharedRiskFiles, diffCheckPassed, suggestedChecks };
  if (options.json) process.stdout.write(`${JSON.stringify(report)}\n`);
  else process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = diffCheckPassed ? 0 : 1;
} catch (error) {
  fail(error);
}

