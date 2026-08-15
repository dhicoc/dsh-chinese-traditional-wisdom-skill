import { test, expect } from '@playwright/test';
import { openWorkspace } from './p13-helpers';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5174';

async function seedHistory(page: import('@playwright/test').Page) {
  await page.waitForFunction(
    () => typeof (window as unknown as { HistoryStore?: { add?: unknown } }).HistoryStore?.add === 'function',
  );
  await page.evaluate(() => {
    const store = (window as unknown as {
      HistoryStore: { clear: () => void; clearFavorites: () => void; add: (entry: unknown) => void };
    }).HistoryStore;
    store.clear();
    store.clearFavorites();
    store.add({
      module: 'bazi',
      title: '八字 · 1990年6月15日',
      summary: '1990年6月15日 12时的阅读摘要',
      tags: ['1990年6月15日', '八字'],
      mode: 'local-exact',
    });
  });
}

test.describe('P1.3e 用户侧报告与隐私验收', () => {
  test.setTimeout(90000);

  test('报告清楚标识计算边界，且不导出完整出生日期与时辰', async ({ page }) => {
    const workspace = await openWorkspace(page, '八字命盘', 'bazi');

    await page.evaluate(() => {
      const originalCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = (blob) => {
        void blob.text().then((html) => window.sessionStorage.setItem('exported-report-html', html));
        return originalCreateObjectURL(blob);
      };
    });
    await workspace.getByRole('button', { name: '导出报告' }).click({ force: true });
    await expect.poll(() => page.evaluate(() => window.sessionStorage.getItem('exported-report-html'))).not.toBeNull();
    const report = await page.evaluate(() => window.sessionStorage.getItem('exported-report-html') ?? '');

    expect(report).toContain('传统文化参考');
    expect(report).toContain('计算状态');
    expect(report).toContain('使用限制与注意事项');
    expect(report).toContain('本报告内容仅作传统文化参考。');
    expect(report).toContain('限制与注意事项');
    expect(report).toContain('本次分析说明');
    expect(report).toContain('本次按出生资料排盘');
    expect(report).not.toContain('1990年出生');
    expect(report).not.toContain('1990年6月15日');
    expect(report).not.toContain('12时');
    expect(report).not.toContain('lunar-javascript');
    expect(report).not.toContain('Solar 全局对象');
    expect(report).toContain('本次推算已按传统历法口径处理，结果仅作传统文化参考。');
  });

  test('本地历史显示脱敏摘要，收藏在清空历史后仍被保留', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
    await seedHistory(page);
    await openWorkspace(page, '本地历史与收藏', 'history');

    const workspace = page.locator('[data-testid="workspace-history"]');
    await expect(workspace.getByRole('heading', { name: '本地历史与收藏', exact: true }).first()).toBeVisible({ timeout: 60000 });
    await expect(workspace.getByText('脱敏阅读摘要')).toBeVisible();
    await expect(workspace.getByText('1990年6月15日', { exact: true })).toHaveCount(0);
    const baziEntry = workspace.getByRole('article').filter({ hasText: '八字 · ****' });
    const entryText = await baziEntry.innerText();
    expect(entryText.match(/\*\*\*\*/g)).toHaveLength(3);

    await baziEntry.getByTitle('收藏').click();
    page.once('dialog', (dialog) => void dialog.accept());
    await workspace.getByRole('button', { name: '清空历史' }).click();
    await expect(workspace.getByText('暂无历史记录。生成命盘后会自动保存脱敏摘要。')).toBeVisible();

    await workspace.getByRole('button', { name: '收藏 (1)' }).click();
    await expect(workspace.getByTitle('取消收藏')).toBeVisible();
    await expect(workspace.getByText('数据完全本地化，不上传任何服务器。')).toBeVisible();
  });
});
