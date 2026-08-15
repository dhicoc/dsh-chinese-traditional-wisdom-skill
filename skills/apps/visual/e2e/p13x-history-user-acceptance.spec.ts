import { test, expect } from '@playwright/test';
import { BASE_URL, expectNoHorizontalOverflow, openWorkspace } from './p13-helpers';

test.describe('P1.3x 本地历史与收藏用户侧验收', () => {
  test.setTimeout(90000);

  test('导航记录可收藏、删除，并呈现本地脱敏隐私边界', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();

    await openWorkspace(page, '古籍阅读', 'reader');
    const workspace = await openWorkspace(page, '本地历史与收藏', 'history');

    await expect(workspace.locator('h2').filter({ hasText: '本地历史与收藏' })).toBeVisible();
    await expect(workspace.getByText('历史记录', { exact: true })).toBeVisible();
    await expect(workspace.getByRole('button', { name: '收藏 (0)', exact: true })).toBeVisible();
    await expect(workspace.getByText('最大保留数', { exact: true })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '古籍阅读', exact: true })).toBeVisible();

    const readerEntry = workspace.getByRole('heading', { name: '古籍阅读', exact: true }).locator('xpath=ancestor::article');
    await readerEntry.getByTitle('收藏').click();
    await expect(readerEntry.getByTitle('取消收藏')).toBeVisible();

    await workspace.getByRole('button', { name: /收藏 \(1\)/ }).click();
    await expect(workspace.getByRole('heading', { name: '古籍阅读', exact: true })).toBeVisible();

    await workspace.getByRole('button', { name: /历史 \(2\)/ }).click();
    const readerEntryInHistory = workspace.getByRole('heading', { name: '古籍阅读', exact: true }).locator('xpath=ancestor::article');
    await readerEntryInHistory.getByRole('button', { name: '删除', exact: true }).click();
    await expect(workspace.getByRole('heading', { name: '古籍阅读', exact: true })).toHaveCount(0);

    await expect(workspace.getByText('仅保留模块、标题、摘要和标签，不保存完整姓名、完整出生日期或具体地点。')).toBeVisible();
    await expect(workspace.getByText('数据完全本地化，不上传任何服务器。')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
