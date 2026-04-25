# Subagent 派发指南

主 agent 遵循此模式派发 subagent：

1. **加载 agent**：从 `.claude/agents/{agentRef}.md` 读取 frontmatter 获取 model/description
2. **构建 prompt**：组装上下文 = 步骤指令 + 前置步骤输出摘要 + 项目路径
3. **派发**：通过 Agent tool 调用，subagent_type = agentRef，指定 model
4. **收集**：subagent 完成后读取其交付物路径列表
5. **校验**：检查交付物是否存在、格式是否正确
6. **注入**：将交付物路径注入 artifacts map，供后续步骤使用
