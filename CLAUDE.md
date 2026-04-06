# qa-flow

## 快速开始

输入 `/qa-flow` 查看功能菜单，首次使用请先执行 `/qa-flow init`。

## 功能索引

| 命令             | 功能            |
| ---------------- | --------------- |
| `/qa-flow`       | 功能菜单        |
| `/qa-flow init`  | 环境初始化      |
| `/test-case-gen` | 生成测试用例    |
| `/code-analysis` | 分析报错/冲突   |
| `/xmind-editor`  | 编辑 XMind 用例 |
| `/ui-autotest`   | UI 自动化测试   |

## 核心约束

- `workspace/.repos/` 下的源码仓库为只读，禁止 push/commit
- 用户偏好规则见 `preferences/` 目录，优先级高于 skill 内置规则
- 所有输出产物写入 `workspace/` 目录，不污染框架代码

## 脚本变更规则

- 每次修改 `.claude/scripts/` 下的 ts 脚本后，**必须**同步更新或新增对应的单元测试
- 修改完成后，**必须**全量运行一遍单元测试（`npx tsx --test .claude/scripts/__tests__/**/*.test.ts`），确认全部通过后才能交付
