import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { makeGitProject, makeTempDir, runNode } from './helpers.mjs';

const skillRoot = new URL('..', import.meta.url).pathname;
const initScript = join(skillRoot, 'scripts', 'init.mjs');
const profileScript = join(skillRoot, 'scripts', 'profile.mjs');

function initializedProject() {
  const fixture = makeTempDir('frontend-workflow-profile-');
  const project = join(fixture, 'project');
  const profileHome = join(fixture, 'profiles');
  makeGitProject(project, { name: 'project', dependencies: { react: '^19.0.0' } }, {
    'src/components/UserPicker.tsx': 'export function UserPicker() { return null; }\n',
    'src/pages/Orders.tsx': 'import { UserPicker } from "../components/UserPicker";\n',
    'src/pages/Customers.tsx': 'import { UserPicker } from "../components/UserPicker";\n',
  });
  const init = runNode(initScript, ['--project', project, '--home', profileHome, '--yes', '--json']);
  assert.equal(init.status, 0, init.stderr);
  return { fixture, project, profileHome, profileDir: JSON.parse(init.stdout).profileDir };
}

test('stores a minimal candidate card and promotes it only on an explicit command', () => {
  const { project, profileHome, profileDir } = initializedProject();
  const common = ['--project', project, '--home', profileHome];

  const add = runNode(profileScript, ['add', ...common,
    '--kind', 'candidate', '--name', 'UserPicker', '--path', 'src/components/UserPicker.tsx',
    '--use-for', 'user selection', '--input', 'multiple', '--output', 'change',
    '--evidence', 'src/pages/Orders.tsx', '--evidence', 'src/pages/Customers.tsx']);
  assert.equal(add.status, 0, add.stderr);

  const candidates = JSON.parse(readFileSync(join(profileDir, 'candidates.json'), 'utf8'));
  const confirmedBefore = JSON.parse(readFileSync(join(profileDir, 'confirmed.json'), 'utf8'));
  assert.equal(candidates.length, 1);
  assert.deepEqual(Object.keys(candidates[0]).sort(), [
    'contract', 'evidence', 'fingerprint', 'name', 'path', 'useFor', 'verifiedAt',
  ]);
  assert.deepEqual(confirmedBefore, []);

  const promote = runNode(profileScript, ['promote', ...common, '--name', 'UserPicker']);
  assert.equal(promote.status, 0, promote.stderr);
  assert.deepEqual(JSON.parse(readFileSync(join(profileDir, 'candidates.json'), 'utf8')), []);
  assert.equal(JSON.parse(readFileSync(join(profileDir, 'confirmed.json'), 'utf8'))[0].name, 'UserPicker');
});

test('marks a changed capability as stale only when verification is requested', () => {
  const { project, profileHome } = initializedProject();
  const common = ['--project', project, '--home', profileHome];
  const add = runNode(profileScript, ['add', ...common,
    '--kind', 'confirmed', '--name', 'UserPicker', '--path', 'src/components/UserPicker.tsx',
    '--use-for', 'user selection']);
  assert.equal(add.status, 0, add.stderr);
  appendFileSync(join(project, 'src/components/UserPicker.tsx'), '// changed\n');

  const verify = runNode(profileScript, ['verify', ...common, '--json']);

  assert.equal(verify.status, 0, verify.stderr);
  const cards = JSON.parse(verify.stdout);
  assert.equal(cards[0].name, 'UserPicker');
  assert.equal(cards[0].status, 'stale');
});

test('refuses to export private capability cards into a Git worktree', () => {
  const { fixture, project, profileHome } = initializedProject();
  const destinationRepo = join(fixture, 'shared-repo');
  makeGitProject(destinationRepo, { name: 'shared-repo' });
  const destination = join(destinationRepo, 'team-capabilities.json');

  const result = runNode(profileScript, ['export', '--project', project, '--home', profileHome,
    '--to', destination]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Git worktree/i);
});

test('blocks an export when a Git-external deny list matches private terms', () => {
  const { fixture, project, profileHome } = initializedProject();
  const common = ['--project', project, '--home', profileHome];
  const add = runNode(profileScript, ['add', ...common,
    '--kind', 'confirmed', '--name', 'PrivatePicker', '--path', 'src/components/UserPicker.tsx',
    '--use-for', 'AcmeSecretPlatform users']);
  assert.equal(add.status, 0, add.stderr);
  const denyFile = join(fixture, 'deny.txt');
  const destination = join(fixture, 'export.json');
  writeFileSync(denyFile, 'AcmeSecretPlatform\n');

  const result = runNode(profileScript, ['export', ...common, '--to', destination,
    '--deny-file', denyFile, '--yes']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /sensitive term/i);
});

test('imports only the minimal capability card fields', () => {
  const { fixture, project, profileHome, profileDir } = initializedProject();
  const source = join(fixture, 'import.json');
  writeFileSync(source, `${JSON.stringify({
    schemaVersion: 1,
    capabilities: [{
      name: 'UserPicker',
      path: 'src/components/UserPicker.tsx',
      useFor: ['user selection'],
      contract: { inputs: ['multiple'], outputs: ['change'] },
      evidence: ['src/pages/Orders.tsx'],
      sourceCode: 'private implementation',
      responseSample: { token: 'secret' },
    }],
  })}\n`);

  const result = runNode(profileScript, ['import', '--project', project, '--home', profileHome,
    '--from', source, '--yes']);

  assert.equal(result.status, 0, result.stderr);
  const card = JSON.parse(readFileSync(join(profileDir, 'confirmed.json'), 'utf8'))[0];
  assert.deepEqual(Object.keys(card).sort(), [
    'contract', 'evidence', 'fingerprint', 'name', 'path', 'useFor', 'verifiedAt',
  ]);
  assert.equal(JSON.stringify(card).includes('secret'), false);
});
