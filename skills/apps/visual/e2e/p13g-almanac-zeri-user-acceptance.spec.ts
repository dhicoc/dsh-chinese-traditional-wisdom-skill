import { test, expect } from '@playwright/test';
import { openWorkspace } from './p13-helpers';

test.describe('P1.3g 黄历与综合择日用户侧验收', () => {
  test.setTimeout(90000);

  test('每日黄历随日期切换更新，并明确民俗参考边界', async ({ page }) => {
    await openWorkspace(page, '每日黄历', 'almanac');
    const workspace = page.locator('[data-testid="workspace-almanac"]');

    await expect(workspace.getByRole('heading', { name: '每日黄历', exact: true })).toBeVisible({ timeout: 60000 });
    await expect(workspace.getByText('民俗参考 · 非预测结论')).toBeVisible();
    await expect(workspace.getByText('宜忌为传统民俗参考，不作为决策依据。')).toBeVisible();

    const dateInput = workspace.getByLabel('选择日期');
    await dateInput.fill('2024-02-29');
    await expect(workspace.getByText('2024年2月29日', { exact: true })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '十二时辰吉凶' })).toBeVisible();
    await expect(workspace.getByText(/吉时 \d+ 辰 · 凶时 \d+ 辰/)).toBeVisible();

    await dateInput.fill('2024-03-01');
    await expect(workspace.getByText('2024年3月1日', { exact: true })).toBeVisible();
    await expect(workspace.getByText('2024年2月29日', { exact: true })).toHaveCount(0);
  });

  test('综合择日遵从用途、日期区间与 Top N', async ({ page }) => {
    await openWorkspace(page, '联合分析', 'combo');
    const workspace = page.locator('[data-testid="workspace-combo"]');

    await workspace.getByRole('button', { name: '综合择日' }).click();
    await expect(workspace.getByLabel('择日用途')).toBeVisible({ timeout: 60000 });
    await workspace.getByLabel('择日用途').selectOption('签约');
    await workspace.getByLabel('择日区间起').fill('2026-08-01');
    await workspace.getByLabel('择日区间止').fill('2026-08-31');
    await workspace.getByLabel('择日返回数量').fill('3');
    await workspace.getByLabel('择日返回数量').press('Tab');

    const result = workspace.getByText('优选吉日 · 签约', { exact: true });
    await expect(result).toBeVisible();
    const resultCard = result.locator('..').locator('..');
    const badge = await resultCard.getByText(/共31天 · 筛出\d+个吉日/).textContent();
    const screenedCount = Number(badge?.match(/筛出(\d+)个吉日/)?.[1]);
    expect(screenedCount).toBeGreaterThanOrEqual(0);
    expect(screenedCount).toBeLessThanOrEqual(3);

    const rankedDays = workspace.getByTestId('zeri-ranked-days');
    const candidateDates = rankedDays.getByTestId('zeri-ranked-day-date');
    expect(await rankedDays.getByTestId('zeri-ranked-day').count()).toBe(screenedCount);
    expect(await candidateDates.count()).toBe(screenedCount);
    for (let index = 0; index < await candidateDates.count(); index += 1) {
      const date = await candidateDates.nth(index).textContent();
      expect(date).toBeTruthy();
      expect(date! >= '2026-08-01' && date! <= '2026-08-31').toBe(true);
      const candidate = rankedDays.getByTestId('zeri-ranked-day').nth(index);
      await expect(candidate.getByText(/评分 \d+/)).toBeVisible();
      await expect(candidate.getByText(/^(吉|中|凶)$/)).toBeVisible();
    }

    if (screenedCount === 0) {
      await expect(resultCard.getByText('区间内无符合「签约」的吉日。建议放宽区间或调整用途。')).toBeVisible();
    }
  });
});
