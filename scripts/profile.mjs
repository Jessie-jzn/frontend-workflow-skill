#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import {
  DEFAULT_PROFILE_HOME,
  assertOutsideGit,
  fail,
  fingerprint,
  parseArgs,
  profileFor,
  readJson,
  values,
  writeJson,
} from './profile-lib.mjs';

function usage() {
  return `Usage:
  profile.mjs list [--project PATH] [--home PATH] [--json]
  profile.mjs add --kind candidate|confirmed --name NAME --path RELATIVE_PATH --use-for PURPOSE [--input NAME] [--output NAME] [--evidence PATH]
  profile.mjs promote --name NAME
  profile.mjs verify [--json]
  profile.mjs export --to PATH [--yes]
  profile.mjs import --from PATH [--yes]
  profile.mjs forget --name NAME
`;
}

function context(options) {
  return profileFor(options.project || process.cwd(), options.home || DEFAULT_PROFILE_HOME, false);
}

function cardFiles(profileDir) {
  return {
    candidate: join(profileDir, 'candidates.json'),
    confirmed: join(profileDir, 'confirmed.json'),
  };
}

function readCards(profileDir) {
  const files = cardFiles(profileDir);
  return {
    candidate: readJson(files.candidate, []),
    confirmed: readJson(files.confirmed, []),
  };
}

function saveCards(profileDir, cards) {
  const files = cardFiles(profileDir);
  writeJson(files.candidate, cards.candidate);
  writeJson(files.confirmed, cards.confirmed);
}

function safeCapabilityPath(projectRoot, requested) {
  if (!requested || isAbsolute(requested)) throw new Error('Capability path must be relative to the project root.');
  const absolute = resolve(projectRoot, requested);
  const rel = relative(projectRoot, absolute);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('Capability path escapes the project root.');
  if (!existsSync(absolute)) throw new Error(`Capability path does not exist: ${requested}`);
  return { absolute, relative: rel };
}

function minimalCard(card, projectRoot) {
  if (!card || typeof card !== 'object') throw new Error('Capability card must be an object.');
  if (typeof card.name !== 'string' || !card.name.trim()) throw new Error('Capability name is required.');
  const path = safeCapabilityPath(projectRoot, card.path);
  const useFor = values(card.useFor).filter((item) => typeof item === 'string');
  const contract = card.contract && typeof card.contract === 'object' ? card.contract : {};
  return {
    name: card.name,
    path: path.relative,
    useFor,
    contract: {
      inputs: values(contract.inputs).filter((item) => typeof item === 'string'),
      outputs: values(contract.outputs).filter((item) => typeof item === 'string'),
    },
    evidence: values(card.evidence).filter((item) => typeof item === 'string'),
    fingerprint: fingerprint(path.absolute),
    verifiedAt: new Date().toISOString(),
  };
}

