// META: {"id":"t17","priority":"P1","title":"【P1】验证导入模板下载功能"}
import { test, expect } from "../../../../../shared/fixtures/step-screenshot";
import ExcelJS from "exceljs";
import * as path from "path";
import * as fs from "fs";
import {
  gotoJsonConfigPage,
  clickHeaderButton,
  waitModal,
} from "../../helpers/json-config-helpers";


test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证导入模板下载功能", { tag: "@serial" }, async ({ page, step }) => {
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
          expect(suggestedName).toBe("json_format_import_template.xlsx");
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

          expect(sheetNames).toHaveLength(5);

          for (const layer of ["一层", "二层", "三层", "四层", "五层"]) {
            const found = sheetNames.includes(layer);
            expect(found, `Sheet 中应包含「${layer}」`).toBe(true);
          }
        },
      );

      // 步骤5：校验一层 Sheet 表头字段
      await step(
        "步骤5: 验证一层 Sheet 表头含「* key」「中文名称」「value格式」 → 列结构符合规范",
        async () => {
          const wb2 = new ExcelJS.Workbook();
          await wb2.xlsx.readFile(savePath);

          const sheet1 = wb2.worksheets.find((ws) => ws.name === "一层");
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

          expect(headers).toEqual(["* key", "中文名称", "value格式"]);
        },
      );

      // 步骤6：校验二至五层 Sheet 表头（每层含当前层及所有上层的 key 列）
      await step(
        "步骤6: 验证二至五层 Sheet 表头各含对应层级的「* 第N层级key名」前缀列、「* key」、「中文名称」、「value格式」 → 多层结构正确",
        async () => {
          const wb3 = new ExcelJS.Workbook();
          await wb3.xlsx.readFile(savePath);
          const readHeaders = (sheetName: string) => {
            const sheet = wb3.worksheets.find((ws) => ws.name === sheetName);
            expect(sheet, `${sheetName} Sheet 应存在`).toBeTruthy();
            const headerRow = sheet!.getRow(1);
            const headers: string[] = [];
            headerRow.eachCell((cell) => {
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
              headers.push(text.trim());
            });
            return headers;
          };

          // 二层：["* 第一层级key名", "* key", "中文名称", "value格式"]
          expect(readHeaders("二层")).toEqual(["* 第一层级key名", "* key", "中文名称", "value格式"]);
          // 三层：["* 第一层级key名", "* 第二层级key名", "* key", "中文名称", "value格式"]
          expect(readHeaders("三层")).toEqual(["* 第一层级key名", "* 第二层级key名", "* key", "中文名称", "value格式"]);
          // 四层
          expect(readHeaders("四层")).toEqual(["* 第一层级key名", "* 第二层级key名", "* 第三层级key名", "* key", "中文名称", "value格式"]);
          // 五层
          expect(readHeaders("五层")).toEqual(["* 第一层级key名", "* 第二层级key名", "* 第三层级key名", "* 第四层级key名", "* key", "中文名称", "value格式"]);
        },
      );
    } finally {
      if (fs.existsSync(savePath)) {
        fs.unlinkSync(savePath);
      }
    }
  });
});
