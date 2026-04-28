/**
 * 自定义 Playwright fixture：每个 test.step 自动截图
 *
 * 每步生成一个附件，命名采用多行排版：
 *   通过：
 *     ✅ 步骤-1: {{操作描述}}
 *     预期-1: {{预期内容}}
 *   失败：
 *     ❌ 步骤-2: {{操作描述}}
 *     预期-2: {{预期内容}}
 *     实际-2: {{断言失败摘要}}
 *
 * 步骤名称约定格式：
 *   "步骤N: {{操作描述}} → {{预期描述}}"
 *
 * 用法：
 *   import { test, expect } from '../../fixtures/step-screenshot';
 *
 *   test('示例', async ({ page, step }) => {
 *     await step('步骤1: 打开页面 → 页面正常加载', async () => {
 *       await page.goto('https://example.com');
 *     });
 *
 *     const heading = page.getByRole('heading');
 *     await step('步骤2: 验证标题 → 标题可见', async () => {
 *       await expect(heading).toBeVisible();
 *     }, heading);  // 可选：对元素加红框高亮
 *   });
 */

import {
  test as base,
  expect as baseExpect,
  type Locator,
  type Page,
} from "@playwright/test";

export type StepFn = (
  name: string,
  body: () => Promise<void>,
  highlight?: Locator,
) => Promise<void>;

const HIGHLIGHT_STYLE =
  "outline: 3px solid red !important; outline-offset: 2px !important;";

type StepCaptureState = {
  lastLocator?: Locator;
};

type StepCaptureMode = "all" | "failed" | "off";

function resolveStepCaptureMode(): StepCaptureMode {
  const raw = (process.env.UI_AUTOTEST_STEP_CAPTURE ?? "all").toLowerCase();
  if (raw === "failed") {
    return "failed";
  }
  if (raw === "off") {
    return "off";
  }
  return "all";
}

let currentStepCapture: StepCaptureState | null = null;

function isLocatorLike(value: unknown): value is Locator {
  return (
    typeof value === "object" &&
    value !== null &&
    "evaluate" in value &&
    typeof value.evaluate === "function" &&
    "scrollIntoViewIfNeeded" in value &&
    typeof value.scrollIntoViewIfNeeded === "function"
  );
}

async function settleForScreenshot(page: Page): Promise<void> {
  await Promise.race([
    page
      .evaluate(
        () =>
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          }),
      )
      .catch(() => {}),
    new Promise<void>((resolve) => setTimeout(resolve, 2000)),
  ]);
}

const ANSI_RE = /\x1b\[[0-9;]*m/g;

function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, "");
}

function summarizeActual(err: unknown): string {
  if (!err) return "";
  const raw =
    err instanceof Error
      ? stripAnsi(err.message ?? "")
      : typeof err === "string"
        ? stripAnsi(err)
        : "";
  if (!raw) return "";

  const lines = raw.split("\n");
  const trimmedLines = lines.map((l) => l.trim()).filter(Boolean);

  // 1) 单行 Received: "..."（toHaveText/toContainText 等）
  const receivedLine = trimmedLines.find((l) => /^Received[\s:]/i.test(l));
  if (receivedLine) {
    const val = receivedLine.replace(/^Received[^:]*:\s*/i, "");
    return truncate(val, 200);
  }

  // 2) toEqual / toMatchObject 等 diff 格式：
  //      - Expected  - N
  //      + Received  + M
  //        Array [
  //      -   "*key",
  //      +   "key",
  //          ...
  //        ]
  const diff = parseDiffChanges(lines);
  if (diff) {
    return truncate(diff, 300);
  }

  // 3) 超时类错误
  const timedOut = trimmedLines.find((l) => /^Timed out/i.test(l));
  if (timedOut) {
    return truncate(timedOut, 200);
  }

  // 4) 兜底：取首条非空行
  return truncate(trimmedLines[0] ?? "", 200);
}

