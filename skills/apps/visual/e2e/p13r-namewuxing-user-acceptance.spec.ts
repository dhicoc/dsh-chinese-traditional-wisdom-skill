import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow, openWorkspace } from './p13-helpers';

test.describe('P1.3r 姓名五行用户侧验收', () => {
  test.setTimeout(90000);

  test('真实姓名输入驱动笔画、五格与五行结果刷新，并呈现传统参考边界', async ({ page }) => {
    await openWorkspace(page, '姓名五行', 'namewuxing');
    const workspace = page.locator('[data-testid="workspace-namewuxing"]');
    const surname = workspace.locator('input[type="text"]').nth(0);
    const givenName = workspace.locator('input[type="text"]').nth(1);
    const analyze = workspace.getByRole('button', { name: '分析五行', exact: true });

    await expect(workspace.getByRole('heading', { name: '姓名五行', exact: true })).toBeVisible();
    await expect(analyze).toBeDisabled();

    await surname.fill('张');
    await givenName.fill('伟');
    await expect(analyze).toBeEnabled();
    await analyze.click();

    await expect(workspace.getByRole('heading', { name: '字元笔画', exact: true })).toBeVisible();
    await expect(workspace.getByText('张', { exact: true })).toBeVisible();
    await expect(workspace.getByText('伟', { exact: true })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '五格数理', exact: true })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '三才配置', exact: true })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '五维评分', exact: true })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '五行平衡', exact: true })).toBeVisible();

    const firstSummary = await workspace.getByRole('heading', { name: '字元笔画', exact: true }).locator('..').textContent();
    await surname.fill('李');
    await givenName.fill('子涵');
    await analyze.click();
    await expect.poll(() => workspace.getByRole('heading', { name: '字元笔画', exact: true }).locator('..').textContent()).not.toBe(firstSummary);
    await expect(workspace.getByText('李', { exact: true })).toBeVisible();
    await expect(workspace.getByText('子', { exact: true })).toBeVisible();
    await expect(workspace.getByText('涵', { exact: true })).toBeVisible();

    const usageCard = workspace.locator('section').filter({ hasText: '使用说明' });
    await expect(usageCard).toBeVisible();
    await expect(usageCard).toContainText('姓名学为传统文化参考，不构成命名决策依据。');
    await expectNoHorizontalOverflow(page);
  });
});
