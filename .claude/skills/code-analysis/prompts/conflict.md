# 合并冲突分析指令

> 本提示词由 code-analysis skill 在模式 B 时加载。
> 分析完成后，生成 HTML 报告所需的结构化数据（见「输出结构」一节）。

---

## 分析目标

将用户提供的 git 合并冲突代码转化为：

1. 每处冲突的性质判断（逻辑冲突 / 格式冲突 / 依赖冲突）
2. 可直接执行的合并建议
3. 需要人工决策的项目清单
4. 结构化报告数据（用于渲染 HTML 报告）

---

## 冲突标记识别

标准 git 冲突标记格式：

```
<<<<<<< HEAD
当前分支（HEAD）的代码
=======
合入分支（incoming）的代码
>>>>>>> branch-name
```

解析时需提取：
- HEAD 侧内容（`<<<<<<< HEAD` 到 `=======` 之间）
- 合入侧内容（`=======` 到 `>>>>>>>` 之间）
- 冲突所在文件名和行号（若用户提供）

---

## 冲突分类

### 1. 逻辑冲突

两侧代码**都有实质性业务逻辑变更**，且变更目标不同。

特征：
- 同一函数/方法被两侧分别修改
- 业务逻辑存在互斥（如条件判断方向相反）
- 数据处理方式不同

处理策略：**需要人工决策**，标记为 `manual`。

### 2. 格式冲突

两侧改动**语义相同**，仅有格式、命名、注释等表面差异。

特征：
- 仅有空格、换行、缩进差异
- 变量名重命名（两侧不同新名）
- 注释增删
- import 顺序调整

处理策略：**可自动合并**，优先采用代码风格更规范的一侧，标记为 `auto`。

### 3. 依赖冲突

两侧对**第三方依赖、配置文件、接口定义**有不同修改。

特征：
- `package.json` / `pom.xml` 版本号冲突
- 配置文件（application.yml / .env）的键值冲突
- API 接口定义（TypeScript interface / Java DTO）的字段冲突

处理策略：需根据版本策略决定，标记为 `manual`（通常取高版本或合并字段）。

---

## 分析步骤

### 第一步：统计冲突概况

- 共有多少处冲突（`<<<<<<<` 的数量）
- 涉及多少个文件
- 各类型冲突分布

### 第二步：逐块分析

对每处冲突：

1. **描述两侧改动的意图**（HEAD 侧在做什么，合入侧在做什么）
2. **判断冲突类型**（逻辑 / 格式 / 依赖）
3. **给出合并建议**：
   - 取 HEAD 侧
   - 取合入侧
   - 合并两侧（给出合并后代码）
   - 人工决策（说明决策依据）

### 第三步：汇总人工决策项

列出所有需要人工决策的冲突，说明：
- 冲突位置（文件:行号）
- 决策依据（两侧分别实现了什么，为什么自动化无法判断）
- 推荐倾向（若有明确倾向，给出推荐但不强制）

---

## 输出结构

分析完成后，将以下 JSON 数据交给 SKILL.md 渲染 HTML 报告：

```json
{
  "title": "报告标题（如：feature/xxx 合入 main 冲突分析）",
  "analysis_time": "YYYY-MM-DD HH:mm",
  "branches": {
    "head": "当前分支名（如 main）",
    "incoming": "合入分支名（如 feature/xxx）"
  },
  "summary": {
    "total_conflicts": 5,
    "auto_resolvable": 2,
    "manual_required": 3,
    "files_affected": ["src/service/UserService.java", "package.json"]
  },
  "conflicts": [
    {
      "id": 1,
      "file": "src/service/UserService.java",
      "line_range": "100-120",
      "type": "逻辑冲突 | 格式冲突 | 依赖冲突",
      "resolution": "auto | manual",
      "head_intent": "HEAD 侧改动意图",
      "incoming_intent": "合入侧改动意图",
      "suggestion": "合并建议（文字描述）",
      "merged_code": "合并后代码（auto 类型时提供）",
      "decision_basis": "人工决策依据（manual 类型时提供）",
      "recommended_side": "head | incoming | merge | null"
    }
  ],
  "manual_decision_list": [
    {
      "conflict_id": 3,
      "file": "...",
      "description": "需要决策的内容描述",
      "options": ["选项 A", "选项 B"],
      "recommended": "推荐选项（若有）"
    }
  ]
}
```

若某字段信息不足，填 `null`，不要留空字符串占位。

---

## 注意事项

- 不要盲目取 HEAD 侧或合入侧；每处冲突需独立判断。
- 格式冲突可以放心建议自动合并，但需在报告中明确标出，让开发者可以快速确认。
- 涉及数据库 Schema（如 Liquibase / Flyway 迁移脚本）的冲突，一律标记为 `manual`，这类冲突合并错误代价极高。
- 若用户只提供了部分冲突代码，在报告中说明"分析基于提供的片段，可能存在未覆盖的冲突"。
