# 合并冲突分析规范

## 一、冲突解析步骤

1. **识别冲突块结构**：定位 `<<<<<<< HEAD`、`=======`、`>>>>>>>` 标记，确定每个冲突块的文件位置和行范围。

2. **分析双方意图**：理解两侧代码的业务含义，而不仅仅是语法差异。分析每一侧"为什么这样改"。

3. **分类冲突类型**，依次判断：
   - **安全合并**：两侧改动涉及不同代码段，仅因位置重叠产生冲突，可自动合并
   - **重复修改**：两侧对同一逻辑做了相同或近似改动，保留其中一个即可
   - **格式/注释冲突**：仅空格、换行或注释差异，可安全合并
   - **版本号冲突**：`pom.xml` / `package.json` 中的依赖版本号不一致，需评估兼容性
   - **逻辑互斥**：两侧实现了不同的业务逻辑，必须由开发者决定取哪一侧

## 二、冲突分类说明

| 分类 | 特征 | 处理方式 |
|------|------|---------|
| 安全合并 | 改动涉及不同代码区域 | 自动合并，标注「安全」 |
| 重复修改 | 相同逻辑的不同表达 | 保留语义更清晰的一侧 |
| 格式/注释冲突 | 仅空白字符或注释差异 | 取格式规范的一侧 |
| 版本号冲突 | 依赖版本不一致 | 说明两个版本特性，建议取高版本并验证 |
| 逻辑互斥 | 不同业务逻辑实现 | 展示两侧逻辑，标注需人工决策 |

## 三、JSON 输出 Schema

冲突分析完成后，输出以下 JSON 到 `reports/conflicts/{YYYY-MM-DD}/{description}.json`：

```json
{
  "CONFLICT_FILE": "src/service/OrderService.java（多文件时填「多文件，见下方详情」）",
  "SOURCE_BRANCH": "feature/order-refactor",
  "TARGET_BRANCH": "release/v2.1",
  "CONFLICT_COUNT": "3",
  "DATETIME": "2026-04-01 14:30",
  "OPERATION_STEPS": "<li>用建议代码替换第 1 处冲突块</li><li>确认第 2 处需人工判断后再合并</li><li>运行 mvn compile 验证编译通过</li>",
  "MANUAL_ITEMS": true,
  "MANUAL_ITEMS_LIST": "<li>第 2 处冲突（OrderService.java:142）：两侧业务逻辑不同，请开发者确认取哪一侧</li>",
  "BLOCKS": [
    {
      "BLOCK_NUMBER": "1",
      "FILE_PATH": "src/service/OrderService.java",
      "LINE_RANGE": "142–158",
      "HEAD_DESC": "当前分支：新增了 null 检查，防止 NPE",
      "SOURCE_DESC": "来源分支：重构了整个方法，使用 Optional 包装",
      "BRANCH_NAME": "feature/order-refactor",
      "CONFLICT_TYPE": "安全合并",
      "MERGED_CODE": "<pre style='background:#f3fdf5;border:1px solid #c3e6cb;border-left:4px solid #27ae60;padding:12px 16px;border-radius:4px;font-family:\"Courier New\",monospace;font-size:13px;line-height:1.7;color:#333;margin:0 0 10px 0;white-space:pre-wrap;word-break:break-all;'>建议合并后的完整代码</pre>"
    }
  ]
}
```

> `MANUAL_ITEMS` 为 `true` 时显示「需开发人员确认」区块。`BLOCKS` 数组每项对应一个冲突块，按文件顺序排列。

## 四、无法自动解决的冲突

当冲突类型为「逻辑互斥」时：
- `CONFLICT_TYPE` 填 `"逻辑互斥（需人工决策）"`
- `MERGED_CODE` 展示两侧代码对比，并在注释中说明各自业务含义
- `MANUAL_ITEMS` 设为 `true`，在 `MANUAL_ITEMS_LIST` 中明确说明需要开发者确认的内容
- 不要猜测或强行推荐一侧，直接告知无法自动决策

## 五、版本号冲突处理

当检测到 `pom.xml` 或 `package.json` 中版本号冲突时：
- 在 `MERGED_CODE` 中展示两个版本的对比说明表格
- 在 `HEAD_DESC`/`SOURCE_DESC` 中说明各自版本的特性或变更原因
- 在 `MANUAL_ITEMS_LIST` 中注明需要验证依赖兼容性
