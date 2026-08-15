import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5174';

/**
 * E2E Smoke Tests - 基础冒烟测试
 * 验证应用能正常启动，核心元素可见
 *
 * 注：模块导航为 <button role="tab">（文字 = module.title），不再有 [data-testid="nav-item"]。
 */

test.describe('Application Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Wait for React to hydrate
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
  });

  test('should display app shell with title', async ({ page }) => {
    // 品牌标题在桌面侧边栏中渲染；移动端侧边栏隐藏，故强制桌面视口验证可见性
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
    await expect(page.getByRole('heading', { name: '玄枢' })).toBeVisible();
  });

  test('should render sidebar navigation', async ({ page }) => {
    // 侧边栏为桌面专属结构；移动端侧边栏隐藏，故强制桌面视口验证可见性
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible();
    // 所有模块以 <button role="tab"> 渲染（当前共 24 个模块）。
    // AppShell 对桌面/移动分别渲染一份 tablist（响应式双份），getByRole 默认只匹配可见的一份 → 24
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(24);
    // 联合分析标签应在侧边栏
    await expect(page.getByRole('button', { name: /联合分析/ })).toBeVisible();
  });

  test('should render command bar', async ({ page }) => {
    await expect(page.locator('[data-testid="command-bar"]')).toBeVisible();
    await expect(page.locator('text=搜索工具')).toBeVisible();
  });

  test('should display home dashboard by default', async ({ page }) => {
    await expect(page.locator('[data-testid="home-dashboard"]')).toBeVisible();
    await expect(page.getByTestId('home-dashboard').getByText('四柱 / 九宫工作台')).toBeVisible();
  });

  test('should show core plate and birth input', async ({ page }) => {
    // 面向用户的核心内容：意图入口 + 四柱命盘（生辰由侧边栏全局控制）
    await expect(page.getByTestId('home-dashboard').getByText('我想看运势')).toBeVisible();
    await expect(page.getByTestId('home-dashboard').getByText('四柱 / 九宫工作台')).toBeVisible();
    await expect(page.getByTestId('home-bazi-plate')).toBeVisible();
  });

  test('should not have console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(e =>
      !e.includes('source map') &&
      !e.includes('favicon') &&
      !e.includes('Manifest')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Responsive Layout', () => {
  test('should adapt to mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);

    // Mobile should show workspace tabs instead of sidebar
    await expect(page.locator('[data-testid="workspace-tabs"]').first()).toBeVisible();
  });

  test('should adapt to desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE_URL);

    // Desktop should show sidebar
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible();
  });
});
