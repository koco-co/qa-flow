# {{project}} 项目级规则

本目录下的规则覆盖全局 `rules/`。优先级：用户当前指令 > 项目级 rules > 全局 rules > skill 内置。

## 如何添加项目级规则

1. 从仓库根目录 `rules/` 拷贝需要覆盖的 `.md` 文件到本目录
2. 修改该文件即可（保留 frontmatter 若有）
3. 规则加载由以下命令完成：
   `kata-cli rule-loader load --project {{project}}`

## 常见场景

- 覆盖用例编写规范：拷贝 `rules/case-writing.md` 到本目录修改
- 覆盖 XMind 结构约束：拷贝 `rules/xmind-structure.md` 到本目录修改
- 仅项目独有规则：直接新建 `.md` 文件（如 `hotfix-frontmatter.md`）
