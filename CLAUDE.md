# qa-flow

使用中文回复。

## 快速开始

输入 `/qa-flow` 查看功能菜单，首次使用请先执行 `/qa-flow init`。

## 功能索引

| 命令 | 功能 |
|------|------|
| `/qa-flow` | 功能菜单 |
| `/qa-flow init` | 环境初始化 |
| `/test-case-gen` | 生成测试用例 |
| `/code-analysis` | 分析报错/冲突 |
| `/xmind-editor` | 编辑 XMind 用例 |
| `/ui-autotest` | UI 自动化测试 |

## 核心约束

- `workspace/.repos/` 下的源码仓库为只读，禁止 push/commit
- 用户偏好规则见 `preferences.md`，优先级高于 skill 内置规则
- 所有输出产物写入 `workspace/` 目录，不污染框架代码
