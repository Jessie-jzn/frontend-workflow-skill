import assert from 'node:assert/strict';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { makeTempDir, runNode } from './helpers.mjs';

const skillRoot = new URL('..', import.meta.url).pathname;
const validateScript = join(skillRoot, 'scripts', 'validate.mjs');

test('validates the complete public skill package', () => {
  const result = runNode(validateScript, ['--skill', skillRoot]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /valid/i);
});

test('rejects a package without the complete workflow references', () => {
  const fixture = makeTempDir('frontend-workflow-references-');
  const copy = join(fixture, 'frontend-workflow');
  cpSync(skillRoot, copy, { recursive: true });
  rmSync(join(copy, 'references', 'code-review.md'), { force: true });

  const result = runNode(join(copy, 'scripts', 'validate.mjs'), ['--skill', copy]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /references\/code-review\.md/);
});

test('rejects a package without the English README guide', () => {
  const fixture = makeTempDir('frontend-workflow-language-');
  const copy = join(fixture, 'frontend-workflow');
  cpSync(skillRoot, copy, { recursive: true });
  rmSync(join(copy, 'README.md'), { force: true });

  const result = runNode(join(copy, 'scripts', 'validate.mjs'), ['--skill', copy]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /README\.md/);
});

test('rejects a package without the Chinese README guide', () => {
  const fixture = makeTempDir('frontend-workflow-language-');
  const copy = join(fixture, 'frontend-workflow');
  cpSync(skillRoot, copy, { recursive: true });
  rmSync(join(copy, 'README.zh-CN.md'), { force: true });

  const result = runNode(join(copy, 'scripts', 'validate.mjs'), ['--skill', copy]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /README\.zh-CN\.md/);
});

test('rejects macOS metadata from the public package', () => {
  const fixture = makeTempDir('frontend-workflow-metadata-');
  const copy = join(fixture, 'frontend-workflow');
  cpSync(skillRoot, copy, { recursive: true });
  writeFileSync(join(copy, '.DS_Store'), 'metadata');

  const result = runNode(join(copy, 'scripts', 'validate.mjs'), ['--skill', copy]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /\.DS_Store/);
});

test('rejects project-specific terms supplied from a deny file outside the skill', () => {
  const fixture = makeTempDir('frontend-workflow-privacy-');
  const copy = join(fixture, 'frontend-workflow');
  const denyFile = join(fixture, 'private-patterns.txt');
  cpSync(skillRoot, copy, { recursive: true });
  mkdirSync(join(copy, 'references'), { recursive: true });
  writeFileSync(join(copy, 'references', 'leak.md'), 'AcmeSecretPlatform\n');
  writeFileSync(denyFile, 'AcmeSecretPlatform\n');

  const result = runNode(join(copy, 'scripts', 'validate.mjs'), ['--skill', copy, '--deny-file', denyFile]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /private term/i);
});

test('validates itself when installed under a path containing spaces', () => {
  const fixture = makeTempDir('frontend-workflow-spaces-');
  const copy = join(fixture, 'skill packages', 'frontend workflow');
  cpSync(skillRoot, copy, { recursive: true });

  const result = runNode(join(copy, 'scripts', 'validate.mjs'), []);

  assert.equal(result.status, 0, result.stderr);
});
