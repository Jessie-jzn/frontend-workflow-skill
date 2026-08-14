<h1 align="center">⚡ Frontend Workflow</h1>

<p align="center">
  <strong>让你的 AI Agent 更小范围、更可复用、更安全地完成前端改动。</strong>
</p>

<p align="center">
  先发现已有能力，再决定如何实现；谨慎处理公共改动；用验证结果交付。
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="#快速开始">快速开始</a> · <a href="#你会得到什么">你会得到什么</a> · <a href="#它如何工作">它如何工作</a> · <a href="#维护者">维护者</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
</p>

---

## 少写一点，先理解更多。

前端改动容易失控，往往不是因为代码难写，而是 Agent 重做了已有能力、没有盘点调用方就改了公共组件，或把不清楚的接口契约误判成 UI 问题。Frontend Workflow 为这些场景提供一套聚焦的工作方式。

这是一个用于开发、排错、Review 和提交前检查的 Skill。它不会替代仓库已有规则，而是帮助 Agent 在改代码前先找到并遵循这些规则。

## 快速开始

### 1. 安装 Skill

将此目录克隆或复制到你的 Agent skills 目录。以 Codex 为例：

```bash
git clone https://github.com/Jessie-jzn/frontend-workflow-skill.git ~/.codex/skills/frontend-workflow
```

### 2. 校验安装包

```bash
node ~/.codex/skills/frontend-workflow/scripts/validate.mjs \
  --skill ~/.codex/skills/frontend-workflow
```

### 3. 交给 Agent 一个真实任务

```text
使用 $frontend-workflow 完成这个前端需求：
<你的需求>
```

Skill 会先检查项目、读取仓库指令并寻找可复用能力，再提出或实施改动。

## 你会得到什么

| 需求 | 工作流会帮助 Agent 做什么 |
| --- | --- |
| 开发或修改功能 | 在新建代码前查找已有组件、Hooks、工具函数和 API |
| 排查问题 | 从契约和数据流回溯 UI 行为，而不是只看页面猜测 |
| Review diff | 检查范围、复用、公共代码影响和交付准备度 |
| 修改公共能力 | 枚举调用方、核对契约、验证行为，并说明残余风险 |
| 提交前准备 | 运行项目已有检查，只报告真正有用的证据 |

## 它如何工作

### 1. 动手前先认识项目

Agent 会找到 Git 根目录、仓库指令、框架、包管理器和可用脚本；修改前先阅读目标区域及其直接调用方和依赖。

### 2. 先复用，再创建

选型顺序明确：直接复用 → 组合 → 保持旧行为的兼容扩展 → 页面局部实现 → 新组件。名称相近不是复用依据。

### 3. 对公共改动负责

涉及公共组件、Hook、工具函数或契约时，Agent 会枚举受影响调用方并验证行为，再说明改动是否安全。

### 4. 用有用的信息交付

最终回答保持适度：改动文件、实际复用、验证结果和重要残余风险。小改动不需要写成一篇报告。

## 保护代码库的边界

- 仓库指令和现有代码始终优先于本 Skill。
- 文件大不代表应该重构；未经用户同意，不拆分、改名、迁移或清理无关代码。
- 找不到复用能力不阻碍交付；会影响正确性的业务或 API 契约不明确时才暂停确认。
- 除非用户要求，Skill 不会在目标项目创建文档或配置。
- 本地学习数据始终位于 Git worktree 外，且未经许可不会导出。

## 按任务阅读对应指南

| 任务 | 从这里开始 |
| --- | --- |
| 功能开发 | [功能开发](references/feature-development.md) · [工程边界](references/engineering-guardrails.md) · [能力发现](references/capability-discovery.md) |
| 接口驱动或服务端状态改动 | [交付准备](references/delivery-readiness.md) |
| 数据不一致或展示异常 | [数据契约排查](references/data-contract-debugging.md) |
| Review diff 或模块 | [代码评审](references/code-review.md) |
| 提交前 | [提交前检查](references/pre-submit-checks.md) |
| 维护此 Skill | [Skill 维护](references/skill-maintenance.md) |

一个请求同时包含多类工作时，按“开发 → Review → 提交前检查”的顺序执行。

## 维护者

公开 Skill 不得包含项目专有信息、生成物或私有 Profile。每次修改后运行：

```bash
node scripts/validate.mjs --skill .
node --test tests/*.test.mjs
```

发布检查与隐私边界详见 [Skill 维护](references/skill-maintenance.md)。
