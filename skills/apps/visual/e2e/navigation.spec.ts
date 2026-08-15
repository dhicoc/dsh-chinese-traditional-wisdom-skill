import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5174';

/**
 * Navigation E2E Tests - 导航测试
 * 验证标签切换、路由、CommandBar 功能
 *
 * 注意：模块导航在 React 迁移后改为 <button role="tab">（文字 = module.title），
 * 不再有 [data-testid="nav-item"]，故统一用 getByRole('tab', { name }) 定位。
 */

test.describe('Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
  });

  test('should navigate to bazi tab', async ({ page }) => {
    await page.getByRole('tab', { name: '八字' }).click();
    const workspace = page.locator('[data-testid="workspace-bazi"]');
    await expect(workspace).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '八字排盘' })).toBeVisible();
  });

  test('should navigate to ziwei tab', async ({ page }) => {
    await page.getByRole('tab', { name: '紫微' }).click();
    await expect(page.locator('[data-testid="workspace-ziwei"]')).toBeVisible();
    await expect(page.locator('[data-testid="workspace-ziwei"]')).toContainText('紫微斗数');
  });

  test('should navigate to liuyao tab', async ({ page }) => {
    await page.getByRole('tab', { name: '六爻' }).click();
    await expect(page.locator('[data-testid="workspace-liuyao"]')).toBeVisible();
    await expect(page.locator('[data-testid="workspace-liuyao"]')).toContainText('六爻占卜');
  });

  test('should navigate to meihua tab', async ({ page }) => {
    await page.getByRole('tab', { name: '梅花' }).click();
    await expect(page.locator('[data-testid="workspace-meihua"]')).toBeVisible();
    await expect(page.locator('[data-testid="workspace-meihua"]')).toContainText('梅花易数');
  });

  test('should navigate to fengshui tab', async ({ page }) => {
    await page.getByRole('tab', { name: '风水' }).click();
    await expect(page.locator('[data-testid="workspace-fengshui"]')).toBeVisible();
  });

  test('should update URL hash on tab change', async ({ page }) => {
    await page.getByRole('tab', { name: '八字' }).click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('#bazi');

    await page.getByRole('tab', { name: '紫微' }).click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('#ziwei');
  });

  test('should restore tab from URL hash', async ({ page }) => {
    await page.goto(`${BASE_URL}#liuyao`);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="workspace-liuyao"]')).toBeVisible();
  });
});

test.describe('CommandBar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
  });

  test('should open command bar with keyboard shortcut', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();
  });

  test('should search and navigate via command bar', async ({ page }) => {
    // Open command bar
    await page.click('[data-testid="command-bar"]');
    await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();

    // Type search query
    await page.fill('[data-testid="command-input"]', '八字');
    await expect(page.locator('[data-testid="command-result"]:has-text("八字命盘")').first()).toBeVisible();

    // Select result (导航项优先，避开 agent 路由项)
    await page.locator('[data-testid="command-result"]:has-text("八字命盘")').first().click();
    await expect(page.locator('[data-testid="workspace-bazi"]')).toBeVisible();
  });

  test('should show year navigation in command bar', async ({ page }) => {
    await page.click('[data-testid="command-bar"]');
    await page.fill('[data-testid="command-input"]', '2026');

    // Should show year navigation options
    await expect(page.locator('[data-testid="command-result"]:has-text("流年飞星")')).toBeVisible();
    await expect(page.locator('[data-testid="command-result"]:has-text("五运六气")')).toBeVisible();
  });

  test('should show feedback after selecting a command', async ({ page }) => {
    await page.click('[data-testid="command-bar"]');
    await page.fill('[data-testid="command-input"]', '八字');
    await page.locator('[data-testid="command-result"]:has-text("八字命盘")').first().click();

    await expect(page.locator('[data-testid="command-feedback"]')).toBeVisible();
    await expect(page.locator('[data-testid="command-feedback"]')).toContainText('已执行：八字命盘');
  });

  test('should show feedback after a dynamic birth command', async ({ page }) => {
    await page.click('[data-testid="command-bar"]');
    await page.fill('[data-testid="command-input"]', '生辰 1992-03-04 9 女');
    await page.click('[data-testid="command-result"]:has-text("更新全局生辰")');

    await expect(page.locator('[data-testid="command-feedback"]')).toBeVisible();
    await expect(page.locator('[data-testid="command-feedback"]')).toContainText('已执行：更新全局生辰');
  });

  test('should suggest the right tool for a natural-language question', async ({ page }) => {
    await page.click('[data-testid="command-bar"]');
    await page.fill('[data-testid="command-input"]', '要不要换工作');

    await expect(page.locator('[data-testid="command-result"]:has-text("建议打开")')).toBeVisible();
    await page.click('[data-testid="command-result"]:has-text("建议打开")');

    // 确认面板出现，展示六爻目标
    await expect(page.locator('[data-testid="agent-confirm-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="agent-confirm-target"]')).toContainText('六爻占卜');

    // 确认执行
    await page.click('[data-testid="agent-confirm-execute"]');
    await expect(page.locator('[data-testid="workspace-liuyao"]')).toBeVisible();
    await expect(page.locator('[data-testid="command-feedback"]')).toContainText('六爻占卜');
  });

  test('should suggest Bazi for a birth and wealth question, then update birth', async ({ page }) => {
    await page.click('[data-testid="command-bar"]');
    await page.fill('[data-testid="command-input"]', '1990-06-15 12 男 今年财运');
    await page.click('[data-testid="command-result"]:has-text("建议打开")');

    // 确认面板应展示生辰预填
    await expect(page.locator('[data-testid="agent-confirm-birth"]')).toContainText('1990-06-15');
    await page.click('[data-testid="agent-confirm-execute"]');

    await expect(page.locator('[data-testid="workspace-bazi"]')).toBeVisible();
    await expect(page.locator('[data-testid="command-feedback"]')).toContainText('八字命盘');
    await expect(page.locator('button:visible').filter({ hasText: '全局生辰' })).toContainText('1990-06-15');
  });

  test('should cancel a tool suggestion without navigating', async ({ page }) => {
    await page.click('[data-testid="command-bar"]');
    await page.fill('[data-testid="command-input"]', '要不要换工作');
    await page.click('[data-testid="command-result"]:has-text("建议打开")');
    await expect(page.locator('[data-testid="agent-confirm-panel"]')).toBeVisible();
    await page.click('[data-testid="agent-confirm-cancel"]');
    await expect(page.locator('[data-testid="agent-confirm-panel"]')).toHaveCount(0);
  });
});

test.describe('Home Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="home-dashboard"]', { timeout: 10000 });
  });

  test('should navigate to tool from home cards', async ({ page }) => {
    // 从首页意图入口跳转（「我想看运势」指向八字命盘）
    await page.click('button:has-text("我想看运势")');
    await expect(page.locator('[data-testid="workspace-bazi"]')).toBeVisible();
  });
});
