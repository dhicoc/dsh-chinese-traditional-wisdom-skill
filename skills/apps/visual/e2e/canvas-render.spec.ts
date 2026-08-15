import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5174';

/**
 * Chart Rendering E2E Tests（Phase 10 后：Canvas 已全部替换为 SVG）
 * 验证各工具的 SVG 图表能正常渲染、可见、有尺寸、无控制台致命错误。
 *
 * 注：React 迁移后模块导航为 <button role="tab">（文字 = module.title），
 * 旧 legacy 引擎全局（EngineAdapterRegistry）已移除，改由纯 TS 引擎在 React 内渲染，
 * 故不再等待 legacy 全局，直接等待工作区与图表 SVG 即可。
 */

/** 切换到指定工具并等待工作区可见 */
async function openTool(page: import('@playwright/test').Page, navText: string, workspaceTestId: string): Promise<void> {
  await page.getByRole('tab', { name: navText }).click();
  await page.waitForSelector(`[data-testid="${workspaceTestId}"]`, { timeout: 10000 });
}

/** 校验 SVG 图表可见且有合理尺寸 */
async function expectSvgVisible(page: import('@playwright/test').Page, testId: string): Promise<void> {
  // 六爻有本卦+变卦两个 hexagram-chart，取 first
  const svg = page.locator(`[data-testid="${testId}"]`).first();
  await expect(svg).toBeVisible({ timeout: 10000 });
  const box = await svg.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(100);
  expect(box!.height).toBeGreaterThan(50);
}

test.describe('Chart Rendering - Destiny Tools', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
  });

  test('should render bazi SVG chart', async ({ page }) => {
    await openTool(page, '八字', 'workspace-bazi');
    await expectSvgVisible(page, 'bazi-pillars-chart');
  });

  test('should render ziwei SVG chart', async ({ page }) => {
    await openTool(page, '紫微', 'workspace-ziwei');
    await expectSvgVisible(page, 'ziwei-palace-grid');
  });

  test('should render liuyao SVG chart', async ({ page }) => {
    await openTool(page, '六爻', 'workspace-liuyao');
    await expectSvgVisible(page, 'hexagram-chart');
  });

  test('should render meihua SVG chart', async ({ page }) => {
    await openTool(page, '梅花', 'workspace-meihua');
    await expectSvgVisible(page, 'meihua-chart');
  });
});

test.describe('Chart Rendering - Feng Shui Tools', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
  });

  test('should render fengshui compass SVG', async ({ page }) => {
    await openTool(page, '风水', 'workspace-fengshui');
    await expectSvgVisible(page, 'fengshui-compass');
  });

  test('should render feixing SVG chart', async ({ page }) => {
    await openTool(page, '飞星', 'workspace-feixing');
    await expectSvgVisible(page, 'nine-palace-grid');
  });

  test('should render bazhai SVG chart', async ({ page }) => {
    await openTool(page, '八宅', 'workspace-bazhai');
    await expectSvgVisible(page, 'eight-mansions-chart');
  });
});

test.describe('Chart Rendering - Health Tools', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
  });

  test('should render yunqi SVG chart', async ({ page }) => {
    await openTool(page, '五运六气', 'workspace-yunqi');
    await expectSvgVisible(page, 'yunqi-chart');
  });

  test('should render tizhi radar SVG chart', async ({ page }) => {
    // 体质雷达图是纯 React 自包含
    await openTool(page, '体质', 'workspace-tizhi');
    await expectSvgVisible(page, 'radar-chart');
  });
});

test.describe('Chart Rendering - No Console Errors', () => {
  test('should not have chart-related errors across all tools', async ({ page }) => {
    test.setTimeout(120000); // 遍历 9 工具需加载引擎 + 渲染，给足超时
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    const tools = ['八字命盘', '紫微斗数', '六爻占卜', '梅花易数', '风水罗盘', '流年飞星', '八宅大游年', '五运六气', '体质辨识'];
    for (const tool of tools) {
      await page.goto(BASE_URL);
      await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
      await page.getByRole('tab', { name: tool }).click();
      await page.waitForTimeout(1500);
    }

    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('source map') &&
        !e.includes('favicon') &&
        !e.includes('Manifest') &&
        !e.includes('React DevTools'),
    );
    if (criticalErrors.length > 0) {
      console.error('Console errors detected:', JSON.stringify(criticalErrors, null, 2));
    }
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Chart Responsiveness', () => {
  test('should keep SVG visible on viewport change', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
    // 体质雷达图自包含，适合做响应式校验
    await openTool(page, '体质', 'workspace-tizhi');
    const svg = page.locator('[data-testid="radar-chart"]');

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect.poll(async () => (await svg.boundingBox())?.width ?? 0).toBeGreaterThan(100);

    await page.setViewportSize({ width: 375, height: 667 });
    await expect.poll(async () => (await svg.boundingBox())?.width ?? 0).toBeGreaterThan(0);
    await expect.poll(async () => (await svg.boundingBox())?.height ?? 0).toBeGreaterThan(0);
  });
});
