# 测试目录与断言规范

适用场景：/ui-autotest、/test-case-gen

## 目录结构

- workspace/{project}/tests/cases/ 下每个 case 文件命名：t{NNN}-{desc}.ts
- features/{ym}-{slug}/tests/cases/ 下 case 与 feature 一一对应
- 禁止在 tests/ 根目录直接放 case 文件

## 断言分层（L1-L5）

- L1: 页面加载/元素存在性断言
- L2: 交互过程断言（点击、输入、切换）
- L3: 数据正确性断言（表格内容、表单值）
- L4: 跨页面/跨系统数据一致性断言
- L5: 性能/异常场景断言

## 禁用模式

- 不用 .toBeTruthy() 兜底空数组
- 不用 filter(Boolean) 绕过渲染异常
- 数值/文本断言必须与 PRD/用例一致
