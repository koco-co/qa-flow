# Session 2: Lanhu 集成增强 (T02)

> 分支: `feat/qa-workflow-optimize`
> 前置: Session 1 已完成

## 目标

让用户输入蓝湖 URL 后能零中断走完流程：Cookie 自动检测 + 重试、模块显式选择、页面选择交互闭环。

## 涉及文件（只改这个）

| 文件 | 改动类型 |
|------|---------|
| `.claude/skills/test-case-generator/prompts/step-parse-input.md` | 修改 3 处 |

## 详细改动

### 改动 1: Cookie 自动检测 + 3 次重试

在 `## 1.0 蓝湖 URL 检测` 中，找到第 2 步（检查 MCP Server 状态）和第 3 步（调用 lanhu_get_pages）之间，插入新的子步骤 `2.5`：

```markdown
2.5. **Cookie 有效性预检**：
   调用 `lanhu_get_pages` 时若返回 418（Cookie 过期），执行自动刷新（最多 3 次，每次间隔 5 秒）：

   ```bash
   for i in 1 2 3; do
     echo "第 ${i} 次尝试刷新 Cookie..."
     LANHU_LOGIN_EMAIL="$LANHU_LOGIN_EMAIL" \
     LANHU_LOGIN_PASSWORD="$LANHU_LOGIN_PASSWORD" \
     python3 .claude/skills/using-qa-flow/scripts/refresh-lanhu-cookie.py 2>&1
     sleep 5
     # 刷新后重新调用 lanhu_get_pages 验证
     # 若成功 → break 并继续
     # 若仍失败 → 继续下一次
   done
   ```

   3 次均失败 → 向用户展示：
   ```
   蓝湖 Cookie 刷新失败（已重试 3 次）。

   请手动执行以下命令后重试：
   ! LANHU_LOGIN_EMAIL='<账号>' LANHU_LOGIN_PASSWORD='<密码>' python3 .claude/skills/using-qa-flow/scripts/refresh-lanhu-cookie.py

   或手动更新 tools/lanhu-mcp/.env 中的 Cookie 值。
   ```
   **等待用户确认后重试，不自动继续下一步。**
```

同时修改原有的第 3 步中 418 处理逻辑：将原来的"提示用户手动执行"改为"先走 2.5 自动重试，全部失败后才手动提示"。即删除第 3 步中原有的 418 手动提示块（避免重复）。

### 改动 2: 模块显式选择

在第 5 步（整理输出为 PRD Markdown）的 `保存至` 逻辑**之前**，插入新的子步骤 `5.1`：

```markdown
5.1. **模块确认（必须交互）**

   从文档标题和内容中推断最可能的模块 key，然后向用户展示确认菜单：

   ```
   从蓝湖文档标题推断模块为: data-assets (数据资产)

   请确认或选择正确的模块:
   [1] data-assets (数据资产) ← 推荐
   [2] batch-works (离线开发)
   [3] data-query (统一查询)
   [4] variable-center (变量中心)
   [5] public-service (公共组件)
   [6] xyzh (信永中和/定制)
   ```

   - 用户回复数字或模块名 → 使用对应模块
   - **不得跳过此确认步骤**，即使推断置信度很高
   - 用户确认后，根据模块 key 决定文件保存路径：
     - DTStack 模块 → `cases/requirements/<module>/v{version}/PRD-<docId>-<docName>.md`
     - xyzh 定制 → `cases/requirements/custom/xyzh/<功能名>.md`
```

### 改动 3: 蓝湖页面选择交互闭环

修改第 3 步中"展示页面列表，询问用户要导入哪些页面（默认全部）"的逻辑，替换为更明确的交互：

```markdown
3. **调用 `lanhu_get_pages` 工具** 获取页面列表
   - 若返回 418 → 走 2.5 自动刷新流程
   - 成功后向用户展示页面列表：
     ```
     蓝湖文档「xxx」包含以下页面：

     [1] ✅ 列表页-质量问题台账
     [2] ✅ 新增质量问题
     [3] ✅ 问题详情
     [4] ✅ 规则集管理

     默认导入全部页面。
     - 输入编号排除（如「排除 4」或「只要 1,2,3」）
     - 直接回复「确认」继续
     - 回复「取消」中止
     ```
   - **等待用户明确回复**后才进入第 4 步
   - 不回复不继续
```

## 完成标准

- [ ] step-parse-input.md 包含 Cookie 有效性预检 + 3 次自动重试逻辑
- [ ] 原有的 418 手动提示作为最后 fallback（3 次重试全失败后），不重复出现
- [ ] step-parse-input.md 包含模块确认交互（6 选项菜单），标注"不得跳过"
- [ ] step-parse-input.md 的页面列表交互包含明确的"等待用户回复"指令和"取消"选项
- [ ] 改动不影响非蓝湖 URL 的流程（1.1 解析指令逻辑不变）

## Commit

```
git add -A && git commit -m "feat: enhance Lanhu integration with auto-retry, module selection and page confirmation (T02)"
```
