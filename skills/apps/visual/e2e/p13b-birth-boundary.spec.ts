import { test, expect, type Page } from '@playwright/test';
import { fillVisibleBirthField } from './p13-helpers';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5174';

async function openBazi(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE_URL);
  await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 60000 });
  await page.getByRole('button', { name: /我想看运势/ }).click({ force: true });
  await expect(page.getByRole('heading', { name: '八字排盘' })).toBeVisible({ timeout: 60000 });
}

test.describe('出生时间与真太阳时边界验收', () => {
  test('默认以民用时间展示，并提示完成真太阳时核验所需资料', async ({ page }) => {
    await openBazi(page);
    await fillVisibleBirthField(page, 'minute', '37');

    const workspace = page.locator('[data-testid="workspace-bazi"]');
    const birthPanel = page.locator('[data-testid="sidebar-nav"]');
    await expect(workspace.getByText('民用时间：1990-06-15 12:37')).toBeVisible();
    await expect(birthPanel.getByText('请提供可定位的出生地，以核对地点、历史时区与夏令时；完成核验后将以校正后的出生时间排盘。')).toBeVisible();
    await expect(workspace.getByText('排盘时间：')).not.toBeVisible();
  });

  test('生辰面板不再提供手动经度或 UTC 偏移校时', async ({ page }) => {
    await openBazi(page);

    await expect(page.getByText('八字地点与校时（可选）')).toHaveCount(0);
    await expect(page.getByLabel('经度（东正西负）')).toHaveCount(0);
    await expect(page.getByLabel('实际 UTC 偏移（分钟）')).toHaveCount(0);
  });

  test('修改小时和分钟后保留民用出生记录', async ({ page }) => {
    await openBazi(page);
    await fillVisibleBirthField(page, 'hour', '13');
    await fillVisibleBirthField(page, 'minute', '5');

    await expect(page.getByText('民用时间：1990-06-15 13:05')).toBeVisible();
  });

  test('子初附近的民用时间不会被前端自行校正', async ({ page }) => {
    await openBazi(page);
    await fillVisibleBirthField(page, 'hour', '00');
    await fillVisibleBirthField(page, 'minute', '10');

    await expect(page.getByText('民用时间：1990-06-15 00:10')).toBeVisible();
    await expect(page.getByText(/真太阳时已跨越/)).toHaveCount(0);
  });
});
