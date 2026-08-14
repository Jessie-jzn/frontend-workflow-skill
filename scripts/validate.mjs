#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fail, parseArgs } from './profile-lib.mjs';

const REQUIRED_FILES = [
  'SKILL.md',
  'README.md',
  'README.zh-CN.md',
  'LICENSE',
  'agents/openai.yaml',
  'references/feature-development.md',
  'references/engineering-guardrails.md',
  'references/delivery-readiness.md',
  'references/data-contract-debugging.md',
  'references/capability-discovery.md',
  'references/code-review.md',
  'references/pre-submit-checks.md',
  'references/skill-maintenance.md',
  'scripts/inspect-project.mjs',
  'scripts/check-changed-files.mjs',
  'scripts/init.mjs',
  'scripts/profile.mjs',
  'scripts/profile-lib.mjs',
  'scripts/validate.mjs',
  'evals/cases/reuse-existing-capability.md',
  'evals/cases/local-when-contract-differs.md',
  'evals/cases/shared-change-impact.md',
  'evals/cases/api-command-closure.md',
];
const TEXT_EXTENSIONS = new Set(['', '.md', '.mjs', '.js', '.json', '.yaml', '.yml', '.txt']);
const PRIVATE_ARTIFACTS = new Set(['registry.json', 'config.json', 'candidates.json', 'confirmed.json', 'index.json']);
const DISALLOWED_ARTIFACTS = new Set(['.DS_Store']);

function walk(root) {
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const path = join(directory, entry.name);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) throw new Error(`Symlinks are not allowed in the public skill: ${relative(root, path)}`);
      if (entry.isDirectory()) visit(path);
      else files.push(path);
    }
  };
  visit(root);
  return files;
}

function loadDenyTerms(path) {
  if (!path) return [];
  return readFileSync(resolve(path), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const skillRoot = resolve(options.skill || fileURLToPath(new URL('..', import.meta.url)));
  const files = walk(skillRoot);
  const relativeFiles = new Set(files.map((path) => relative(skillRoot, path)));
  for (const required of REQUIRED_FILES) {
    if (!relativeFiles.has(required)) throw new Error(`Missing required file: ${required}`);
  }
  for (const file of relativeFiles) {
    if (DISALLOWED_ARTIFACTS.has(file.split('/').at(-1))) {
      throw new Error(`Generated artifact must not ship in the public skill: ${file}`);
    }
    if (PRIVATE_ARTIFACTS.has(file.split('/').at(-1))) {
      throw new Error(`Private profile artifact must not ship in the public skill: ${file}`);
    }
  }
  const skill = readFileSync(join(skillRoot, 'SKILL.md'), 'utf8');
  if (!skill.startsWith('---\n')) throw new Error('SKILL.md frontmatter is missing.');
  const frontmatterEnd = skill.indexOf('\n---\n', 4);
  if (frontmatterEnd < 0) throw new Error('SKILL.md frontmatter is not closed.');
  const frontmatter = skill.slice(4, frontmatterEnd);
  if (!/^name: frontend-workflow$/m.test(frontmatter)) throw new Error('Skill name must be frontend-workflow.');
  if (!/^description: Use when /m.test(frontmatter)) throw new Error('Description must start with "Use when".');
  if (/\b(?:TODO|TBD)\b/.test(skill)) throw new Error('SKILL.md contains unfinished placeholders.');
  const denyTerms = loadDenyTerms(options['deny-file']);
  for (const path of files) {
    if (!TEXT_EXTENSIONS.has(extname(path))) continue;
    const contents = readFileSync(path, 'utf8');
    const term = denyTerms.find((candidate) => contents.toLowerCase().includes(candidate.toLowerCase()));
    if (term) throw new Error(`Private term found in ${relative(skillRoot, path)}: ${term}`);
  }
  for (const path of files.filter((file) => extname(file) === '.mjs')) {
    const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`JavaScript syntax check failed for ${relative(skillRoot, path)}:\n${result.stderr}`);
  }
  process.stdout.write(`Skill package is valid: ${skillRoot}\n`);
}

try {
  main();
} catch (error) {
  fail(error);
}
