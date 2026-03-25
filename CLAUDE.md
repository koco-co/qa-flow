# WorkSpaces QA 测试用例工作空间

## 项目概述

本工作空间用于 QA 测试用例的自动化编写与管理，覆盖 DTStack 平台和信永中和定制项目。

## 快速开始

### 普通模式（完整流程，含 brainstorming 和 Checklist 确认）

```
生成用例 Story-20260322 PRD-26
根据需求文档: Story-20260322 中的 PRD-26 生成测试用例
为 Story-20260322 写测试用例
```

### 快速模式（--quick，跳过交互，自动执行全流程）

适合重跑、已熟悉的需求、或不需要交互确认的场景：

```
为 Story-20260322 快速生成测试用例
Story-20260322 --quick
```

### 续传模式（自动检测）

如果上次流程被中断，重新发起相同指令，系统会自动检测进度并从断点继续：

```
继续 Story-20260322 的用例生成
```

### 模块级重跑

生成完毕后，可以单独重跑某个模块的用例：

```
重新生成 Story-20260322 的「列表页」模块用例
为 Story-20260322 追加边界用例
```

系统将自动执行：PRD 增强（含增量 diff）→ 健康度预检 → Brainstorming + 解耦 → Checklist 预览 → 并行生成 → 评审 → 输出 XMind。

---

## 目录结构

```
WorkSpaces/
├── CLAUDE.md                              # 本文件
├── zentao-cases/                          # 测试用例输出目录
│   ├── XMind/                             # XMind 文件存放
│   │   ├── Assets/img/                    # 辅助图片资源
│   │   ├── BatchWorks/                    # 离线开发测试用例
│   │   ├── CustomItem/信永中和/            # 信永中和项目
│   │   ├── DataAssets/                    # 数据资产测试用例
│   │   ├── DataQuery/                     # 统一查询测试用例
│   │   └── VariableCenter/                # 变量中心测试用例
│   ├── customItem-platform/信永中和/       # 信永中和需求文档与历史用例
│   │   ├── Requirement/Story-YYYYMMDD/    # PRD 文档 + 临时文件（按 Story 隔离）
│   │   │   ├── PRD-XX-xxx.md             # 原始 PRD
│   │   │   ├── PRD-XX-xxx-enhanced.md    # 增强版 PRD（含图片描述）
│   │   │   ├── temp/                     # 临时 JSON（生成完成后删除）
│   │   │   └── .qa-state.json            # 断点续传状态文件（完成后删除）
│   │   └── v0.x.x/                       # 历史 CSV 用例（部分模块，已迁移至 XMind）
│   └── dtstack-platform/                  # DTStack 历史用例
├── gitlab-projects/                       # 源码仓库（用于验证按钮/文案）
│   ├── CustomItem/                        # 定制项目源码
│   ├── dt-insight-engine/                 # 引擎层源码
│   ├── dt-insight-front/                  # 前端源码
│   ├── dt-insight-plat/                   # 后端源码
│   ├── dt-insight-qa/                     # QA 工具与文档
│   └── dt-insight-web/                    # Web 层源码
└── .claude/
    ├── skills/                            # 项目级 skills
    │   ├── prd-enhancer/                  # PRD 文档增强（含增量 diff + 健康度预检）
    │   ├── test-case-generator/           # 用例生成编排（主入口，8步流程）
    │   └── xmind-converter/               # JSON → XMind 转换（含 --append 模式）
    └── scripts/
        ├── package.json                   # Node.js 依赖
        └── json-to-xmind.mjs             # 转换脚本（支持 --append）
```

---

## 代码仓库路径映射

| 项目         | 类型     | 路径                                                  |
| ------------ | -------- | ----------------------------------------------------- |
| DTStack 平台 | 前端     | `gitlab-projects/dt-insight-front/dt-insight-studio/` |
| DTStack 平台 | Web 层   | `gitlab-projects/dt-insight-web/`                     |
| DTStack 平台 | 后端     | `gitlab-projects/dt-insight-plat/`                    |
| DTStack 平台 | 引擎层   | `gitlab-projects/dt-insight-engine/`                  |
| QA 工具      | 文档/工具 | `gitlab-projects/dt-insight-qa/`                      |
| 定制项目     | 源码     | `gitlab-projects/CustomItem/`                         |
| 信永中和     | —        | 无源码，仅 PRD                                        |

