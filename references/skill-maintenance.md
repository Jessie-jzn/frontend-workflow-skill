# Skill 维护与公开发布

Skill 本体必须与使用者项目分离；私有 Profile 必须位于所有 Git worktree 外。

修改后运行：

```bash
node <skill-dir>/scripts/validate.mjs --skill <skill-dir>
node --test <skill-dir>/tests/*.test.mjs
```

发布前使用 Git 外的 deny-list 扫描内部项目名、平台、组件、API、权限、账号、token、真实响应和用户路径：

```bash
node <skill-dir>/scripts/validate.mjs --skill <skill-dir> --deny-file /private/path/terms.txt
```

不得发布 `.DS_Store`、私有 Profile、符号链接、生成物或任何业务项目知识。每次修改流程规则后，至少用一个不含私有上下文的压力场景前向验证：已有能力应复用、契约不匹配时不强行复用、大文件未授权不重构、公共改动要分析调用方、接口功能不能制造假成功。

