// META: {"id":"t17","priority":"P1","title":"【P1】验证导入模板下载功能"}
import { test, expect } from "../../fixtures/step-screenshot";
import ExcelJS from "exceljs";
import * as path from "path";
import * as fs from "fs";
import {
  gotoJsonConfigPage,
  clickHeaderButton,
  waitModal,
} from "./json-config-helpers";


test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证导入模板下载功能", async ({ page, step }) => {
    const savePath = path.join("/tmp", `json_format_template_${Date.now()}.xlsx`);

    try {
      // 步骤1：进入json格式校验管理页面
      await step(
        "步骤1: 进入【数据质量 → 通用配置】页面，等待列表加载完成 → json格式校验管理页面打开，列表显示已有key数据",
        async () => {
          await gotoJsonConfigPage(page);
          await expect(
            page.locator(".json-format-check").first(),
          ).toBeVisible({ timeout: 15000 });
        },
      );

      // 步骤2：点击【导入】按钮，等待弹窗
      let modal: import("@playwright/test").Locator;
      await step(
        "步骤2: 点击【导入】按钮 → 弹出导入弹窗",
        async () => {
          await clickHeaderButton(page, "导入");
          modal = await waitModal(page, "导入");
          await expect(modal).toBeVisible();
        },
      );

      // 步骤3：在弹窗内找【下载模板】链接/按钮，监听 download 事件并点击
      await step(
        "步骤3: 点击弹窗内【下载模板】 → 浏览器触发文件下载，文件名含 xlsx 或 json_format",
        async () => {
          const downloadLink = modal!
            .getByRole("button", { name: /下载模板/ })
            .or(modal!.getByRole("link", { name: /下载模板/ }))
            .or(modal!.getByText(/下载模板/));

          await expect(downloadLink.first()).toBeVisible({ timeout: 5000 });

          const [download] = await Promise.all([
            page.waitForEvent("download", { timeout: 30000 }),
            downloadLink.first().click(),
          ]);

          await download.saveAs(savePath);

          const suggestedName = download.suggestedFilename();
          expect(
            /xlsx/i.test(suggestedName) || /json_format/i.test(suggestedName),
          ).toBe(true);
        },
      );

      // 步骤4：用 ExcelJS 打开文件，断言包含 5 个 Sheet
      await step(
        "步骤4: 打开下载文件，验证包含 5 个 Sheet（一层/二层/三层/四层/五层） → 文件结构正确",
        async () => {
          expect(fs.existsSync(savePath)).toBe(true);

          const wb = new ExcelJS.Workbook();
          await wb.xlsx.readFile(savePath);
          const sheetNames = wb.worksheets.map((ws) => ws.name);

          expect(sheetNames.length).toBeGreaterThanOrEqual(5);

          // 校验存在一层、二层、三层、四层、五层（允许名称变体，如带空格或括号）
          const layerPattern = (n: string) =>
            new RegExp(n, "i");
          for (const layer of ["一层", "二层", "三层", "四层", "五层"]) {
            const found = sheetNames.some((name) =>
              layerPattern(layer).test(name),
            );
            expect(found, `Sheet 中应包含「${layer}」`).toBe(true);
          }
        },
      );

      // 步骤5：校验一层 Sheet 表头字段
      const firstLayerSheet = await step(
        "步骤5: 验证一层 Sheet 表头含「*key / key」「中文名称」「value格式」 → 列结构符合规范",
        async () => {
          const wb2 = new ExcelJS.Workbook();
          await wb2.xlsx.readFile(savePath);

          const sheet1 = wb2.worksheets.find((ws) => /一层/.test(ws.name));
          expect(sheet1, "一层 Sheet 应存在").toBeTruthy();

          const headerRow = sheet1!.getRow(1);
          const headers: string[] = [];
          headerRow.eachCell((cell) => {
            const v = cell.value;
            let text = "";
            if (v === null || v === undefined) {
              text = "";
            } else if (typeof v === "object" && "richText" in v) {
              // ExcelJS rich text: { richText: [{ text: "..." }, ...] }
              text = (v as { richText: { text: string }[] }).richText
                .map((r) => r.text)
                .join("");
            } else if (typeof v === "object" && "result" in v) {
              // ExcelJS formula cell: { formula: "...", result: "..." }
              text = String((v as { result: unknown }).result ?? "");
            } else {
              text = String(v);
            }
            headers.push(text.trim());
          });

          const hasKey = headers.some((h) => /key/i.test(h));
          const hasChinese = headers.some((h) => /中文名称/.test(h));
          const hasValueFormat = headers.some((h) => /value格式/.test(h));

          expect(hasKey, `一层表头应含 key，实际: ${headers.join(", ")}`).toBe(true);
          expect(hasChinese, `一层表头应含 中文名称，实际: ${headers.join(", ")}`).toBe(true);
          expect(hasValueFormat, `一层表头应含 value格式，实际: ${headers.join(", ")}`).toBe(true);

          return wb2;
        },
      );

      // 步骤6：校验二层 Sheet 表头还含"上一层级的key名"
      await step(
        "步骤6: 验证二层 Sheet 表头含「上一层级的key名」「*key / key」「中文名称」「value格式」 → 多层结构正确",
        async () => {
          const wb3 = new ExcelJS.Workbook();
          await wb3.xlsx.readFile(savePath);

          const sheet2 = wb3.worksheets.find((ws) => /二层/.test(ws.name));
          expect(sheet2, "二层 Sheet 应存在").toBeTruthy();

          const headerRow2 = sheet2!.getRow(1);
          const headers2: string[] = [];
          headerRow2.eachCell((cell) => {
            const v = cell.value;
            let text = "";
            if (v === null || v === undefined) {
              text = "";
            } else if (typeof v === "object" && "richText" in v) {
              text = (v as { richText: { text: string }[] }).richText
                .map((r) => r.text)
                .join("");
            } else if (typeof v === "object" && "result" in v) {
              text = String((v as { result: unknown }).result ?? "");
            } else {
              text = String(v);
            }
            headers2.push(text.trim());
          });

          const hasParentKey = headers2.some((h) => /上一层级.*key|key.*上一层级|第\S*层.*key|key.*第\S*层/i.test(h));
          const hasKey2 = headers2.some((h) => /^[\*＊]?\s*key$/i.test(h));
          const hasChinese2 = headers2.some((h) => /中文名称/.test(h));
          const hasValueFormat2 = headers2.some((h) => /value格式/.test(h));

          expect(hasParentKey, `二层表头应含「上一层级的key名」，实际: ${headers2.join(", ")}`).toBe(true);
          expect(hasKey2, `二层表头应含 key，实际: ${headers2.join(", ")}`).toBe(true);
          expect(hasChinese2, `二层表头应含 中文名称，实际: ${headers2.join(", ")}`).toBe(true);
          expect(hasValueFormat2, `二层表头应含 value格式，实际: ${headers2.join(", ")}`).toBe(true);
        },
      );
    } finally {
      if (fs.existsSync(savePath)) {
        fs.unlinkSync(savePath);
      }
    }
  });
});
