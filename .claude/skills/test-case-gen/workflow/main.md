# 编排步骤

> 共享协议（Task 可视化、Writer 阻断中转、产物契约等）见 [`protocols.md`](protocols.md)。

## 步骤 1: init

executor: direct
指令: .claude/skills/test-case-gen/workflow/step-1-init.md

## 步骤 2: probe

executor: subagent
agent: source-facts-agent
model: haiku
指令: .claude/skills/test-case-gen/workflow/step-2-probe.md
gate 后: gates/R1.md

## 步骤 3: discuss

executor: subagent
agent: writer-agent
model: sonnet
指令: .claude/skills/test-case-gen/workflow/step-3-discuss.md
gate 后: gates/R2.md

## 步骤 4: analyze

executor: subagent
agent: analyze-agent
model: sonnet
指令: .claude/skills/test-case-gen/workflow/step-4-analyze.md

## 步骤 5: write

executor: subagent
agent: writer-agent
model: sonnet
指令: .claude/skills/test-case-gen/workflow/step-5-write.md

## 步骤 6: review

executor: subagent
agent: reviewer-agent
model: opus
指令: .claude/skills/test-case-gen/workflow/step-6-review.md

## 步骤 7: format-check

executor: direct
指令: .claude/skills/test-case-gen/workflow/step-7-format-check.md

## 步骤 8: output

executor: direct
指令: .claude/skills/test-case-gen/workflow/step-8-output.md
gate 后: gates/R3.md
