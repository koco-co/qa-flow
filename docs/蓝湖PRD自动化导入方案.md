# 蓝湖 PRD 自动化导入方案

> 目标：将蓝湖设计网站的 PRD/原型 URL 直接转换为本地 Markdown 需求文档，  
> 省去手动 copy 内容的步骤，无缝衔接现有 test-case-generator 工作流。

---

## 1. 现状与痛点

目前工作流的起点是本地 Markdown 文件：

```
蓝湖 URL → [手动复制粘贴] → 本地 PRD-xx.md → prd-enhancer → test-case-generator → XMind
```

手动这一步带来的问题：
- 内容复制不完整（截图无法复制，格式错乱）
- 重复劳动，每次有新 PRD 都要人工处理
- 截图需要额外截取并保存到 `images/`

---

## 2. 解决方案：lanhu-mcp

**项目地址**：https://github.com/dsphper/lanhu-mcp  
**Star 数**：785⭐（持续活跃维护）  
**定位**：专为 AI 工具（Claude、Cursor 等）与蓝湖平台打通设计的 MCP Server。

### 2.1 方案架构

```
蓝湖 URL（用户提供）
        ↓
GitHub Copilot CLI
        ↓  调用 MCP Tool
lanhu-mcp Server（本地运行，localhost:8000）
        ↓  Cookie 鉴权
蓝湖 API + Playwright 浏览器渲染
        ↓
原型页面文本 + 设计截图（多模态）
        ↓  Claude 分析整理
本地 MD 需求文档（PRD-xx-xxx.md）
        ↓
prd-enhancer → test-case-generator → XMind
```

### 2.2 目标效果

配置完成后，只需在 Copilot CLI 输入：

```
帮我用 mcp 看看这个需求文档：
https://lanhuapp.com/web/#/item/project/product?tid=xxx&pid=xxx&docId=xxx

以测试视角分析，生成标准 PRD 格式 MD 文件，
保存到 cases/requirements/xyzh/Story-20260322/
```

AI 自动完成：页面遍历 → 内容提取 → 图片保存 → 整理为标准 MD 格式。

---

## 3. lanhu-mcp 可用工具

| 工具名 | 功能 | 用途 |
|--------|------|------|
| `lanhu_resolve_invite_link` | 解析邀请链接 / 分享链接 | 处理蓝湖分享的短链 |
| `lanhu_get_pages` | 获取原型文档所有页面列表 | 了解 PRD 有哪些页面 |
| `lanhu_get_ai_analyze_page_result` | **分析原型页面内容** | 提取需求文字、字段规则、交互逻辑 |
| `lanhu_get_designs` | 获取 UI 设计稿列表 | 查看设计图 |
| `lanhu_get_ai_analyze_design_result` | 分析 UI 设计图 | 提取尺寸/颜色/字段等设计参数 |
| `lanhu_get_design_slices` | 获取切图信息 | 下载图标素材 |

> **测试视角模式**：`lanhu_get_ai_analyze_page_result` 支持 `role=Tester` 参数，  
> 直接输出测试场景、边界值、字段校验规则，可直接喂给 test-case-generator。

---

## 4. 环境要求

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| Python | 3.10+ | lanhu-mcp 运行时 |
| Playwright | 自动安装 | 浏览器渲染引擎 |
| GitHub Copilot CLI | 任意版本 | 已通过 `/mcp` 命令支持 MCP |
| 网络 | 能访问 lanhuapp.com | 服务运行在本地，需要出口网络 |

---

## 5. 安装与配置（一次性，约 15 分钟）

### Step 1：安装 lanhu-mcp

```bash
# 当前仓库已内置 vendor/lanhu-mcp，无需额外 clone
cd vendor/lanhu-mcp

# 一键安装（自动安装 Python 依赖 + Playwright 浏览器）
bash easy-install.sh
```

> 如果 `easy-install.sh` 不可用，手动安装：
> ```bash
> pip install -r requirements.txt
> playwright install chromium
> ```

### Step 2：配置蓝湖 Cookie（鉴权）

蓝湖没有公开 API Token，鉴权方式是浏览器 Cookie。

