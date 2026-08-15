import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow, openWorkspace } from './p13-helpers';

test.describe('P1.3j 五运六气用户侧验收', () => {
  test.setTimeout(90000);

  test('年份切换同步更新岁运、司天在泉、图表与传统医学边界', async ({ page }) => {
    await openWorkspace(page, '五运六气', 'yunqi');
    const workspace = page.locator('[data-testid="workspace-yunqi"]');

    await expect(workspace.getByRole('heading', { name: '五运六气', exact: true })).toBeVisible();
    await expect(workspace.locator('aside p').filter({ hasText: /五运六气输出仅作传统文化和气候病机理论学习参考，不构成医学诊断或治疗建议/ })).toBeVisible();

    const year = workspace.getByLabel('年份');
    await year.fill('2024');
    await expect(year).toHaveValue('2024');
    await expect(workspace.getByText('甲辰', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByText('土运太过', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByText('太阳寒水', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByText('太阴湿土', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByTestId('yunqi-chart')).toHaveAttribute('aria-label', /^五运六气 2024年 甲辰，查询日期/);
    await expect(workspace.getByText(/客气六步 · 查询日期所在步位以金边标出/)).toBeVisible();
    await expect(workspace.getByText('五运六气解读', { exact: true })).toBeVisible();

    await year.fill('1990');
    await expect(year).toHaveValue('1990');
    await expect(workspace.getByText('庚午', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByText('金运太过', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByText('少阴君火', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByText('阳明燥金', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByTestId('yunqi-chart')).toHaveAttribute('aria-label', /^五运六气 1990年 庚午，查询日期/);
    await expect(workspace.getByText('甲辰', { exact: true })).toHaveCount(0);

    await expectNoHorizontalOverflow(page);
  });
});
