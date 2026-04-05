# 蓝湖 PRD 导入插件

从蓝湖 URL 自动爬取需求页面内容、截图和设计稿，转化为 PRD Markdown。

## 功能

- 解析蓝湖分享链接并提取页面元数据
- 自动截取 Axure 设计稿和设计说明
- 将需求描述转化为 Markdown 格式
- 支持多页面需求聚合

## 环境配置

在项目根目录 `.env` 文件中配置：

```env
# 蓝湖登录 Cookie（必填）
LANHU_COOKIE="lanhu_session_id=xxx; path=/; secure"
```

## 获取 LANHU_COOKIE

1. 使用浏览器访问 https://lanhuapp.com
2. 登录账号
3. 打开浏览器开发者工具 → 应用 → Cookie
4. 复制 `lanhu_session_id` 的完整值
5. 粘贴到 `.env` 文件

## 用法

```bash
# 从蓝湖 URL 导入需求
npx tsx plugins/lanhu/fetch.ts --url "https://lanhuapp.com/web/#/item/..." --output cases/prds/202604/

# 或通过 qa-flow 命令
生成测试用例 https://lanhuapp.com/web/#/item/...
```

## 输出格式

生成的 PRD 文件包含：

- YAML front-matter（需求元数据）
- Markdown 需求描述
- 嵌入的设计稿截图（存储在 `assets/images/`）
