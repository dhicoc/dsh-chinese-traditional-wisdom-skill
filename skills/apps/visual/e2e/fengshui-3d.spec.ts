import { expect, test } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:5174/';

test.describe('风水罗盘 3D 渐进增强', () => {
  test.setTimeout(60_000);
  test('保留二维精读，并可切换三维交互或安全降级', async ({ page }, testInfo) => {
    await page.goto(`${BASE_URL}#fengshui`);
    const workspace = page.getByTestId('workspace-fengshui');
    const svg = workspace.getByTestId('fengshui-compass');
    await expect(svg).toBeVisible({ timeout: 60_000 });

    await workspace.getByRole('button', { name: '三维交互' }).click();
    const threeHost = workspace.getByTestId('fengshui-compass-3d');
    await page.waitForTimeout(1_000);
    await expect.poll(async () => (await threeHost.isVisible()) || (await svg.isVisible()), { timeout: 20_000 }).toBeTruthy();
    const appeared = await threeHost.isVisible();

    if (appeared) {
      const canvas = threeHost.getByRole('img', { name: /交互式三维二十四山风水罗盘/ });
      await expect(canvas).toBeVisible();
      await canvas.evaluate((element) => {
        (element as HTMLElement).focus();
        element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      });
      await expect(threeHost.getByText(/山/).first()).toBeVisible();
      const wheelCapture = await threeHost.evaluate((host) => {
        host.dispatchEvent(new PointerEvent('pointerenter'));
        const canvasElement = host.querySelector('canvas');
        if (!canvasElement) return { prevented: false, active: false };
        const wheel = new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true });
        canvasElement.dispatchEvent(wheel);
        const active = host.getAttribute('data-wheel-capture') === 'active';
        host.dispatchEvent(new PointerEvent('pointerleave'));
        return { prevented: wheel.defaultPrevented, active };
      });
      expect(wheelCapture).toEqual({ prevented: true, active: true });
      if (testInfo.project.name === 'chromium') {
        const spinButton = threeHost.getByRole('button', { name: '自转' });
        const rotationBefore = await threeHost.getAttribute('data-dial-rotation');
        await spinButton.evaluate((element) => (element as HTMLButtonElement).click());
        await page.waitForTimeout(350);
        const rotationAfter = await threeHost.getAttribute('data-dial-rotation');
        expect(rotationAfter).not.toBe(rotationBefore);
        await spinButton.evaluate((element) => (element as HTMLButtonElement).click());

        const box = await canvas.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          const scrollBefore = await page.evaluate(() => window.scrollY);
          await page.mouse.wheel(0, 240);
          await page.waitForTimeout(100);
          const scrollAfter = await page.evaluate(() => window.scrollY);
          expect(scrollAfter).toBe(scrollBefore);
        }
      }

      const explode = threeHost.getByRole('button', { name: '分层' });
      await explode.evaluate((element) => (element as HTMLButtonElement).click());
      await expect(threeHost.getByRole('button', { name: '合拢' })).toHaveAttribute('aria-pressed', 'true');
      await expect(threeHost).toHaveAttribute('data-controls-enabled', 'true');
      const separatedWheel = await threeHost.evaluate((host) => {
        host.dispatchEvent(new PointerEvent('pointerenter'));
        const canvasElement = host.querySelector('canvas');
        if (!canvasElement) return false;
        const wheel = new WheelEvent('wheel', { deltaY: -120, bubbles: true, cancelable: true });
        canvasElement.dispatchEvent(wheel);
        host.dispatchEvent(new PointerEvent('pointerleave'));
        return wheel.defaultPrevented;
      });
      expect(separatedWheel).toBe(true);
      if (testInfo.project.name === 'chromium') {
        const spinButton = threeHost.getByRole('button', { name: '自转' });
        const rotationBefore = await threeHost.getAttribute('data-dial-rotation');
        await spinButton.evaluate((element) => (element as HTMLButtonElement).click());
        await page.waitForTimeout(350);
        const rotationAfter = await threeHost.getAttribute('data-dial-rotation');
        expect(rotationAfter).not.toBe(rotationBefore);
        await spinButton.evaluate((element) => (element as HTMLButtonElement).click());

        const box = await canvas.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
          const cameraBefore = await threeHost.getAttribute('data-camera-position');
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 30, { steps: 8 });
          await page.mouse.up();
          await page.waitForTimeout(200);
          const cameraAfter = await threeHost.getAttribute('data-camera-position');
          expect(cameraAfter).not.toBe(cameraBefore);
        }
      }
    } else {
      await expect(svg).toBeVisible();
      await expect(workspace.getByRole('button', { name: '二维精读' })).toHaveAttribute('aria-pressed', 'true');
    }

    await workspace.getByRole('button', { name: '二维精读' }).evaluate((element) => (element as HTMLButtonElement).click());
    await expect(svg).toBeVisible();
    await expect(svg).toHaveAttribute('aria-label', /二十四山风水罗盘/);
  });
});
