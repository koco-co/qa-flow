# Transform 节点设计：测试增强 PRD 模板 + 源码分析 + CLARIFY 协议

## 背景

qa-flow 现有 6 节点工作流（init → enhance → analyze → write → review → output）中，蓝湖导入的 raw-prd.md 是非结构化的原始素材（截图 + Axure 提取文本），直接交给 enhance 节点做有限补强。enhance 节点无法解决的核心问题：

1. 字段定义、校验规则、状态流转等信息在蓝湖文档中缺失或模糊
2. 前后端源码中有大量可直接提取的测试关键信息未被利用
3. 归档历史用例中的同模块经验未被参考
4. 需求不明确时缺乏结构化的澄清机制

## 决策记录

| 决策项 | 结论 | 理由 |
|--------|------|------|
| 节点位置 | 插入 init 和 enhance 之间（新 `transform` 节点） | 职责分离：transform 做结构化+源码分析，enhance 保留图片压缩+健康度检查 |
| 源码分析深度 | 自动检测，动态调整 | 已开发→深入业务逻辑层；开发中→参考推测；无源码→仅蓝湖+归档 |
| 源码配置方式 | 映射表自动匹配 + CLI 覆盖 + 首次学习 | 按需求动态变化，不能写死 |
| 分析视角 | 硬编码 tester | qa-flow 是 QA 工具 |
| 待确认项交互 | CLARIFY 中转协议，subagent → 主 agent → 用户 | 用户无法与 subagent 直接通信 |
| PRD 模板 | 5 部分结构化模板，四色来源标注 | 覆盖 enhance 健康度检查项 W001-W008 |

## 工作流变更

```
原流程：init → enhance → analyze → write → review → output
新流程：init → transform → enhance → analyze → write → review → output
                 ↑
              新增节点
```

### transform 节点职责

1. 解析蓝湖 raw-prd（截图 + 文字），识别页面结构
2. 根据用户确认的源码配置，checkout 对应分支，分析前后端代码
3. 检索归档 archive 中的同模块历史用例
4. 三方信息交叉比对，按模板自动填充结构化 PRD
5. 通过 CLARIFY 协议将无法确定的待确认项传递给主 agent
6. 接收用户确认结果，合入 PRD，移除待确认标记
7. 输出增强后的结构化 PRD，交给 enhance 节点

### enhance 节点调整

transform 产出的 PRD 已经结构化，enhance 节点简化为：

- 图片压缩（保留）
- frontmatter 规范化（保留，需支持新字段）
- 健康度检查（保留，作为最终质量门禁）
- 源码同步（移除，已由 transform 处理）
- 需求澄清问答（移除，已由 CLARIFY 协议处理）

## 源码映射配置

### 映射表结构

存放位置：`config.json` 的 `repo_profiles` 字段

```json
{
  "repo_profiles": {
    "岚图": {
      "repos": [
        { "path": ".repos/CustomItem/dt-center-assets", "branch": "release_6.3.x_ltqc" },
        { "path": ".repos/CustomItem/dt-insight-studio", "branch": "dataAssets/release_6.3.x_ltqc" }
      ]
    },
    "标准版": {
      "repos": [
        { "path": ".repos/dt-center-assets", "branch": "dev" }
      ]
    }
  }
}
```

### 匹配规则

1. 从 PRD 标题/蓝湖项目路径中提取关键词（如"岚图"）
2. 与 `repo_profiles` 的 key 做模糊匹配
3. 匹配成功 → 命中项作为默认选中
4. 匹配失败 → 回退询问用户

### CLI 覆盖

```
生成测试用例 https://lanhuapp.com/xxx
--repos dt-center-assets:release_6.3.x_ltqc,dt-insight-studio:dataAssets/release_6.3.x_ltqc
```

### 确认清单交互

在正式开始 transform 分析前，主 agent 向用户展示确认清单：

```
📋 源码配置确认

  命中映射规则：岚图
  
  仓库 1:
    ● .repos/CustomItem/dt-center-assets @ release_6.3.x_ltqc（映射表默认）
    ○ 自行输入仓库路径和分支
  
  仓库 2:
    ● .repos/CustomItem/dt-insight-studio @ dataAssets/release_6.3.x_ltqc（映射表默认）
    ○ 自行输入仓库路径和分支
  
  ○ 添加更多仓库
  ○ 不使用源码参考

确认后将拉取最新代码。
```

