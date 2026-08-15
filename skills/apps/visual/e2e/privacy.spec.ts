import { test, expect } from '@playwright/test';
const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5174';

/**
 * Privacy E2E Tests — 隐私测试（重写为真实校验）
 *
 * 验证：历史/收藏不保存完整生辰/姓名/地点；报告导出脱敏；
 * 30 条历史限制；全局生辰仅收集 年/月/日/时/性别 拆分字段。
 *
 * 实现说明（React 迁移后）：
 *  - 历史/收藏由 src/legacy/historyStore.ts 管理，并暴露在 window.HistoryStore
 *    （localStorage 键 FORTUNE_HISTORY / FORTUNE_FAVORITES），真实写入即走此 API。
 *  - 报告导出由 ExportReportButton 生成脱敏 JSON 并触发下载，不再有旧 FORTUNE.exportReportData 全局。
 *  - 生辰由 BirthPanel 收集，仅 年/月/日/时/性别/历法/精确节气 拆分字段，无完整日期输入。
 */

/** 等待历史存储就绪（window.HistoryStore 由 historyStore.ts 暴露） */
async function waitForStore(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as unknown as { HistoryStore?: { add?: unknown } }).HistoryStore?.add === 'function',
    { timeout: 12000 },
  );
}

async function exportReportHtml(page: import('@playwright/test').Page): Promise<string> {
  await page.evaluate(() => {
    const original = URL.createObjectURL;
    (window as unknown as { exportedReportBlob?: Blob }).exportedReportBlob = undefined;
    URL.createObjectURL = (blob) => {
      (window as unknown as { exportedReportBlob?: Blob }).exportedReportBlob = blob;
      return original.call(URL, blob);
    };
  });
  await page.getByRole('button', { name: /全局生辰/ }).click();
  const exportButton = page.locator('[data-testid="workspace-bazi"]').getByRole('button', { name: '导出报告', exact: true });
  await exportButton.evaluate((element) => {
    window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top - 220 });
  });
  await expect(exportButton).toBeInViewport();
  await exportButton.click();
  await page.waitForFunction(() => Boolean((window as unknown as { exportedReportBlob?: Blob }).exportedReportBlob));
  return page.evaluate(async () => (window as unknown as { exportedReportBlob: Blob }).exportedReportBlob.text());
}

/** 检查字符串是否含完整出生日期（yyyy-mm-dd 或 yyyy年mm月dd日） */
function hasFullDate(s: string): boolean {
  return /\d{4}-\d{2}-\d{2}/.test(s) || /\d{4}年\d{1,2}月\d{1,2}日/.test(s);
}

/** 检查历史/收藏条目是否含完整出生日期，排除 createdAt/id 等时间戳字段 */
function entryHasFullBirthDate(entry: Record<string, unknown>): boolean {
  const skipKeys = new Set(['createdAt', 'id', 'timestamp', 'generatedAt']);
  for (const [key, value] of Object.entries(entry)) {
    if (skipKeys.has(key)) continue;
    if (typeof value === 'string' && hasFullDate(value)) return true;
    if (typeof value === 'object' && value !== null) {
      const sub = JSON.stringify(value);
      if (hasFullDate(sub) && !sub.includes('"createdAt"')) return true;
    }
  }
  return false;
}

test.describe('Privacy - History Store', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
    await waitForStore(page);
    // 清空历史与收藏
    await page.evaluate(() => {
      const H = (window as unknown as { HistoryStore: { clear?: () => void; clearFavorites?: () => void } }).HistoryStore;
      if (H?.clear) H.clear();
      if (H?.clearFavorites) H.clearFavorites();
    });
  });

  test('历史记录不含完整出生日期', async ({ page }) => {
    // 通过 HistoryStore.add 添加一条带年份的记录（模拟真实使用）
    await page.evaluate(() => {
      const H = (window as unknown as { HistoryStore: { add: (e: unknown) => void } }).HistoryStore;
      H.add({ module: 'bazi', title: '八字测试', summary: '1990年男性命盘', tags: ['八字'], mode: 'local-exact' });
    });

    const raw = await page.evaluate(() => window.localStorage.getItem('FORTUNE_HISTORY'));
    expect(raw).toBeTruthy();
    const entries = JSON.parse(raw!);

    // 每条历史记录不应含完整出生日期（排除 createdAt 时间戳）
    for (const entry of entries) {
      expect(entryHasFullBirthDate(entry)).toBe(false);
    }
  });

  test('历史记录不含完整姓名', async ({ page }) => {
    await page.evaluate(() => {
      const H = (window as unknown as { HistoryStore: { add: (e: unknown) => void } }).HistoryStore;
      H.add({ module: 'bazi', title: '八字测试', summary: '命盘分析', tags: ['八字'], mode: 'local-exact' });
    });

    const raw = await page.evaluate(() => window.localStorage.getItem('FORTUNE_HISTORY'));
    const entries = JSON.parse(raw!);

    // 历史记录字段不应有 name/fullName 字段
    for (const entry of entries) {
      expect(entry.name).toBeUndefined();
      expect(entry.fullName).toBeUndefined();
      expect(entry.birthDate).toBeUndefined();
      expect(entry.location).toBeUndefined();
    }
  });

  test('历史记录不含地点信息', async ({ page }) => {
    await page.evaluate(() => {
      const H = (window as unknown as { HistoryStore: { add: (e: unknown) => void } }).HistoryStore;
      H.add({ module: 'fengshui', title: '风水测试', summary: '坐北朝南', tags: ['风水'], mode: 'local' });
    });

    const raw = await page.evaluate(() => window.localStorage.getItem('FORTUNE_HISTORY'));
    const entries = JSON.parse(raw!);

    for (const entry of entries) {
      // 不应有地点相关字段
      expect(entry.location).toBeUndefined();
      expect(entry.address).toBeUndefined();
      expect(entry.birthPlace).toBeUndefined();
      expect(entry.place).toBeUndefined();
    }
  });

  test('历史记录可含年份但不含月日', async ({ page }) => {
    await page.evaluate(() => {
      const H = (window as unknown as { HistoryStore: { add: (e: unknown) => void } }).HistoryStore;
      H.add({ module: 'bazi', title: '1990年命盘', summary: '分析', tags: [], mode: 'local-exact' });
    });

    const raw = await page.evaluate(() => window.localStorage.getItem('FORTUNE_HISTORY'));
    const entries = JSON.parse(raw!);

    for (const entry of entries) {
      // year 字段可以是 4 位数字
      if (entry.year) {
        expect(String(entry.year)).toMatch(/^\d{4}$/);
      }
      // 不应有 month/day 字段
      expect(entry.month).toBeUndefined();
      expect(entry.day).toBeUndefined();
      expect(entry.hour).toBeUndefined();
    }
  });
});

