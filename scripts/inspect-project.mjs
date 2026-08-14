#!/usr/bin/env node

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fail, parseArgs, requireProjectRoot } from './profile-lib.mjs';

function framework(pkg) {
  const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
  if (dependencies.react || dependencies['react-dom']) return 'react';
  if (dependencies.vue) return String(dependencies.vue).match(/(?:^|\D)2(?:\D|$)/) ? 'vue2' : 'vue3';
  if (dependencies['@angular/core']) return 'angular';
  if (dependencies.svelte) return 'svelte';
  return 'generic';
}

function packageManager(root, pkg) {
  const names = new Set(readdirSync(root));
  if (names.has('pnpm-lock.yaml')) return 'pnpm';
  if (names.has('yarn.lock')) return 'yarn';
  if (names.has('bun.lock') || names.has('bun.lockb')) return 'bun';
  if (names.has('package-lock.json')) return 'npm';
  return pkg.packageManager?.split('@')[0] || 'unknown';
}

try {
  const options = parseArgs(process.argv.slice(2));
  const root = requireProjectRoot(resolve(options.project || process.cwd()));
  let pkg = {};
  try { pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')); } catch { /* package.json is optional */ }
  const scripts = Object.fromEntries(Object.entries(pkg.scripts || {}).filter(([name]) =>
    ['lint', 'test', 'build', 'typecheck', 'type-check'].includes(name)));
  const result = { root, framework: framework(pkg), packageManager: packageManager(root, pkg), scripts };
  process.stdout.write(options.json ? `${JSON.stringify(result)}\n` : `${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  fail(error);
}

