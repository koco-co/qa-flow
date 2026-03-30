# 任务交接文档：PRD 15696【通用配置】json格式配置

**交接时间**：2026-03-30
**当前状态**：等待用户确认 Checklist，下一步启动并行 Writer

---

## 当前进度

| 步骤 | 状态 |
|------|------|
| parse-input | ✅ 完成 |
| req-elicit | ✅ 完成（评分 66%→77%） |
| source-sync | ✅ 完成 |
| prd-formalize | ✅ 完成 |
| prd-enhancer | ✅ 完成 |
| brainstorm | ✅ 完成 |
| **checklist** | ⏳ **等待用户确认** |
| writer | 未开始 |
| reviewer | 未开始 |
| xmind | 未开始 |
| archive | 未开始 |

---

## 关键参数

- **PRD 文件**：`cases/requirements/data-assets/v6.4.10/【通用配置】json格式配置.md`（status: enhanced）
- **状态文件**：`cases/requirements/data-assets/v6.4.10/.qa-state.json`（`last_completed_step: "brainstorm"`）
- **模块**：`data-assets`，**版本**：`v6.4.10`，**开发分支**：`6.3岚图定制化分支`
- **仓库**：
  - backend `.repos/CustomItem/dt-center-assets` @ `release_6.3.x_ltqc`
  - frontend `.repos/CustomItem/dt-insight-studio` @ `dataAssets/release_6.3.x_ltqc`
- **源码状态**：用例基于 PRD 和需求澄清

---

## 需求澄清关键结论

| 项目 | 结论 |
|------|------|
| 树形层级 | 最多 **5 层**，第 5 层不显示【新增子层级】按钮 |
| key 唯一性 | **无唯一性校验**，同一数据源类型下允许重复 |
| 正则测试反馈 | 实时显示绿色「匹配成功」/ 红色「不匹配」 |
| 导入格式 | Excel（.xlsx / .xls） |
| 成功 Toast | 「操作成功」 |
| 超长错误 | 「最多255个字符」 |
| 数据源类型 | sparkthrift2.x / hive2.x / doris3.x |

---

## Writer 拆分方案（待用户确认后执行）

| Writer | 负责范围 | 输出文件 | 预估用例 |
|--------|---------|---------|---------|
| Writer A | 列表展示、树形展开折叠、数据源Tab切换、搜索、批量删除、导出（含筛选）、导入 | `temp/list.json` | ~14 条 |
| Writer B | 新增表单（字段校验）、编辑、子层级新增、value格式/测试数据联动、第5层限制、单条删除级联 | `temp/form.json` | ~16 条 |

**共享模块名**：`JSON格式配置`

---

## 如何在新窗口中继续

在新对话窗口中，直接告诉 Claude：

> 继续 data-assets v6.4.10【通用配置】json格式配置 的用例生成，Checklist 已确认，请启动并行 Writer

或者粘贴蓝湖 URL（系统会自动识别续传）：
```
https://lanhuapp.com/web/#/item/project/product?tid=24a1c6b2-a52e-454c-8d51-8aff866598b1&pid=7de90493-e80f-4592-a263-38fb2d2e98c0&versionId=7991bb05-6f97-4b29-8ad6-de18b5869a4d&docId=fc0fee93-74f5-4eff-a769-99e68506b296&docType=axure&pageId=e08ead471bc2471489e6fc7443d060c6&image_id=fc0fee93-74f5-4eff-a769-99e68506b296&parentId=493e80b4-33c3-44cb-b880-42bee51dba19
```

**新窗口中 Claude 需要做的第一件事**：
1. 读取 `.qa-state.json` 确认 `last_completed_step: "brainstorm"`
2. 读取增强版 PRD `【通用配置】json格式配置.md`（status: enhanced）
3. 用户若已确认 Checklist → 直接进入 Step writer（并行启动 2 个 Writer Agent）
4. 步骤定义见 `.claude/skills/test-case-generator/prompts/writer-subagent.md`

---

## Checklist 预览（新窗口确认用）

```
JSON格式配置 [~30 条]
├── 列表页 [Writer A，~14 条]
│   ├── 列表展示：P0默认加载 / P1树形展开折叠 / P1列字段显示
│   ├── 数据源切换：P1切换hive2.x / P1切换doris3.x
│   ├── 搜索：P1模糊搜索含子层级 / P2无结果展示
│   ├── 批量删除：P1级联删除 / P1弹窗文案 / P2未勾选状态
│   ├── 导出：P1全量导出命名 / P2筛选后导出
│   └── 导入：P1成功新增 / P2不覆盖已有
└── 新增/编辑页 [Writer B，~16 条]
    ├── 新增根级 key：P0完整流程 / P1key必填 / P1超255字符 / P1默认数据源类型
    ├── 编辑：P1保存成功 / P1修改数据源类型
    ├── 子层级：P0新增第2层 / P1第5层无新增子层级按钮 / P2第4层有按钮
    ├── value格式联动：P1为空不显示测试数据 / P1有值显示 / P1匹配成功 / P1不匹配
    └── 单删：P1叶子节点 / P1级联删除子层级
```
