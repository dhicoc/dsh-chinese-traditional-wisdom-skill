import { expect, test } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:5174/';

test.describe('二十八星宿 3D 渐进增强', () => {
  test.setTimeout(60_000);

  test('保留二维精读，并提供浑天、巡游、滚轮和安全降级', async ({ page }, testInfo) => {
    await page.goto(`${BASE_URL}#xingxiu`);
    const workspace = page.getByTestId('workspace-xingxiu');
    const svg = workspace.getByTestId('xingxiu-chart');
    await expect(svg).toBeVisible({ timeout: 60_000 });

    await workspace.getByRole('button', { name: '三维星盘' }).evaluate((element) => (element as HTMLButtonElement).click());
    const threeHost = workspace.getByTestId('xingxiu-chart-3d');
    await page.waitForTimeout(1_000);
    await expect.poll(async () => (await threeHost.isVisible()) || (await svg.isVisible()), { timeout: 20_000 }).toBeTruthy();
    const appeared = await threeHost.isVisible();

    if (appeared) {
      const canvas = threeHost.getByRole('img', { name: /交互式三维二十八星宿星盘/ });
      await expect(canvas).toBeVisible();
      await canvas.evaluate((element) => element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
      await expect(threeHost.getByText(/曜/).first()).toBeVisible();

      const wheelCapture = await threeHost.evaluate((host) => {
        host.dispatchEvent(new PointerEvent('pointerenter'));
        const canvasElement = host.querySelector('canvas');
        if (!canvasElement) return false;
        const wheel = new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true });
        canvasElement.dispatchEvent(wheel);
        host.dispatchEvent(new PointerEvent('pointerleave'));
        return wheel.defaultPrevented;
      });
      expect(wheelCapture).toBe(true);

      await threeHost.getByRole('button', { name: '浑天' }).evaluate((element) => (element as HTMLButtonElement).click());
      await expect(threeHost).toHaveAttribute('data-armillary-visible', 'true');
      await expect(threeHost).toHaveAttribute('data-controls-enabled', 'true');

      if (testInfo.project.name === 'chromium') {
        const rotationBefore = await threeHost.getAttribute('data-dial-rotation');
        const tour = threeHost.getByRole('button', { name: '巡游' });
        await tour.evaluate((element) => (element as HTMLButtonElement).click());
        await page.waitForTimeout(350);
        const rotationAfter = await threeHost.getAttribute('data-dial-rotation');
        expect(rotationAfter).not.toBe(rotationBefore);
        await tour.evaluate((element) => (element as HTMLButtonElement).click());
      }
    } else {
      await expect(svg).toBeVisible();
      await expect(workspace.getByRole('button', { name: '二维精读' })).toHaveAttribute('aria-pressed', 'true');
    }

    await workspace.getByRole('button', { name: '二维精读' }).evaluate((element) => (element as HTMLButtonElement).click());
    await expect(svg).toBeVisible();
  });
});
