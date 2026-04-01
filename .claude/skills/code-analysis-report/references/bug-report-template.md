# Bug 报告模板（HTML 格式 · 富文本编辑器通用）

## 核心规范

- 纯 HTML 片段，**无** `<html>` / `<head>` / `<body>` 标签
- **全部内联 style**，禁止 `<style>` 块和 CSS 类名
- **严禁任何 Emoji**（🐛🔥💡🚀✨ 等）——部分富文本编辑器保存时可能失败，全部改用 `[BUG]`/`[!]`/`[x]`/`[v]` 或 `⚠️`/`×`/`✓`
- 代码块用 `<pre>` 标签，禁止 Markdown 围栏

---

## 严重程度颜色

| 级别 | 渐变色（用于顶部 header） | 标签背景色 |
|------|--------------------------|-----------|
| P0 致命 | `#c0392b, #96281b` | `#c0392b` |
| P1 严重 | `#e67e22, #ca6f1e` | `#e67e22` |
| P2 一般 | `#2980b9, #1a6fa0` | `#2980b9` |
| P3 轻微 | `#27ae60, #1e8449` | `#27ae60` |

---

## 完整 HTML 模板

将所有 `{占位符}` 替换为实际内容，保留全部标签和内联样式。

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; max-width: 960px; margin: 0 auto; padding: 24px; background-color: #f4f6f8; color: #1f2328; line-height: 1.6;">

