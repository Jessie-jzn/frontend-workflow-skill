---
name: frontend-workflow
description: Use when developing, debugging, reviewing, or preparing JavaScript/TypeScript frontend changes in an existing repository, especially where reuse, shared components, API contracts, oversized files, or validation scope need disciplined handling.
---

# Frontend Workflow

Route frontend work through a small investigation, the relevant guardrails, and proportionate validation. Repository instructions and current code are the source of truth; this Skill supplies the reusable process.

## Start every task

1. Find the Git root, repository instructions, package manager, framework, and package scripts. Run `node <skill-dir>/scripts/inspect-project.mjs --project <root>` when useful.
2. Read the target file and direct callers/dependencies before proposing changes.
3. If initialized, query the private Profile with `node <skill-dir>/scripts/profile.mjs list --project <root> --json`; missing Profile is normal.
4. Do not create documentation or configuration in the target project unless the user explicitly requests it.

## Route by task

| User intent | Read |
| --- | --- |
| Develop or modify a feature | `references/feature-development.md`, `references/engineering-guardrails.md`, `references/capability-discovery.md`; read `references/delivery-readiness.md` for API-driven or state-changing behavior |
| Debug an error or unexpected behavior | `references/engineering-guardrails.md`, `references/delivery-readiness.md`; read `references/data-contract-debugging.md` for joins, dictionaries, mismatched displays, or missing-looking data |
| Review a diff, feature, or module | `references/code-review.md`, `references/engineering-guardrails.md`; add `references/delivery-readiness.md` for API work and `references/capability-discovery.md` for new or shared UI |
| Pre-submit validation | `references/pre-submit-checks.md` |
| Find reusable capabilities or callers | `references/capability-discovery.md` |
| Maintain this Skill or prepare a public release | `references/skill-maintenance.md` |

For combined work, use development → review → pre-submit checks.

## Non-negotiable boundaries

- Prefer direct reuse, composition, backward-compatible extension, local implementation, then a new component—in that order.
- Do not copy a component merely to alter it. Do not force reuse from matching names.
- Unless the user explicitly requests refactoring, do not split large files, migrate old callers, reorganize layers, rename existing APIs, or clean unrelated code. File length triggers inspection only.
- Do not claim a shared change is safe until callers, contracts, validation, and residual risk are stated.
- Missing reuse options do not block coding. Missing business or API facts that determine correctness do.
- Keep normal progress quiet: one line for small work, 3–5 lines for ordinary work, detailed evidence only for shared-code risk.

## Local learning

Initialize only with user approval:

```bash
node <skill-dir>/scripts/init.mjs --project <root>
```

Private Profiles live outside every Git worktree. Record concise capability cards, verify them only when relevant, and ask before promotion or import/export. See `references/capability-discovery.md`.

## Finish

Report changed files, actual reuse, validation, and material residual risk. Do not produce a document, design report, or historical cleanup proposal unless requested.

