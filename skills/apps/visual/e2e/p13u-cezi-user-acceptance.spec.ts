import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow, openWorkspace } from './p13-helpers';

test.describe('P1.3u 测字用户侧验收', () => {
  test.setTimeout(90000);

  test('所测字、问题方向与八字补益开关刷新结果，并呈现传统参考边界', async ({ page }) => {
    await openWorkspace(page, '测字', 'cezi');
    const workspace = page.locator('[data-testid="workspace-cezi"]');
    const charInput = workspace.locator('input[type="text"]');
    const aspect = workspace.locator('select');
    const baziBoost = workspace.locator('input[type="checkbox"]');

    await expect(workspace.getByRole('heading', { name: '测字 · 字占', exact: true })).toBeVisible();
    await expect(workspace.getByText('笔画数理', { exact: true })).toBeVisible();
    await expect(workspace.getByText('字义五行', { exact: true })).toBeVisible();
    await expect(workspace.locator('.grid.sm\\:grid-cols-3 > div > p').filter({ hasText: /^字形结构$/ })).toBeVisible();
    await expect(workspace.getByText('八字用神补益', { exact: true })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: /测「明」字解读/ })).toBeVisible();

    const initialResult = await workspace.getByRole('heading', { name: /测「明」字解读/ }).locator('..').textContent();
    await charInput.fill('江');
    await aspect.selectOption('事业');
    await expect(workspace.getByRole('heading', { name: /测「江」字解读/ })).toBeVisible();
    await expect.poll(() => workspace.getByRole('heading', { name: /测「江」字解读/ }).locator('..').textContent()).not.toBe(initialResult);
    await expect(workspace.getByText('事业影响：', { exact: true })).toBeVisible();

    await baziBoost.uncheck();
    await expect(baziBoost).not.toBeChecked();
    await expect(workspace.getByText('八字用神补益', { exact: true })).toHaveCount(0);

    await expect(workspace.locator('.console-panel > p').filter({ hasText: /^测字结果仅作传统民俗文化学习参考，不作为现实决策依据。$/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
