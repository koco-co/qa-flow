/**
 * Playwright 共享工具库
 *
 * 跨项目通用的 Ant Design 交互、导航、工具函数。
 * 所有项目的 spec 文件均可 import 此库。
 *
 * @example
 * ```typescript
 * import { selectAntOption, expectAntMessage, navigateViaMenu, uniqueName } from "@pw/index";
 * ```
 */

// Ant Design 组件交互 + 导航
export * from "./ant-design";

// 通用工具函数
export { uniqueName, todayStr } from "./utils";
