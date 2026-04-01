# 合并冲突分析与输出格式规范

---

## 一、冲突解析步骤

### Step 1：识别冲突块结构

```
<<<<<<< HEAD                    ← 当前分支开始（你所在的分支）
  【当前分支代码块 A】
=======                         ← 分隔符
  【来源分支代码块 B】
>>>>>>> feature/your-branch     ← 来源分支结束
```

多个冲突块可能出现在同一文件中，需要逐块分析。

### Step 2：分析双方的修改意图

不要只看代码结构，要理解每一方**为什么要这样改**：
- 代码块 A 是为了实现什么功能？
- 代码块 B 是为了实现什么功能？
- 两者是否可以共存？是否有逻辑冲突？

### Step 3：判断冲突类型

| 冲突类型 | 特征 | 处理策略 |
|---------|------|---------|
| **安全合并型** | 双方修改了不同的代码段，只是行位置冲突 | 保留双方修改，手动合并 |
| **逻辑互斥型** | 双方对同一业务逻辑做了不同实现 | 需要与开发沟通，选择正确方案 |
| **重复修改型** | 双方做了相同的修改（内容一致但格式略有不同） | 取任意一方，检查是否完全等价 |
| **依赖版本冲突** | pom.xml / package.json 中同一依赖版本不同 | 分析两个版本的差异，选择兼容版本 |
| **格式/注释冲突** | 仅空格、换行、注释不同，无逻辑差异 | 取代码更规范的一方 |

---

## 二、输出格式规范（HTML · 富文本编辑器通用）

所有冲突报告输出为 HTML 片段，使用内联样式，粘贴进支持 HTML 的富文本编辑器后格式应完整保留。

每个冲突块按以下 HTML 格式输出：

```html
<!-- ===== 冲突块 N ===== -->
<h3 style="font-size:15px;font-weight:bold;color:#2c3e50;margin:16px 0 10px 0;padding-left:10px;border-left:4px solid #e67e22;">
  冲突块 {N}：{文件路径}  第 {起始行}–{结束行} 行
</h3>

<table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:12px;">
  <tr>
    <td style="padding:8px 12px;background:#eaf4ff;border:1px solid #b8d9f5;font-weight:bold;width:140px;color:#2980b9;">当前分支 HEAD</td>
    <td style="padding:8px 12px;border:1px solid #b8d9f5;">{用一句话描述当前分支这段代码在做什么}</td>
  </tr>
  <tr>
    <td style="padding:8px 12px;background:#fff8e1;border:1px solid #ffe082;font-weight:bold;color:#e67e22;">来源分支 {分支名}</td>
    <td style="padding:8px 12px;border:1px solid #ffe082;">{用一句话描述来源分支这段代码在做什么}</td>
  </tr>
  <tr>
    <td style="padding:8px 12px;background:#f8f9fa;border:1px solid #dee2e6;font-weight:bold;color:#555;">冲突类型</td>
    <td style="padding:8px 12px;border:1px solid #dee2e6;">
      <span style="padding:2px 8px;border-radius:3px;font-size:13px;background:#e8f5e9;color:#2e7d32;font-weight:bold;">{安全合并型 / 逻辑互斥型 / 重复修改型 / 依赖版本冲突 / 格式注释冲突}</span>
    </td>
  </tr>
</table>

<p style="font-size:13px;font-weight:bold;color:#27ae60;margin:0 0 5px 0;">✅ 合并后代码（可直接替换冲突块）：</p>
<pre style="background:#f3fdf5;border:1px solid #c3e6cb;border-left:4px solid #27ae60;padding:12px 16px;border-radius:4px;font-family:'Courier New',monospace;font-size:13px;line-height:1.7;color:#333;margin:0 0 10px 0;white-space:pre-wrap;word-break:break-all;">{合并后的最终代码，去掉所有冲突标记}</pre>

<!-- 仅在有注意事项时添加此块 -->
<p style="padding:10px 14px;background:#fff8e1;border-left:4px solid #ffc107;border-radius:0 4px 4px 0;font-size:13px;color:#856404;margin:0 0 16px 0;">
  ⚠️ <strong>注意：</strong>{需要开发人员确认的事项}
</p>
```

---

## 三、完整冲突报告的 HTML 框架

当一个文件有多个冲突块时，用以下框架包裹：

