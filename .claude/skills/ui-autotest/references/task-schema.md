# UI 自动化测试 — Task schema

使用 Claude 原生 Task 工具（TaskCreate/TaskUpdate）实现动态进度追踪。

## 主任务（Step 0 创建）

| Subject                | Description                            | 依赖          |
| ---------------------- | -------------------------------------- | ------------- |
| T0: 环境检查           | Pre-flight 检查：目录结构 lint + 续传  | —             |
| T1: 解析输入与确认范围 | 解析 Archive MD，确认测试范围          | blockedBy T0  |
| T2: 登录态准备         | 执行浏览器登录，保存 session           | blockedBy T1  |
| T3a: 读取站点知识      | 查询 knowledge/sites/ 获取站点操作知识 | blockedBy T2  |
| T3: 生成并验证脚本     | 并行 script-case-agent 生成→自测→修复  | blockedBy T3a |
| T4: 合并脚本           | 合并 cases/ 到 runners/                | blockedBy T3  |
| T5: 执行测试           | 运行回归测试套件                       | blockedBy T4  |
| T6: 处理结果与通知     | 生成报告，失败用例转 Bug               | blockedBy T5  |

## 动态子任务（按需创建）

**Step 3 — 脚本处理子任务**：

- 每批派发时：`TaskCreate subject="T3-batch-{N}: 处理 {task_ids}"`
- 完成时：`TaskUpdate status=completed`

**Step 5 — 测试执行子任务**：

- 开始执行时：`TaskCreate subject="T5-{N}: 执行 {filename}" activeForm="执行 {filename}..."`
- 执行完成时：`TaskUpdate subject="T5-{N}: 执行 {filename} — PASS/FAIL ({pass}/{total})" status=completed`

**Step 6 — Bug 报告子任务**：

- 开始生成时：`TaskCreate subject="T6-{N}: Bug 报告 {filename}" activeForm="生成 Bug 报告..."`
- 生成完成时：`TaskUpdate subject="T6-{N}: Bug 报告 {filename} — 已生成" status=completed`

## 状态更新规范

- 进入步骤：`TaskUpdate status=in_progress`
- 完成步骤：`TaskUpdate status=completed`，subject 追加结果指标
- 失败：保持 `in_progress`，description 中记录错误详情
