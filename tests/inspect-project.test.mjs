import assert from 'node:assert/strict';
import { join } from 'node:path';
import test from 'node:test';
import { makeGitProject, makeTempDir, runNode } from './helpers.mjs';

const skillRoot = new URL('..', import.meta.url).pathname;
const inspectScript = join(skillRoot, 'scripts', 'inspect-project.mjs');

test('detects framework, package manager, and available verification scripts', () => {
  const fixture = makeTempDir('frontend-workflow-inspect-');
  const project = join(fixture, 'project');
  makeGitProject(project, {
    name: 'project',
    packageManager: 'pnpm@9.0.0',
    scripts: { lint: 'eslint src', test: 'vitest run', typecheck: 'tsc --noEmit', ignored: 'echo ignored' },
    dependencies: { vue: '^3.5.0' },
  });

  const result = runNode(inspectScript, ['--project', project, '--json']);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    root: project.replace(/^\/var\//, '/private/var/'),
    framework: 'vue3',
    packageManager: 'pnpm',
    scripts: { lint: 'eslint src', test: 'vitest run', typecheck: 'tsc --noEmit' },
  });
});
