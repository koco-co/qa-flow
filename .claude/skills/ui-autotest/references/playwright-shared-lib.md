# Playwright 共享工具库清单

> `lib/playwright/` 提供跨项目通用的 Ant Design 交互函数。所有生成 Playwright 脚本的 agent 必须**优先引用**，禁止在 spec 中内联重新实现。

## 函数清单

| 分类       | 函数                                               | 用途                            |
| ---------- | -------------------------------------------------- | ------------------------------- |
| Select     | `selectAntOption(page, trigger, text)`             | 下拉选择（含虚拟滚动 fallback） |
| Message    | `expectAntMessage(page, text, timeout?)`           | 等待 Message/Notification 提示  |
| Modal      | `waitForAntModal(page, title?)`                    | 等待 Modal 可见并返回 Locator   |
|            | `confirmAntModal(page, modal?)`                    | 点击 Modal 主按钮确认           |
|            | `closeAntModal(page, modal?)`                      | 关闭 Modal                      |
| Drawer     | `waitForAntDrawer(page, title?)`                   | 等待 Drawer 可见并返回 Locator  |
|            | `closeAntDrawer(page, drawer?)`                    | 关闭 Drawer                     |
|            | `waitForOverlay(page, title?)`                     | 等待 Modal 或 Drawer            |
| Popconfirm | `confirmPopconfirm(page, timeout?)`                | 确认气泡确认框                  |
|            | `cancelPopconfirm(page, timeout?)`                 | 取消气泡确认框                  |
| Table      | `waitForTableLoaded(page, table?, timeout?)`       | 等待表格加载完成                |
|            | `findTableRow(page, rowText, table?)`              | 按文本定位表格行                |
| Form       | `locateFormItem(container, label)`                 | 按标签定位表单字段              |
|            | `expectFormError(container, errorText?, timeout?)` | 断言表单验证错误可见            |
|            | `expectNoFormError(container, timeout?)`           | 断言无表单验证错误              |
| Tabs       | `switchAntTab(page, tabName, container?)`          | 切换标签页                      |
| Checkbox   | `checkAntCheckbox(checkbox)`                       | 勾选（幂等）                    |
|            | `uncheckAntCheckbox(checkbox)`                     | 取消勾选（幂等）                |
| Radio      | `clickAntRadio(container, label)`                  | 点击 Radio 选项                 |
| Dropdown   | `clickDropdownMenuItem(page, text, timeout?)`      | 点击下拉菜单项（右键菜单等）    |
| Navigation | `navigateViaMenu(page, menuPath)`                  | 侧边栏菜单导航                  |
| Utils      | `uniqueName(prefix)`                               | 带时间戳唯一名称                |
|            | `todayStr()`                                       | 当天日期 "YYYYMMDD"             |

## 引用方式

通过项目 helpers re-export 引用（推荐，路径更短）：

```typescript
import { selectAntOption, expectAntMessage } from "../../helpers/test-setup";
```

## 约束

- 生成脚本前**必须先读取 `lib/playwright/index.ts`** 确认最新导出
- 禁止在 spec 文件中内联定义上表中已有的函数
- 禁止复制粘贴共享库代码到 spec 文件
- 需要的交互模式不在清单中 → 先用清单内函数组合实现；实在无法满足，在套件级 helpers 中新建