---

## 完整工作流（8 步）

| 步骤 | 名称 | 说明 |
|------|------|------|
| Step 1 | 解析用户指令 | 提取 Story/PRD 路径、验证源码仓库、检测断点续传 |
| Step 2 | PRD 增强 | 调用 prd-enhancer：增量 diff + 图片读取 + 健康度预检 |
| Step 3 | Brainstorming | 与用户讨论测试范围、高风险场景、历史 Bug（`--quick` 跳过） |
| Step 4 | Checklist 预览 | 展示每个模块的测试点清单，用户可增删调整（`--quick` 跳过） |
| Step 5 | 用户确认 | 一次性确认 PRD 摘要 + 拆分方案 + 测试点（`--quick` 跳过） |
| Step 6 | 并行 Writer | 为每个解耦模块启动独立 Writer Subagent，并行生成用例 |
| Step 7 | Reviewer 评审 | 合并所有 Writer 输出，3 轮修正 + 查漏补缺 + 质量阈值检查 |
| Step 8 | 输出 XMind | 调用 xmind-converter 生成 .xmind 文件（支持 --append 追加） |

---

## Skills 独立使用说明

### prd-enhancer（单独增强某个 PRD）

```
帮我增强这个 PRD：zentao-cases/customItem-platform/信永中和/Requirement/Story-20260322/PRD-26-数据质量-质量问题台账.md
```

### xmind-converter（单独转换 JSON 为 XMind）

```
将 zentao-cases/customItem-platform/信永中和/Requirement/Story-20260322/temp/cases.json 转换为 XMind 文件
```

### test-case-generator（主入口，完整流程）

```
根据需求文档: Story-20260322 中的 PRD-26 生成测试用例
为 Story-20260322 快速生成测试用例
```

---

## XMind 输出规范

- **文件命名**：同一 Story 下所有 PRD 用例推荐输出到同一文件：
  - 单 PRD：`YYYYMM-<功能名>.xmind`（如 `202603-数据质量-质量问题台账.xmind`）
  - 整个 Story：`YYYYMM-Story-YYYYMMDD.xmind`（如 `202603-Story-20260322.xmind`）
- **输出路径**：`zentao-cases/XMind/<项目>/`（如 `zentao-cases/XMind/CustomItem/信永中和/`）
- **层级**：Root → L1（版本+需求名）→ L2（模块）→ [L3（子分组）] → 用例标题 → 步骤 → 预期
- **追加模式**：同一 XMind 文件中，不同 PRD 的用例以各自的 L1 节点区分

---

## 增量更新说明

PRD 修改后，不需要从头开始：

1. 重新运行相同指令（普通模式或快速模式）
2. prd-enhancer 自动比对 PRD 原文件与 `-enhanced.md` 的修改时间（`enhanced-at` 时间戳），仅在 PRD 有更新时重新处理
3. test-case-generator 只重新生成受影响模块的 Writer
4. Reviewer 对所有用例（新旧）重新评审

如需强制全量重跑，删除对应的 `-enhanced.md` 文件和 `.qa-state.json` 后重新运行。

---

## 断点续传说明

流程每步完成后会在 Story 目录写入进度文件：

```
zentao-cases/<项目路径>/Requirement/Story-20260322/.qa-state.json
```

如果会话中断（网络问题、context 超限等），重新开始对话并发起相同指令，系统会自动检测并从断点继续。流程全部完成后，状态文件会自动删除。

### 状态文件关键字段

| 字段 | 说明 |
|------|------|
| `last_completed_step` | 最后完成的步骤编号（1-8），恢复时从下一步开始 |
| `mode` | `normal`（完整流程）/ `quick`（跳过交互步骤） |
| `writers.<name>.status` | 每个 Writer 的状态：`pending` / `in_progress` / `completed` / `failed` |
| `reviewer_status` | `pending` / `completed` / `escalated`（需人工介入） |
| `checklist_confirmed` | Checklist 是否已确认 |

---

## 临时文件管理

- 临时 JSON 路径：`zentao-cases/<项目路径>/Requirement/Story-YYYYMMDD/temp/`
- 每个 Story 有独立的 temp 目录，多 Story 并发不冲突
- 生成 XMind 后自动删除 temp/ 目录和 .qa-state.json

---

