import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow, openWorkspace } from './p13-helpers';

test.describe('P1.3k 大六壬用户侧验收', () => {
  test.setTimeout(90000);

  test('流派切换更新天将口径，同时保留天地盘、四课三传与传统参考边界', async ({ page }) => {
    await openWorkspace(page, '大六壬', 'liuren');
    const workspace = page.locator('[data-testid="workspace-liuren"]');

    await expect(workspace.getByRole('heading', { name: '大六壬', exact: true })).toBeVisible();
    await expect(workspace.getByText('大六壬结果仅作传统卜筮文化学习参考，不作为现实决策依据。')).toBeVisible();
    await expect(workspace.getByText('排盘信息', { exact: true })).toBeVisible();
    await expect(workspace.getByTestId('daliuren-chart')).toHaveAttribute('aria-label', '大六壬天地盘');
    await expect(workspace.getByRole('heading', { name: '四课', exact: true })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '三传', exact: true })).toBeVisible();
    await expect(workspace.getByText('大六壬解读', { exact: true })).toBeVisible();

    const school = workspace.getByLabel('流派');
    await expect(school).toHaveValue('classic');
    await expect(workspace.locator('p').filter({ hasText: /^通行（天盘临方定顺逆）$/ })).toBeVisible();
    await expect(workspace.locator('p').filter({ hasText: '顺逆以贵人天盘落支临阳方' })).toBeVisible();

    await school.selectOption('gufa');
    await expect(school).toHaveValue('gufa');
    await expect(workspace.locator('p').filter({ hasText: /^古法（昼顺夜逆·上神承将）$/ })).toBeVisible();
    await expect(workspace.locator('p').filter({ hasText: '顺逆径以昼顺夜逆，不依天盘临方' })).toBeVisible();
    await expect(workspace.getByTestId('daliuren-chart')).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '四课', exact: true })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '三传', exact: true })).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
});
