import { test, expect } from '@playwright/test';
import { openWorkspace, visibleBirthInput } from './p13-helpers';

test.describe('P1.3d 用户侧高频咨询验收', () => {
  test.setTimeout(90000);

  test('合婚可填写乙方资料、切换场景，并显示文化参考边界', async ({ page }) => {
    await openWorkspace(page, '联合分析', 'combo');
    const workspace = page.locator('[data-testid="workspace-combo"]');
    await expect(workspace.getByRole('heading', { name: '联合分析' })).toBeVisible({ timeout: 60000 });
    await workspace.getByRole('button', { name: '合婚配对' }).click();
    await expect(page.getByLabel('合婚关系类型')).toBeVisible({ timeout: 60000 });

    await page.getByLabel('合婚乙方出生年').fill('1992');
    await page.getByLabel('合婚乙方出生年').press('Tab');
    await page.getByLabel('甲方姓名（可选）').fill('张');
    await page.getByLabel('甲方名（可选）').fill('伟');
    await page.getByLabel('合婚乙方姓名').fill('李');
    await page.getByLabel('合婚乙方名').fill('梅');
    await page.getByLabel('合婚关系类型').selectOption('合伙');

    await expect(page.getByRole('heading', { name: '合伙配对解读' })).toBeVisible();
    await expect(page.getByText(/^姓名匹配 \d+$/)).toBeVisible();
    await expect(page.getByText('输入双方出生信息，分析八字日柱冲合')).toContainText('仅供文化参考');
  });

  test('综合择日按用途、区间与数量返回范围内候选日', async ({ page }) => {
    await openWorkspace(page, '联合分析', 'combo');
    const workspace = page.locator('[data-testid="workspace-combo"]');
    await expect(workspace.getByRole('heading', { name: '联合分析' })).toBeVisible({ timeout: 60000 });
    await workspace.getByRole('button', { name: '综合择日' }).click();
    await expect(page.getByLabel('择日区间起')).toBeVisible({ timeout: 60000 });

    await page.getByLabel('择日用途').selectOption('签约');
    await page.getByLabel('择日区间起').fill('2026-08-01');
    await page.getByLabel('择日区间止').fill('2026-08-31');
    await page.getByLabel('择日返回数量').fill('3');
    await page.getByLabel('择日返回数量').press('Tab');

    const result = page.getByText(/优选吉日 · 签约/);
    await expect(result).toBeVisible();
    await expect(page.getByText(/筛出[0-3]个吉日/)).toBeVisible();

    const resultCard = result.locator('..').locator('..');
    const dates = resultCard.locator('div.rounded-card').filter({ hasText: /2026-08-\d{2}/ });
    expect(await dates.count()).toBeLessThanOrEqual(3);
  });

  test('修改全局出生年份后，八字动态层保持目标日期并刷新本命结果', async ({ page }) => {
    await openWorkspace(page, '八字命盘', 'bazi');

    const workspace = page.locator('[data-testid="workspace-bazi"]');
    await expect(workspace.getByRole('heading', { name: '四柱主盘' })).toBeVisible({ timeout: 60000 });

    const dateInput = workspace.getByLabel('目标日期');
    await dateInput.fill('2025-07-15');
    const previousNatalYear = await workspace.locator('table').getByRole('row').nth(1).locator('td').nth(0).textContent();

    const birthYear = visibleBirthInput(page, 'year');
    await birthYear.fill('1992');
    await birthYear.press('Tab');

    await expect(dateInput).toHaveValue('2025-07-15');
    await expect(workspace.locator('table').getByRole('row').nth(1).locator('td').nth(0)).not.toHaveText(previousNatalYear ?? '');
    await expect(workspace.getByText('动态层均按目标日期计算；本命盘保持不变。小运按虚岁定位。')).toBeVisible();
  });
});
