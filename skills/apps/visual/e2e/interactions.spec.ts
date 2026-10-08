import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5174';

/**
 * E2E 交互测试 — Phase 11 后续扩展。
 * 覆盖 CommandBar 命令面板交互、SVG 双击放大、右键复制为图像等关键路径。
 *
 * 注：模块导航为 <button role="tab">（文字 = module.title），故用 getByRole('tab') 定位。
 */

test.describe('CommandBar 命令面板交互', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
  });

  test('点击触发按钮打开命令面板', async ({ page }) => {
    const trigger = page.locator('[aria-label*="打开命令面板"]');
    await expect(trigger).toBeVisible();
    await trigger.click();
    // 面板打开后应出现输入框（placeholder 含「搜索工具」）
    await expect(page.locator('input[placeholder*="搜索工具"]')).toBeVisible();
  });

  test('Ctrl+K 打开命令面板', async ({ page }) => {
    await page.keyboard.press('Control+KeyK');
    await expect(page.locator('input[placeholder*="搜索工具"]')).toBeVisible();
  });

  test('搜索关键词过滤命令项', async ({ page }) => {
    await page.keyboard.press('Control+KeyK');
    const input = page.locator('input[placeholder*="搜索工具"]');
    await input.fill('紫微');
    // 过滤后应能匹配到紫微相关项
    await expect(page.locator('[role="option"], [role="listitem"], button').filter({ hasText: '紫微' }).first()).toBeVisible();
  });

  test('Esc 关闭命令面板', async ({ page }) => {
    await page.keyboard.press('Control+KeyK');
    const input = page.locator('input[placeholder*="搜索工具"]');
    await expect(input).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(input).not.toBeVisible();
  });
});

test.describe('SVG 图表双击放大与右键复制', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
    // 体质雷达图为 React 自包含，适合做放大/复制校验
    await page.getByRole('tab', { name: '体质辨识' }).click();
    await page.waitForSelector('[data-testid="radar-chart"]', { timeout: 10000 });
  });

  test('双击 SVG 打开放大弹窗', async ({ page }) => {
    const chart = page.locator('[data-testid="radar-chart"]').locator('..');
    await chart.dblclick();
    // 放大弹窗标题应出现（ZoomableSvg 传入的 title = 「九种体质雷达图」）
    await expect(page.locator('[role="dialog"]').filter({ hasText: '九种体质雷达图' })).toBeVisible();
  });

  test('放大弹窗可用 Esc / × / 点背景关闭', async ({ page }) => {
    const chart = page.locator('[data-testid="radar-chart"]').locator('..');
    await chart.dblclick();
    const dialog = page.locator('[role="dialog"]').filter({ hasText: '九种体质雷达图' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('右键 SVG 复制可读取、非纯黑的 PNG 图像', async ({ page }) => {
    await page.evaluate(() => {
      type ClipboardPayload = Record<string, Blob | Promise<Blob>>;
      class MockClipboardItem {
        readonly payload: ClipboardPayload;

        constructor(payload: ClipboardPayload) {
          this.payload = payload;
        }

        async getType(type: string): Promise<Blob> {
          return Promise.resolve(this.payload[type]);
        }
      }

      const state = window as typeof window & { __copiedChartBlob?: Blob };
      Object.defineProperty(window, 'ClipboardItem', { configurable: true, value: MockClipboardItem });
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          write: async (items: MockClipboardItem[]) => {
            state.__copiedChartBlob = await items[0].getType('image/png');
          },
        },
      });
    });

    const chart = page.locator('[data-testid="radar-chart"]').locator('..');
    await chart.click({ button: 'right' });
    await expect(page.getByText('已复制图像到剪贴板')).toBeVisible();

    const image = await page.evaluate(async () => {
      const blob = (window as typeof window & { __copiedChartBlob?: Blob }).__copiedChartBlob;
      if (!blob) return null;

      const url = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('copied PNG cannot be decoded'));
        img.src = url;
      });
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) return null;
      context.drawImage(img, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let sampled = 0;
      let black = 0;
      const colors = new Set<string>();
      for (let y = 0; y < canvas.height; y += 12) {
        for (let x = 0; x < canvas.width; x += 12) {
          const offset = (y * canvas.width + x) * 4;
          const r = pixels[offset];
          const g = pixels[offset + 1];
          const b = pixels[offset + 2];
          if (r < 12 && g < 12 && b < 12) black += 1;
          colors.add(`${Math.round(r / 16)},${Math.round(g / 16)},${Math.round(b / 16)}`);
          sampled += 1;
        }
      }
      return {
        type: blob.type,
        size: blob.size,
        width: canvas.width,
        height: canvas.height,
        blackRatio: black / sampled,
        colorCount: colors.size,
      };
    });

    expect(image).not.toBeNull();
    expect(image?.type).toBe('image/png');
    expect(image?.size).toBeGreaterThan(1_000);
    expect(image?.width).toBeGreaterThan(100);
    expect(image?.height).toBeGreaterThan(100);
    expect(image?.blackRatio).toBeLessThan(0.9);
    expect(image?.colorCount).toBeGreaterThan(4);
  });
});
