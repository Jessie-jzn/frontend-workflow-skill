import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { makeGitProject, makeTempDir, runNode, snapshotTree } from './helpers.mjs';

const skillRoot = new URL('..', import.meta.url).pathname;
const checkScript = join(skillRoot, 'scripts', 'check-changed-files.mjs');

test('reports changed frontend files and shared-code risk without modifying the project', () => {
  const fixture = makeTempDir('frontend-workflow-check-');
  const project = join(fixture, 'project');
  makeGitProject(project, {
    name: 'project',
    scripts: { lint: 'eslint src', typecheck: 'tsc --noEmit' },
    dependencies: { react: '^19.0.0' },
  }, {
    'src/components/UserPicker.tsx': 'export const UserPicker = () => null;\n',
    'src/pages/Orders.tsx': 'export const Orders = () => null;\n',
  });
  writeFileSync(join(project, 'src/components/UserPicker.tsx'), 'export const UserPicker = () => <input />;\n');
  const before = snapshotTree(project);

  const result = runNode(checkScript, ['--project', project, '--json']);

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.changedFiles, ['src/components/UserPicker.tsx']);
  assert.deepEqual(report.frontendFiles, ['src/components/UserPicker.tsx']);
  assert.deepEqual(report.sharedRiskFiles, ['src/components/UserPicker.tsx']);
  assert.deepEqual(report.suggestedChecks, ['npm run lint -- src/components/UserPicker.tsx', 'npm run typecheck']);
  assert.deepEqual(snapshotTree(project), before);
});

test('includes untracked frontend files and reports diff whitespace failures', () => {
  const fixture = makeTempDir('frontend-workflow-diff-');
  const project = join(fixture, 'project');
  makeGitProject(project, { name: 'project', dependencies: { vue: '^3.0.0' } }, {
    'src/App.vue': '<template><main /></template>\n',
  });
  mkdirSync(join(project, 'src', 'components'), { recursive: true });
  writeFileSync(join(project, 'src', 'components', 'NewPicker.vue'), '<template><input /></template>  \n');

  const result = runNode(checkScript, ['--project', project, '--json']);

  assert.equal(result.status, 1, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.frontendFiles, ['src/components/NewPicker.vue']);
  assert.equal(report.diffCheckPassed, false);
});
