import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

export function makeTempDir(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

export function makeGitProject(root, packageJson, files = {}) {
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);
  for (const [path, contents] of Object.entries(files)) {
    const target = join(root, path);
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, contents);
  }
  execFileSync('git', ['init', '-q', root]);
  execFileSync('git', ['-C', root, 'config', 'user.name', 'Skill Test']);
  execFileSync('git', ['-C', root, 'config', 'user.email', 'skill-test@example.com']);
  execFileSync('git', ['-C', root, 'add', '.']);
  execFileSync('git', ['-C', root, 'commit', '-qm', 'fixture']);
}

export function runNode(script, args, options = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    input: options.input,
    encoding: 'utf8',
  });
}

export function snapshotTree(root) {
  const snapshot = {};
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.git') continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else snapshot[relative(root, path)] = {
        contents: readFileSync(path, 'utf8'),
        mode: statSync(path).mode,
      };
    }
  };
  visit(root);
  return snapshot;
}
