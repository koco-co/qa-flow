# Phase 3: Init Wizard - Research

**Researched:** 2026-03-31
**Domain:** Interactive CLI Wizard / Claude Skill Orchestration / Config Generation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**结构推断策略**
- **D-01:** 采用**智能混合模式** — 先扫描项目目录，检测到有意义结构则用推断结果作为默认值展示确认；完全空目录时退化为纯问答引导
- **D-02:** 扫描采集五类信号：① `cases/` 下子目录名 → 推断模块 key；② PRD 文件名中版本号（如 `v6.4.10`）→ 推断版本化模块；③ `.xmind`/`.csv` 历史文件 → 辅助推断模块和层级；④ `.repos/` 下 git 仓库 → 推断需要源码分析能力；⑤ `assets/images/` 存在图片 → 推断 PRD 含图片
- **D-03:** 推断结果用 **Markdown 表格摘要**展示（列：模块 key / 是否版本化 / 路径 / 推断来源），用户整体确认后再写任何文件，扫描阶段不做写操作
- **D-04:** 用户发现摘要有误时，采用**向导内问答修正** — 逐项询问，用户输入新值，向导实时更新后重新展示确认表格

**历史文件解析**
- **D-05:** 解析触发采用**两者皆可模式** — 扫描阶段自动检测 `cases/history/` 下文件，同时在摘要确认后追问「还有其他历史文件要导入吗？」，支持用户主动提供路径
- **D-06:** 模块 key 推断采用**向导询问确认** — 先从文件名（正则去除日期前缀、版本号后缀）和文件内容（CSV 表头、XMind 根节点/L1 节点）提取候选名，展示「检测到模块名 yyy，请确认或输入正确 key」，用户最终拍板
- **D-07:** 多来源合并采用**分别展示再合并** — 先展示目录扫描推断结果，再单独展示来自历史文件解析的新增项或冲突项，用户逐项决定保留哪个版本

**Config 生成交互模式**
- **D-08:** 采用**全量问答** — 向导逐一询问所有配置字段，不预设跳过任何字段
- **D-09:** 采用**功能分组顺序**：
  - ① 基础信息（project.name、displayName、casesRoot）
  - ② 模块配置（已在扫描/推断阶段完成，此步骤做最终确认）
  - ③ 源码仓库（repos、branchMapping、stackTrace）
  - ④ 集成工具（lanhu MCP 配置：runtimePath、envFile 等）
  - ⑤ 最终确认写入
- **D-10:** 写入前用**纯文字摘要确认** — 按分组列出所有字段的最终值，问「确认写入吗？」，不展示完整 JSON

