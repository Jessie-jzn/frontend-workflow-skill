# Frontend Workflow（中文执行说明）

`SKILL.md` 是 Codex 的触发入口；本文件提供同等的中文工作流。仓库自身的指令和当前代码永远优先，本 Skill 只提供可复用流程。

## 每次任务开始

1. 找到 Git 根目录、仓库指令、包管理器、框架和 `package.json` 脚本；需要时运行：

   ```bash
   node <skill-dir>/scripts/inspect-project.mjs --project <root>
   ```

2. 修改前阅读目标文件，以及直接调用方和依赖。
3. 如果已初始化，查询私有 Profile：

   ```bash
   node <skill-dir>/scripts/profile.mjs list --project <root> --json
   ```

   没有 Profile 属于正常状态。
4. 除非用户明确要求，不在目标项目中创建文档或配置。

## 按任务加载规则

| 用户意图 | 必读文件 |
| --- | --- |
| 开发或修改功能 | `references/feature-development.md`、`references/engineering-guardrails.md`、`references/capability-discovery.md`；接口驱动或改变服务端状态时再读 `references/delivery-readiness.md` |
| 排查报错或异常行为 | `references/engineering-guardrails.md`、`references/delivery-readiness.md`；涉及多列表关联、字典、展示不一致或疑似字段缺失时再读 `references/data-contract-debugging.md` |
| Review diff、功能或模块 | `references/code-review.md`、`references/engineering-guardrails.md`；接口功能补读 `delivery-readiness.md`，新 UI 或公共能力补读 `capability-discovery.md` |
| 提交前检查 | `references/pre-submit-checks.md` |
| 查找可复用能力或调用方 | `references/capability-discovery.md` |
| 维护或发布本 Skill | `references/skill-maintenance.md` |

一个请求含多项工作时，按“开发 → Review → 提交前检查”执行。

## 不可违反的边界

- 选型顺序：直接复用 → 组合 → 保持旧行为的兼容扩展 → 页面局部实现 → 新组件。
- 不得只因名称相近就复用，也不得复制组件再改。
- 除非用户明确要求重构，不得因文件很大而拆分、迁移旧调用方、重组层级、改名或清理无关代码。
- 公共能力变更没有枚举调用方、核对契约、完成验证并说明残余风险前，不得声称安全。
- 找不到复用能力不阻止实现；不明确且会影响正确性的业务/API 契约才需要暂停确认。
- 普通任务保持安静：小改动一句，普通任务 3～5 行，只有公共风险才展开证据。

## 本地学习

仅在用户同意时初始化：

```bash
node <skill-dir>/scripts/init.mjs --project <root>
```

Profile 永远在 Git worktree 外。能力卡片只记录路径和简短契约；仅在需要时重新验证；提升、导入、导出都必须征得用户确认。详见 `references/capability-discovery.md`。

## 交付

只说明改动文件、实际复用、验证和重要残余风险。除非用户要求，不生成文档、设计报告或历史清理方案。

