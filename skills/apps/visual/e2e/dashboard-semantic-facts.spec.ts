import { expect, test } from '@playwright/test';
import { readFileSync } from 'fs';
import { openWorkspace } from './p13-helpers';

test.describe('跨 Workspace 语义报告边界', () => {
  test.setTimeout(90000);

  test('二十八星宿展示经核对事实、传统解释边界，并将其导出到 HTML', async ({ page }) => {
    const workspace = await openWorkspace(page, '二十八星宿', 'xingxiu');

    await expect(workspace.getByRole('heading', { name: '二十八星宿', exact: true })).toBeVisible();
    const factCheck = workspace.getByText('结构化事实核对', { exact: true }).locator('..');
    await expect(factCheck).toBeVisible();
    await expect(factCheck.locator('dt').filter({ hasText: '当日值宿' })).toBeVisible();
    await expect(factCheck.locator('dt').filter({ hasText: '值宿全称' })).toBeVisible();
    await expect(workspace.getByRole('button', { name: /查看传统解释/ })).toBeVisible();
    await expect(workspace.getByText('免责声明', { exact: true })).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      workspace.getByRole('button', { name: '导出报告', exact: true }).click(),
    ]);
    const path = await download.path();
    expect(path).toBeTruthy();
    const report = readFileSync(path!, 'utf-8');
    expect(report).toContain('结构化事实核对');
    expect(report).toContain('传统解释');
    expect(report).toContain('免责声明');
  });

  test('五运六气将年份和干支等核对事实随稳定年份切换刷新', async ({ page }) => {
    const workspace = await openWorkspace(page, '五运六气', 'yunqi');
    const year = workspace.getByLabel('年份');

    const factCheck = workspace.getByText('结构化事实核对', { exact: true }).locator('..');
    await expect(factCheck).toBeVisible();
    await expect(factCheck.locator('dt').filter({ hasText: '年份' })).toBeVisible();
    await expect(factCheck.locator('dt').filter({ hasText: '天干' })).toBeVisible();
    await expect(factCheck.locator('dt').filter({ hasText: '地支' })).toBeVisible();

    await year.fill('2024');
    await expect(year).toHaveValue('2024');
    await expect(workspace.getByText('甲', { exact: true })).toBeVisible();
    await expect(workspace.getByText('辰', { exact: true })).toBeVisible();
    await expect(workspace.getByText('土运太过', { exact: true }).first()).toBeVisible();

    await year.fill('1990');
    await expect(year).toHaveValue('1990');
    await expect(workspace.getByText('庚', { exact: true })).toBeVisible();
    await expect(workspace.getByText('午', { exact: true })).toBeVisible();
    await expect(workspace.getByText('金运太过', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByText('甲', { exact: true })).toHaveCount(0);
  });

  test('事件决策作为无 verifier 合约的联合模式不显示结构化事实', async ({ page }) => {
    await openWorkspace(page, '联合分析', 'combo');
    const workspace = page.getByRole('main');

    await workspace.getByRole('button', { name: /事件决策/ }).click();
    await expect(workspace.getByText('联合分析计算中', { exact: true })).toHaveCount(0, { timeout: 60000 });
    await expect(workspace.getByRole('heading', { name: '联合分析', exact: true })).toBeVisible();
    await expect(workspace.getByText('各术数看法', { exact: true })).toBeVisible();
    await expect(workspace.getByRole('button', { name: /查看传统解释/ })).toBeVisible();
    await expect(workspace.getByText('免责声明', { exact: true })).toBeVisible();
    await expect(workspace.getByText('结构化事实核对', { exact: true })).toHaveCount(0);
  });
});
