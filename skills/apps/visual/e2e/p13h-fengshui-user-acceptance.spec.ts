import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow, visibleBirthInput } from './p13-helpers';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5174';

test.describe('P1.3h 风水罗盘用户侧验收', () => {
  test.setTimeout(90000);

  test('坐向、流年与全局生辰驱动风水展示，并保留传统参考边界', async ({ page }) => {
    await page.goto(`${BASE_URL}#fengshui`);
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();

    const workspace = page.locator('[data-testid="workspace-fengshui"]');
    await expect(workspace.getByRole('heading', { name: '风水罗盘', exact: true })).toBeVisible({ timeout: 60000 });
    const compass = workspace.getByTestId('fengshui-compass');
    await expect(compass).toBeVisible();
    await expect(page.getByText('未作现实世界验证，仅供学习和参考。')).toBeVisible();
    await expect(workspace.getByText('罗盘展示仅作传统文化学习与方位认知参考，不构成实地勘测或布局建议。')).toBeVisible();

    await workspace.getByLabel('房屋坐向').selectOption('子午');
    await expect(compass).toHaveAttribute('aria-label', '二十四山风水罗盘，坐子向午');
    await expect(workspace.getByText('坐子向午', { exact: true })).toBeVisible();
    await expect(workspace.getByText('当前坐子向午，罗盘已旋转对准。')).toBeVisible();

    const year = workspace.getByLabel('流年年份');
    await year.fill('2023');
    await year.press('Tab');
    await expect(workspace.getByText('八运（2004-2023）')).toBeVisible();
    await year.fill('2024');
    await year.press('Tab');
    await expect(workspace.getByText('九运（2024-2043）')).toBeVisible();
    await expect(workspace.getByText('流年方位吉凶')).toBeVisible();
    await expect(workspace.getByText('化煞建议')).toBeVisible();

    const mingGua = workspace.getByText(/命卦：.+卦 ·/).first();
    const previousMingGua = await mingGua.textContent();
    const birthYear = visibleBirthInput(page, 'year');
    await birthYear.fill('1991');
    await birthYear.press('Tab');
    await expect(mingGua).not.toHaveText(previousMingGua ?? '');
    await expect(workspace.getByText('命卦合参', { exact: true })).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
});
