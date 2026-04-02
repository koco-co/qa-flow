# 图片引用规范

> 适用范围：本仓库所有 Markdown 文件中的图片引用。

## 存放位置

所有图片统一存放在 `assets/images/` 目录下，不在子目录中分散存储。

## 引用格式

使用**标准 Markdown 格式**，禁止使用 Obsidian 专有格式：

```markdown
# ✅ 正确

![语义化中文描述](../../assets/images/语义化文件名.png)

# ❌ 禁止

![[Pasted image 20260325151102.png]]
```

## 相对路径计算

根据 md 文件所在深度，计算到 `assets/images/` 的相对路径：

| 文件位置示例                     | 相对路径前缀                 |
| -------------------------------- | ---------------------------- |
| `cases/prds/YYYYMM/*.md`         | `../../../assets/images/`    |
| `cases/archive/YYYYMM/*.md`      | `../../../assets/images/`    |
| `cases/issues/*.md`              | `../../assets/images/`       |
| 根目录 `*.md`                    | `assets/images/`             |

## 文件命名规则

- 使用中文语义化名称，反映图片实际内容（如 `商品管理列表页.png`）
- 禁止使用时间戳、UUID、MD5 哈希等无意义名称
- 同功能多页面用 `-` 分隔：`商品管理-新增表单页.png`
- 同名文件追加 `-2`、`-3` 等后缀

## 图片预处理

读取图片前必须压缩超大图片（>2000px 时 AI 多模态可能跳过分析）：

```bash
for f in assets/images/*.png assets/images/*.jpg; do
  [ -f "$f" ] || continue
  w=$(sips -g pixelWidth "$f" | awk '/pixelWidth/{print $2}')
  h=$(sips -g pixelHeight "$f" | awk '/pixelHeight/{print $2}')
  if [ "$w" -gt 2000 ] || [ "$h" -gt 2000 ]; then
    sips -Z 2000 "$f"
  fi
done
```

## prd-enhancer 自动处理

执行 prd-enhancer 时自动完成：

1. 识别 Obsidian `![[]]` 格式并转换为标准 Markdown `![]()` 格式
2. 将散落在各处的图片移入 `assets/images/`
3. 重命名无意义文件名为语义化名称
4. 计算并填入正确的相对路径