## 质量控制

Reviewer 采用 3 级质量阈值自动决策：

| 问题率 | 行为 |
|--------|------|
| < 15% | 自动修正，无需通知用户 |
| 15% - 40% | 自动修正 + 质量警告，建议用户核查 |
| > 40% | 立即停止，输出阻断报告，等待用户选择：修复 PRD 重跑 / 手动修正 / 强制继续 |

问题率 = 含 F01-F07 任意问题的用例数 / 总用例数（一条用例多个问题只计 1 次）。

---

## 已完成后的操作

测试用例生成完毕后，支持以下后续操作：

- **模块级重跑**：`重新生成 Story-xxx 的「列表页」模块用例` — 仅重跑指定 Writer，其他模块保持不变
- **追加边界用例**：`为 Story-xxx 追加边界用例` — 在现有用例基础上补充 P2 边界场景
- **追加到现有 XMind**：使用 `--append` 模式，将新 PRD 的用例追加到同一 .xmind 文件
- **强制全量重跑**：删除 `-enhanced.md` 和 `.qa-state.json` 后重新运行

---

## 图片引用规范

本仓库所有 Markdown 文件中的图片引用必须遵循以下规范：

### 存放位置

所有图片统一存放在仓库根目录 `images/` 下，不在子目录中分散存储。

### 引用格式

使用**标准 Markdown 格式**，禁止使用 Obsidian 专有格式：

```markdown
# ✅ 正确：标准 Markdown 格式
![语义化中文描述](../../../../../images/语义化文件名.png)

# ❌ 禁止：Obsidian 格式
![[Pasted image 20260325151102.png]]
```

### 相对路径计算

根据 md 文件所在深度，计算到根目录 `images/` 的相对路径：

| 文件位置示例                                                         | 相对路径前缀           |
| -------------------------------------------------------------------- | ---------------------- |
| `zentao-cases/customItem-platform/信永中和/Requirement/Story-xxx/*.md` | `../../../../../images/` |
| `zentao-cases/dtstack-platform/数据资产/archive-reqs/Story/*.md`     | `../../../../../images/` |
| 根目录 `*.md`                                                        | `images/`              |

### 文件命名规则

- 使用中文语义化名称，反映图片实际内容（如 `质量问题台账列表页.png`）
- 禁止使用时间戳（`Pasted image 2026xxxx.png`）、UUID、MD5 哈希等无意义名称
- 同功能多页面用 `-` 分隔：`质量问题台账-新增表单页.png`
- 如同名文件已存在，追加 `-2`、`-3` 等后缀

### prd-enhancer 自动处理

执行 prd-enhancer 时，会自动完成以下图片规范化：
1. 识别 Obsidian `![[]]` 格式并转换为标准 Markdown `![]()` 格式
2. 将散落在各处的图片移入 `images/` 根目录
3. 重命名无意义文件名为语义化名称
4. 计算并填入正确的相对路径

---

## 图片预处理规则

**在任何需要读取图片的步骤之前，必须先压缩超大图片。**

> 原因：图片超过 2000px 时 AI 多模态能力可能跳过分析，导致关键 UI 信息丢失。

每次执行 prd-enhancer 或直接读取 PRD 图片前，使用以下命令对目标图片所在目录批量压缩：

```bash
for f in <图片目录>/*.png <图片目录>/*.jpg; do
  [ -f "$f" ] || continue
  w=$(sips -g pixelWidth "$f" | awk '/pixelWidth/{print $2}')
  h=$(sips -g pixelHeight "$f" | awk '/pixelHeight/{print $2}')
  if [ "$w" -gt 2000 ] || [ "$h" -gt 2000 ]; then
    echo "压缩: $f (${w}x${h})"
    sips -Z 2000 "$f"
  fi
done
```

- `sips -Z 2000`：等比缩放，最长边 ≤ 2000px，已达标图片不处理，原位覆盖
- 适用于 macOS（内置 `sips` 命令，无需安装依赖）
- 如图片存放在 `images/` 全局目录，也应在流程开始前对该目录执行一次

---

## 工具依赖

```bash
# 安装脚本依赖（首次使用）
cd .claude/scripts && npm install
```

依赖项：

- `xmind-generator@^1.0.1` — XMind 文件生成
- `jszip@^3.10.1` — ZIP 读写（--append 模式必需）
