# 异常处理（按需加载）

> 任意步骤执行失败时调用。

1. 向用户报告失败节点和原因
2. 发送 `workflow-failed` 通知：
   ```bash
   kata-cli plugin-loader notify --event workflow-failed --data '{"step":"{{step_name}}","reason":"{{error_msg}}"}'
   ```
3. 提供重试选项，不强制退出
