# 合并冲突分析流程（模式B）

适用场景：Jenkins 合并失败、包含 `<<<<<<< HEAD` / `=======` / `>>>>>>>` 标记的冲突代码片段，或用户明确说明需要分析冲突原因与解决建议。

---

## Step 1：归一化冲突材料

优先收集以下信息：

| 材料 | 作用 |
| --- | --- |
| 冲突片段 / Jenkins 日志 | 识别冲突块、文件路径、基础分支与来源分支 |
| 仓库路径或仓库名 | 必要时回到源码仓库核对上下文 |
| 当前分支 / 目标分支 / 来源分支 | 帮助确认冲突双方的真实意图 |

若仓库与分支可定位，开始分析前先执行只读同步：

```bash
cd <仓库绝对路径>
git fetch origin
git checkout <当前分支>
git pull origin <当前分支>
```

若缺少仓库或分支信息，仍可基于冲突片段分析，但报告中要标记上下文不完整。

---

## Step 2：解析冲突块并分类

1. 定位每个 `<<<<<<< HEAD` / `=======` / `>>>>>>>` 冲突块的文件位置和行范围。
2. 分析双方代码意图，而不是只比较字面差异。
3. 使用 `references/conflict-resolution.md` 分类：
   - 安全合并
   - 重复修改
   - 格式 / 注释冲突
   - 版本号冲突
   - 逻辑互斥（需人工决策）

---

## Step 3：形成解决建议

对每个冲突块输出：

- 当前分支侧的业务意图说明
- 来源分支侧的业务意图说明
- 冲突类型判断
- 建议合并后的代码或明确的“需开发人工确认”结论

若属于逻辑互斥，不得强行选择一侧；必须在报告中突出人工决策项。

---

## Step 4：生成冲突报告

1. 将分析结果写入 `reports/conflicts/{YYYY-MM-DD}/{description}.json`。
2. 字段结构遵循 `references/conflict-resolution.md` 的 JSON Schema。
3. 执行渲染：

```bash
node .claude/skills/code-analysis-report/scripts/render-report.mjs \
  .claude/skills/code-analysis-report/templates/conflict-report.html \
  reports/conflicts/{date}/{description}.json \
  reports/conflicts/{date}/{description}.html
```

4. 刷新快捷链接：`node .claude/shared/scripts/refresh-latest-link.mjs`

---

## 输出前核对清单

- [ ] 冲突块数量与输入材料一致
- [ ] 每个冲突块都给出了类型判断与处理建议
- [ ] 逻辑互斥项已显式标记“需人工决策”
- [ ] 报告中说明了使用的仓库 / 分支上下文，或明确标记上下文缺失
- [ ] `latest-conflict-report.html` 已刷新
