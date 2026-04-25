---
name: case-format
description:
  "测试用例格式中枢：XMind 编辑 / XMind↔Archive 双向同步 / 外部格式（XMind、CSV）标准化。触发词：
  - edit 模式：修改用例、编辑用例、新增用例、删除用例
  - reverse-sync 模式：同步 xmind、反向同步、同步 XMind 文件
  - other2md 模式：标准化归档、归档用例、转化用例、标准化 xmind、标准化 csv；直接传入 .xmind 或 .csv 文件路径亦自动进入此模式。"
argument-hint: "[edit | reverse-sync | other2md] [文件路径或关键词]"
---

<precedence>
用户当前指令 > 项目级 rules > 全局 rules > 本文件
</precedence>

<artifact_contract>
<xmind_intermediate contract="A">

<title>验证xxx</title>
<priority>P1</priority>
</xmind_intermediate>
<archive_md contract="B">
<display_title>【P1】验证xxx</display_title>
</archive_md>
</artifact_contract>

> 本 Skill 写入 XMind 时必须使用 Contract A：`case-json.title` 保持裸标题 `验证xxx`，`priority` 单独存储。
> 若用户提供的是 Archive MD / 展示标题 `【P1】验证xxx`，写入前必须先拆分为 `title=验证xxx` + `priority=P1`。

# case-format

## 模式路由

根据第一个参数 / 自然语言关键词 / 输入文件类型切模式：

| 模式           | 触发词 / 输入                                    | 工作流文件                 |
| -------------- | ------------------------------------------------ | -------------------------- |
| `edit`         | 修改用例、编辑用例、新增用例、删除用例           | `workflow/edit.md`         |
| `reverse-sync` | 同步 xmind、反向同步、XMind 文件 + Archive MD    | `workflow/reverse-sync.md` |
| `other2md`     | 标准化归档、归档用例、`.xmind` / `.csv` 文件路径 | `workflow/other2md.md`     |

确定模式后，Read 对应 workflow 文件并按其指引继续执行。

## 项目选择（所有模式共享）

扫描 `workspace/` 目录下的子目录（排除 `.` 开头的隐藏目录和 `.repos` 等）：

- 仅 1 个项目 → 自动选中
- 多个项目 → 列出供用户选择

## 共享约束

- 产出写入 `workspace/{project}/archive/{YYYYMM}/` 或 `workspace/{project}/xmind/{YYYYMM}/`
- 不改 Archive MD / XMind 的 A/B 产物契约
- 遵守 `rules/case-writing.md` 与 `rules/xmind-structure.md`