```html
<!-- ===== 合并冲突分析报告 ===== -->
<h1 style="font-size:20px;font-weight:bold;color:#2c3e50;margin:0 0 8px 0;padding-bottom:10px;border-bottom:3px solid #e67e22;">🔀 合并冲突分析报告</h1>

<table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
  <tr>
    <td style="padding:7px 12px;background:#f8f9fa;border:1px solid #dee2e6;font-weight:bold;width:100px;color:#555;">冲突文件</td>
    <td style="padding:7px 12px;border:1px solid #dee2e6;"><code style="background:#f4f4f4;padding:2px 6px;border-radius:3px;font-family:monospace;font-size:12px;">{文件路径}</code></td>
  </tr>
  <tr>
    <td style="padding:7px 12px;background:#f8f9fa;border:1px solid #dee2e6;font-weight:bold;color:#555;">来源分支</td>
    <td style="padding:7px 12px;border:1px solid #dee2e6;"><code style="background:#f4f4f4;padding:2px 6px;border-radius:3px;font-family:monospace;font-size:12px;">{feature 分支名}</code></td>
  </tr>
  <tr>
    <td style="padding:7px 12px;background:#f8f9fa;border:1px solid #dee2e6;font-weight:bold;color:#555;">目标分支</td>
    <td style="padding:7px 12px;border:1px solid #dee2e6;"><code style="background:#f4f4f4;padding:2px 6px;border-radius:3px;font-family:monospace;font-size:12px;">{main / master / develop}</code></td>
  </tr>
  <tr>
    <td style="padding:7px 12px;background:#f8f9fa;border:1px solid #dee2e6;font-weight:bold;color:#555;">冲突块数</td>
    <td style="padding:7px 12px;border:1px solid #dee2e6;font-weight:bold;color:#e67e22;">{N} 个</td>
  </tr>
</table>

<hr style="border:none;border-top:1px solid #eee;margin:0 0 16px 0;" />

{逐块输出，每块使用上方「冲突块 N」HTML 模板}

<hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />

<!-- ===== 解决步骤总结 ===== -->
<h2 style="font-size:16px;font-weight:bold;color:#2c3e50;margin:0 0 12px 0;padding-left:10px;border-left:4px solid #27ae60;">📋 操作步骤总结</h2>
<ol style="font-size:14px;line-height:1.9;margin:0 0 20px 0;padding-left:20px;color:#333;">
  <li>打开文件 <code style="background:#f4f4f4;padding:2px 5px;border-radius:2px;font-family:monospace;font-size:12px;">{文件路径}</code></li>
  <li>找到第 {行号范围} 行的第一个冲突块（<code style="background:#f4f4f4;padding:1px 4px;font-family:monospace;font-size:12px;">&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code> 标记），用上方合并后代码替换整个冲突块</li>
  <li>{后续冲突块同理…}</li>
  <li>确认文件中不存在任何 <code style="background:#f4f4f4;padding:1px 4px;font-family:monospace;font-size:12px;">&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code>、<code style="background:#f4f4f4;padding:1px 4px;font-family:monospace;font-size:12px;">=======</code>、<code style="background:#f4f4f4;padding:1px 4px;font-family:monospace;font-size:12px;">&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code> 标记</li>
  <li>执行 <code style="background:#f4f4f4;padding:2px 5px;border-radius:2px;font-family:monospace;font-size:12px;">mvn compile</code> 确认编译通过</li>
  <li>执行相关单元测试，确认功能正常</li>
</ol>

<!-- 仅在存在需人工确认事项时添加 -->
<h2 style="font-size:16px;font-weight:bold;color:#2c3e50;margin:0 0 10px 0;padding-left:10px;border-left:4px solid #e74c3c;">⚠️ 需开发人员确认的事项</h2>
<ul style="font-size:14px;line-height:1.8;margin:0 0 20px 0;padding-left:20px;color:#333;">
  <li>☐ {需要开发判断的事项1}</li>
  <li>☐ {需要开发判断的事项2}</li>
</ul>

<hr style="border:none;border-top:1px solid #eee;margin:0 0 10px 0;" />
<p style="font-size:12px;color:#bbb;text-align:right;margin:0;">报告生成时间：{YYYY-MM-DD HH:mm} &nbsp;·&nbsp; Claude Code Bug Analysis Skill 自动生成</p>
```

依赖冲突不能简单「选一个」，需要分析版本影响，在冲突块的「注意」区块中用 HTML 表格说明：

```html
<p style="padding:10px 14px;background:#fff8e1;border-left:4px solid #ffc107;border-radius:0 4px 4px 0;font-size:13px;color:#856404;margin:0 0 12px 0;">
  ⚠️ <strong>依赖版本冲突说明：</strong>
</p>
<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:12px;">
  <tr style="background:#f8f9fa;">
    <th style="padding:7px 12px;border:1px solid #dee2e6;text-align:left;"> </th>
    <th style="padding:7px 12px;border:1px solid #dee2e6;text-align:left;">版本</th>
    <th style="padding:7px 12px;border:1px solid #dee2e6;text-align:left;">说明</th>
  </tr>
  <tr>
    <td style="padding:7px 12px;border:1px solid #dee2e6;font-weight:bold;color:#2980b9;">当前分支</td>
    <td style="padding:7px 12px;border:1px solid #dee2e6;"><code style="font-family:monospace;">1.2.83</code></td>
    <td style="padding:7px 12px;border:1px solid #dee2e6;">1.x 最终安全版本，存在历史 CVE</td>
  </tr>
  <tr>
    <td style="padding:7px 12px;border:1px solid #dee2e6;font-weight:bold;color:#e67e22;">来源分支</td>
    <td style="padding:7px 12px;border:1px solid #dee2e6;"><code style="font-family:monospace;">2.0.25</code></td>
    <td style="padding:7px 12px;border:1px solid #dee2e6;">2.x 重大重构版本，不完全向后兼容</td>
  </tr>
</table>
<p style="font-size:13px;color:#333;margin:0 0 6px 0;"><strong>建议：</strong>选择 2.0.25，合并后执行全量编译确认无错误。若项目中存在 fastjson 1.x 专有 API，需同步迁移。</p>
```

---

## 五、无法自动解决的冲突（逻辑互斥型，必须说明）

当冲突属于「逻辑互斥型」，AI 无法独立判断应保留哪方时，**不得随意选择一方**，在对应冲突块中输出：

```html
<p style="padding:12px 16px;background:#fdf3f3;border:1px solid #f5c6cb;border-left:4px solid #e74c3c;border-radius:0 4px 4px 0;font-size:14px;color:#333;margin:0 0 16px 0;line-height:1.8;">
  🚫 <strong>此冲突需要开发人员介入判断，无法自动合并</strong><br/>
  <strong>原因：</strong>双方对同一业务逻辑做了不同实现，自动合并可能引入业务错误。<br/>
  <strong>当前分支实现：</strong>{描述 A 的业务逻辑}<br/>
  <strong>来源分支实现：</strong>{描述 B 的业务逻辑}<br/>
  <strong>建议：</strong>请相关开发对齐，确认以哪个实现为准后告知，将输出最终合并代码。
</p>
```
