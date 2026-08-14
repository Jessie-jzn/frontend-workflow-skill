<h1 align="center">⚡ Frontend Workflow</h1>

<p align="center">
  <strong>Help your AI agent make small, reusable, and safe frontend changes.</strong>
</p>

<p align="center">
  Discover what already exists before building. Keep shared changes deliberate. Ship with evidence.
</p>

<p align="center">
  <a href="README.zh-CN.md">中文</a> · <a href="#quick-start">Quick start</a> · <a href="#what-you-get">What you get</a> · <a href="#how-it-works">How it works</a> · <a href="#for-maintainers">For maintainers</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
</p>

---

## Build less. Understand more.

Frontend work goes sideways when an agent rebuilds an existing capability, changes a shared component without mapping its callers, or treats an unclear API response as a UI problem. Frontend Workflow gives your agent a focused operating model for those moments.

It is a skill for feature work, debugging, review, and pre-submit checks. It does not replace your repository rules; it helps the agent find and follow them before it changes code.

## Quick start

### 1. Install the skill

Clone or copy this directory into your agent's skills directory. For Codex:

```bash
git clone https://github.com/Jessie-jzn/frontend-workflow-skill.git ~/.codex/skills/frontend-workflow
```

### 2. Verify the package

```bash
node ~/.codex/skills/frontend-workflow/scripts/validate.mjs \
  --skill ~/.codex/skills/frontend-workflow
```

### 3. Give your agent a real task

```text
Use $frontend-workflow to implement this frontend change:
<your request>
```

The skill first inspects the project, reads local instructions, and looks for relevant capabilities before proposing or making a change.

## What you get

| Need | The workflow helps the agent |
| --- | --- |
| Add or change a feature | Find existing components, hooks, utilities, and APIs before creating new ones |
| Fix a bug | Trace UI behavior back through contracts and data flow instead of guessing from the screen |
| Review a diff | Check scope, reuse, shared-code impact, and delivery readiness |
| Change shared code | Enumerate callers, check contracts, verify behavior, and state remaining risk |
| Prepare a submission | Run the available checks and report only evidence that matters |

## How it works

### 1. Learn the project before touching it

The agent finds the Git root, repository instructions, framework, package manager, and available scripts. It reads the target area plus direct callers and dependencies before editing.

### 2. Reuse before creating

The preferred order is deliberate: direct reuse → composition → backward-compatible extension → page-local implementation → new component. Similar names alone are not evidence of reuse.

### 3. Keep shared changes accountable

For a public component, hook, utility, or contract, the agent maps affected callers and validates the behavior before saying the change is safe.

### 4. Deliver a useful handoff

The final response stays proportional: changed files, actual reuse, validation, and any important residual risk. Small changes do not get a report disguised as a novel.

## Boundaries that protect your codebase

- Repository instructions and existing code always win over this skill.
- Large files are not an invitation to refactor. No splitting, renaming, migration, or cleanup without user approval.
- Missing reusable code does not block delivery. An unclear business or API contract that affects correctness does.
- The skill does not create docs or config in the target project unless the user asks.
- Local learning data stays outside Git worktrees and is never exported without permission.

## Read the right guide for the task

| Task | Start here |
| --- | --- |
| Feature development | [Feature development](references/feature-development.md) · [Engineering guardrails](references/engineering-guardrails.md) · [Capability discovery](references/capability-discovery.md) |
| API-driven work or server state | [Delivery readiness](references/delivery-readiness.md) |
| Data mismatch or display inconsistency | [Data-contract debugging](references/data-contract-debugging.md) |
| Diff or module review | [Code review](references/code-review.md) |
| Before submitting | [Pre-submit checks](references/pre-submit-checks.md) |
| Maintaining this skill | [Skill maintenance](references/skill-maintenance.md) |

For a request with multiple modes, follow the sequence: develop → review → pre-submit checks.

## For maintainers

Keep public skill content free of project-specific information, generated artifacts, and private Profiles. Validate every change with:

```bash
node scripts/validate.mjs --skill .
node --test tests/*.test.mjs
```

See [Skill maintenance](references/skill-maintenance.md) for release checks and privacy safeguards.
