# Frontend Workflow

`SKILL.md` is the Codex trigger entry point. This README provides an English workflow guide. Repository instructions and the current code always take precedence; this skill supplies only reusable process guidance.

## Start every task

1. Find the Git root, repository instructions, package manager, framework, and `package.json` scripts. Run this when needed:

   ```bash
   node <skill-dir>/scripts/inspect-project.mjs --project <root>
   ```

2. Before editing, read the target files plus their direct callers and dependencies.
3. When initialized, query the private Profile:

   ```bash
   node <skill-dir>/scripts/profile.mjs list --project <root> --json
   ```

   No Profile is a normal state.
4. Do not create documentation or configuration in the target project unless the user explicitly asks.

## Load rules by task

| User intent | Required reading |
| --- | --- |
| Develop or change a feature | `references/feature-development.md`, `references/engineering-guardrails.md`, and `references/capability-discovery.md`; also read `references/delivery-readiness.md` for API-driven work or server-state changes |
| Diagnose an error or unexpected behavior | `references/engineering-guardrails.md` and `references/delivery-readiness.md`; also read `references/data-contract-debugging.md` for related lists, dictionaries, display inconsistencies, or suspected missing fields |
| Review a diff, feature, or module | `references/code-review.md` and `references/engineering-guardrails.md`; add `delivery-readiness.md` for API work and `capability-discovery.md` for new UI or shared capabilities |
| Pre-submit checks | `references/pre-submit-checks.md` |
| Find a reusable capability or callers | `references/capability-discovery.md` |
| Maintain or release this skill | `references/skill-maintenance.md` |

For a request containing multiple kinds of work, follow: development, then review, then pre-submit checks.

## Non-negotiable boundaries

- Choose in this order: direct reuse, composition, backward-compatible extension, page-local implementation, then a new component.
- Do not reuse solely because names look similar, and do not copy a component and modify it.
- Unless the user explicitly requests refactoring, do not split a large file, migrate existing callers, reorganize hierarchy, rename, or clean unrelated code.
- Do not claim a shared-capability change is safe until callers are enumerated, contracts are checked, verification is complete, and residual risk is stated.
- Not finding a reusable capability does not block implementation. Pause only for an unclear business or API contract that affects correctness.
- Keep ordinary tasks quiet: one sentence for a small change, three to five lines for a typical task, and detailed evidence only for shared risk.

## Local learning

Initialize only with user approval:

```bash
node <skill-dir>/scripts/init.mjs --project <root>
```

Profiles always live outside Git worktrees. Capability cards record only paths and concise contracts; re-verify only when needed; promotion, import, and export all require user confirmation. See `references/capability-discovery.md`.

## Delivery

Report only changed files, actual reuse, verification, and important residual risk. Do not generate documentation, design reports, or history-cleanup proposals unless the user asks.
