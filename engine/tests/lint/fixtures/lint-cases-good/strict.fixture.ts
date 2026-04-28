test("good", async () => {
  await expect(page.locator("xxx")).toBeVisible();
  await expect(page.locator("yyy")).toHaveText("expected");
});