test.describe('Privacy - Favorites Store', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
    await waitForStore(page);
    await page.evaluate(() => {
      const H = (window as unknown as { HistoryStore: { clearFavorites?: () => void } }).HistoryStore;
      if (H?.clearFavorites) H.clearFavorites();
    });
  });

  test('收藏不含完整出生日期', async ({ page }) => {
    // 添加一条收藏
    await page.evaluate(() => {
      const H = (window as unknown as { HistoryStore: { add: (e: unknown) => void } }).HistoryStore;
      H.add({ module: 'bazi', title: '收藏测试', summary: '1990年命盘', tags: ['八字'], mode: 'local-exact', favorite: true });
    });

    const raw = await page.evaluate(() => window.localStorage.getItem('FORTUNE_FAVORITES'));
    if (raw) {
      const favs = JSON.parse(raw);
      for (const fav of favs) {
        expect(entryHasFullBirthDate(fav)).toBe(false);
        expect(fav.name).toBeUndefined();
        expect(fav.birthDate).toBeUndefined();
        expect(fav.location).toBeUndefined();
      }
    }
  });
});

test.describe('Privacy - Report Export', () => {
  test('报告导出为 HTML，不嵌入结构化出生资料字段', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
    await page.getByRole('tab', { name: '八字命盘' }).click();
    const workspace = page.locator('[data-testid="workspace-bazi"]');
    await expect(workspace).toBeVisible({ timeout: 10000 });

    const exportButton = workspace.getByRole('button', { name: '导出报告', exact: true });
    await expect(exportButton).toBeVisible();
    const raw = await exportReportHtml(page);

    expect(raw).toContain('<!doctype html>');
    expect(raw).toContain('<main>');
    expect(raw).not.toMatch(/"(?:birth|solarBirth|fullName|birthPlace|solarDate|lunarDate|queryDate)"\s*:/i);
  });

  test('报告不包含姓名或出生地点字段', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
    await page.getByRole('tab', { name: '八字命盘' }).click();
    const workspace = page.locator('[data-testid="workspace-bazi"]');
    await expect(workspace).toBeVisible({ timeout: 10000 });

    const exportButton = workspace.getByRole('button', { name: '导出报告', exact: true });
    await expect(exportButton).toBeVisible();
    const raw = await exportReportHtml(page);

    expect(raw).not.toMatch(/"(?:fullName|birthPlace|location)"\s*:/i);
  });
});

test.describe('Privacy - Birth Data Input', () => {
  test.beforeEach(async ({ page }) => {
    // 生辰输入面板位于桌面侧边栏，移动端隐藏；强制桌面视口以校验输入字段
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
  });

  test('全局生辰面板默认展开且含 年/月/日/时/分/性别 输入', async ({ page }) => {
    // BirthPanel 默认展开，位于侧边栏内
    const sidebar = page.locator('aside[data-testid="sidebar-nav"]');
    await expect(sidebar).toBeVisible();

    // 年/月/日/时/分使用拆分数字输入
    const numberInputs = sidebar.locator('input[type="number"]');
    await expect(numberInputs.first()).toBeVisible();
    await expect(numberInputs).toHaveCount(5);
    await expect(sidebar.getByLabel('全局出生分', { exact: true })).toBeVisible();
    // 性别下拉
    await expect(sidebar.locator('select')).toHaveCount(1);
  });

  test('全局生辰不收集完整日期字段', async ({ page }) => {
    const sidebar = page.locator('aside[data-testid="sidebar-nav"]');
    // 不应存在完整日期输入（date/datetime-local），仅 年/月/日/时 拆分字段
    await expect(sidebar.locator('input[type="date"], input[type="datetime-local"]')).toHaveCount(0);
  });
});

test.describe('Privacy - Data Retention', () => {
  test('历史限制 30 条', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
    await waitForStore(page);

    // 清空后添加 35 条（不同 title 避免去重）
    await page.evaluate(() => {
      const H = (window as unknown as { HistoryStore: { clear?: () => void; add: (e: unknown) => void } }).HistoryStore;
      if (H?.clear) H.clear();
      for (let i = 0; i < 35; i++) {
        H.add({ module: 'bazi', title: `test-${i}`, summary: 's', tags: [], mode: 'local' });
      }
    });

    const count = await page.evaluate(() => {
      const H = (window as unknown as { HistoryStore: { list?: () => unknown[] } }).HistoryStore;
      return H?.list ? H.list().length : -1;
    });
    expect(count).toBeLessThanOrEqual(30);
    expect(count).toBeGreaterThan(0);
  });
});
