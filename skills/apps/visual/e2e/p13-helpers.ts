import { expect, type Locator, type Page } from '@playwright/test';

export const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5174';
export type BirthField = 'year' | 'month' | 'day' | 'hour' | 'minute';
const BIRTH_FIELD_ARIA_LABEL: Record<BirthField, string> = {
  year: '全局出生年', month: '全局出生月', day: '全局出生日', hour: '全局出生时', minute: '全局出生分',
};
export async function openWorkspace(page: Page, title: string, workspaceId: string): Promise<Locator> {
  await page.goto(BASE_URL);
  await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
  await page.getByRole('button', { name: '打开命令面板' }).click();
  await page.getByTestId('command-input').fill(title);
  await page.getByTestId('command-result').filter({ hasText: title }).filter({ hasText: '导航' }).click();
  const workspace = page.locator(`[data-testid="workspace-${workspaceId}"]`);
  await expect(workspace).toBeVisible({ timeout: 60000 });
  return workspace;
}
export function visibleBirthInput(page: Page, field: BirthField): Locator {
  return page.locator(`input[aria-label="${BIRTH_FIELD_ARIA_LABEL[field]}"]:visible`);
}
export async function fillVisibleBirthField(page: Page, field: BirthField, value: string): Promise<void> {
  const input = visibleBirthInput(page, field);
  await input.fill(value);
  await input.blur();
}
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const viewport = await page.viewportSize();
  if (!viewport) throw new Error('P1.3 layout assertions require a configured viewport.');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 1);
}