用户确认后：
1. 对每个仓库执行 `git fetch && git checkout <branch> && git pull`
2. 记录实际 commit SHA 到 PRD frontmatter
3. 开始 transform 分析

### 首次学习

用户通过"自行输入"提供了新的映射关系时，主 agent 询问：

> "是否将此配置保存到映射表？下次遇到「岚图」相关需求时自动使用。"

确认后写入 `config.json` 的 `repo_profiles`。

## 源码分析策略

### 自动检测源码状态

| 检测信号 | 判定 | 分析深度 |
|----------|------|---------|
| 前端路由配置中存在 PRD 提到的页面路径 | 已开发 | B: 深入业务逻辑层 |
| 分支存在但相关代码未找到或仅有骨架 | 开发中 | A: 参考已有类似模块推测 |
| 未配置源码仓库或分支不存在 | 无源码 | 仅蓝湖素材 + 归档用例 |

### A 级分析（路由 + API 接口层）

- 前端：路由配置、菜单定义、页面组件入口
- 后端：Controller 接口定义（URL、HTTP 方法、入参、出参）
- 标注所有推断内容为 `🟡 [推测: 基于同模块 xxx 页面推断]`

### B 级分析（深入业务逻辑层）

在 A 的基础上：
- 前端：表单校验规则、联动逻辑（useEffect/watch）、状态管理、权限判断
- 后端：Service 层业务规则、字段校验、状态流转、异常处理、权限配置
- 直接标注为 `🔵 [源码: 文件名:行号]`

## PRD 模板结构

### 第 1 部分：文档级元信息（frontmatter）

```yaml
---
source: lanhu
source_url: "https://lanhuapp.com/web/#/item/..."
fetch_date: "2026-04-05"
project: 岚图
version: "6.3"
requirement_id: 15525
requirement_name: "【内置规则丰富】一致性，多表数据一致性比对"
modules: [数据质量]
repo_profile: 岚图
repos:
  - path: .repos/CustomItem/dt-center-assets
    branch: release_6.3.x_ltqc
    commit: abc1234
  - path: .repos/CustomItem/dt-insight-studio
    branch: dataAssets/release_6.3.x_ltqc
    commit: def5678
confidence: 0.85
status: "已增强"
---
```

- `repo_profile` 和 `repos` 记录本次实际使用的源码引用
- `commit` 记录分析时的实际 commit SHA，可追溯
- `confidence` 表示自动填充的整体可信度

### 第 2 部分：需求概述

```markdown
# 需求名称

## 需求概述

| 项目 | 内容 |
|------|------|
| 开发版本 | 版本号 + 分支描述 |
| 需求背景 | 从蓝湖文字描述提取 |
| 影响模块 | 模块路径 |
| 导航路径 | 从前端路由代码提取，蓝湖补充 |
| 关联需求 | 同文档其他页面自动识别 |

### 信息来源标注

- 🟢 **蓝湖原文**：直接来自 PRD 描述
- 🔵 **源码推断**：从代码中提取，标注具体文件
- 🟡 **历史参考**：从归档用例中推断
- 🔴 **待确认**：三方均无法确定，需用户确认
```

四色标注贯穿整个文档。

### 第 3 部分：页面级结构（模板核心）

每个蓝湖页面转化为一个二级章节，内部固定 4 个子章节：

**3.1 字段定义**

```markdown
| 字段名 | 控件类型 | 必填 | 校验规则 | 默认值 | 来源 |
|--------|---------|------|---------|--------|------|
```

- 从蓝湖截图识别控件类型和字段名
- 从前端代码提取校验规则、必填判断
- 从后端代码交叉验证
- 覆盖健康度检查 W001

**3.2 交互逻辑**

编号列表，每条带来源标注：

```markdown
1. 🟢 选择"一致性校验"后展示子类型选项
2. 🔵 选择对比表后主键下拉自动加载字段列表 (`useFieldList`, `RuleForm.tsx:62`)
3. 🔴 校验字段是否支持跨类型对比？**待确认**
```

