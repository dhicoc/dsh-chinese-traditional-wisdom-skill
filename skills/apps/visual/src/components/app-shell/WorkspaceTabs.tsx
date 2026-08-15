import { useEffect, useRef, useState } from 'react';
import type { ModuleId } from '@/lib/modules';
import { MODULES, MODULE_GROUPS, getModuleById } from '@/lib/modules';

interface WorkspaceTabsProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
}

/** easeInOutCubic 缓动（Apple 风格柔和加减速） */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** 自定义平滑滚动：rAF + cubic 缓动，比浏览器默认 linear-smooth 更柔和 */
function smoothScrollTo(el: HTMLElement, targetLeft: number, duration = 420) {
  const start = el.scrollLeft;
  const distance = targetLeft - start;
  if (Math.abs(distance) < 1) return;
  const startTime = performance.now();
  let rafId = 0;
  const tick = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    el.scrollLeft = start + distance * easeInOutCubic(progress);
    if (progress < 1) rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
  // 返回取消句柄（可选）
  return () => cancelAnimationFrame(rafId);
}

export function WorkspaceTabs({ activeModule, onSelectModule }: WorkspaceTabsProps) {
  const active = getModuleById(activeModule);
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  // 选中项变化时用自定义缓动滚动到可见区域（留 24px 边距，不完全贴边）
  useEffect(() => {
    const el = scrollRef.current;
    const btn = activeRef.current;
    if (!el || !btn) return;
    const elRect = el.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    // 选中项已在可见区内则不滚动
    const visible = btnRect.left >= elRect.left + 24 && btnRect.right <= elRect.right - 24;
    if (visible) return;
    // 计算让选中项居中或贴近可见侧的目标 scrollLeft
    const targetLeft = el.scrollLeft + (btnRect.left - elRect.left) - el.clientWidth / 2 + btnRect.width / 2;
    const clamped = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, targetLeft));
    smoothScrollTo(el, clamped);
  }, [activeModule]);

  // 跟踪滚动位置，控制左右指示器/箭头显隐
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      setCanLeft(el.scrollLeft > 4);
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    // 用自定义缓动替代浏览器默认 smooth
    const targetLeft = el.scrollLeft + dir * el.clientWidth * 0.6;
    const clamped = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, targetLeft));
    smoothScrollTo(el, clamped);
  };

  return (
    <div data-testid="workspace-tabs" className="rounded-panel border border-ink-700 bg-ink-850/70 p-2">
      <div className="relative flex items-center">
        {/* 左侧箭头 + 渐变 */}
        <button
          type="button"
          aria-label="向左滚动标签"
          onClick={() => scrollBy(-1)}
          className={`z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-ink-900/90 text-jade-100/70 transition-all duration-300 ease-out hover:scale-105 hover:text-jade-100 active:scale-95 ${
            canLeft ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          ‹
        </button>
        <div className="relative min-w-0 flex-1">
          <div
            ref={scrollRef}
            className="scrollbar-none flex gap-2 overflow-x-auto pb-1"
            role="tablist"
            aria-label="工作区标签"
          >
            {MODULES.map((module, idx) => {
              const isActive = module.id === activeModule;
              // 组间分隔符：当前模块的 group 与前一个不同时显示
              const prevModule = idx > 0 ? MODULES[idx - 1] : null;
              const showDivider = idx > 0 && prevModule && prevModule.group !== module.group;
              return (
                <span key={module.id} className="flex shrink-0 items-center gap-2">
                  {showDivider && <span className="h-4 w-px shrink-0 bg-white/10" />}
                  <button
                    ref={isActive ? activeRef : undefined}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => onSelectModule(module.id)}
                    className={[
                      'shrink-0 rounded-full border px-2 py-1.5 text-[11px] font-semibold transition-all duration-300 ease-out sm:px-3 sm:py-2 sm:text-xs',
                      isActive
                        ? 'border-jade-500/40 bg-jade-500/12 text-jade-50 shadow-[0_2px_12px_rgb(var(--jade)/0.18)]'
                        : 'border-transparent text-jade-100/45 hover:border-jade-500/20 hover:text-jade-100 hover:bg-jade-500/5',
                    ].join(' ')}
                  >
                    {module.title}
                  </button>
                </span>
              );
            })}
          </div>
          {/* 左右渐变遮罩，提示还有更多标签 */}
          <div
            className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-ink-850/90 to-transparent transition-opacity duration-300 ease-out ${
              canLeft ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div
            className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-ink-850/90 to-transparent transition-opacity duration-300 ease-out ${
              canRight ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>
        {/* 右侧箭头 + 渐变 */}
        <button
          type="button"
          aria-label="向右滚动标签"
          onClick={() => scrollBy(1)}
          className={`z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-ink-900/90 text-jade-100/70 transition-all duration-300 ease-out hover:scale-105 hover:text-jade-100 active:scale-95 ${
            canRight ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          ›
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-2 rounded-card border border-white/8 bg-black/20 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-serif text-2xl font-semibold text-jade-100">{active.title}</p>
          <p className="mt-1 text-sm leading-6 text-jade-100/55">{active.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-jade-500/25 bg-jade-500/10 px-3 py-1 text-xs text-jade-400">{active.statusLabel}</span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-jade-100/55">{active.privacyLevel}</span>
        </div>
      </div>
    </div>
  );
}
