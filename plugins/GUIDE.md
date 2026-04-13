# 插件开发指南

## 插件结构

```
plugins/
└── my-plugin/
    ├── plugin.json      # 插件描述文件（必须）
    ├── fetch.ts         # 主脚本（按 commands 定义）
    ├── __tests__/       # 测试目录
    └── README.md        # 插件说明
```

## plugin.json 规范

```json
{
  "description": "插件描述",
  "env_required": ["MY_PLUGIN_TOKEN"],
  "env_required_any": ["ALT_TOKEN_A", "ALT_TOKEN_B"],
  "url_patterns": ["myapp.com", "api.myapp.com"],
  "commands": {
    "fetch": "bun run plugins/my-plugin/fetch.ts --url {{url}} --output {{output}}"
  }
}
```

### 字段说明

| 字段 | 必须 | 说明 |
|------|------|------|
| `description` | 推荐 | 插件功能描述 |
| `env_required` | 否 | 全部满足才激活（AND 逻辑） |
| `env_required_any` | 否 | 任一满足即激活（OR 逻辑） |
| `url_patterns` | 否 | URL 匹配模式（子字符串匹配） |
| `commands` | 是 | 命令模板，支持 `{{url}}` `{{output}}` 占位符 |

## 可用 Hook 点

| Hook 名称 | 触发时机 |
|-----------|---------|
| `test-case-gen:init` | 测试用例生成开始前 |
| `test-case-gen:output` | 测试用例生成完成后 |
| `code-analysis:init` | 代码分析开始前 |
| `code-analysis:output` | 代码分析完成后 |
| `*:output` | 任何 skill 完成后（通配符） |

## 安全注意事项

- `{{url}}` 等占位符已经过 shell 转义（`shellEscape()`）
- `env_required` 的值会 `.trim()` 后检查，空白值视为未设置
- 路径参数会通过 `validateFilePath()` 校验
