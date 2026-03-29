# Step prd-enhancer：PRD 增强 + 健康度预检

## 执行方式

调用 `prd-enhancer` Skill（`.claude/skills/prd-enhancer/SKILL.md`），对 Step parse-input 中识别出的所有 PRD 文件逐一增强。

> 对 DTStack 而言，输入应当是 **正式需求文档**（prd-formalize 产出），不是蓝湖原始文本 dump。

## prd-enhancer 的增量检测特性（自动生效）

- 若 `-enhanced.md` 已存在且 PRD 未修改 → 直接使用现有版本，跳过重新增强
- 若 PRD 有更新 → 只重新处理变更章节

## 健康度预检

增强完成后，prd-enhancer 输出健康度预检报告。

**如有 ❌ 错误级问题：** 向用户展示，询问是否继续（推荐先修复 PRD）。
**如仅有 ⚠️ 警告：** 记录在报告中，不阻断流程。

## 快捷链接刷新

增强成功后，刷新根目录符号链接：

```bash
ln -sf <实际enhanced.md路径> ./latest-prd-enhanced.md
```

## 步骤完成后

更新 `.qa-state.json`：将 `last_completed_step` 设为 `"prd-enhancer"`。
