import { createPortal } from 'react-dom';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';

/**
 * ZoomableSvg — 给 SVG 图表组件补回「双击放大查看」+「右键复制为图像」能力。
 *
 * Phase 10 把 Canvas 图表替换为 SVG 后，丢失了 CanvasPanel 的 zoom portal。
 * 本组件包裹任意 SVG 图表子元素：
 * - 双击：把 SVG 的 outerHTML 放进全屏 portal 放大显示；Esc / 点背景 / × 关闭。
 * - 右键：把 SVG 渲染为 PNG 写入系统剪贴板，方便用户粘贴保存。
 * 视觉与 CanvasPanel zoom portal 对齐。
 */

interface ZoomableSvgProps {
  /** 放大弹窗标题 */
  title: string;
  /** 任意 SVG 图表组件（如 <ZiweiPalaceGrid />） */
  children: ReactNode;
  /** 自定义 className 包裹层 */
  className?: string;
}

/** 把 SVG 元素渲染为 PNG Blob（2x 高 DPI）。返回 Promise<Blob | null>。 */
async function svgToPngBlob(svg: SVGSVGElement, scale = 2): Promise<Blob | null> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  // 从 viewBox 推断尺寸；缺则用 getBoundingClientRect
  const viewBox = clone.getAttribute('viewBox');
  let w = 0;
  let h = 0;
  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(Number);
    if (parts.length === 4) {
      w = parts[2];
      h = parts[3];
    }
  }
  if (!w || !h) {
    const rect = svg.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
  }
  if (!w || !h) return null;
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));
  clone.removeAttribute('class');

  const xml = new XMLSerializer().serializeToString(clone);
  const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      // 纸面/夜面底色（Canvas 不能用 var()，读 CSS 变量计算值）
      const surfaceColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-surface').trim() || '#f7f3e8';
      ctx.fillStyle = surfaceColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    };
    img.onerror = () => resolve(null);
    img.src = svgUrl;
  });
}

export function ZoomableSvg({ title, children, className }: ZoomableSvgProps) {
  const reactId = useId();
  const zoomId = `svg-zoom-${reactId.replace(/:/g, '')}`;
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [zoomMarkup, setZoomMarkup] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const closeZoom = useCallback(() => setZoomMarkup(null), []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const openZoom = useCallback(() => {
    const svg = wrapperRef.current?.querySelector('svg');
    if (!svg) return;
    // 克隆 SVG 并确保放大时撑满容器宽度
    const clone = svg.cloneNode(true) as SVGElement;
    clone.removeAttribute('class');
    clone.setAttribute('style', 'width:100%;height:auto;display:block;');
    setZoomMarkup(clone.outerHTML);
  }, []);

  /** 右键复制为 PNG 到剪贴板 */
  const copyAsImage = useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault();
      const svg = wrapperRef.current?.querySelector('svg');
      if (!svg) {
        showToast('未找到图表');
        return;
      }
      const blob = await svgToPngBlob(svg as SVGSVGElement);
      if (!blob) {
        showToast('复制失败：图表渲染异常');
        return;
      }
      try {
        if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
          await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
          showToast('已复制图像到剪贴板');
        } else {
          showToast('当前浏览器不支持复制图像');
        }
      } catch {
        showToast('复制失败：浏览器拒绝写入剪贴板');
      }
    },
    [showToast],
  );

  useEffect(() => {
    if (!zoomMarkup) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeZoom();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeZoom, zoomMarkup]);

  return (
    <>
      <div
        ref={wrapperRef}
        className={className ? `${className} cursor-zoom-in` : 'cursor-zoom-in'}
        title="双击放大查看 · 右键复制为图像"
        onDoubleClick={openZoom}
        onContextMenu={copyAsImage}
      >
        {children}
      </div>
      {zoomMarkup &&
        createPortal(
          <div className="fixed inset-0 z-[9999] grid place-items-center p-4" role="presentation">
            <button
              type="button"
              aria-label="关闭放大图表"
              className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-md"
              onClick={closeZoom}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${zoomId}-title`}
              className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-[min(1040px,calc(100vw-2rem))] flex-col overflow-hidden rounded-panel border border-jade-500/25 bg-ink-950/95 shadow-[0_32px_100px_rgb(var(--shadow-rgb)/0.58)]"
            >
              <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-ink-900/92 px-5 py-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-jade-400">Chart Zoom</p>
                  <h2 id={`${zoomId}-title`} className="mt-1 text-lg font-semibold text-jade-50">{title}</h2>
                </div>
                <button
                  type="button"
                  aria-label="关闭放大图表"
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/6 text-2xl leading-none text-jade-100/70 transition hover:border-cinnabar-500/35 hover:bg-cinnabar-500/14 hover:text-red-100"
                  onClick={closeZoom}
                >
                  ×
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-auto bg-[radial-gradient(circle_at_top_left,rgb(var(--jade)/0.12),transparent_22rem),rgb(var(--ink-900)/0.78)] p-4 text-center">
                <div
                  // eslint-disable-next-line react/no-danger -- markup 来自本项目自有 SVG 组件的克隆，无外部输入
                  dangerouslySetInnerHTML={{ __html: zoomMarkup }}
                  className="mx-auto block h-auto w-full max-w-full rounded-card bg-ink-950 shadow-[0_22px_56px_rgb(var(--shadow-rgb)/0.38)]"
                />
              </div>
              <p className="border-t border-white/10 bg-ink-900/92 px-4 py-3 text-center text-xs text-jade-100/45">
                双击图表放大查看；右键复制为图像；按 Esc、点击背景或右上角 × 关闭。
              </p>
            </div>
          </div>,
          document.body,
        )}
      {toast &&
        createPortal(
          <div className="pointer-events-none fixed bottom-6 left-1/2 z-[10000] -translate-x-1/2 rounded-full border border-jade-500/30 bg-ink-900/95 px-5 py-2.5 text-sm text-jade-100 shadow-[0_12px_40px_rgb(var(--shadow-rgb)/0.5)] backdrop-blur-md">
            {toast}
          </div>,
          document.body,
        )}
    </>
  );
}
