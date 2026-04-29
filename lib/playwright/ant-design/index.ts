/**
 * Ant Design 组件交互工具 — barrel export
 */

// 组件交互
export {
  // Select
  selectAntOption,
  // Message / Notification
  expectAntMessage,
  // Modal
  waitForAntModal,
  confirmAntModal,
  closeAntModal,
  // Drawer
  waitForAntDrawer,
  closeAntDrawer,
  waitForOverlay,
  // Popconfirm / Popover
  confirmPopconfirm,
  cancelPopconfirm,
  // Table
  waitForTableLoaded,
  findTableRow,
  // Form
  locateFormItem,
  expectFormError,
  expectNoFormError,
  // Tabs
  switchAntTab,
  // Checkbox & Radio
  checkAntCheckbox,
  uncheckAntCheckbox,
  clickAntRadio,
  // Dropdown
  clickDropdownMenuItem,
} from "./interactions";

// 导航
export { navigateViaMenu } from "./navigation";
