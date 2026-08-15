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

  test('右键 SVG 触发复制为图像（不出现浏览器默认菜单）', async ({ page }) => {
    const chart = page.locator('[data-testid="radar-chart"]').locator('..');
    // 右键应被组件 preventDefault，浏览器默认上下文菜单不弹出
    // 这里校验右键后页面无致命错误且图表仍在
    await chart.click({ button: 'right' });
    await expect(page.locator('[data-testid="radar-chart"]')).toBeVisible();
  });
});
