import { expect, test } from '@playwright/test';
import {
  BASE_URL,
  expectNoHorizontalOverflow,
  openWorkspace,
  visibleBirthInput,
} from './p13-helpers';

test.describe('P1.4b 全局 Shell 用户侧验收', () => {
  test.setTimeout(90000);

  test('桌面全局生辰离焦提交会刷新首页命盘，确认后可重置默认资料', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE_URL);
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: '玄枢' })).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible();

    const birthYear = visibleBirthInput(page, 'year');
    const homeBaziPlate = page.getByTestId('home-bazi-plate');
    const birthSummary = page.getByRole('button', { name: /全局生辰/ });

    await expect(birthYear).toHaveValue('1990');
    await expect(homeBaziPlate).toBeVisible();
    const previousPlateText = await homeBaziPlate.textContent();
    if (!previousPlateText) {
      throw new Error('首页四柱环形命盘未提供可比较的用户可见文本。');
    }

    await birthYear.fill('1991');
    await birthYear.press('Tab');

    await expect(birthYear).toHaveValue('1991');
    await expect(birthSummary).toContainText('1991-06-15');
    await expect.poll(() => homeBaziPlate.textContent()).not.toBe(previousPlateText);

    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toBe('确定重置生辰为默认值（1990-06-15 12时 男）？');
      await dialog.accept();
    });
    await page.getByRole('button', { name: '重置' }).click();

    await expect(birthYear).toHaveValue('1990');
    await expect(birthSummary).toContainText('1990-06-15');
    await expect(page.locator('span:visible').filter({ hasText: '当前为默认生辰（1990-06-15），请修改为您的真实出生信息以查看真实排盘结果。' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('命令面板搜索八字命盘后抵达目标工作区', async ({ page }) => {
    const workspace = await openWorkspace(page, '八字命盘', 'bazi');

    await expect(workspace.getByRole('heading', { name: '四柱主盘' })).toBeVisible({ timeout: 60000 });
  });

  test('移动端可访问全局生辰且 Shell 不产生横向溢出', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
    await expect(page.locator('[data-testid="workspace-tabs"]').first()).toBeVisible();
    await expect(visibleBirthInput(page, 'year')).toBeVisible();
    await expect(page.getByRole('button', { name: /全局生辰/ })).toBeVisible();
    await expect(page.locator('span:visible').filter({ hasText: '当前为默认生辰（1990-06-15），请修改为您的真实出生信息以查看真实排盘结果。' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
