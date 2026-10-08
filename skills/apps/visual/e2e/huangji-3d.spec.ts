import { expect, test } from '@playwright/test';
const BASE_URL = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:5174/';
test.describe('皇极经世六十四卦 3D 渐进增强', () => {
  test.setTimeout(60_000);
  test('保留二维精读，并提供时间轮、巡行、分层和安全降级', async ({
    page,
  }, testInfo) => {
    await page.goto(`${BASE_URL}#huangji`);
    const workspace = page.getByTestId('workspace-huangji');
    const svg = workspace.getByTestId('huangji-gua-circle');
    await expect(svg).toBeVisible({ timeout: 60_000 });
    await workspace
      .getByRole('button', { name: '三维时间轮' })
      .evaluate((el) => (el as HTMLButtonElement).click());
    const host = workspace.getByTestId('huangji-time-wheel-3d');
    await page.waitForTimeout(1000);
    await expect
      .poll(async () => (await host.isVisible()) || (await svg.isVisible()), {
        timeout: 20_000,
      })
      .toBeTruthy();
    if (await host.isVisible()) {
      const canvas = host.getByRole('img', {
        name: /交互式三维皇极经世六十四卦时间轮/,
      });
      await expect(canvas).toBeVisible();
      await canvas.evaluate((element) =>
        element.scrollIntoView({ block: 'center' }),
      );
      await page.waitForTimeout(150);
      await canvas.evaluate((el) =>
        el.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
        ),
      );
      await expect(
        host.getByText(/六十四卦|正卦|世卦|年卦/).first(),
      ).toBeVisible();
      const wheel = await host.evaluate((el) => {
        el.dispatchEvent(new PointerEvent('pointerenter'));
        const canvasEl = el.querySelector('canvas');
        if (!canvasEl) return false;
        const event = new WheelEvent('wheel', {
          deltaY: 120,
          bubbles: true,
          cancelable: true,
        });
        canvasEl.dispatchEvent(event);
        el.dispatchEvent(new PointerEvent('pointerleave'));
        return event.defaultPrevented;
      });
      expect(wheel).toBe(true);
      await host
        .getByRole('button', { name: '时间轮' })
        .evaluate((el) => (el as HTMLButtonElement).click());
      await expect(host).toHaveAttribute('data-controls-enabled', 'true');
      await host
        .getByRole('button', { name: '分层' })
        .evaluate((el) => (el as HTMLButtonElement).click());
      await expect(host).toHaveAttribute('data-layers-separated', 'true');
      await expect(host).toHaveAttribute('data-controls-enabled', 'true');
      if (testInfo.project.name === 'chromium') {
        const before = await host.getAttribute('data-dial-rotation');
        const tour = host.getByRole('button', { name: '巡行' });
        await tour.evaluate((el) => (el as HTMLButtonElement).click());
        await expect
          .poll(() => host.getAttribute('data-dial-rotation'), {
            timeout: 3_000,
          })
          .not.toBe(before);
        await tour.evaluate((el) => (el as HTMLButtonElement).click());
      }
    } else {
      await expect(svg).toBeVisible();
      await expect(
        workspace.getByRole('button', { name: '二维精读' }),
      ).toHaveAttribute('aria-pressed', 'true');
    }
    await workspace
      .getByRole('button', { name: '二维精读' })
      .evaluate((el) => (el as HTMLButtonElement).click());
    await expect(svg).toBeVisible();
  });
});