**CLAUDE.md 模板生成**
- **D-11:** 采用**模板 + 占位符替换** — 使用固定标准模板，init 完成时将关键变量（项目名、模块路径示例、触发词中的模块名）自动替换为用户真实配置值
- **D-12:** Skill 快速示例保留**通用占位符格式** — 示例写成 `为 <module-key> 生成测试用例` 形式，不填入具体模块名
- **D-13 (Agent's Discretion):** CLAUDE.md 中 `repos` 条件块的处理方式（始终写入完整条件块 vs 按 config.repos 是否配置裁剪）交给 Claude 实现时决定

**Re-init / 增量更新**
- **D-14:** 检测到已有 `config.json` 时**先问意图** — 询问用户「完整重新配置」还是「只更新某些项」
- **D-15:** 选择增量更新时，粒度为**功能组** — 展示五个功能组让用户勾选要重新配置的，未选组保持现有值不变
- **D-16:** 每次 re-init 都**询问是否同时更新 CLAUDE.md** — 不默认覆盖，用户明确确认后才重新生成

### Agent's Discretion
- CLAUDE.md 中 repos 条件块的写入策略（D-13）
- `cases/history/` 内文件的具体解析逻辑（XMind 节点深度映射、CSV 表头列识别规则）
- 模块 key 候选名的中文转英文 slug 策略
- init 向导的具体实现载体（新增 Node.js 脚本 vs 纯 Claude 对话编排）

### Deferred Ideas (OUT OF SCOPE)
- 生成 `.env.example` 文件（lanhu MCP token 模板）— 属于 Phase 5 IM 通知或 Phase 6 文档范畴
- init 完成后自动触发 archive-converter 将检测到的历史 CSV/XMind 批量归档 — 可作为 Phase 4 Skills 重设计的一部分
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INIT-01 | using-qa-flow 交互式初始化 — 全自动推断项目结构 + 确认 | D-01~D-04：智能混合扫描 → Markdown 表格摘要 → 问答修正模式；scan-project.mjs 脚本实现目录扫描逻辑 |
| INIT-02 | 历史用例文件上传解析 — 支持 CSV/XMind 格式，推断模块和层级 | D-05~D-07：两者皆可触发；重用 archive-converter 中已有的 parseCSV() 和 JSZip XMind 解析逻辑 |
| INIT-03 | 多迭代版本 / 多产品线场景支持 | config.modules[key].versioned=true/false 字段；extractVersionFromPath() 复用；multi-module loop 在向导 Q&A 中支持多次添加 |
| INIT-04 | CLAUDE.md 标准化模板生成 — 初始化时自动创建 | D-11~D-12：模板文件 + 占位符替换；init-wizard.mjs 写入项目根目录 CLAUDE.md |
| INIT-05 | config.json 模板生成 — 根据推断结果生成项目配置 | 全量问答 D-08~D-10；生成结果必须通过 loadConfig() 的 assertRequiredFields() 验证 |
</phase_requirements>

---

## Summary

Phase 3 构建的是 `using-qa-flow init` 交互式向导。该项目使用 **Claude Code Skills** 作为运行时引擎，向导的**对话交互部分**由 Claude 通过 SKILL.md 编排，**文件 I/O 部分**（目录扫描、CSV/XMind 解析、config.json 和 CLAUDE.md 写入）由新增的 Node.js ESM 脚本承担——这与项目中所有现有 Skills 的模式完全一致。

XMind 解析和 CSV 解析的核心逻辑已在 `archive-converter/scripts/convert-history-cases.mjs` 中实现（分别基于 JSZip 和手写 RFC-4180 解析器），init 向导可直接复用或提取这些模式到共享工具中。目录扫描的五类信号、版本号提取（`extractVersionFromPath()`）、模块 key 提取（`extractModuleKey()`）也均有现成 API 可调用。

Re-init 场景通过 `loadConfigFromPath()` 加载现有 config 作为初始值，增量更新仅覆盖用户选中的功能组，未选组原样保留。

**Primary recommendation:** 在 `.claude/skills/using-qa-flow/scripts/` 中新增 `init-wizard.mjs` 脚本承担所有 I/O 操作，更新 `SKILL.md` 的 init 分支编排对话流程和对该脚本的调用，并在 `templates/` 目录下放置 `CLAUDE.md.template`。

---

## Standard Stack

### Core（已锁定，不引入新依赖）
| Library/Tool | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js ESM (.mjs) | v25.8.1 (installed) | 脚本运行时 | 项目硬约束，不引入额外运行时 |
| jszip | ^3.10.1 (archive-converter & xmind-converter deps) | 读取 .xmind ZIP 内容 | 已在项目中使用，不引入新依赖 |
| node:fs, node:path | Built-in | 目录扫描、文件写入 | 原生模块，无需安装 |
| load-config.mjs | Internal | loadConfigFromPath() for re-init, assertRequiredFields() | 现有 API，init 必须兼容 |
| front-matter-utils.mjs | Internal | extractVersionFromPath(), extractModuleKey() | 现有 API，减少重复实现 |

### 无新依赖原则
项目约束明确禁止引入额外运行时。CSV 解析使用手写 RFC-4180 解析器（已验证可行），XMind 解析使用 jszip（已有依赖）。**不引入** `inquirer`、`commander`、`csv-parse` 或任何交互式 CLI 框架——向导对话由 Claude 承担，脚本只处理数据 I/O。

**依赖确认（init 向导无新 npm install）:**
```bash
# jszip 已在 archive-converter 和 tests 中声明
# init 脚本若需要 jszip，可与 archive-converter scripts 共用 node_modules
# 或在 using-qa-flow/scripts/ 下声明自己的 package.json
```

---

## Architecture Patterns

### 推荐项目结构（新增文件）

```
.claude/skills/using-qa-flow/
├── SKILL.md                          # 更新：添加 init 对话编排（Step 0）
├── scripts/
│   ├── init-wizard.mjs               # NEW: 主 I/O 脚本（扫描、解析、写文件）
│   ├── scan-project.mjs              # NEW: 目录扫描 → 推断信号（可内联在 init-wizard）
│   └── [existing scripts...]
└── templates/
    └── CLAUDE.md.template            # NEW: CLAUDE.md 模板文件（占位符待替换）
```

### Pattern 1: Skill + Script 分工模式（项目已有模式）

**What:** Claude Skill (SKILL.md) 驱动对话，Node.js 脚本处理 I/O。向导的每个交互步骤由 SKILL.md 定义 Claude 的行为，Claude 在合适时机调用 init-wizard.mjs 的子命令。

**When to use:** 需要用户交互 + 文件写入组合场景。项目中所有现有 Skills 都遵循此模式（archive-converter, prd-enhancer, test-case-generator 等）。

**子命令设计示例：**
```javascript
// init-wizard.mjs 通过 --command 参数暴露功能
// node init-wizard.mjs --command scan          → 输出 JSON 推断结果
// node init-wizard.mjs --command parse-file --path ./cases/history/xxx.csv  → 输出模块候选
// node init-wizard.mjs --command write --config-json '...' --claude-md '...' → 写入文件
// node init-wizard.mjs --command load-existing  → 读取现有 config.json 输出 JSON
```

**SKILL.md init 分支结构（伪代码）：**
```markdown
如果 $ARGUMENTS 包含 init / 初始化 / 0:

  ### Step 0: Config 向导（新增）
  1. 执行 node init-wizard.mjs --command scan，解析扫描结果
  2. 以 Markdown 表格展示推断的模块结构，等待用户确认
  3. 如有误，逐项修正后重新展示
  4. 询问历史文件路径（已检测到的 + 用户补充）
  5. 功能分组问答（5 组）
  6. 写入前文字摘要确认
  7. 执行 node init-wizard.mjs --command write ...

  ### Step 1-5: 原有环境初始化流程（不变）
```

### Pattern 2: 目录扫描五信号推断

**What:** `--command scan` 返回结构化 JSON，Claude 根据 JSON 决定展示内容。

```javascript
// scan 输出格式（供 Claude 读取）
{
  "modules": [
    {
      "key": "data-assets",          // 推断的 moduleKey
      "versioned": true,             // 是否发现版本子目录
      "inferredFrom": "cases/xmind", // 推断来源
      "paths": { "xmind": "cases/xmind/data-assets/" }
    }
  ],
  "signals": {
    "hasCasesDir": true,
    "hasReposDir": true,              // .repos/ 存在 → 建议配置 repos
    "hasImages": true,                // assets/images/ 有图片
    "historyFiles": [                 // cases/history/ 下文件
      { "path": "cases/history/xyzh/v0.2.0/用例.csv", "type": "csv" }
    ],
    "prdVersionPatterns": ["v6.4.10"] // PRD 文件名中发现的版本号
  },
  "existingConfig": null              // re-init 时为已有 config 对象
}
```

### Pattern 3: CSV/XMind 模块 key 推断（复用现有逻辑）

**What:** 从文件名和文件内容提取候选模块名，交给用户确认。

```javascript
// CSV 候选名提取：表头第一列或文件名去除日期前缀+版本后缀
// 日期前缀正则：/^\d{6,8}[-_]/
// 版本后缀正则：/[-_]?v\d+[\d.]+$/i
function inferModuleKeyFromFilename(filename) {
  return filename
    .replace(/^\d{6,8}[-_]/, '')      // 去日期前缀 (20260311-)
    .replace(/[-_]?v\d+[\d.]*$/i, '') // 去版本后缀 (-v0.2.0)
    .replace(/\.(csv|xmind)$/i, '')   // 去扩展名
    .trim();
}

// XMind 候选名：根节点 title 或 L1 子节点 titles（via JSZip + JSON parse）
// 使用 archive-converter 中已验证的 JSZip 解析模式
```

**中文 → slug 策略（Agent's Discretion）：** 提取候选名后原样展示，向用户询问「请输入英文 key（如 data-assets）」。不做自动中英翻译（避免不可预测的音译错误）。

### Pattern 4: Config JSON 生成与验证

**What:** 向导收集所有字段后构建 config 对象，写入前用 `assertRequiredFields()` 验证。

```javascript
// init-wizard.mjs --command write 接收 JSON 字符串并写入
async function writeOutputs({ configJson, claudeMdContent }) {
  // 1. 验证 config 合法性（复用 load-config.mjs 的内部验证逻辑）
  const parsed = JSON.parse(configJson);
  assertRequiredFields(parsed, '.claude/config.json');  // 需导出或内联
  
  // 2. 写入 .claude/config.json
  writeFileSync(CONFIG_PATH, JSON.stringify(parsed, null, 2), 'utf8');
  
  // 3. 写入项目根目录 CLAUDE.md
  writeFileSync(CLAUDE_MD_PATH, claudeMdContent, 'utf8');
}
```

### Pattern 5: CLAUDE.md 模板占位符替换

**What:** 读取模板文件，替换关键变量后写入项目根目录。

```javascript
// 占位符定义（在模板中以 {{}} 形式标记）
const replacements = {
  '{{PROJECT_NAME}}':    config.project.displayName || config.project.name,
  '{{MODULE_KEY_EXAMPLE}}': firstModuleKey || '<module-key>',
  '{{CASES_ROOT}}':      config.casesRoot || 'cases/',
};

function renderTemplate(templateContent, replacements) {
  return Object.entries(replacements).reduce(
    (content, [placeholder, value]) => content.replaceAll(placeholder, value),
    templateContent
  );
}
```

### Pattern 6: Re-init 增量更新

**What:** 检测到现有 config.json → 加载 → 按功能组选择性更新 → 写回。

```javascript
// init-wizard.mjs --command load-existing
// 使用现有 loadConfigFromPath() API
import { loadConfigFromPath } from '../../../shared/scripts/load-config.mjs';
const existing = loadConfigFromPath(CONFIG_PATH);
// 输出 JSON 供 Claude 读取，作为各组问答的默认值
```

### Anti-Patterns to Avoid

- **❌ 在 SKILL.md 中内联 JSON 构建逻辑** — JSON 生成属于 I/O 操作，应在 .mjs 脚本中进行，Claude 只传递字段值
- **❌ 扫描阶段写任何文件** — D-03 明确禁止，必须用户确认后才写（init-wizard.mjs 的 scan 命令只读不写）
- **❌ 在 init 脚本中 hardcode 路径** — 所有路径通过 config 字段解析（Phase 2 决策延续）
- **❌ 引入新 npm 依赖（除 jszip 外）** — 技术栈约束：Node.js ESM 无额外运行时
- **❌ assertRequiredFields 之外另写 config 验证** — 手写验证风格（Phase 1 决策），不引入 Ajv/Zod
- **❌ 自动转换中文模块名为英文 slug** — D-06 要求用户确认，音译/拼音转换不可靠，会产生错误 key

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XMind 文件解析 | 自定义 XML/ZIP 解析器 | JSZip（已有依赖）+ 现有 `convertXMind()` 逻辑 | archive-converter 已验证：XMind 是 ZIP 包含 content.json |
| CSV 解析 | 新的 CSV 库 | archive-converter 中的 `parseCSV()` 函数（RFC-4180，支持带换行引用字段，含 BOM 处理） | 已经在生产中使用，支持中文 CSV |
| 版本号提取 | 新正则逻辑 | `extractVersionFromPath()` from front-matter-utils.mjs | 已有 `\bv(\d+\.\d+\.\d+)\b` 正则，经测试 |
| 模块 key 提取 | 新路径解析 | `extractModuleKey()` from front-matter-utils.mjs | 已有 `cases/xmind/<key>` 路径模式识别 |
| Config 验证 | 再写一套字段检查 | `assertRequiredFields()` from load-config.mjs（导出或内联等效逻辑） | Phase 1 决策：手写验证，统一入口 |
| 现有 config 加载（re-init） | 自己 readFileSync + JSON.parse | `loadConfigFromPath()` from load-config.mjs | 已有完整错误处理 |

**Key insight:** 大量辅助逻辑已在项目中实现（CSV 解析、XMind 解析、版本提取、config 验证）。init 向导的核心工作是**编排这些能力**，而非重新实现。

---

## Common Pitfalls

### Pitfall 1: SKILL.md 中试图构建复杂 JSON
**What goes wrong:** Claude 在对话中拼接 JSON 字符串容易出格式错误（引号转义、嵌套结构）
**Why it happens:** 想把所有逻辑放在 SKILL.md 中，但 Claude 对精确 JSON 格式不够可靠
**How to avoid:** Claude 只收集字段值（字符串），最终传递给 init-wizard.mjs `--command write` 时由脚本用 `JSON.stringify()` 构建合法 JSON
**Warning signs:** SKILL.md 中出现 `JSON.stringify` 或复杂 JSON 拼接逻辑

### Pitfall 2: config.modules 的 versioned 字段被遗漏
**What goes wrong:** 生成的 config 中模块缺少 `versioned` 字段，导致 `resolveModulePath()` 无法正确处理版本化目录
**Why it happens:** 向导问答只关注模块名，忘记询问「这个模块是否按版本迭代？」
**How to avoid:** 模块配置问答必须包含 versioned 字段确认（D-09 第②组）；扫描推断时若发现版本子目录则 `versioned: true` 作为默认推荐值
**Warning signs:** `resolveModulePath(key, 'xmind', config, 'v1.0')` 在测试中不返回版本子目录路径

### Pitfall 3: Re-init 覆盖用户未选中的配置组
**What goes wrong:** 增量更新时，未选中的功能组被空值或默认值覆盖，用户丢失现有配置
**Why it happens:** 写入逻辑没有合并策略，直接用新对象替换旧对象
**How to avoid:** D-15 要求未选组直接保留原值；实现时 `deepMerge(existingConfig, updatedGroups)` 而不是对象替换
**Warning signs:** Re-init 后 `repos` 或 `integrations` 字段变为空对象

### Pitfall 4: XMind 文件格式多样性（content.json vs content.xml）
**What goes wrong:** 某些 XMind 版本生成的文件只有 content.xml，没有 content.json，JSZip 读取 content.json 失败
**Why it happens:** XMind 格式在不同版本间有变化
**How to avoid:** 复用 archive-converter 中已有的 fallback 逻辑（`zip.files['content.json'] || zip.files['content.xml']`，line 494 of convert-history-cases.mjs）
**Warning signs:** `.xmind` 解析报 `XMind 文件中既无 content.json 也无 content.xml`

### Pitfall 5: CLAUDE.md 模板占位符被 Claude 误读
**What goes wrong:** 模板文件中的 `{{PROJECT_NAME}}` 等占位符被 Claude 在读取模板时解析为指令或替换
**Why it happens:** SKILL.md 中直接 `cat` 模板文件然后让 Claude 处理内容
**How to avoid:** 模板替换完全在 init-wizard.mjs 脚本中完成，Claude 只传递替换值（不读取模板原文）；`--command render-template --project-name "xxx" ...`

### Pitfall 6: loadConfig() 缓存导致 re-init 后读到旧值
**What goes wrong:** init 写入新 config.json 后，同一进程中其他脚本调用 `loadConfig()` 仍读到缓存的旧值
**Why it happens:** load-config.mjs 有模块级缓存 `_config`
**How to avoid:** init-wizard.mjs 是独立子进程（`node init-wizard.mjs`），不共享缓存；同时告知用户在 init 完成后重新开始对话以确保新 config 生效

---

## Code Examples

### 目录扫描实现（5 信号）
```javascript
// Source: 基于 D-02 决策，使用 node:fs built-in
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function scanProject(rootDir) {
  const casesDir = join(rootDir, 'cases');
  const result = { modules: [], signals: {} };
  
  // 信号1: cases/ 子目录 → 推断模块 key
  if (existsSync(casesDir)) {
    const xmindDir = join(casesDir, 'xmind');
    if (existsSync(xmindDir)) {
      for (const entry of readdirSync(xmindDir)) {
        if (statSync(join(xmindDir, entry)).isDirectory()) {
          // 检查是否有版本子目录（如 v6.4.10/）
          const subDirs = readdirSync(join(xmindDir, entry))
            .filter(d => /^v\d+/.test(d));
          result.modules.push({
            key: entry, versioned: subDirs.length > 0,
            inferredFrom: 'cases/xmind',
          });
        }
      }
    }
  }
  
  // 信号2: .repos/ 存在 → 建议配置 repos
  result.signals.hasReposDir = existsSync(join(rootDir, '.repos'));
  
  // 信号3: assets/images/ 有图片
  const imagesDir = join(rootDir, 'assets', 'images');
  result.signals.hasImages = existsSync(imagesDir) && 
    readdirSync(imagesDir).some(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f));
  
  // 信号4/5: cases/history/ 下的 CSV/XMind 文件
  const historyDir = join(casesDir, 'history');
  result.signals.historyFiles = findFiles(historyDir, ['.csv', '.xmind']);
  
  return result;
}
```

### CSV 模块 key 推断（复用 archive-converter 逻辑）
```javascript
// Source: 提取自 convert-history-cases.mjs parseCSV() 模式
// 文件名候选提取
function inferCandidateFromFilename(filename) {
  return filename
    .replace(/^\d{6,8}[-_]/, '')      // 去日期前缀
    .replace(/[-_]?v?\d+[\d.]*$/i, '') // 去版本后缀
    .replace(/\.(csv|xmind)$/i, '')   // 去扩展名
    .trim();
}

// CSV 表头提取（第一行第一列往往是模块分类列）
function inferCandidateFromCSVHeader(csvPath) {
  const raw = readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
  const firstLine = raw.split('\n')[0];
  return firstLine.split(',')[0].replace(/"/g, '').trim();
}
```

### XMind 根节点提取（复用 archive-converter JSZip 模式）
```javascript
// Source: convert-history-cases.mjs convertXMind() 逻辑（第468行起）
async function extractXMindRootTitle(xmindPath) {
  const { default: JSZip } = await import('jszip');
  const buf = readFileSync(xmindPath);
  const zip = await JSZip.loadAsync(buf);
  
  const contentFile = zip.files['content.json'] || zip.files['content.xml'];
  if (!contentFile) throw new Error('XMind 文件格式不支持');
  
  const raw = await contentFile.async('string');
  if (zip.files['content.json']) {
    const sheets = JSON.parse(raw);
    return sheets[0]?.rootTopic?.title || null;
  }
  // content.xml fallback: parse root node title
  // ...
}
```

### Config 对象构建（完整 schema）
```javascript
// Source: .claude/config.json 当前 schema（经 loadConfig() 验证通过）
function buildConfigObject({
  projectName, displayName, casesRoot,
  modules,           // { [key]: { versioned, zh?, repoHints?, xmind?, archive?, requirements?, history? } }
  repos,             // {} or { [repoName]: { path, type } }
  branchMapping,     // null or string path
  stackTrace,        // {} or config
  hasLanhuMcp,       // boolean
  lanhuMcpConfig,    // object if hasLanhuMcp
}) {
  return {
    project: { name: projectName, displayName: displayName || projectName },
    casesRoot: casesRoot || 'cases/',
    modules,
    repos: repos || {},
    stackTrace: stackTrace || {},
    branchMapping: branchMapping || null,
    trash: { dir: '.trash/', retentionDays: 30 },
    assets: { images: 'assets/images/' },
    reports: { bugs: 'reports/bugs/', conflicts: 'reports/conflicts/' },
    integrations: hasLanhuMcp ? { lanhuMcp: lanhuMcpConfig } : { lanhuMcp: { runtimePath: 'tools/lanhu-mcp/', envFile: 'tools/lanhu-mcp/.env', setupScript: 'tools/lanhu-mcp/setup-env.sh', quickstartScript: 'tools/lanhu-mcp/quickstart.sh', entryScript: 'tools/lanhu-mcp/lanhu_mcp_server.py', serverHost: '127.0.0.1', serverPort: 8000, serverUrl: 'http://127.0.0.1:8000', mcpPath: '/mcp', logFile: '.claude/tmp/lanhu-mcp.log', cookieRefreshScript: '.claude/skills/using-qa-flow/scripts/refresh-lanhu-cookie.py' } },
    shortcuts: { latestXmind: 'latest-output.xmind', latestEnhancedPrd: 'latest-prd-enhanced.md', latestBugReport: 'latest-bug-report.html', latestConflictReport: 'latest-conflict-report.html' },
  };
}
```

---

## Runtime State Inventory

> 此阶段是新功能开发（非 rename/refactor），但生成的文件会创建持久化运行时状态。

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `.claude/config.json` — init 写入后成为持久化状态；re-init 需读取现有值 | 使用 loadConfigFromPath() 加载；deepMerge 策略保护未选组 |
| Live service config | `CLAUDE.md` — 项目根目录，已有内容需在 re-init 时谨慎覆盖（D-16 要求确认） | 每次 re-init 询问用户是否更新 |
| OS-registered state | None — 无 Task Scheduler / pm2 注册 | None — verified |
| Secrets/env vars | lanhu MCP 的 `.env` 文件不由 init 生成（Deferred）；init 只记录 envFile 路径到 config | No action in this phase |
| Build artifacts | `.claude/skills/using-qa-flow/scripts/node_modules/` — 若 init-wizard.mjs 需要 jszip，需在该目录下 `npm install` | Wave 0 task: 创建 package.json + npm install |

---

## Validation Architecture

> nyquist_validation 未设为 false，执行验证。

### Test Framework
| Property | Value |
|----------|-------|
| Framework | 自定义 node runner（run-all.mjs）|
| Config file | `.claude/tests/run-all.mjs`（自动发现 `test-*.mjs`）|
| Quick run command | `node .claude/tests/test-init-wizard.mjs` |
| Full suite command | `node .claude/tests/run-all.mjs` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INIT-01 | 目录扫描返回正确的模块推断 JSON | unit | `node .claude/tests/test-init-wizard.mjs` | ❌ Wave 0 |
| INIT-01 | 扫描阶段不写任何文件 | unit | `node .claude/tests/test-init-wizard.mjs` | ❌ Wave 0 |
| INIT-02 | CSV 文件推断候选模块名正确 | unit | `node .claude/tests/test-init-wizard.mjs` | ❌ Wave 0 |
| INIT-02 | XMind 文件提取根节点标题正确 | unit | `node .claude/tests/test-init-wizard.mjs` | ❌ Wave 0 |
| INIT-03 | 含 versioned:true 的多模块 config 通过 loadConfig() | unit | `node .claude/tests/test-init-wizard.mjs` | ❌ Wave 0 |
| INIT-04 | CLAUDE.md 模板占位符全部被替换（无残留 `{{` ） | unit | `node .claude/tests/test-init-wizard.mjs` | ❌ Wave 0 |
| INIT-05 | 生成 config.json 通过 assertRequiredFields() 不抛错 | unit | `node .claude/tests/test-init-wizard.mjs` | ❌ Wave 0 |
| INIT-05 | Re-init 增量更新保留未选组的现有值 | unit | `node .claude/tests/test-init-wizard.mjs` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node .claude/tests/test-init-wizard.mjs`
- **Per wave merge:** `node .claude/tests/run-all.mjs`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `.claude/tests/test-init-wizard.mjs` — 覆盖 INIT-01 至 INIT-05 所有单元测试
- [ ] `.claude/skills/using-qa-flow/scripts/package.json` — 若 init-wizard.mjs 依赖 jszip，需声明并安装
- [ ] `.claude/skills/using-qa-flow/templates/CLAUDE.md.template` — 模板文件（可与脚本同波次创建）

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | init-wizard.mjs 运行时 | ✓ | v25.8.1 | — |
| jszip | XMind 解析 | ✓ (in archive-converter) | ^3.10.1 | — |
| node:fs, node:path | 目录扫描、文件写入 | ✓ | Built-in | — |

**Missing dependencies with no fallback:** 无。

---

## Open Questions

1. **init-wizard.mjs 的 jszip 依赖如何管理**
   - What we know: jszip 已在 `archive-converter/scripts/` 和 `tests/` 中声明
   - What's unclear: init-wizard.mjs 是否在独立的 `using-qa-flow/scripts/` package 中，还是可以共享 archive-converter 的 node_modules
   - Recommendation: 在 `.claude/skills/using-qa-flow/scripts/package.json` 中独立声明 `jszip` 依赖，与其他脚本包保持一致的独立性；Wave 0 任务包含 npm install

2. **CLAUDE.md 模板应放在哪里**
   - What we know: 需要一个标准模板，init 替换占位符后写入项目根目录
   - What's unclear: 是放 `using-qa-flow/templates/` 还是 `.claude/shared/templates/`
   - Recommendation: 放 `.claude/skills/using-qa-flow/templates/CLAUDE.md.template`，与 using-qa-flow Skill 内聚；如果后续多个 Skill 需要模板，再迁移到 shared

3. **D-13: CLAUDE.md 中 repos 条件块的写入策略**
   - What we know: Agent's Discretion，决策留给实现时
   - Recommendation: **始终写入完整条件块**（保留 `> 以下规则仅在 config.repos 非空时适用` guard），因为用户后续可能添加 repos 配置，guard 逻辑在运行时生效，无需重新生成 CLAUDE.md

4. **using-qa-flow SKILL.md 中 init 5 步流程的位置**
   - What we know: 现有 Step 1-5 是环境初始化（Python/Node.js/源码仓库）；新 config 向导是「Step 0」
   - Recommendation: 将新向导明确标记为 `Step 0: 项目配置（首次使用必须完成）`，原 Step 1-5 保持不变，向导完成后自然引导进入环境初始化

---

## Sources

### Primary (HIGH confidence)
- `.claude/config.json` — config schema 字段权威来源，init 生成结果必须与此对齐
- `.claude/shared/scripts/load-config.mjs` — assertRequiredFields()、loadConfigFromPath()、resolveModulePath() API 文档
- `.claude/shared/scripts/front-matter-utils.mjs` — extractVersionFromPath()、extractModuleKey() 实现
- `.claude/skills/archive-converter/scripts/convert-history-cases.mjs` — parseCSV() 和 convertXMind() 可复用模式
- `.planning/phases/03-init-wizard/03-CONTEXT.md` — D-01 至 D-16 锁定决策

### Secondary (MEDIUM confidence)
- `.claude/skills/using-qa-flow/SKILL.md` — 现有 init 5 步流程，新向导插入 Step 0 后的结构参照
- `CLAUDE.md` — 生成模板的参照文件，结构和关键变量来源

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 技术栈约束明确，无新依赖引入
- Architecture: HIGH — 项目现有模式（Skill + Script 分工）已有大量参照
- Pitfalls: HIGH — 基于现有代码逻辑分析（jszip 格式 fallback、config 缓存、JSON 拼接脆弱性）
- Implementation details for Agent's Discretion items: MEDIUM — 有建议但非锁定

**Research date:** 2026-03-31
**Valid until:** 2026-05-01（项目约束稳定，30 天有效）
