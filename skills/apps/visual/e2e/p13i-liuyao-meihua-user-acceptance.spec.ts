import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow, openWorkspace } from './p13-helpers';

test.describe('P1.3i 六爻与梅花用户侧验收', () => {
  test.setTimeout(90000);

  test('六爻按手动爻值和占问事项更新卦象、变卦与解读边界', async ({ page }) => {
    await openWorkspace(page, '六爻占卜', 'liuyao');
    const workspace = page.locator('[data-testid="workspace-liuyao"]');

    await expect(workspace.getByRole('heading', { name: '六爻占卜', exact: true })).toBeVisible();
    await expect(workspace.getByText('六爻为传统文化占问参考，非绝对预测；同一事不宜反复起卦。')).toBeVisible();

    await workspace.getByLabel('起卦方式').selectOption('manual');
    await workspace.getByLabel('占问事项（影响用神选取）').fill('今年财运如何');
    await workspace.getByLabel('爻值（初爻→上爻）').fill('677777');

    await expect(workspace.getByText('天风姤', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByText('乾为天', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByText('妻财', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByText('动爻', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByText('1', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '本卦', exact: true })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '变卦', exact: true })).toBeVisible();
    await expect(workspace.getByTestId('hexagram-chart').first()).toBeVisible();
    await expect(workspace.getByText('纳甲六爻明细')).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });

  test('梅花按数字起卦生成卦象与参考策略', async ({ page }) => {
    await openWorkspace(page, '梅花易数', 'meihua');
    const workspace = page.locator('[data-testid="workspace-meihua"]');

    await expect(workspace.getByRole('heading', { name: '梅花易数', exact: true })).toBeVisible();
    await expect(workspace.getByText('梅花易数为传统文化观察参考，非绝对预测或现实决策依据。')).toBeVisible();

    await workspace.getByLabel('起卦方式').selectOption('number');
    await workspace.getByLabel('数字一').fill('3');
    await workspace.getByLabel('数字二').fill('5');

    await expect(workspace.getByTestId('meihua-chart')).toBeVisible();
    await expect(workspace.getByText('数字起卦', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByText('火地', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByText('第2爻', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByText('体生用', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByText('本卦 · 互卦 · 变卦', { exact: true })).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
});
