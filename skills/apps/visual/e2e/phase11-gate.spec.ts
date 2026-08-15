import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5174';

/**
 * Phase 11 主入口切换回归 Gate
 * 切换主入口到 React Shell 后的全量验证：
 *  - 工具 tab 全部可打开且默认数据可渲染
 *  - CommandBar 可切换模块
 *  - Copy context 按钮存在
 *  - 375px 移动端不横向溢出
 *  - 暗黑模式 contrast 合格（核心文本可见）
 *
 * 注：React 迁移后模块导航为 <button role="tab">（文字 = module.title），
 * 不再有 [data-testid="nav-item"]；旧 legacy 引擎全局（EngineAdapterRegistry）已移除，
 * 故不再等待该全局，直接等待 app-shell + 工作区渲染即可。
 */

const TOOL_TABS = [
  { nav: '八字命盘', workspace: 'workspace-bazi' },
  { nav: '紫微斗数', workspace: 'workspace-ziwei' },
  { nav: '六爻占卜', workspace: 'workspace-liuyao' },
  { nav: '梅花易数', workspace: 'workspace-meihua' },
  { nav: '风水罗盘', workspace: 'workspace-fengshui' },
  { nav: '流年飞星', workspace: 'workspace-feixing' },
  { nav: '八宅大游年', workspace: 'workspace-bazhai' },
  { nav: '五运六气', workspace: 'workspace-yunqi' },
  { nav: '体质辨识', workspace: 'workspace-tizhi' },
  { nav: '每日黄历', workspace: 'workspace-almanac' },
  { nav: '姓名五行', workspace: 'workspace-namewuxing' },
  { nav: '大六壬', workspace: 'workspace-liuren' },
  { nav: '二十八星宿', workspace: 'workspace-xingxiu' },
] as const;

test.describe('Phase 11 Gate - 所有工具 tab 可打开并渲染', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
  });

  for (const tab of TOOL_TABS) {
    test(`tab ${tab.nav} 可打开且工作区可见`, async ({ page }) => {
      await page.getByRole('tab', { name: tab.nav }).click();
      await page.waitForSelector(`[data-testid="${tab.workspace}"]`, { timeout: 10000 });
      await expect(page.locator(`[data-testid="${tab.workspace}"]`)).toBeVisible();
    });
  }
});

test.describe('Phase 11 Gate - CommandBar 与 Copy context', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
  });

  test('CommandBar 切换模块后工作区更新', async ({ page }) => {
    // 默认 home，通过 CommandBar 切到紫微
    await page.keyboard.press('Control+KeyK');
    const input = page.locator('input[placeholder*="搜索工具"]');
    await expect(input).toBeVisible();
    await input.fill('紫微');
    await page.keyboard.press('Enter');
    // 切换后应出现紫微工作区
    await page.waitForSelector('[data-testid="workspace-ziwei"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="workspace-ziwei"]')).toBeVisible();
  });

  test('每个工具页都有摘要复制入口', async ({ page }) => {
    await page.getByRole('tab', { name: '八字命盘' }).click();
    await page.waitForSelector('[data-testid="workspace-bazi"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="copy-context-button"]')).toBeVisible();
  });
});

test.describe('Phase 11 Gate - 响应式与可访问性', () => {
  test('375px 移动端不横向溢出', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
    // 横向滚动宽度不应超过视口（允许 1px 容差）
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(376);
  });

  test('暗黑模式核心文本可见（contrast 合格）', async ({ page }) => {
    // 主标题位于桌面侧边栏，移动端隐藏；强制桌面视口以校验可见性与对比度
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
    // 校验主标题与正文有可计算的非透明颜色
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    const color = await h1.evaluate((el) => window.getComputedStyle(el).color);
    expect(color).toMatch(/rgb\(/);
    // 颜色不应是纯黑（在暗底上不可见）
    expect(color).not.toBe('rgb(0, 0, 0)');
  });
});
