import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow, openWorkspace } from './p13-helpers';

test.describe('P1.3o 八宅大游年用户侧验收', () => {
  test.setTimeout(90000);

  test('出生资料、房屋朝向与流年分别刷新命盘、命宅关系和合参结果', async ({ page }) => {
    await openWorkspace(page, '八宅大游年', 'bazhai');
    const workspace = page.locator('[data-testid="workspace-bazhai"]');

    await expect(workspace.getByRole('heading', { name: '八宅大游年', exact: true })).toBeVisible();
    await expect(workspace.locator('p').filter({ hasText: /^命卦$/ })).toBeVisible();
    await expect(workspace.locator('p').filter({ hasText: /^宅卦$/ })).toBeVisible();
    await expect(workspace.locator('p').filter({ hasText: /^命宅相配$/ })).toBeVisible();
    await expect(workspace.getByText('八宅命盘', { exact: true })).toBeVisible();
    await expect(workspace.getByText('八宅 + 飞星合参', { exact: true })).toBeVisible();
    await expect(workspace.getByText('太岁流年神煞', { exact: true })).toBeVisible();
    await expect(workspace.getByText('门主灶三要', { exact: true })).toBeVisible();

    const chart = workspace.getByTestId('eight-mansions-chart');
    const initialChart = await chart.textContent();
    const birthYear = workspace.getByLabel('出生年');
    await expect(birthYear).toHaveValue('1990');
    await birthYear.fill('1991');
    await expect(birthYear).toHaveValue('1991');
    await expect.poll(() => chart.textContent()).not.toBe(initialChart);
    await expect(chart).toHaveAttribute('aria-label', /八宅命盘 .+卦/);

    const compatibility = workspace.locator('p').filter({ hasText: /^命宅相配$/ }).locator('..').locator('..');
    const initialCompatibility = await compatibility.textContent();
    const facing = workspace.getByLabel('房屋朝向');
    await expect(facing).toHaveValue('南');
    await facing.selectOption('北');
    await expect(facing).toHaveValue('北');
    await expect.poll(() => compatibility.textContent()).not.toBe(initialCompatibility);

    const annual = workspace.getByText('八宅 + 飞星合参', { exact: true }).locator('..').locator('..');
    const initialAnnual = await annual.textContent();
    const flowYear = annual.getByRole('spinbutton');
    await expect(flowYear).toHaveValue('2026');
    await flowYear.fill('2025');
    await expect(flowYear).toHaveValue('2025');
    await expect.poll(() => annual.textContent()).not.toBe(initialAnnual);

    await expect(workspace.getByText('八宅游年仅作传统文化学习与方位参考，不构成风水操作或决策建议。')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
