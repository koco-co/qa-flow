<!-- step-id: checklist | delegate: testCaseOrchestrator -->
# Step checklist：Checklist 预览 + 用户一次确认

> 前置条件: `last_completed_step` == `"brainstorm"`
> 快速模式: **跳过**
> **快速模式时跳过此步骤，不执行本文件内容。**

## Checklist 预览

为每个解耦模块，启动轻量级 Checklist 生成（只需测试点列表，无需完整 steps/expected）。

**Checklist 展示格式（4 级树形，在对话中展示）：**

```
商品管理（菜单名）[共 ~25条]
├── 列表页 [Writer A]
│   ├── 搜索
│   │   ├── ✅ 按商品名称单条件搜索（P1）
│   │   ├── ✅ 搜索无结果边界（P2，异常）
│   │   └── ✅ 重置搜索条件（P2）
│   └── 导出
│       └── ✅ 批量导出 Excel（P2）
├── 新增商品页 [Writer B]
│   ├── ✅ 正常新增完整流程（P0）
│   ├── ✅ 「商品名称」为空时不可提交（P1，异常）
│   └── ✅ 「商品名称」超出100字符（P1，异常）
└── 编辑/详情页 [Writer C]
    └── ...
```

用户可以：直接回复「确认」、删除/新增测试点、调整优先级。

---

## 用户一次确认

在一条消息中展示完整确认内容，包含：

- PRD 增强摘要（图片读取情况、健康度）
- 拆分方案（各 Writer 及预计用例数）
- 历史去重（现有用例排除情况）

用户可选：`[确认，开始生成]` / `[修改测试点]` / `[修改拆分方案]`

---

## 错误处理

- **用户超过 2 轮修改仍未确认时**：提示用户是否切换为快速模式跳过 checklist

---

## 步骤完成后

更新 `.qa-state.json`：
- `last_completed_step` → `"checklist"`
- `checklist_confirmed` → `true`

同时向 `execution_log` 数组追加：
```json
{"step": "checklist", "status": "completed", "at": "<ISO8601>", "duration_ms": null, "summary": "用户确认了 Checklist，准备启动 Writer"}
```
