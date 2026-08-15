import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow, openWorkspace, visibleBirthInput } from './p13-helpers';

test.describe('P1.3v 二十八星宿用户侧验收', () => {
  test.setTimeout(90000);

  test('全局出生年份和计算口径刷新星宿结果，并呈现传统参考边界', async ({ page }) => {
    await openWorkspace(page, '二十八星宿', 'xingxiu');
    const workspace = page.locator('[data-testid="workspace-xingxiu"]');
    const birthYear = visibleBirthInput(page, 'year');
    const birthCard = workspace.getByText('本命星宿', { exact: true }).locator('..');

    await expect(workspace.getByRole('heading', { name: '二十八星宿', exact: true })).toBeVisible();
    await expect(workspace.locator('aside > div').first().locator('p').filter({ hasText: /^当日值宿$/ })).toBeVisible();
    await expect(birthCard).toBeVisible();
    await expect(workspace.getByTestId('xingxiu-chart')).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '二十八星宿解读', exact: true })).toBeVisible();
    await expect(birthYear).toHaveValue('1990');

    const initialBirth = await birthCard.textContent();
    await birthYear.fill('1991');
    await birthYear.press('Tab');
    await expect(birthYear).toHaveValue('1991');
    await expect.poll(() => birthCard.textContent()).not.toBe(initialBirth);

    const lookup = workspace.getByRole('button', { name: '查表法', exact: true });
    const rotational = workspace.getByRole('button', { name: '轮转法', exact: true });
    await lookup.click();
    await expect(lookup).toHaveClass(/bg-jade-500\/20/);
    await rotational.click();
    await expect(rotational).toHaveClass(/bg-jade-500\/20/);

    await birthYear.fill('1990');
    await birthYear.press('Tab');
    await expect(birthYear).toHaveValue('1990');
    await expect(workspace.getByText('二十八星宿结果仅作传统文化学习参考，不作为现实决策依据。')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
