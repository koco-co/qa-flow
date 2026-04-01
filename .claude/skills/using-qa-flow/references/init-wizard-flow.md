# 初始化向导流程

本文件承载 `/using-qa-flow init` 中 Step 0 的详细编排，`SKILL.md` 只保留入口摘要。

## 0.1 扫描项目结构

执行目录扫描：

```bash
node .claude/skills/using-qa-flow/scripts/init-wizard.mjs --command scan
```

解析返回的 JSON 结果。

**Re-init 检测（D-14）：** 如果 `signals.existingConfig` 不为 null，说明已有 config.json。

必要时也可以单独读取当前配置作为回填默认值：

```bash
node .claude/skills/using-qa-flow/scripts/init-wizard.mjs --command load-existing
```

- 询问用户：「检测到已有项目配置。请选择：(1) 完整重新配置 (2) 只更新部分配置」
- 选择 (2) 时，按照 [配置问卷](./config-questionnaire.md) 中的规则，让用户勾选要重新配置的功能组（D-15）
- 未勾选的组保持现有值不变
- 如果选择 (1)，执行完整的 0.1 ~ 0.5 流程

**新项目流程：** 如果 `signals.existingConfig` 为 null，直接进入推断展示。

## 0.2 展示推断结果（D-03）

将 `modules[]` 数组格式化为 Markdown 表格展示：

```text
### 📋 项目结构推断结果

| 模块 key | 是否版本化 | 路径 | 推断来源 |
|----------|-----------|------|----------|
| {key}    | {versioned ? '✅ 是' : '❌ 否'} | {paths.xmind || 'cases/xmind/' + key + '/'} | {inferredFrom} |
```

同时展示检测到的信号摘要：

- `.repos/` 目录: {hasReposDir ? '已检测到 → 建议配置源码仓库' : '未检测到'}
- 历史文件: {historyFiles.length} 个 ({historyFiles.map(f => f.path).join(', ')})
- PRD 版本号: {prdVersionPatterns.join(', ') || '无'}
- 图片目录: {hasImages ? '已检测到' : '未检测到'}

如果 `modules` 为空且 `historyFiles` 也为空（完全空白项目）：

- 提示：「未检测到现有结构，将通过问答方式引导你配置项目。」
- 直接跳到 0.4 全量问答

**用户确认：** 询问「以上推断是否正确？(y/n)」

- 如果 n：逐项询问修正（D-04）——对每个模块询问 key 是否正确、versioned 是否正确，用户输入新值后更新，重新展示表格直到用户确认

## 0.3 历史文件解析（D-05 / D-06 / D-07）

**自动检测部分：** 如果 `signals.historyFiles` 非空：

- 对每个历史文件调用：

```bash
node .claude/skills/using-qa-flow/scripts/init-wizard.mjs --command parse-file --path {filePath}
```

- 展示解析结果：「从 {filename} 检测到模块候选名：{candidates.join(', ')}」
- 对每个候选名，询问用户确认（D-06）：「检测到模块名 "{candidate}"，请确认或输入正确的英文 key：」
- 用户输入后，还需确认该模块是否版本化

**主动追问部分：** 完成自动检测后，追问（D-05）：「还有其他历史文件要导入吗？如有请提供文件路径，没有请回复 n」

- 如果用户提供路径，继续调用 `parse-file` 解析

**合并展示（D-07）：** 将目录扫描推断结果 + 历史文件解析结果分别展示：

```text
### 来自目录扫描的模块：
| 模块 key | 是否版本化 | 来源 |
...

### 来自历史文件的新增模块：
| 模块 key | 是否版本化 | 来源文件 |
...

### 冲突项（同名模块，不同来源）：
| 模块 key | 目录扫描结果 | 历史文件结果 | 请选择保留哪个 |
...
```

用户逐项决定冲突项后，合并为最终模块列表。

## 0.4 功能分组问答（D-08 / D-09）

- 按五个功能组逐一询问所有配置字段，优先复用目录扫描结果、历史文件解析结果和已有配置默认值。
- 如果处于「只更新部分配置」模式，仅询问用户勾选的功能组；未勾选的组保持原值。
- 具体问题模板、默认值说明以及重新初始化规则见 [配置问卷](./config-questionnaire.md)。
- 0.4 完成后，回到 `SKILL.md` 的 0.5 写入文件步骤继续执行。
