import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5174';

test.describe('P1.3c 八字动态层联动', () => {
  test('流年、流月、流日共用日期锚点，并可连续浏览日期', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto(`${BASE_URL}#bazi`);

    const workspace = page.locator('[data-testid="workspace-bazi"]');
    await expect(workspace.getByRole('heading', { name: '四柱主盘' })).toBeVisible({ timeout: 60000 });

    const dateInput = workspace.getByLabel('目标日期');
    await dateInput.fill('2025-07-15');
    await expect(workspace.getByLabel('目标年份')).toHaveValue('2025');
    await expect(workspace.getByText('当前小运', { exact: true })).toBeVisible();
    await expect(workspace.getByText(/虚岁\d+ · [甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/)).toBeVisible();
    await expect(workspace.getByText('流年', { exact: true })).toBeVisible();
    await expect(workspace.getByText('流年关系', { exact: true })).toBeVisible();
    await expect(workspace.getByText('流月', { exact: true })).toBeVisible();
    await expect(workspace.getByText('流日', { exact: true })).toBeVisible();
    await expect(workspace.getByText('动态层均按目标日期计算；本命盘保持不变。小运按虚岁定位。')).toBeVisible();
    await expect(workspace.getByText('传统文化参考：上述关系不推导事业、婚恋、健康或财富等现实结论。')).toBeVisible();

    const timeline = workspace.getByRole('list', { name: '大运时间轴' });
    await expect(timeline).toBeVisible();
    const alternateLuck = timeline.locator('button:not([disabled]):not([aria-pressed="true"])').first();
    await alternateLuck.click({ force: true });
    await expect(dateInput).not.toHaveValue('2025-07-15');
    await expect(workspace.getByLabel('目标年份')).toHaveValue(/\d{4}/);
    await dateInput.fill('2025-07-15');

    const natalDayPillar = await workspace.locator('table').getByRole('row').nth(2).locator('td').nth(2).textContent();

    const nextDay = workspace.getByRole('button', { name: '后一日' });
    const previousDay = workspace.getByRole('button', { name: '前一日' });
    await expect(nextDay).toBeVisible();
    await expect(previousDay).toBeVisible();

    await nextDay.click({ force: true });
    await expect(workspace.locator('table').getByRole('row').nth(2).locator('td').nth(2)).toHaveText(natalDayPillar ?? '');
    await expect(dateInput).toHaveValue('2025-07-16');
    await expect(workspace.getByLabel('目标年份')).toHaveValue('2025');

    await previousDay.click({ force: true });
    await expect(dateInput).toHaveValue('2025-07-15');

    await dateInput.fill('2025-12-31');
    await nextDay.click({ force: true });
    await expect(dateInput).toHaveValue('2026-01-01');
    await expect(workspace.getByLabel('目标年份')).toHaveValue('2026');
  });
});
