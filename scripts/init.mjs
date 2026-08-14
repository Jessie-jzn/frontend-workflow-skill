#!/usr/bin/env node

import { readdirSync, readFileSync } from 'node:fs';
import { basename, extname, join, relative, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import {
  DEFAULT_PROFILE_HOME,
  assertOutsideGit,
  fail,
  parseArgs,
  profileFor,
  requireProjectRoot,
  writeJson,
} from './profile-lib.mjs';

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.vue']);
const SKIP_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.nuxt']);

function walk(root, limit = 2500) {
  const files = [];
  const visit = (directory) => {
    if (files.length >= limit) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (files.length >= limit) return;
      if (entry.isDirectory() && SKIP_DIRECTORIES.has(entry.name)) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (SOURCE_EXTENSIONS.has(extname(entry.name))) files.push(path);
    }
  };
  visit(root);
  return files;
}

function detectFramework(pkg) {
  const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
  if (dependencies.react || dependencies['react-dom']) return 'react';
  if (dependencies.vue) return String(dependencies.vue).match(/(?:^|\D)2(?:\D|$)/) ? 'vue2' : 'vue3';
  return 'generic';
}

function detectPackageManager(root, pkg) {
  const names = new Set(readdirSync(root));
  if (names.has('pnpm-lock.yaml')) return 'pnpm';
  if (names.has('yarn.lock')) return 'yarn';
  if (names.has('bun.lock') || names.has('bun.lockb')) return 'bun';
  if (names.has('package-lock.json')) return 'npm';
  return pkg.packageManager?.split('@')[0] || 'unknown';
}

function selectCommands(scripts = {}) {
  const selected = {};
  for (const key of ['build', 'lint', 'test', 'typecheck', 'type-check']) {
    if (scripts[key]) selected[key === 'type-check' ? 'typecheck' : key] = scripts[key];
  }
  return Object.fromEntries(Object.entries(selected).sort(([a], [b]) => a.localeCompare(b)));
}

function existingPaths(root, candidates) {
  const names = new Set(walkDirectories(root, 3));
  return candidates.filter((path) => names.has(path));
}

function walkDirectories(root, maxDepth) {
  const directories = [];
  const visit = (directory, depth) => {
    if (depth > maxDepth) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isDirectory() || SKIP_DIRECTORIES.has(entry.name)) continue;
      const path = join(directory, entry.name);
      directories.push(relative(root, path));
      visit(path, depth + 1);
    }
  };
  visit(root, 1);
  return directories;
}

function buildLightIndex(projectRoot, sharedPaths, sourceFiles) {
  const contents = new Map(sourceFiles.map((path) => [path, readFileSync(path, 'utf8')]));
  const components = [];
  for (const sharedPath of sharedPaths) {
    const prefix = `${join(projectRoot, sharedPath)}/`;
    for (const path of sourceFiles.filter((file) => file.startsWith(prefix))) {
      const name = basename(path, extname(path)).replace(/^index$/, basename(join(path, '..')));
      const callerPattern = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      const callers = [...contents.entries()].filter(([file, text]) => file !== path && callerPattern.test(text)).length;
      components.push({ name, path: relative(projectRoot, path), callers });
    }
  }
  return components.sort((a, b) => b.callers - a.callers || a.path.localeCompare(b.path));
}

async function confirm(summary) {
  const terminal = createInterface({ input: stdin, output: stdout });
  const answer = await terminal.question(`${summary}\nCreate this private profile outside Git? [y/N] `);
  terminal.close();
  return /^y(es)?$/i.test(answer.trim());
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const requestedProject = resolve(options.project || process.cwd());
  const home = resolve(options.home || DEFAULT_PROFILE_HOME);
  const projectRoot = requireProjectRoot(requestedProject);
  assertOutsideGit(home);
  const packagePath = join(projectRoot, 'package.json');
  let pkg = {};
  try {
    pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
  } catch {
    pkg = { name: basename(projectRoot) };
  }
  const sourceFiles = walk(projectRoot);
  const framework = detectFramework(pkg);
  const language = sourceFiles.some((path) => ['.ts', '.tsx'].includes(extname(path))) ? 'typescript' : 'javascript';
  const sourcePaths = existingPaths(projectRoot, ['src', 'app', 'pages']);
  const sharedPaths = existingPaths(projectRoot, [
    'src/components', 'src/hooks', 'src/composables', 'src/utils',
    'app/components', 'app/hooks', 'app/utils', 'components', 'hooks', 'utils',
  ]);
  const commands = selectCommands(pkg.scripts);
  const packageManager = detectPackageManager(projectRoot, pkg);
  const summary = [
    `Project: ${projectRoot}`,
    `Detected: ${framework}, ${language}, ${packageManager}`,
    `Shared paths: ${sharedPaths.join(', ') || 'none'}`,
    `Checks: ${Object.keys(commands).join(', ') || 'none'}`,
    `Profile home: ${home}`,
  ].join('\n');
  if (!options.yes && !(await confirm(summary))) {
    process.stderr.write('Cancelled.\n');
    process.exitCode = 2;
    return;
  }
  const profile = profileFor(projectRoot, home, true);
  const now = new Date().toISOString();
  const config = {
    schemaVersion: 1,
    projectRoot: profile.projectRoot,
    projectName: pkg.name || basename(projectRoot),
    framework,
    language,
    packageManager,
    sourcePaths,
    sharedPaths,
    commands,
    learning: { mode: 'local', suggestPromotion: true },
    initializedAt: now,
  };
  writeJson(join(profile.profileDir, 'config.json'), config);
  writeJson(join(profile.profileDir, 'index.json'), buildLightIndex(profile.projectRoot, sharedPaths, sourceFiles));
  writeJson(join(profile.profileDir, 'candidates.json'), []);
  writeJson(join(profile.profileDir, 'confirmed.json'), []);
  const output = { ...config, profileDir: profile.profileDir };
  if (options.json) stdout.write(`${JSON.stringify(output)}\n`);
  else stdout.write(`${summary}\nInitialized. The project worktree was not modified.\n`);
}

main().catch(fail);
