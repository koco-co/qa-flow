# XMind 层级映射规范

> 本文件定义中间 JSON / Archive MD 到 XMind 文件的层级映射关系，供 `xmind-converter` / `xmind-gen` 脚本使用。

<artifact_contract>
  <xmind_intermediate contract="A">
    <title>验证xxx</title>
    <priority>P1</priority>
  </xmind_intermediate>
  <archive_md contract="B">
    <display_title>【P1】验证xxx</display_title>
  </archive_md>
</artifact_contract>

---

## 1. 节点层级映射

| XMind 层级  | 来源字段                                                  | 备注                                                                           |
| ----------- | --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Root        | `frontmatter.root_name`（MD 输入且存在时）/ `meta.project_name` | `root_name` 存在时优先；否则按项目模板或 `meta.project_name` 回退               |
| L1          | `meta.requirement_name`                                   | 需求名称；`meta.requirement_id` 存在时写入 L1 labels                           |
| L2          | `modules[].name`                                          | 模块名称（如「数据质量」「数据安全」）                                         |
| L3          | `modules[].pages[].name`                                  | 菜单名称（如「json格式校验管理」，多级菜单用横杠连接）                         |
| L4（可选）  | `modules[].pages[].sub_groups[].name`                     | 功能点名称（如「新增key」「编辑key」），无子组时跳过                           |
| L5 用例节点 | `CaseObject.title`                                        | Contract A：节点标题保持 `验证xxx`；优先级通过 Marker / metadata 表达，不写 `【P1】` |
| 步骤节点    | `StepObject.step`                                         | L5 用例节点的子节点                                                            |
| 预期节点    | `StepObject.expected`                                     | 步骤节点的子节点                                                               |

### 1.1 Root 解析优先级

1. 输入为 Archive MD 且 frontmatter 存在 `root_name` 时，Root = `root_name`
2. 否则若中间 JSON 提供 `meta.version`，按项目级 `root_title_template` 生成 Root
3. 否则 Root = `meta.project_name`

---

## 2. L1 标题格式规则

```
有 trackerId 的模块：
  L1 标题 = meta.requirement_name
  L1 标题（有 requirement_ticket）= meta.requirement_name + "(#" + meta.requirement_ticket + ")"

无 trackerId 的模块：
  L1 标题 = "【" + meta.version + "】" + meta.requirement_name
  （无 version 时省略版本前缀）
```

**L1 labels**（当 `meta.requirement_id` 存在时）：

```
labels = ["#" + meta.requirement_id]
```

**L1 默认折叠**：`folded: true`

---

## 3. 用例节点附加信息

### 3.1 优先级 Marker

| 优先级 | XMind Marker             |
| ------ | ------------------------ |
| P0     | `priority-1`（红色旗帜） |
| P1     | `priority-2`（橙色旗帜） |
| P2     | `priority-3`（蓝色旗帜） |

### 3.2 前置条件 Note

当 `CaseObject.preconditions` 非空时，将其写入用例节点的 `note` 属性：

```
note = "前置条件\n" + preconditions
```

### 3.3 Archive MD / display 渲染

同一条用例在 Archive MD 或其他展示面中渲染为 `【P1】验证xxx`。
该前缀仅属于 Contract B，不写入 XMind 节点标题。

---

## 4. 输出路径规则

### 4.1 标准路径

```
 workspace/{{project}}/xmind/{{YYYYMM}}/<功能名>.xmind
```

- `YYYYMM`：产物生成的年月（如 `202604`）
- `<功能名>`：来源于 `meta.requirement_name` 或 PRD 文件名 basename

### 4.2 配置了 trackerId 的模块路径

参考 `bun run .claude/scripts/config.ts` 中 `modules[].xmind` 字段指定的输出目录：

```
 workspace/{{project}}/xmind/{{YYYYMM}}/<功能名>.xmind
```

### 4.3 归档 MD 路径

XMind 归档转换（`history-convert.ts`）时，从 L1 标题提取文件名和 case_id：

```
L1 标题格式: 【数据安全】数据表权限分配支持通配符(#10305)
                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^   ^^^^^
                     文件名 (保留【】)              case_id

输出路径: workspace/{{project}}/archive/{{YYYYMM}}/【数据安全】数据表权限分配支持通配符.md
```

- 文件名 = L1 标题去掉 `(#数字)` 后缀，**保留【】**
- `suite_name` = 完整 L1 标题（含 `(#xxx)`）
- `case_id` = 从 `(#数字)` 中提取的禅道需求 ID

### 4.4 需求聚合文件

仅在用户明确要求合并多个 PRD 时使用：

```
 workspace/{{project}}/xmind/{{YYYYMM}}/<需求名称>.xmind
```

---

## 5. 写入模式

| 模式      | 触发条件                                 | 行为                     |
| --------- | ---------------------------------------- | ------------------------ |
| `create`  | 目标文件不存在                           | 创建新 XMind 文件        |
| `append`  | 目标文件存在，且 L1 节点未出现相同需求名 | 追加新 L1 节点到已有文件 |
| `replace` | 目标文件存在，且已有相同需求名的 L1 节点 | 替换对应 L1 节点下的内容 |

**追加模式说明**：不同 PRD 的用例通过各自的 L1 节点区分；跨 PRD 聚合时优先使用 Story 级文件名，不扩展旧式自定义文件名。

---

## 6. 输出确认

生成、追加或替换成功后，脚本在终端输出 XMind 文件的**绝对路径**，供用户直接访问：

```
✅ XMind 已生成：{{project_root}}/workspace/{{project}}/xmind/{{YYYYMM}}/{{需求名称}}.xmind
```