**获取步骤（约 2 分钟）：**

```
1. 用 Chrome/Edge 登录 https://lanhuapp.com
2. 打开 F12 DevTools → Network 标签
3. 刷新页面，点击第一个网络请求
4. 在 Request Headers 中找到 Cookie 字段
5. 复制完整的 Cookie 值（一长串）
```

**写入配置文件：**

```bash
# 在 vendor/lanhu-mcp 目录下创建 .env 文件
cat > vendor/lanhu-mcp/.env << 'EOF'
LANHU_COOKIE=你复制的完整Cookie值
SERVER_HOST=127.0.0.1
SERVER_PORT=8000
EOF
```

> ⚠️ **Cookie 有效期约 1~2 周**，过期后需重新复制。  
> 过期的表现：请求返回 401 或蓝湖弹出登录框。

### Step 3：启动 MCP Server

```bash
cd .claude/scripts
node lanhu-mcp-runtime.mjs start
# 看到输出中的 serverUrl / mcpUrl 即表示启动命令已发出
```

**设置自动启动（可选）：**

```bash
# macOS 开机自启（launchd）
# 或者更简单：每次进入项目后执行
cd .claude/scripts && node lanhu-mcp-runtime.mjs start
```

### Step 4：在 Copilot CLI 中接入 MCP

**方式一：使用 `/mcp add` 命令（推荐，交互式）**

```
在 Copilot CLI 会话中输入：
/mcp add

填写：
  Name: lanhu
  URL:  http://localhost:8000/mcp?role=Tester&name=YourName
```

**方式二：直接编辑配置文件**

```bash
# 配置文件位置
~/.copilot/mcp-config.json

# 添加以下内容
{
  "mcpServers": {
    "lanhu": {
      "url": "http://localhost:8000/mcp?role=Tester&name=YourName"
    }
  }
}
```

> `role=Tester`：以测试视角分析，输出测试场景 + 用例 + 边界值。  
> `name=YourName`：替换为自己的名字（用于协作追踪，个人使用随意填）。

---

## 6. 使用指南

### 6.1 基础使用：提取需求 → 保存 MD

```
帮我用 mcp 看看这个需求文档：
https://lanhuapp.com/web/#/item/project/product?tid=xxx&pid=xxx&docId=xxx

分析完成后，按照 PRD 模板格式整理成 Markdown 文件，
命名为 PRD-31-xxx-xxx.md，
保存到 cases/requirements/xyzh/Story-YYYYMMDD/
```

### 6.2 高级使用：提取 + 直接生成测试用例（一步完成）

```
帮我用 mcp 读取这个蓝湖 PRD：
https://lanhuapp.com/web/#/item/project/product?tid=xxx&pid=xxx&docId=xxx

以测试视角分析，直接为这个 PRD 生成测试用例，
保存到 cases/xmind/custom/xyzh/ 下
```

### 6.3 验证安装是否成功

```
# 用一个真实的蓝湖 URL 测试
帮我用 mcp 列出这个蓝湖文档的所有页面：
https://lanhuapp.com/web/#/item/project/product?tid=xxx&pid=xxx&docId=xxx
```

---

## 7. 局限性说明

| 问题 | 影响程度 | 说明 |
|------|---------|------|
| **仅支持 Axure 原型** | ⚠️ 中 | 蓝湖中的 PRD 如果是 Axure 上传的原型，完全支持。如果是「超级文档」（纯富文本编辑器写的），支持有限（能读文字，无法读图） |
| **Cookie 过期** | ✅ 低 | 约 1~2 周更新一次，2 分钟操作，成本远低于每次手动复制 PRD |
| **Server 需保持运行** | ✅ 低 | 使用前确认服务在跑，或设为开机自启 |
| **网络依赖** | ✅ 低 | 需要能访问 lanhuapp.com（内网环境可能有限制） |
| **蓝湖 DOM 结构变更** | ⚠️ 中 | lanhu-mcp 项目活跃维护，遇到变更通常很快修复 |

---

## 8. 与现有工作流的集成

### 当前工作流（人工起点）

