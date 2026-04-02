# qa-flow

QA 测试用例自动生成工具——支持 PRD / 蓝湖 URL 导入、历史归档转化与代码分析报告。

> **完整工作流手册**：[`CLAUDE.md`](CLAUDE.md)（唯一权威来源）  
> **首次使用**：输入 `/using-qa-flow init` 初始化环境  
> **查看功能**：输入 `/using-qa-flow` 打开功能菜单

---

## ⭐ 快速开始

```bash
# 最常用：生成测试用例
为 Story-20260322 生成测试用例

# 快速模式（跳过 Brainstorming / Checklist / 确认）
为 Story-20260322 --quick 生成测试用例
```

<details>
<summary>更多用法</summary>

```bash
# 蓝湖 URL 直接导入
生成测试用例 https://lanhuapp.com/web/#/item/project/product?tid=xxx&pid=xxx&docId=xxx

# 续传 / 模块重跑
继续 Story-20260322 的用例生成
重新生成 Story-20260322 的「列表页」模块用例

# 增强 PRD
帮我增强这个 PRD：<PRD文件路径>

# 分析报错 / 冲突
帮我分析这个报错（附报错日志 + curl）

# 线上问题转化（禅道 Bug 链接）
http://zenpms.dtstack.cn/zentao/bug-view-138845.html

# 转化历史用例
转化所有历史用例
```
</details>

---

## 目录结构

```text
qa-flow/
├── CLAUDE.md                      # 权威工作流手册（先读这里）
├── config/                        # DTStack repo/branch 映射
├── cases/
│   ├── xmind/                     # XMind 输出
│   ├── archive/                   # 归档 Markdown
│   ├── prds/                      # PRD / Story 文档
│   ├── issues/                    # 线上问题用例
│   └── history/                   # 历史 CSV 原始资料
├── reports/                       # 代码分析报告（bugs / conflicts）
├── assets/images/                 # 全局图片
├── tools/lanhu-mcp/               # 蓝湖 MCP 服务
└── .claude/
    ├── config.json                # 路径/模块/仓库唯一权威配置
    ├── rules/                     # 主题规则
    ├── shared/scripts/            # 共享工具脚本
    └── skills/                    # Skill 入口层
```

---

## 先读哪里

1. **`CLAUDE.md`** — 权威工作流手册、Skill 索引、快速开始（推荐先读）
2. **`.claude/config.json`** — 模块 / 仓库 / 路径唯一权威配置
3. **`.claude/rules/*.md`** — 主题细则（用例编写、XMind 输出、归档格式等）
