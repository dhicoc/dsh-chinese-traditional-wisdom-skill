import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow, openWorkspace } from './p13-helpers';

test.describe('P1.3s 周公解梦用户侧验收', () => {
  test.setTimeout(90000);

  test('真实关键词查询刷新梦象解读、古文断语与传统参考边界', async ({ page }) => {
    await openWorkspace(page, '周公解梦', 'dream');
    const workspace = page.locator('[data-testid="workspace-dream"]');
    const search = workspace.locator('input[type="text"]');
    const interpret = workspace.getByRole('button', { name: '解梦', exact: true });

    await expect(workspace.getByRole('heading', { name: '周公解梦', exact: true })).toBeVisible();
    await expect(workspace.getByText('热门梦象：', { exact: true })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '按类别浏览梦象', exact: true })).toBeVisible();

    await search.fill('蛇');
    await interpret.click();
    await expect(workspace.getByRole('heading', { name: '「蛇」解梦结果', exact: true })).toBeVisible();
    await expect(workspace.getByText('原版周公解梦古文', { exact: true })).toBeVisible();
    await expect(workspace.getByText('方位联动提示', { exact: true })).toBeVisible();

    const firstResult = await workspace.getByRole('heading', { name: '「蛇」解梦结果', exact: true }).locator('..').textContent();
    await search.fill('水');
    await search.press('Enter');
    await expect(workspace.getByRole('heading', { name: '「水」解梦结果', exact: true })).toBeVisible();
    await expect.poll(() => workspace.getByRole('heading', { name: '「水」解梦结果', exact: true }).locator('..').textContent()).not.toBe(firstResult);

    const usageCard = workspace.locator('section').filter({ hasText: '使用说明' });
    await expect(usageCard).toBeVisible();
    await expect(usageCard).toContainText('非预言绝对');
    await expectNoHorizontalOverflow(page);
  });
});