```
[手动] 蓝湖 PRD → 本地 MD 文件
    → prd-enhancer（Step 2）
    → test-case-generator（Steps 3-10）
    → XMind + cases/archive MD
```

### 集成后的工作流（全自动）

```
[一句话] 蓝湖 URL
    → lanhu-mcp（MCP Tool）→ 本地 MD 文件（自动保存）
    → prd-enhancer（Step 2）
    → test-case-generator（Steps 3-10）
    → XMind + cases/archive MD
```

可以进一步封装：在 `test-case-generator` skill 中，如果用户提供的是蓝湖 URL 而非本地文件路径，自动触发 lanhu-mcp 提取步骤，无需用户额外操作。

---

## 9. 实施计划

| 阶段 | 任务 | 预计耗时 |
|------|------|---------|
| **Phase 1：安装验证** | 安装 lanhu-mcp，配置 Cookie，启动服务，基础功能验证 | 30 分钟 |
| **Phase 2：接入 Copilot** | `/mcp add` 配置，测试一个真实蓝湖 URL 提取 | 15 分钟 |
| **Phase 3：流程对接** | 验证提取结果 → prd-enhancer → test-case-generator 全链路 | 1 次完整测试 |
| **Phase 4（可选）：封装 Skill** | 在 test-case-generator 中支持蓝湖 URL 作为直接输入 | 1~2 小时 |

---

## 10. 决策建议

**建议先做 Phase 1+2**（约 45 分钟）：

1. 验证 lanhu-mcp 能否成功读取你的蓝湖 PRD
2. 确认输出质量能否满足 PRD 模板要求

如果验证通过，再做 Phase 3 全链路接入。Phase 4 是锦上添花，可按需决定。

**风险点**：产品给出的蓝湖 PRD 是 Axure 原型还是超级文档？  
如果是超级文档（富文本编辑器直接写的），需要额外评估 lanhu-mcp 的支持效果。

---

*文档创建时间：2026-03-26*  
*参考项目：https://github.com/dsphper/lanhu-mcp*

---

## 11. 安装验证记录

### 环境状态（2026-03-28，全部完成 ✅）

| 组件 | 状态 | 说明 |
|------|------|------|
| lanhu-mcp 子项目 | ✅ 完成 | `vendor/lanhu-mcp/` |
| uv 虚拟环境 | ✅ 完成 | `vendor/lanhu-mcp/.venv`（Python 3.14） |
| Playwright Chromium | ✅ 完成 | 已安装，实现自动 Cookie 刷新 |
| MCP Server 启动 | ✅ 完成 | `http://127.0.0.1:8000/mcp`，11 个工具加载成功 |
| Copilot CLI MCP 配置 | ✅ 完成 | `~/.copilot/mcp-config.json` 已写入 |
| 蓝湖 Cookie | ✅ 完成 | 通过 `refresh-lanhu-cookie.py` 写入 `vendor/lanhu-mcp/.env` |
| 项目权限 | ✅ 完成 | `user_in_project: true`，API 返回 HTTP 200 |
| `lanhu_get_pages` | ✅ 完成 | 返回 12 页，结构完整 |
| `lanhu_get_ai_analyze_page_result` | ✅ 完成 | 提取页面文本内容，适合 tester 分析 |
| test-case-generator 集成 | ✅ 完成 | SKILL.md Step 1.0 已加入蓝湖 URL 检测逻辑 |

### 重启 MCP Server 命令

```bash
cd .claude/scripts && node lanhu-mcp-runtime.mjs start
```

### Cookie 自动刷新（Playwright）

Cookie 约 1-2 周过期，过期时运行：

```bash
cd .claude/scripts && \
LANHU_LOGIN_EMAIL='<你的蓝湖账号>' \
LANHU_LOGIN_PASSWORD='<你的蓝湖密码>' \
python3 refresh-lanhu-cookie.py
```

### 当前已验证的蓝湖 PRD

- **数据资产 V6.4.10**：`pid=7de90493`，12 页，Axure 类型，`lanhu_get_pages` + `lanhu_get_ai_analyze_page_result` 均正常
