# static-scan — Workflow

Pre-flight: see [skill-preamble.md](references/skill-preamble.md).

---

## Role

You are static-scan orchestration. You drive `kata-cli scan-report` (CRUD + render) and dispatch `static-scan-agent` (diff analysis).

## Inputs

- `--project <name>`（必填；可从粘贴的路径推断）
- `--repo <name>`（必填；`.repos/` 下的目录名）
- `--head-branch <ref>`（待测分支；默认提示用户输入）
- `--related-feature <ym-slug>`（可选；启用 PRD 上下文注入）

Base 分支不预设默认值——必须 AskUserQuestion 收集（典型为 release\_\*.x，但禁止假设）。

## Pre-guard

- 必填：`project`、`repo`、`head-branch`
- 仓库存在性：若 `workspace/{project}/.repos/{repo}` 不存在 → 提示先执行 `kata-cli repo-sync sync ...`，不自动同步
- Invalid：所有必填都缺 → 直接返回 invalid

## Workflow (S1–S6)

**S1 — 收集 base 分支**

调用 AskUserQuestion，把 `release_*.x` 分支作为候选；同时允许用户输入其它分支：

```
header: "选择基线分支"
question: "提测分支 {{head}} 应该与哪个基线分支做 diff？"
options:
  - { label: "release_6.3.x", description: "迭代分支" }
  - { label: "release_6.2.x", description: "迭代分支" }
  - { label: "其它（手动输入）", description: "..." }
```

**S2 — create**

```bash
kata-cli scan-report create \
  --project {{project}} --repo {{repo}} \
  --base-branch {{base}} --head-branch {{head}} \
  [--related-feature {{ym-slug}}]
```

记录返回的 `slug` 与 `yyyymm`。展示 diff 文件数 / 行数。

**S3 — 派发 static-scan-agent**

派发 subagent，prompt 内必含：

- `diff_path`：`workspace/{{project}}/audits/{{yyyymm}}-{{slug}}/diff.patch`
- `meta_path`：同目录下 `meta.json`
- `repo_path`：`workspace/{{project}}/.repos/{{repo}}`
- 若 related_feature 非空：`prd_path`：`workspace/{{project}}/features/{{related_feature}}/prd.md`

agent 返回 **JSON 数组**（可能为空 `[]`）。

**S4 — 逐条 add-bug**

对数组每个元素：

1. 写 `/tmp/scan-bug-{i}.json`
2. 执行：

```bash
kata-cli scan-report add-bug \
  --project {{project}} --yyyymm {{ym}} --slug {{slug}} \
  --json /tmp/scan-bug-{i}.json --auto-id --no-render
```

3. 退出码 ≠ 0：记录到本地丢弃日志，继续下一条
4. 全部入库后调用一次 `kata-cli scan-report render --project ... --yyyymm ... --slug ...`

**S5 — 完成 summary**

向用户展示：写入 N 条、丢弃 M 条、HTML 路径。

**S6 — 后续 CRUD（可选）**

提示用户可用的 CLI：

- `set-meta --field reviewer --value ...`
- `update-bug --bug-id b-003 --field root_cause --value "..."`
- `remove-bug --bug-id b-003`
- `show [--bug-id b-001]`
