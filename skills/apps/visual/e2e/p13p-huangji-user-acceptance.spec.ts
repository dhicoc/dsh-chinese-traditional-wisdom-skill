import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow, openWorkspace, visibleBirthInput } from './p13-helpers';

test.describe('P1.3p 皇极经世用户侧验收', () => {
  test.setTimeout(90000);

  test('全局出生年份刷新元会运世、九卦圆图与解读，并呈现传统参考边界', async ({ page }) => {
    await openWorkspace(page, '皇极经世', 'huangji');
    const workspace = page.locator('[data-testid="workspace-huangji"]');

    await expect(workspace.getByRole('heading', { name: '皇极经世', exact: true })).toBeVisible();
    await expect(workspace.getByText('起盘信息', { exact: true })).toBeVisible();
    await expect(workspace.getByText('九卦配置', { exact: true })).toBeVisible();
    await expect(workspace.getByText('先天六十四卦圆图', { exact: true })).toBeVisible();
    await expect(workspace.getByText('趋势解读', { exact: true })).toBeVisible();
    await expect(workspace.getByText('皇极经世解读', { exact: true })).toBeVisible();

    const chart = workspace.getByTestId('huangji-gua-circle');
    await expect(chart).toHaveAttribute('aria-label', '皇极经世先天六十四卦圆图');
    const initialChart = await chart.textContent();
    const acumYear = workspace.getByText(/^积年\d+年$/, { exact: true });
    const initialAcumYear = await acumYear.textContent();
    const birthYear = visibleBirthInput(page, 'year');
    await expect(birthYear).toHaveValue('1990');

    await birthYear.fill('1991');
    await birthYear.press('Tab');
    await expect(birthYear).toHaveValue('1991');
    await expect.poll(() => chart.textContent()).not.toBe(initialChart);
    await expect.poll(() => acumYear.textContent()).not.toBe(initialAcumYear);

    await birthYear.fill('1990');
    await birthYear.press('Tab');
    await expect(birthYear).toHaveValue('1990');
    await expect.poll(() => chart.textContent()).toBe(initialChart);
    await expect.poll(() => acumYear.textContent()).toBe(initialAcumYear);

    await expect(workspace.getByText('皇极经世结果仅作传统象数文化学习参考，不作为现实决策依据。')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