**3.3 状态/业务规则**

```markdown
- 🔵 提交时校验：所有必填非空 + SQL 语法合法 (`submitRule`, `RuleService.java:120`)
- 🟢 确定后返回列表页，新规则状态为"未启用"
```

覆盖健康度检查 W004。

**3.4 异常处理**

```markdown
| 场景 | 系统行为 | 来源 |
|------|---------|------|
| 对比表被删除 | 提示"表已被删除" | 🔵 `RuleService.java:135` |
| 主键类型不匹配 | 阻断提交 | 🔴 待确认 |
```

覆盖健康度检查 W003。

### 第 4 部分：跨页面关联 + 权限 + 数据格式

**4.1 跨页面关联**

```markdown
| 触发页面 | 操作 | 目标页面 | 联动效果 | 来源 |
|----------|------|----------|---------|------|
```

**4.2 权限说明**

```markdown
| 角色 | 操作1 | 操作2 | ... | 来源 |
|------|-------|-------|-----|------|
```

从后端权限配置代码提取。覆盖健康度检查 W002。

**4.3 数据格式**

```markdown
| 数据项 | 格式 | 示例 | 来源 |
|--------|------|------|------|
```

从蓝湖截图识别 + 前端格式化代码提取。覆盖健康度检查 W008。

### 第 5 部分：待确认项汇总 + 变更记录

**5.1 待确认项**

```markdown
| 编号 | 问题 | 位置 | 确认结果 | 确认时间 |
|------|------|------|---------|---------|
```

CLARIFY 协议处理完毕后自动维护。

**5.2 变更记录**

```markdown
| 版本 | 日期 | 变更内容 | 来源 |
|------|------|---------|------|
```

每个处理阶段（transform/CLARIFY/enhance）自动追加记录。

## CLARIFY 中转协议

### 触发条件

transform subagent 在分析过程中遇到三方（蓝湖/源码/归档）均无法确定的信息时，将待确认项收集到 CLARIFY 块中。

### 协议格式（subagent → 主 agent）

```markdown
## CLARIFY

### Q1
- **问题**: 校验字段是否支持跨表类型不一致的字段对比？
- **上下文**: 蓝湖未说明，源码中 `RuleService.java:95` 仅校验字段是否存在，未校验类型
- **位置**: 页面"多表数据一致性比对" → 字段定义 → 选择校验字段
- **推荐**: B
- **选项**:
  - A: 允许跨类型对比，系统自动做类型转换
  - B: 不允许，选择时过滤掉类型不一致的字段（源码倾向）
  - C: 允许但给出警告提示

### Q2
...
```

### 主 agent 处理流程

1. 解析 CLARIFY 块，提取所有 Q 项
2. 逐个向用户展示选择框（AskUserQuestion），包含：
   - 问题描述 + 上下文
   - 推荐答案（默认选中）
   - 备选答案
   - "自行输入"选项
3. 收集所有确认结果
4. 打包为 `## CONFIRMED` 块，重新派发给 subagent

### 确认结果格式（主 agent → subagent）

```markdown
## CONFIRMED

- Q1: B — 不允许，过滤掉类型不一致的字段
- Q2: A — 阻断提交，提示"主键类型不一致"
```

### 循环终止条件

- subagent 收到 CONFIRMED 后合入 PRD
- 如果合入过程产生新的待确认项 → 再次输出 CLARIFY → 循环
- 无新增待确认项 → 输出最终 PRD，transform 节点结束

## 关联变更（本次 scope 外，需后续处理）

1. `prd-frontmatter.ts` 需支持新字段：`repo_profile`、`repos`（含 commit）、`confidence`
2. `config.json` 需支持 `repo_profiles` 字段
3. `repo-sync.ts` 需支持按指定仓库+分支拉取（当前仅支持全量 clone）
4. archive MD 和 hotfix 用例的 frontmatter 统一优化
5. enhance 节点 prompt 需调整：移除需求澄清问答（由 CLARIFY 处理）、移除源码同步（由 transform 处理）
