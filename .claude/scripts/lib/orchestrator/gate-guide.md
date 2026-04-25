# Review Gate 指南

主 agent 在每个 gate 后执行以下流程：

1. **读取 checklist**：从 `workflow/gates/{gateId}.md` 加载检查清单
2. **逐条检查**：对照交付物逐一验证
3. **判定结果**：
   - 全部通过 → 继续下一步
   - 不通过且 `maxRetries > 0` → 打回 subagent 重试
   - 不通过且 `maxRetries = 0` → 降级为 warn（记录但不阻断）
4. **记录**：将 gate 结果写入 `.kata/{project}/step-errors/`（仅失败时）
