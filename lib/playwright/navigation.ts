/**
 * 通用页面导航工具
 *
 * 适用于使用 Ant Design Layout + Sider 侧边栏的项目。
 */
import type { Page } from "@playwright/test";

/**
 * 通过 Ant Design 侧边栏菜单导航到指定模块
 *
 * 支持多级菜单展开（自动点击 submenu-title 展开父级）。
 *
 * @param page - Playwright Page 实例
 * @param menuPath - 菜单路径数组，如 ['元数据', '数据地图']
 */
export async function navigateViaMenu(
  page: Page,
  menuPath: string[],
): Promise<void> {
  const sideMenu = page.locator(".ant-layout-sider").first();
  await sideMenu.waitFor({ state: "visible", timeout: 10000 });

  for (const menuName of menuPath) {
    const menuItem = sideMenu.getByText(menuName, { exact: false });
    const isVisible = await menuItem.isVisible().catch(() => false);
    if (!isVisible) {
      const parentMenu = sideMenu
        .locator(".ant-menu-submenu-title")
        .filter({ hasText: menuName });
      if (await parentMenu.isVisible().catch(() => false)) {
        await parentMenu.click();
        await page.waitForTimeout(300);
      }
    }
    await menuItem.first().click();
    await page.waitForTimeout(500);
  }
  await page.waitForLoadState("networkidle");
}