function parseDiffChanges(lines: string[]): string | null {
  const expected: string[] = [];
  const received: string[] = [];
  for (const line of lines) {
    if (line.startsWith("---") || line.startsWith("+++")) continue;
    // 跳过 diff 头："- Expected  - 1" / "+ Received  + 1"
    if (/^[-+]\s+(Expected|Received)\b/.test(line)) continue;
    const mMinus = line.match(/^-\s+(.*\S)\s*$/);
    const mPlus = line.match(/^\+\s+(.*\S)\s*$/);
    if (mMinus) expected.push(cleanDiffValue(mMinus[1]));
    else if (mPlus) received.push(cleanDiffValue(mPlus[1]));
  }
  if (expected.length === 0 && received.length === 0) return null;
  const actualPart = received.length ? received.join("、") : "(空)";
  const expectedPart = expected.length ? expected.join("、") : "(空)";
  return `${actualPart}（预期 ${expectedPart}）`;
}

function cleanDiffValue(raw: string): string {
  // 去掉末尾逗号、首尾空白；保留引号使输出直观
  return raw.replace(/,\s*$/, "").trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

export const test = base.extend<{ step: StepFn }>({
  step: async ({ page }, use, testInfo) => {
    let stepIndex = 0;
    const captureMode = resolveStepCaptureMode();

    const stepFn: StepFn = async (name, body, highlight?) => {
      // 解析步骤名：格式 "步骤N: {{操作}} → {{预期}}"
      const arrowIdx = name.indexOf("→");
      const rawDesc = arrowIdx > 0 ? name.slice(0, arrowIdx) : name;
      const stepDesc = rawDesc.replace(/^步骤\d+[:：]\s*/, "").trim();
      const expected = arrowIdx > 0 ? name.slice(arrowIdx + 1).trim() : "";

      let stepError: unknown = null;
      const captureState: StepCaptureState = {};
      const previousCapture = currentStepCapture;
      currentStepCapture = captureState;

      await base.step(name, async () => {
        try {
          await body();
        } catch (err) {
          stepError = err;
          throw err;
        } finally {
          currentStepCapture = previousCapture;
          stepIndex++;
          const idx = stepIndex;
          const passed = stepError === null;
          const icon = passed ? "✅" : "❌";
          const highlightTarget = highlight ?? captureState.lastLocator;

          const shouldCapture =
            captureMode === "all" || (captureMode === "failed" && !passed);

          if (!shouldCapture) {
            return;
          }

          // 高亮目标元素（可选，元素不存在时静默跳过；加超时保护避免 evaluate 等待消失的元素）
          if (highlightTarget) {
            await Promise.race([
              highlightTarget.scrollIntoViewIfNeeded().catch(() => {}),
              new Promise<void>((resolve) => setTimeout(resolve, 2000)),
            ]);
            await Promise.race([
              highlightTarget
                .evaluate((el, style) => {
                  (el as HTMLElement).style.cssText += style;
                }, HIGHLIGHT_STYLE)
                .catch(() => {}),
              new Promise<void>((resolve) => setTimeout(resolve, 2000)),
            ]);
          }

          await settleForScreenshot(page);

          // 无论成功或失败都截图（加超时保护避免 screenshot 挂起）
          const screenshot = await Promise.race([
            page.screenshot({ fullPage: false }).catch(() => null),
            new Promise<null>((resolve) =>
              setTimeout(() => resolve(null), 5000),
            ),
          ]);

          // 移除高亮（加超时保护）
          if (highlightTarget) {
            await Promise.race([
              highlightTarget
                .evaluate((el) => {
                  (el as HTMLElement).style.outline = "";
                  (el as HTMLElement).style.outlineOffset = "";
                })
                .catch(() => {}),
              new Promise<void>((resolve) => setTimeout(resolve, 2000)),
            ]);
          }

          if (screenshot) {
            const lines: string[] = [`${icon} 步骤-${idx}: ${stepDesc}`];
            if (expected) {
              lines.push(`预期-${idx}: ${expected}`);
            }
            if (!passed) {
              const actual = summarizeActual(stepError);
              if (actual) {
                lines.push(`实际-${idx}: ${actual}`);
              }
            }
            await testInfo.attach(lines.join("\n"), {
              body: screenshot,
              contentType: "image/png",
            });
          }
        }
      });
    };

    await use(stepFn);
  },
});

export const expect = new Proxy(baseExpect, {
  apply(target, thisArg, argArray: unknown[]) {
    const [actual] = argArray;
    if (currentStepCapture && isLocatorLike(actual)) {
      currentStepCapture.lastLocator = actual;
    }
    return Reflect.apply(target, thisArg, argArray);
  },
}) as typeof baseExpect;