function denyTerms(path) {
  if (!path) return [];
  return readFileSync(resolve(path), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

function assertNoSensitiveTerms(value, denyFile) {
  const contents = JSON.stringify(value).toLowerCase();
  const match = denyTerms(denyFile).find((term) => contents.includes(term.toLowerCase()));
  if (match) throw new Error(`Sensitive term found in capability package: ${match}`);
}

function add(options) {
  const profile = context(options);
  if (!['candidate', 'confirmed'].includes(options.kind)) throw new Error('--kind must be candidate or confirmed.');
  if (!options.name || !options['use-for']) throw new Error('--name and --use-for are required.');
  const path = safeCapabilityPath(profile.projectRoot, options.path);
  const cards = readCards(profile.profileDir);
  const card = {
    name: options.name,
    path: path.relative,
    useFor: values(options['use-for']),
    contract: { inputs: values(options.input), outputs: values(options.output) },
    evidence: values(options.evidence),
    fingerprint: fingerprint(path.absolute),
    verifiedAt: new Date().toISOString(),
  };
  cards.candidate = cards.candidate.filter((item) => item.name !== card.name);
  cards.confirmed = cards.confirmed.filter((item) => item.name !== card.name);
  cards[options.kind].push(card);
  cards[options.kind].sort((a, b) => a.name.localeCompare(b.name));
  saveCards(profile.profileDir, cards);
  process.stdout.write(`Stored ${card.name} as ${options.kind}.\n`);
}

function promote(options) {
  if (!options.name) throw new Error('--name is required.');
  const profile = context(options);
  const cards = readCards(profile.profileDir);
  const card = cards.candidate.find((item) => item.name === options.name);
  if (!card) throw new Error(`Candidate not found: ${options.name}`);
  cards.candidate = cards.candidate.filter((item) => item.name !== options.name);
  cards.confirmed = [...cards.confirmed.filter((item) => item.name !== options.name), card]
    .sort((a, b) => a.name.localeCompare(b.name));
  saveCards(profile.profileDir, cards);
  process.stdout.write(`Promoted ${options.name}.\n`);
}

function verify(options) {
  const profile = context(options);
  const cards = readCards(profile.profileDir);
  const result = [...cards.confirmed, ...cards.candidate].map((card) => {
    const path = resolve(profile.projectRoot, card.path);
    let status = 'current';
    if (!existsSync(path)) status = 'missing';
    else if (fingerprint(path) !== card.fingerprint) status = 'stale';
    return { name: card.name, path: card.path, status };
  });
  if (options.json) process.stdout.write(`${JSON.stringify(result)}\n`);
  else for (const item of result) process.stdout.write(`${item.status}\t${item.name}\t${item.path}\n`);
}

function list(options) {
  const profile = context(options);
  const cards = readCards(profile.profileDir);
  if (options.json) process.stdout.write(`${JSON.stringify(cards)}\n`);
  else {
    for (const kind of ['confirmed', 'candidate']) {
      process.stdout.write(`${kind}:\n`);
      for (const card of cards[kind]) process.stdout.write(`  ${card.name}\t${card.path}\n`);
    }
  }
}

function exportCards(options) {
  if (!options.to) throw new Error('--to is required.');
  const destination = resolve(options.to);
  assertOutsideGit(destination, 'Export destination');
  const profile = context(options);
  const cards = readCards(profile.profileDir);
  const payload = { schemaVersion: 1, capabilities: cards.confirmed };
  assertNoSensitiveTerms(payload, options['deny-file']);
  if (!options.yes) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    throw new Error('Review the export above, then rerun with --yes.');
  }
  writeJson(destination, payload);
  process.stdout.write(`Exported ${payload.capabilities.length} confirmed capabilities to ${destination}.\n`);
}

function importCards(options) {
  if (!options.from) throw new Error('--from is required.');
  const source = resolve(options.from);
  assertOutsideGit(source, 'Import source');
  const payload = readJson(source, null);
  if (!payload || payload.schemaVersion !== 1 || !Array.isArray(payload.capabilities)) {
    throw new Error('Unsupported capability export.');
  }
  assertNoSensitiveTerms(payload, options['deny-file']);
  if (!options.yes) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    throw new Error('Review the import above, then rerun with --yes.');
  }
  const profile = context(options);
  const cards = readCards(profile.profileDir);
  for (const card of payload.capabilities) {
    const imported = minimalCard(card, profile.projectRoot);
    cards.confirmed = cards.confirmed.filter((item) => item.name !== card.name);
    cards.confirmed.push(imported);
  }
  cards.confirmed.sort((a, b) => a.name.localeCompare(b.name));
  saveCards(profile.profileDir, cards);
  process.stdout.write(`Imported ${payload.capabilities.length} confirmed capabilities.\n`);
}

function forget(options) {
  if (!options.name) throw new Error('--name is required.');
  const profile = context(options);
  const cards = readCards(profile.profileDir);
  cards.candidate = cards.candidate.filter((item) => item.name !== options.name);
  cards.confirmed = cards.confirmed.filter((item) => item.name !== options.name);
  saveCards(profile.profileDir, cards);
  process.stdout.write(`Forgot ${options.name}.\n`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const command = options._[0];
  const handlers = { add, export: exportCards, forget, import: importCards, list, promote, verify };
  if (!handlers[command]) {
    process.stdout.write(usage());
    process.exitCode = command ? 1 : 0;
    return;
  }
  handlers[command](options);
}

try {
  main();
} catch (error) {
  fail(error);
}
