import { createPortal } from 'react-dom';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

interface CanvasPanelProps<TData> {
  title: string;
  description: string;
  data: TData;
  width: number;
  height: number;
  render: (canvasId: string, data: TData) => void;
  ready: boolean;
}

export function CanvasPanel<TData>({ title, description, data, width, height, render, ready }: CanvasPanelProps<TData>) {
  const reactId = useId();
  const canvasId = `canvas-${reactId.replace(/:/g, '')}`;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);

  const closeZoom = useCallback(() => setZoomSrc(null), []);

  useEffect(() => {
    if (!zoomSrc) return;
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
  }, [closeZoom, zoomSrc]);

  const openZoom = useCallback(() => {
    if (!canvasRef.current) return;
    setZoomSrc(canvasRef.current.toDataURL('image/png'));
  }, []);

  useEffect(() => {
    if (!ready || !canvasRef.current) return;
    try {
      setError(null);
      render(canvasId, data);
      if (canvasRef.current) canvasRef.current.style.height = 'auto';
    } catch {
      setError('命盘暂时无法显示，请稍后重试。');
    }
  }, [canvasId, data, ready, render]);

  return (
    <>
      <section className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-jade-50">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-jade-100/55">{description}</p>
          </div>
        </div>
        <div className="canvas-stage overflow-x-auto rounded-card border border-jade-500/18 bg-ink-950/92 p-3">
          <canvas
            ref={canvasRef}
            id={canvasId}
            width={width}
            height={height}
            className="theme-canvas mx-auto block h-auto max-w-full cursor-zoom-in rounded-card transition duration-200 hover:shadow-[0_0_36px_rgb(var(--jade)/0.18)]"
            title="双击放大查看"
            onDoubleClick={openZoom}
          />
        </div>
        {!ready && <p className="mt-3 text-sm text-jade-100/45">正在生成命盘图…</p>}
        {error && <p className="mt-3 rounded-card border border-cinnabar-500/30 bg-cinnabar-500/10 p-3 text-sm text-red-200">{error}</p>}
      </section>
      {zoomSrc && createPortal(
        <div className="fixed inset-0 z-[9999] grid place-items-center p-4" role="presentation">
          <button
            type="button"
            aria-label="关闭放大命盘"
            className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-md"
            onClick={closeZoom}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${canvasId}-zoom-title`}
            className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-[min(1040px,calc(100vw-2rem))] flex-col overflow-hidden rounded-panel border border-jade-500/25 bg-ink-950/95 shadow-[0_32px_100px_rgb(var(--shadow-rgb)/0.58)]"
          >
            <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-ink-900/92 px-5 py-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-jade-400">命盘图</p>
                <h2 id={`${canvasId}-zoom-title`} className="mt-1 text-lg font-semibold text-jade-50">{title}</h2>
              </div>
              <button
                type="button"
                aria-label="关闭放大命盘"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/6 text-2xl leading-none text-jade-100/70 transition hover:border-cinnabar-500/35 hover:bg-cinnabar-500/14 hover:text-red-100"
                onClick={closeZoom}
              >
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-[radial-gradient(circle_at_top_left,rgb(var(--jade)/0.12),transparent_22rem),rgb(var(--shadow-rgb)/0.78)] p-4 text-center">
              <img
                src={zoomSrc}
                alt={`${title} 放大图像`}
                className="mx-auto block h-auto max-w-full rounded-card bg-ink-950 shadow-[0_22px_56px_rgb(var(--shadow-rgb)/0.38)]"
              />
            </div>
            <p className="border-t border-white/10 bg-ink-900/92 px-4 py-3 text-center text-xs text-jade-100/45">
              双击图像可放大查看；点击背景或右上角 × 即可关闭。
            </p>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
