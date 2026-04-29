# Archive 文件格式规范

适用场景：/case-format

## 必需字段（frontmatter）

- id: 全局唯一标识（featureId-seq）
- name: 用例名称（动词开头，中文）
- description: 简要描述用例场景
- layers: 所属断言层级 [L1, L2, L3, L4, L5]

## 字段约束

- id 格式：{feature-slug}-{3位数字}，如 data-validation-001
- name 不超过 50 字
- description 不超过 200 字
- layers 只能包含预定义的 5 个层级值

## 禁止

- 不写空的 description
- 不使用重复的 id
- 不跨 feature 引用 case
