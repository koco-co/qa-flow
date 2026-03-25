# WorkSpaces QA 测试用例工作空间

## 项目概述

本工作空间用于 QA 测试用例的自动化编写与管理，覆盖 DTStack 平台和信永中和定制项目。

## 快速开始

### 普通模式（完整流程，含 brainstorming 和 Checklist 确认）

```
根据需求文档: Story-20260322 中的 PRD-26 生成测试用例
```

### 快速模式（--quick，跳过交互，自动执行全流程）

适合重跑、已熟悉的需求、或不需要交互确认的场景：

```
为 Story-20260322 快速生成测试用例
```

### 续传模式（自动检测）

如果上次流程被中断，重新发起相同指令，系统会自动检测进度并从断点继续：

```
继续 Story-20260322 的用例生成
```

系统将自动执行：PRD 增强（含增量 diff）→ 健康度预检 → Brainstorming + 解耦 → Checklist 预览 → 并行生成 → 评审 → 输出 XMind。

---

## 目录结构

```
WorkSpaces/
├── CLAUDE.md                              # 本文件
├── zentao-cases/                          # 测试用例输出目录
│   ├── XMind/                             # XMind 文件存放
│   │   ├── CustomItem/信永中和/            # 信永中和项目
│   │   ├── dtstack-platform/              # DTStack 平台
│   │   └── DataAssets/ BatchWorks/ ...    # 其他模块
│   ├── customItem-platform/信永中和/       # 信永中和需求文档与历史用例
│   │   ├── Requirement/Story-YYYYMMDD/    # PRD 文档 + 临时文件（按 Story 隔离）
│   │   │   ├── PRD-XX-xxx.md             # 原始 PRD
│   │   │   ├── PRD-XX-xxx-enhanced.md    # 增强版 PRD（含图片描述）
│   │   │   ├── temp/                     # 临时 JSON（生成完成后删除）
│   │   │   └── .qa-state.json            # 断点续传状态文件（完成后删除）
│   │   └── v0.x.x/                       # 历史 CSV 用例（部分模块，已迁移至 XMind）
│   └── dtstack-platform/                  # DTStack 历史用例
├── gitlab-projects/                       # 源码仓库（用于验证按钮/文案）
│   ├── dt-insight-front/                  # 前端源码
│   ├── dt-insight-web/                    # Web 层源码
│   └── dt-insight-plat/                   # 后端源码
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

| 项目         | 类型   | 路径                                                  |
| ------------ | ------ | ----------------------------------------------------- |
| DTStack 平台 | 前端   | `gitlab-projects/dt-insight-front/dt-insight-studio/` |
| DTStack 平台 | Web 层 | `gitlab-projects/dt-insight-web/`                     |
| DTStack 平台 | 后端   | `gitlab-projects/dt-insight-plat/`                    |
| 信永中和     | —      | 无源码，仅 PRD                                        |

---

## 完整工作流（8 步）

```
Step 1: 解析用户指令 + 断点续传检测
Step 2: prd-enhancer（增量 diff + 图片读取 + 健康度预检）
Step 3: Brainstorming + 解耦分析（--quick 时跳过）
Step 4: Checklist 预览（--quick 时跳过）
Step 5: 用户一次确认（--quick 时跳过）
Step 6: 并行 Writer Subagents（基于 Checklist）
Step 7: Reviewer Subagent（15%/40% 质量阈值）
Step 8: xmind-converter（--append 追加到现有文件）
```

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
2. prd-enhancer 会自动比对文件修改时间，只重新处理变更章节
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

---

## 临时文件管理

- 临时 JSON 路径：`zentao-cases/<项目路径>/Requirement/Story-YYYYMMDD/temp/`
- 每个 Story 有独立的 temp 目录，多 Story 并发不冲突
- 生成 XMind 后自动删除 temp/ 目录和 .qa-state.json

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
