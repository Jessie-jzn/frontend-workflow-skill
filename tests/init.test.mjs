import assert from 'node:assert/strict';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { makeGitProject, makeTempDir, runNode, snapshotTree } from './helpers.mjs';

const skillRoot = new URL('..', import.meta.url).pathname;
const initScript = join(skillRoot, 'scripts', 'init.mjs');

test('initializes a React project outside Git without changing the project', () => {
  const fixture = makeTempDir('frontend-workflow-init-');
  const project = join(fixture, 'shop-ui');
  const profileHome = join(fixture, 'profiles');
  makeGitProject(project, {
    name: 'shop-ui',
    scripts: { lint: 'eslint src', typecheck: 'tsc --noEmit', build: 'vite build' },
    dependencies: { react: '^19.0.0' },
    devDependencies: { typescript: '^5.0.0', vite: '^7.0.0' },
  }, {
    'src/components/UserPicker.tsx': 'export function UserPicker() { return null; }\n',
    'src/pages/Orders.tsx': 'export function Orders() { return null; }\n',
  });
  const before = snapshotTree(project);

  const result = runNode(initScript, ['--project', project, '--home', profileHome, '--yes', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.framework, 'react');
  assert.equal(output.language, 'typescript');
  assert.deepEqual(output.sharedPaths, ['src/components']);
  assert.deepEqual(snapshotTree(project), before);
  assert.ok(existsSync(output.profileDir));
  const config = JSON.parse(readFileSync(join(output.profileDir, 'config.json'), 'utf8'));
  assert.equal(config.projectRoot, realpathSync(project));
  assert.deepEqual(config.commands, {
    build: 'vite build',
    lint: 'eslint src',
    typecheck: 'tsc --noEmit',
  });
});

test('detects Vue 2 and records only available checks', () => {
  const fixture = makeTempDir('frontend-workflow-vue-');
  const project = join(fixture, 'admin-ui');
  const profileHome = join(fixture, 'profiles');
  makeGitProject(project, {
    name: 'admin-ui',
    scripts: { lint: 'vue-cli-service lint' },
    dependencies: { vue: '^2.7.0' },
  }, { 'src/components/UserSelect.vue': '<template><div /></template>\n' });

  const result = runNode(initScript, ['--project', project, '--home', profileHome, '--yes', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.framework, 'vue2');
  assert.deepEqual(output.commands, { lint: 'vue-cli-service lint' });
});

test('refuses to store private profiles inside any Git worktree', () => {
  const fixture = makeTempDir('frontend-workflow-git-');
  const project = join(fixture, 'project');
  makeGitProject(project, { name: 'project' });
  const unsafeHome = join(project, '.private-profiles');

  const result = runNode(initScript, ['--project', project, '--home', unsafeHome, '--yes']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Git worktree/i);
  assert.equal(existsSync(unsafeHome), false);
});

test('cancelling interactive initialization writes nothing', () => {
  const fixture = makeTempDir('frontend-workflow-cancel-');
  const project = join(fixture, 'project');
  const profileHome = join(fixture, 'profiles');
  makeGitProject(project, { name: 'project', dependencies: { react: '^19.0.0' } });

  const result = runNode(initScript, ['--project', project, '--home', profileHome], { input: 'n\n' });

  assert.equal(result.status, 2);
  assert.equal(existsSync(profileHome), false);
});
