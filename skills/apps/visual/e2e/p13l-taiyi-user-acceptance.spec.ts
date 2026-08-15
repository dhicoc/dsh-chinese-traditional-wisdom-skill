import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow, openWorkspace } from './p13-helpers';

test.describe('P1.3l 太乙神数用户侧验收', () => {
  test.setTimeout(90000);

  test('计式与积年法切换保持九宫盘和完整解读，并呈现传统参考边界', async ({ page }) => {
    await openWorkspace(page, '太乙神数', 'taiyi');
    const workspace = page.locator('[data-testid="workspace-taiyi"]');

    await expect(workspace.getByRole('heading', { name: '太乙神数', exact: true })).toBeVisible();
    await expect(workspace.getByText('排盘信息', { exact: true })).toBeVisible();
    await expect(workspace.getByText('太乙落宫与二目', { exact: true })).toBeVisible();
    await expect(workspace.getByText('主客算与四将', { exact: true })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '格局', exact: true })).toBeVisible();
    await expect(workspace.getByText('太乙神数解读', { exact: true })).toBeVisible();

    const chart = workspace.getByTestId('taiyi-chart');
    await expect(chart).toHaveAttribute('aria-label', '太乙九宫落宫式盘');
    const initialChart = await chart.textContent();

    const jiStyle = workspace.getByLabel('太乙计式');
    await expect(jiStyle).toHaveValue('0');
    await jiStyle.selectOption('3');
    await expect(jiStyle).toHaveValue('3');
    await expect(chart).toBeVisible();
    await expect.poll(() => chart.textContent()).not.toBe(initialChart);

    const acumYear = workspace.getByLabel('积年法');
    await expect(acumYear).toHaveValue('0');
    const timeChart = await chart.textContent();
    await acumYear.selectOption('1');
    await expect(acumYear).toHaveValue('1');
    await expect(chart).toBeVisible();
    await expect.poll(() => chart.textContent()).not.toBe(timeChart);
    await expect(workspace.getByText('八门与三将', { exact: true })).toBeVisible();

    await expect(workspace.getByText('太乙神数结果仅作传统术数文化学习参考，不作为现实决策依据。')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
