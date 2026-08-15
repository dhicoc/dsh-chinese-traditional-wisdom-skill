import { test, expect } from '@playwright/test';
import { visibleBirthInput } from './p13-helpers';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5174';

test.describe('P1.3f 紫微斗数用户侧验收', () => {
  test.setTimeout(90000);

  test('全局生辰刷新本命盘，目标年月驱动紫微动态层', async ({ page }) => {
    await page.goto(`${BASE_URL}#ziwei`);
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();

    const workspace = page.locator('[data-testid="workspace-ziwei"]');
    await expect(workspace.getByRole('heading', { name: '紫微斗数', exact: true })).toBeVisible({ timeout: 60000 });
    const chart = workspace.getByTestId('ziwei-palace-grid');
    await expect(chart).toBeVisible();

    const birthYear = visibleBirthInput(page, 'year');
    await birthYear.fill('1991');
    await birthYear.press('Tab');
    await expect(chart).toContainText('1991年6月15日');

    await birthYear.fill('1990');
    await birthYear.press('Tab');
    await expect(chart).toContainText('1990年6月15日');
    await expect(chart).toContainText('12时 男命');

    await workspace.getByLabel('目标年份').fill('2025');
    await workspace.getByLabel('月份').fill('7');

    await expect(workspace.getByText('动态层以 2025-07-15 为查询日期', { exact: false })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '大限 · 流年' })).toBeVisible();
    await expect(workspace.getByText('己卯', { exact: true })).toBeVisible();
    await expect(workspace.getByText('乙巳 · 命宫落交友巳', { exact: true })).toBeVisible();
    await expect(workspace.getByText('7月 癸未 · 虚岁 36', { exact: true })).toBeVisible();
  });
});