<div style="background: linear-gradient(90deg, #7367f0 0%, #a17fe0 100%); padding: 35px 30px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(115, 103, 240, 0.2);">
    <div style="font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 8px; letter-spacing: 0.5px;">
      {Bug 一句话标题}
    </div>
    <div style="font-size: 14px; color: rgba(255, 255, 255, 0.9); font-family: 'Consolas', 'Monaco', monospace;">
      {异常类型} @ {ClassName}.java:{行号}
    </div>
  </div>

  <table style="width: 100%; border-collapse: separate; border-spacing: 24px 0; margin-left: -12px; margin-right: -12px; margin-bottom: 24px;">
    <tr style="vertical-align: top;">
      <td style="width: 50%; background-color: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); border: 1px solid #e1e4e8;">
        <h2 style="font-size: 15px; font-weight: 700; color: #1f2328; margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 1px solid #e1e4e8; display: flex; align-items: center;"> 基本信息</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 16px 8px 0; color: #656d76; width: 85px; vertical-align: top;">所属模块</td>
            <td style="padding: 8px 0; color: #1f2328; font-weight: 600;">{模块名称}</td>
          </tr>
          <tr>
            <td style="padding: 8px 16px 8px 0; color: #656d76; vertical-align: top;">接口路径</td>
            <td style="padding: 8px 0;">
              <code style="background-color: #ddf4ff; padding: 3px 8px; border-radius: 6px; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 13px; color: #0969da; border: 1px solid #b6e3ff;">{HTTP Method} {接口路径}</code>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 16px 8px 0; color: #656d76; vertical-align: top;">代码分支</td>
            <td style="padding: 8px 0;">
              <code style="background-color: #f6f8fa; padding: 3px 8px; border-radius: 6px; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 13px; color: #24292f; border: 1px solid #d0d7de;">{分支名}</code>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 16px 8px 0; color: #656d76; vertical-align: top;">相关 Commit</td>
            <td style="padding: 8px 0;">
              <code style="background-color: #f6f8fa; padding: 3px 8px; border-radius: 6px; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 13px; color: #24292f; border: 1px solid #d0d7de;">{commit hash 前8位}</code>
            </td>
          </tr>
        </table>
      </td>

      <td style="width: 50%; background-color: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); border: 1px solid #e1e4e8;">
        <h2 style="font-size: 15px; font-weight: 700; color: #1f2328; margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 1px solid #e1e4e8; display: flex; align-items: center;">环境与上下文</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 16px 8px 0; color: #656d76; width: 85px; vertical-align: top;">环境信息</td>
            <td style="padding: 8px 0;">
              <code style="background-color: #e8f0fe; color: #1a73e8; padding: 3px 8px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 13px; font-weight: 600;">{curl 中的完整 baseurl，如 https://qa.example.com}</code>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 16px 8px 0; color: #656d76; vertical-align: top;">租户信息</td>
              <td style="padding: 8px 0; color: #1f2328; font-weight: 600;">{从 Header / Cookie 提取，如 tenant-demo}</td>
          </tr>
          <tr>
            <td style="padding: 8px 16px 8px 0; color: #656d76; vertical-align: top;">项目信息</td>
              <td style="padding: 8px 0; color: #1f2328;">{从 URL 路径、Header 或请求体提取，如 project=mall-admin}</td>
          </tr>
          <tr>
            <td style="padding: 8px 16px 8px 0; color: #656d76; vertical-align: top;">问题类型</td>
            <td style="padding: 8px 0;">
              <span style="display: inline-block; background-color: #fff8c5; color: #9a6700; padding: 3px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;">{代码缺陷 / 环境配置问题 / 数据问题}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <div style="background-color: #ffffff; border-radius: 12px; padding: 28px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); border: 1px solid #e1e4e8;">
    <h2 style="font-size: 16px; font-weight: 700; color: #1f2328; margin: 0 0 20px 0; padding-bottom: 12px; border-bottom: 2px solid #ff9e64;">根本原因分析</h2>

    <div style="background-color: #fff9f0; border-left: 4px solid #ff9e64; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
      <p style="margin: 0 0 6px 0; font-size: 13px; color: #b45309; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">问题本质</p>
      <p style="margin: 0; color: #3d444d; font-size: 14px; line-height: 1.8;">{用自然语言叙述根本原因，要求非技术人员也能看懂。说清楚：什么条件下、哪个假设被违反了、为什么会崩}</p>
    </div>

    <h3 style="font-size: 14px; font-weight: 700; color: #1f2328; margin: 0 0 10px 0;">调用链路：</h3>
    <div style="background-color: #f6f8fa; border: 1px solid #d0d7de; padding: 16px 20px; border-radius: 8px; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 13px; line-height: 2; color: #24292f;">
      {方法A()} <span style="color: #656d76;">[第{行号}行]</span> → {方法B()} <span style="color: #656d76;">[第{行号}行]</span><br>
      &nbsp;&nbsp;→ {方法C()} <span style="color: #656d76;">[第{行号}行]</span> <span style="color: #d29922; font-weight: 600;">// 未做 {xxx} 判断</span><br>
      &nbsp;&nbsp;&nbsp;&nbsp;→ <span style="color: #cf222e; font-weight: 700; background-color: #ffebe9; padding: 2px 6px; border-radius: 4px;">{出错方法调用} [第{行号}行] → {异常类型}</span>
    </div>
  </div>

  <div style="background-color: #ffffff; border-radius: 12px; padding: 28px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); border: 1px solid #e1e4e8;">
    <h2 style="font-size: 16px; font-weight: 700; color: #1f2328; margin: 0 0 20px 0; padding-bottom: 12px; border-bottom: 2px solid #f7768e;"> 问题代码定位</h2>

    <table style="border-collapse: collapse; margin-bottom: 16px;">
      <tr>
        <td style="padding: 0 10px 0 0;">
          <span style="display: inline-block; background-color: #ffebe9; color: #cf222e; padding: 6px 14px; border-radius: 6px; font-size: 13px; border: 1px solid #ff818266;">文件：<strong>{相对路径}/{ClassName}.java</strong></span>
        </td>
        <td style="padding: 0 10px 0 0;">
          <span style="display: inline-block; background-color: #ffebe9; color: #cf222e; padding: 6px 14px; border-radius: 6px; font-size: 13px; border: 1px solid #ff818266;">方法：<strong>{methodName()}</strong></span>
        </td>
        <td>
          <span style="display: inline-block; background-color: #ffebe9; color: #cf222e; padding: 6px 14px; border-radius: 6px; font-size: 13px; border: 1px solid #ff818266;">出错行：<strong>第 {N} 行</strong></span>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 8px 0; color: #656d76; font-size: 13px;">{方法名}（第 {起始行}–{结束行} 行）— {说明这段代码存在的问题}：</p>
    <pre style="background-color: #1a1b26; color: #a9b1d6; padding: 20px; border-radius: 8px; font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace; font-size: 13px; line-height: 1.7; margin: 0; white-space: pre-wrap; word-break: break-all; border: 1px solid #292e42; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">{问题代码片段，出错行末尾加注释 <span style="color: #f7768e;">// &lt;-- 问题在这里</span>}</pre>
  </div>

  <div style="background-color: #ffffff; border-radius: 12px; padding: 28px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); border: 1px solid #e1e4e8;">
    <h2 style="font-size: 16px; font-weight: 700; color: #1f2328; margin: 0 0 20px 0; padding-bottom: 12px; border-bottom: 2px solid #7aa2f7;">代码对比：{有处理的方法} vs {缺少处理的方法}</h2>
    <table style="width: 100%; border-collapse: separate; border-spacing: 16px 0; margin-left: -8px; margin-right: -8px;">
      <tr style="vertical-align: top;">
        <td style="width: 50%; background-color: #dafbe1; border-radius: 8px; padding: 16px; border-left: 4px solid #2da44e;">
          <p style="margin: 0 0 12px 0; color: #1a7f37; font-size: 14px; font-weight: 700;"> {正确方法名} — 有 {xxx} 判断</p>
          <pre style="background-color: #ffffff; padding: 16px; border-radius: 6px; font-size: 12px; font-family: 'JetBrains Mono', monospace; line-height: 1.7; margin: 0; white-space: pre-wrap; word-break: break-all; border: 1px solid #4ac26b4d; color: #24292f;">{正确处理的代码}</pre>
        </td>
        <td style="width: 50%; background-color: #ffebe9; border-radius: 8px; padding: 16px; border-left: 4px solid #cf222e;">
          <p style="margin: 0 0 12px 0; color: #a40e26; font-size: 14px; font-weight: 700;">{问题方法名} — 缺少 {xxx} 判断</p>
          <pre style="background-color: #ffffff; padding: 16px; border-radius: 6px; font-size: 12px; font-family: 'JetBrains Mono', monospace; line-height: 1.7; margin: 0; white-space: pre-wrap; word-break: break-all; border: 1px solid #ff81824d; color: #24292f;">{有问题的代码}</pre>
        </td>
      </tr>
    </table>
  </div>

  <div style="background-color: #ffffff; border-radius: 12px; padding: 28px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); border: 1px solid #e1e4e8;">
    <h2 style="font-size: 16px; font-weight: 700; color: #1f2328; margin: 0 0 20px 0; padding-bottom: 12px; border-bottom: 2px solid #7aa2f7;"> 复现步骤</h2>

    <p style="font-size: 14px; font-weight: 700; color: #1f2328; margin: 0 0 8px 0;">原始请求：</p>
    <pre style="background-color: #1a1b26; color: #7aa2f7; padding: 20px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.6; margin: 0 0 20px 0; white-space: pre-wrap; word-break: break-all; border: 1px solid #292e42;">{curl 命令原样保留，不做任何脱敏处理}</pre>

    <p style="font-size: 14px; font-weight: 700; color: #1f2328; margin: 0 0 10px 0;">复现条件：</p>
    <ol style="font-size: 14px; line-height: 1.9; margin: 0 0 20px 0; padding-left: 24px; color: #3d444d;">
      <li>{步骤1}</li>
      <li>{步骤2}</li>
      <li>{步骤3，如：直接发送上述请求即可稳定触发}</li>
    </ol>

    <table style="width: 100%; border-collapse: separate; border-spacing: 16px 0; margin-left: -8px; margin-right: -8px;">
      <tr style="vertical-align: top;">
        <td style="width: 50%; background-color: #ffebe9; border-radius: 8px; padding: 16px 20px; border-left: 4px solid #cf222e; border: 1px solid #ff81824d;">
          <p style="margin: 0 0 6px 0; font-size: 13px; color: #a40e26; font-weight: 700; text-transform: uppercase;">实际结果</p>
          <p style="margin: 0; font-size: 14px; color: #24292f; font-family: 'JetBrains Mono', monospace;">{实际返回内容，如：HTTP 500，NPE 堆栈}</p>
        </td>
        <td style="width: 50%; background-color: #dafbe1; border-radius: 8px; padding: 16px 20px; border-left: 4px solid #2da44e; border: 1px solid #4ac26b4d;">
          <p style="margin: 0 0 6px 0; font-size: 13px; color: #1a7f37; font-weight: 700; text-transform: uppercase;">期望结果</p>
          <p style="margin: 0; font-size: 14px; color: #24292f; font-family: 'JetBrains Mono', monospace;">{应返回的内容，如：HTTP 200，正常返回业务数据}</p>
        </td>
      </tr>
    </table>
  </div>

  <div style="background-color: #ffffff; border-radius: 12px; padding: 28px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); border: 1px solid #e1e4e8;">
    <h2 style="font-size: 16px; font-weight: 700; color: #1f2328; margin: 0 0 20px 0; padding-bottom: 12px; border-bottom: 2px solid #d0d7de;"> 错误日志</h2>

    <p style="font-size: 14px; font-weight: 700; color: #cf222e; margin: 0 0 8px 0;">关键异常（定位重点）：</p>
    <pre style="background-color: #fff1f0; border: 1px solid #ffccc7; border-left: 4px solid #ff4d4f; padding: 16px 20px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.6; color: #cf1322; margin: 0 0 20px 0; white-space: pre-wrap; word-break: break-all;">{最根本的 Caused by 及第一个业务包名堆栈帧}</pre>

    <p style="font-size: 14px; font-weight: 700; color: #656d76; margin: 0 0 8px 0;">完整日志：</p>
    <pre style="background-color: #1a1b26; color: #a9b1d6; padding: 20px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.6; margin: 0; white-space: pre-wrap; word-break: break-all; border: 1px solid #292e42; max-height: 400px; overflow-y: auto;">{完整错误日志，保留全部 Caused by 链，不截断}</pre>
  </div>

  <div style="background-color: #ffffff; border-radius: 12px; padding: 28px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); border: 1px solid #e1e4e8;">
    <h2 style="font-size: 16px; font-weight: 700; color: #1f2328; margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 2px solid #9ece6a;"> 修复建议</h2>

    <div style="background-color: #f6f8fa; border: 1px dashed #d0d7de; border-radius: 8px; padding: 14px 20px; margin-bottom: 24px; display: flex; align-items: flex-start;">
      <span style="margin-right: 10px; font-size: 16px;">⚠️</span>
      <p style="margin: 0; font-size: 13px; color: #656d76; line-height: 1.6;">
        <strong style="color: #24292f;">以下为 AI 分析结果，仅供参考，请开发人员结合实际业务逻辑酌情判断后再实施修改。</strong><br>
        AI 可能无法感知所有上下文依赖，修改前请确认相关调用方与测试用例不受影响。
      </p>
    </div>

    <h3 style="font-size: 15px; font-weight: 700; color: #1a7f37; margin: 0 0 10px 0;">方案一：{方案名称}（推荐）</h3>
    <p style="font-size: 13px; color: #656d76; margin: 0 0 10px 0;">
      修改文件：<code style="background-color: #f6f8fa; padding: 3px 8px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #24292f; border: 1px solid #d0d7de;">{文件路径}</code>
    </p>
    <pre style="background-color: #1a1b26; color: #9ece6a; border-left: 4px solid #9ece6a; padding: 20px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.7; margin: 0 0 16px 0; white-space: pre-wrap; word-break: break-all; border-top: 1px solid #292e42; border-right: 1px solid #292e42; border-bottom: 1px solid #292e42;">{修复后的完整代码片段，含前后3-5行上下文，可直接粘贴替换}</pre>

    <h4 style="font-size: 14px; font-weight: 700; color: #1f2328; margin: 0 0 10px 0;">修改要点：</h4>
    <ul style="font-size: 14px; line-height: 1.9; margin: 0; padding-left: 24px; color: #3d444d;">
      <li>{修改点1：说明改了什么}</li>
      <li>{修改点2：说明为什么这样改能解决问题}</li>
      <li>{修改点3：是否有其他地方需同步修改}</li>
    </ul>
  </div>

  <div style="background-color: #ffffff; border-radius: 12px; padding: 28px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); border: 1px solid #e1e4e8;">
    <h2 style="font-size: 16px; font-weight: 700; color: #1f2328; margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 2px solid #bb86fc;">影响范围</h2>
    <ul style="font-size: 14px; line-height: 2; margin: 0; padding-left: 24px; color: #3d444d;">
      <li><input type="checkbox" disabled style="margin-right: 6px;"> <code style="background-color: #f6f8fa; padding: 2px 8px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 13px; border: 1px solid #d0d7de;">{其他可能存在相同问题的类/方法}</code>，建议同步检查</li>
      <li><input type="checkbox" disabled style="margin-right: 6px;"> {影响的业务场景，如：所有走 xxx 分支的流程均受影响}</li>
      <li><input type="checkbox" disabled style="margin-right: 6px;"> {数据影响说明，如：不涉及数据写入，不产生脏数据}</li>
    </ul>
  </div>

  <div style="background-color: #ffffff; border-radius: 12px; padding: 28px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); border: 1px solid #e1e4e8;">
    <h2 style="font-size: 16px; font-weight: 700; color: #1f2328; margin: 0 0 20px 0; padding-bottom: 12px; border-bottom: 2px solid #7aa2f7;"> 测试验证 </h2>

    <p style="font-size: 14px; font-weight: 700; color: #cf222e; margin: 0 0 8px 0;">① 复现场景验证（期望：不再报错）：</p>
    <pre style="background-color: #1a1b26; color: #a9b1d6; padding: 16px 20px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.6; margin: 0 0 20px 0; white-space: pre-wrap; word-break: break-all; border: 1px solid #292e42;">{使用触发问题数据的 curl 命令，原样保留}</pre>

    <p style="font-size: 14px; font-weight: 700; color: #1a7f37; margin: 0 0 8px 0;">② 正常场景回归（期望：行为与修复前一致）：</p>
    <pre style="background-color: #1a1b26; color: #a9b1d6; padding: 16px 20px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.6; margin: 0 0 20px 0; white-space: pre-wrap; word-break: break-all; border: 1px solid #292e42;">{正常场景的 curl 命令，原样保留}</pre>

    <table style="width: 100%; border-collapse: collapse; font-size: 14px; border-radius: 8px; overflow: hidden; border: 1px solid #d0d7de;">
      <thead>
        <tr style="background-color: #f6f8fa;">
          <th style="padding: 12px 16px; text-align: left; border-bottom: 1px solid #d0d7de; border-right: 1px solid #d0d7de; color: #24292f; font-weight: 600; width: 50%;">验证项</th>
          <th style="padding: 12px 16px; text-align: left; border-bottom: 1px solid #d0d7de; color: #24292f; font-weight: 600; width: 50%;">预期结果</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #d0d7de; border-right: 1px solid #d0d7de; color: #3d444d; background-color: #ffffff;">{验证场景1}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #d0d7de; color: #1a7f37; font-weight: 600; background-color: #ffffff;">{期望结果}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-right: 1px solid #d0d7de; color: #3d444d; background-color: #ffffff;">{验证场景2}</td>
          <td style="padding: 12px 16px; color: #1a7f37; font-weight: 600; background-color: #ffffff;">{期望结果}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <table style="width: 100%; border-collapse: collapse; background-color: transparent; padding: 16px 20px;">
    <tr>
      <td style="padding: 0;">
        <span style="font-size: 12px; color: #8c959f; font-family: 'JetBrains Mono', monospace;">Code Analysis Report &nbsp;·&nbsp; {分支名} &nbsp;·&nbsp; {YYYY-MM-DD HH:mm}</span>
      </td>
      <td style="padding: 0; text-align: right;">
        <span style="font-size: 12px; color: #8c959f; font-family: 'JetBrains Mono', monospace;">Generated by AI Analysis Engine</span>
      </td>
    </tr>
  </table>

</div>
```

---

## 严重程度渐变色速查

| 级别 | 渐变色起点 | 渐变色终点 |
|------|-----------|-----------|
| P0 致命 | `#c0392b` | `#96281b` |
| P1 严重 | `#e67e22` | `#ca6f1e` |
| P2 一般 | `#2980b9` | `#1a6fa0` |
| P3 轻微 | `#27ae60` | `#1e8449` |

---

## 区块使用说明

| 区块 | 是否必须 | 说明 |
|------|---------|------|
| 顶部 Banner | 必须 | 始终输出 |
| 基本信息 + 环境信息两列 | 必须 | 环境/租户无法提取时填 `[未提供，请补充]` |
| 根本原因分析 | 必须 | 核心，必须用自然语言叙述 |
| 问题代码定位 | 必须 | 代码问题时必须，环境问题时省略 |
| 代码对比 | 可选 | 存在明显「正确 vs 错误」对比时使用 |
| 复现步骤 | 必须 | 始终输出 |
| 完整错误日志 | 必须 | 始终输出 |
| 修复建议（含 AI 免责提示） | 必须 | 代码问题时必须；环境问题时改为「排查建议」，免责提示保留 |
| 影响范围 | 必须 | 不能为空，至少写「经检查无其他类似问题」 |
| 测试验证 | 必须 | 给出具体 curl 命令，禁止写「重新测试」 |
| 页脚 | 必须 | 始终输出 |

---

## 生成规则（必须遵守）

1. 所有样式用内联 style，绝对禁止 `<style>` 块
2. 严禁任何 Emoji（🐛🔥💡🚀✨ 等），全部用 `[BUG]`/`[!]`/`[x]`/`[v]` 或 `⚠️`/`×`/`✓` 替代
3. 根本原因「问题本质」必须用自然语言叙述，禁止复读堆栈
4. 问题代码出错行末尾加 `// <-- 问题在这里`（纯 ASCII 注释）
5. 修复代码必须可直接粘贴替换，含前后3-5行上下文
6. 修复建议区块开头必须保留 AI 免责提示，不得删除
7. token/密码等敏感信息统一替换为 `***`
8. 环境信息和租户信息必须填写，无法提取时填 `[未提供，请补充]`

---

## 前端报错分析报告模板（模式C）

使用与后端 Bug 报告相同的内联 CSS 样式和整体布局，替换以下字段以适配前端错误上下文。

```html
<!-- 前端报错分析报告模板 -->
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; max-width: 960px; margin: 0 auto; padding: 24px; background-color: #f4f6f8; color: #1f2328; line-height: 1.6;">

<div style="background: linear-gradient(90deg, #f7768e 0%, #e0af68 100%); padding: 35px 30px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(247, 118, 142, 0.2);">
  <div style="font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 8px; letter-spacing: 0.5px;">
    {前端报错一句话标题}
  </div>
  <div style="font-size: 14px; color: rgba(255, 255, 255, 0.9); font-family: 'Consolas', 'Monaco', monospace;">
    {错误类型} @ {ComponentName}.{jsx|tsx|vue}:{行号}
  </div>
</div>

<table style="width: 100%; border-collapse: separate; border-spacing: 24px 0; margin-left: -12px; margin-right: -12px; margin-bottom: 24px;">
  <tr style="vertical-align: top;">
    <td style="width: 50%; background-color: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); border: 1px solid #e1e4e8;">
      <h2 style="font-size: 15px; font-weight: 700; color: #1f2328; margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 1px solid #e1e4e8;">基本信息</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 8px 16px 8px 0; color: #656d76; width: 85px; vertical-align: top;">错误类型</td>
          <td style="padding: 8px 0; color: #1f2328; font-weight: 600;">{{error_type}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 16px 8px 0; color: #656d76; vertical-align: top;">框架</td>
          <td style="padding: 8px 0;">
            <code style="background-color: #ddf4ff; padding: 3px 8px; border-radius: 6px; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 13px; color: #0969da; border: 1px solid #b6e3ff;">{{framework}}</code>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 16px 8px 0; color: #656d76; vertical-align: top;">组件路径</td>
          <td style="padding: 8px 0;">
            <code style="background-color: #f6f8fa; padding: 3px 8px; border-radius: 6px; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 13px; color: #24292f; border: 1px solid #d0d7de;">{{component_path}}</code>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 16px 8px 0; color: #656d76; vertical-align: top;">代码分支</td>
          <td style="padding: 8px 0;">
            <code style="background-color: #f6f8fa; padding: 3px 8px; border-radius: 6px; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 13px; color: #24292f; border: 1px solid #d0d7de;">{分支名}</code>
          </td>
        </tr>
      </table>
    </td>

    <td style="width: 50%; background-color: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); border: 1px solid #e1e4e8;">
      <h2 style="font-size: 15px; font-weight: 700; color: #1f2328; margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 1px solid #e1e4e8;">环境与上下文</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 8px 16px 8px 0; color: #656d76; width: 85px; vertical-align: top;">浏览器/环境</td>
          <td style="padding: 8px 0; color: #1f2328; font-weight: 600;">{{browser_env}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 16px 8px 0; color: #656d76; vertical-align: top;">框架版本</td>
          <td style="padding: 8px 0; color: #1f2328;">{{framework_version}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 16px 8px 0; color: #656d76; vertical-align: top;">Node 版本</td>
          <td style="padding: 8px 0; color: #1f2328;">{{node_version}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 16px 8px 0; color: #656d76; vertical-align: top;">问题类型</td>
          <td style="padding: 8px 0;">
            <span style="display: inline-block; background-color: #fff8c5; color: #9a6700; padding: 3px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;">{代码缺陷 / 环境配置问题 / 框架兼容问题}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<div style="background-color: #ffffff; border-radius: 12px; padding: 28px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); border: 1px solid #e1e4e8;">
  <h2 style="font-size: 16px; font-weight: 700; color: #1f2328; margin: 0 0 20px 0; padding-bottom: 12px; border-bottom: 2px solid #ff9e64;">根本原因分析</h2>
  <div style="background-color: #fff9f0; border-left: 4px solid #ff9e64; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
    <p style="margin: 0 0 6px 0; font-size: 13px; color: #b45309; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">问题本质</p>
    <p style="margin: 0; color: #3d444d; font-size: 14px; line-height: 1.8;">{{root_cause_analysis}}</p>
  </div>
  <h3 style="font-size: 14px; font-weight: 700; color: #1f2328; margin: 0 0 10px 0;">组件堆栈：</h3>
  <pre style="background-color: #f6f8fa; border: 1px solid #d0d7de; padding: 16px 20px; border-radius: 8px; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 13px; line-height: 2; color: #24292f;">{{component_stack}}</pre>
</div>

<div style="background-color: #ffffff; border-radius: 12px; padding: 28px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); border: 1px solid #e1e4e8;">
  <h2 style="font-size: 16px; font-weight: 700; color: #1f2328; margin: 0 0 20px 0; padding-bottom: 12px; border-bottom: 2px solid #9ece6a;">修复建议</h2>
  <div style="background-color: #f6f8fa; border: 1px dashed #d0d7de; border-radius: 8px; padding: 14px 20px; margin-bottom: 24px;">
    <span style="margin-right: 10px; font-size: 16px;">⚠️</span>
    <p style="margin: 0; font-size: 13px; color: #656d76; line-height: 1.6; display: inline;">
      <strong style="color: #24292f;">以下为 AI 分析结果，仅供参考，请开发人员结合实际业务逻辑酌情判断后再实施修改。</strong>
    </p>
  </div>
  <p style="font-size: 14px; color: #3d444d; line-height: 1.8;">{{fix_suggestions}}</p>
</div>

<table style="width: 100%; border-collapse: collapse; background-color: transparent; padding: 16px 20px;">
  <tr>
    <td style="padding: 0;">
      <span style="font-size: 12px; color: #8c959f; font-family: 'JetBrains Mono', monospace;">Frontend Error Report &nbsp;·&nbsp; {分支名} &nbsp;·&nbsp; {YYYY-MM-DD HH:mm}</span>
    </td>
    <td style="padding: 0; text-align: right;">
      <span style="font-size: 12px; color: #8c959f; font-family: 'JetBrains Mono', monospace;">Generated by AI Analysis Engine</span>
    </td>
  </tr>
</table>

</div>
```

### 前端报告区块使用说明

| 区块 | 是否必须 | 说明 |
|------|---------|------|
| 顶部 Banner | 必须 | 使用前端报错专用渐变色（红橙色） |
| 基本信息 + 环境信息两列 | 必须 | 无法从报错提取时填 `[未提供，请补充]` |
| 根本原因分析 | 必须 | 用组件堆栈替代 Java 堆栈 |
| 修复建议（含 AI 免责提示） | 必须 | 必须保留免责提示 |
| 页脚 | 必须 | 始终输出 |
