# 前端报错分析流程（模式C）

适用场景：浏览器控制台错误、React / Vue / Next.js / TypeScript 编译错误、SSR / hydration 相关问题。

---

## Step 1：识别报错类型

| 报错特征关键词 | 判定 |
| --- | --- |
| `TypeError: Cannot read` / `ReferenceError` / `Uncaught Error` | JavaScript 运行时错误 |
| `Warning:` / `React.createElement` / `React Hook` / `at Object.<anonymous>` | React 框架错误 |
| `[Vue warn]` / `VueComponent` | Vue 框架错误 |
| `Error: Hydration failed` / `getServerSideProps` / `getStaticProps` | Next.js SSR 错误 |
| `error TS` / `Cannot find module`（无 Java 包名） | TypeScript 编译错误 |

---

## Step 2：仓库定位与分支确认（条件步骤）

仅在 `config.repos` 非空时执行：

1. 从错误堆栈中提取文件路径、组件名或别名路径。
2. 优先匹配 `config.stackTrace` 中的前端键（如 `@/components`、`react-app`、`vue-app`）。
3. 若未命中，再扫描 `.repos/` 下包含 `package.json` 的目录作为候选仓库。
4. 分支确认与同步口径：

**情况 1：用户已提供分支名**

```bash
cd <前端仓库绝对路径>
git fetch origin
git checkout <分支名>
git pull origin <分支名>
```

**情况 2：用户未提供分支名**

```bash
cd <前端仓库绝对路径>
git remote -v
git branch --show-current
git log --oneline -1
```

输出确认信息后，等待用户确认当前分支是否正确，再继续下一步。

若没有 `.repos/` 配置，则跳过源码定位，仅基于报错信息分析，并在报告中注明。

---

## Step 3：根因分析

至少从以下四个维度分析：

1. **组件层**：渲染错误、props 类型不匹配、state / store 管理异常
2. **数据层**：API 返回结构变更、空值未处理、类型转换失败
3. **环境层**：Node 版本不兼容、依赖版本冲突、构建配置错误
4. **框架层**：SSR / CSR hydration 不一致、路由配置错误、中间件异常

环境问题 vs 代码问题的细分判断，参照 `.claude/skills/code-analysis-report/references/env-vs-code-checklist.md` 第五章。

---

## Step 4：生成报告

1. 将分析结果写入 `reports/bugs/{YYYY-MM-DD}/{BugTitle}.json`。
2. 按 `.claude/skills/code-analysis-report/references/bug-report-template.md` 的前端 JSON Schema 填写字段。
3. 执行渲染：

```bash
node .claude/skills/code-analysis-report/scripts/render-report.mjs \
  .claude/skills/code-analysis-report/templates/bug-report-frontend.html \
  reports/bugs/{date}/{BugTitle}.json \
  reports/bugs/{date}/{BugTitle}.html
```

---

## 输出前核对清单

- [ ] 已明确报错类型（运行时 / 框架 / SSR / 编译）
- [ ] 若能定位源码，报告中记录了仓库 / 分支 / 组件路径
- [ ] 根因分析覆盖组件 / 数据 / 环境 / 框架至少两个维度
- [ ] 报告 JSON 字段与前端模板匹配
- [ ] 报告文件路径已在终端输出
