# qa-flow 快速开始

## 最常用功能

### 1. 生成测试用例

最常用的工作流。需要提供需求文档（PRD/Story）。

```bash
# 为指定需求生成完整用例（包含 XMind 和 Archive MD）
为 {{需求名称}} 生成测试用例

# 快速模式（跳过某些检查）
为 {{需求名称}} --quick 生成测试用例

# 从蓝湖 URL 直接导入
生成测试用例 https://lanhuapp.com/web/#/item/project/product?tid=xxx&pid=xxx&docId=xxx

# 续传或模块重跑
继续 {{需求名称}} 的用例生成
重新生成 {{需求名称}} 的【列表页】模块用例
```

### 2. 编辑 XMind 用例

无需读取 PRD，直接在现有 XMind 文件上修改或新增用例。

```bash
# 修改现有用例
修改用例 "验证导出仅导出当前筛选结果且文件命名符合规则"

# 新增用例到指定分组
新增用例 到 "规则列表页" 分组

# 更新步骤或预期
更新步骤 "【P0】验证列表页默认加载" 的第 2 步
```

### 3. 分析报错

直接粘贴错误日志、堆栈跟踪或禅道 Bug 链接。系统自动生成 HTML 分析报告。

```bash
# 直接粘贴报错日志
帮我分析这个报错
[粘贴完整错误日志]

# 粘贴禅道 Bug 链接（自动转化为线上问题用例）
{{ZENTAO_BASE_URL}}/zentao/bug-view-{{bug_id}}.html
```

### 4. 环境初始化

首次使用或配置变更时执行一次。

```bash
/qa-flow init
或
/setup
```

## 输入格式规范

| 类型     | 示例                                                  | 说明                                    |
| -------- | ----------------------------------------------------- | --------------------------------------- |
| 需求名称 | `商品管理需求`                                        | 需要在 `workspace/prds/` 中存在对应文件 |
| 蓝湖 URL | `https://lanhuapp.com/web/#/item/...`                 | 自动提取设计文档信息                    |
| 禅道 Bug | `{{ZENTAO_BASE_URL}}/zentao/bug-view-{{bug_id}}.html` | 自动爬取 Bug 信息生成用例               |
| 用例标题 | `验证导出仅导出当前筛选结果`                          | 精确匹配或模糊匹配均可                  |
| 文件路径 | `workspace/prds/YYYYMM/{{需求标题}}.md`               | 相对或绝对路径皆可                      |

## 常见问题

**Q: 如何指定需求文档生成用例？**

- 准备 PRD 文档（Markdown 格式）存放在 `workspace/prds/YYYYMM/` 目录
- 运行 `为 你的需求文档路径 生成测试用例`

**Q: 生成过程中断了，怎样继续？**

- 运行 `继续 <需求名称> 的用例生成`
- 系统会读取 `workspace/.temp/.qa-state-{需求名}.json` 的断点状态自动恢复

**Q: XMind 和 Archive MD 的区别？**

- **XMind**：可视化思维导图格式，便于阅读和编辑
- **Archive MD**：Markdown 格式，便于版本控制和文本搜索

**Q: 怎样修改已生成的用例？**

- 优先使用 `/xmind-editor`，无需读 PRD 即可修改
- 或者直接编辑 `workspace/archive/YYYYMM/` 中的 Markdown 文件

## 文件位置速查

| 产物类型     | 路径                        | 说明                     |
| ------------ | --------------------------- | ------------------------ |
| PRD 原始文件 | `workspace/prds/YYYYMM/`    | 输入：需求文档           |
| XMind 输出   | `workspace/xmind/YYYYMM/`   | 输出：思维导图           |
| Archive MD   | `workspace/archive/YYYYMM/` | 输出：归档 Markdown      |
| 历史原始资料 | `workspace/history/`        | 来自 CSV/JSON 的导入数据 |
| 线上问题用例 | `workspace/issues/`         | 禅道 Bug 转化的用例      |
| 分析报告     | `workspace/reports/`        | 报错分析 HTML 报告       |
| 图片库       | `workspace/images/`         | 需求文档中引用的截图     |

## 获取帮助

输入以下任一命令查看完整文档：

```bash
/qa-flow              # 显示本菜单
/qa-flow help         # 显示详细帮助
/setup                # 环境初始化和配置检查
```
