test("bad", async () => {
  const x = await page.locator("xxx");
  expect(x).toBeTruthy();  // weak — should toBeVisible / toHaveText
});
