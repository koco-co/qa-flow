# XMind 层级映射规范

> 本文件定义中间 JSON 到 XMind 文件的层级映射关系，供 `xmind-converter` 脚本使用。

---

## 1. 节点层级映射

| XMind 层级 | 来源字段 | 备注 |
|-----------|---------|------|
| Root | `meta.project_name` | 文件根节点标题 |
| L1 | `meta.requirement_name` | 有 trackerId：原始名称；无 trackerId：`【版本】需求名称` |
| L2 | `modules[].name` | 模块 / 菜单名称 |
| L3 | `modules[].pages[].name` | 页面名称 |
| L4（可选） | `modules[].pages[].sub_groups[].name` | 功能子组，无子组时跳过此层 |
| 用例节点 | `CaseObject.priority + CaseObject.title` | 格式：`【P0】验证xxx` |
| 步骤节点 | `StepObject.step` | 用例节点的子节点 |
| 预期节点 | `StepObject.expected` | 步骤节点的子节点 |

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

| 优先级 | XMind Marker |
|--------|-------------|
| P0 | `priority-1`（红色旗帜） |
| P1 | `priority-2`（橙色旗帜） |
| P2 | `priority-3`（蓝色旗帜） |

### 3.2 前置条件 Note

当 `CaseObject.preconditions` 非空时，将其写入用例节点的 `note` 属性：

```
note = "前置条件\n" + preconditions
```

---

## 4. 输出路径规则

### 4.1 标准路径

```
cases/xmind/YYYYMM/<功能名>.xmind
```

- `YYYYMM`：产物生成的年月（如 `202604`）
- `<功能名>`：来源于 `meta.requirement_name` 或 PRD 文件名 basename

### 4.2 配置了 trackerId 的模块路径

参考 `config.json` 中 `modules[].xmind` 字段指定的输出目录：

```
cases/xmind/YYYYMM/<功能名>.xmind
```

### 4.3 Story 聚合文件

仅在用户明确要求合并多个 PRD 时使用：

```
cases/xmind/YYYYMM/Story-YYYYMMDD.xmind
```

---

## 5. 写入模式

| 模式 | 触发条件 | 行为 |
|------|---------|------|
| `create` | 目标文件不存在 | 创建新 XMind 文件 |
| `append` | 目标文件存在，且 L1 节点未出现相同需求名 | 追加新 L1 节点到已有文件 |
| `replace` | 目标文件存在，且已有相同需求名的 L1 节点 | 替换对应 L1 节点下的内容 |

**追加模式说明**：不同 PRD 的用例通过各自的 L1 节点区分；跨 PRD 聚合时优先使用 Story 级文件名，不扩展旧式自定义文件名。

---

## 6. 输出确认

生成、追加或替换成功后，脚本在终端输出 XMind 文件的**绝对路径**，供用户直接访问：

```
✅ XMind 已生成：/Users/poco/Documents/DTStack/qa-flow/cases/xmind/202604/商品管理功能优化.xmind
```
