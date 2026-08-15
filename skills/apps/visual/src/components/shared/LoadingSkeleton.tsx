/**
 * LoadingSkeleton — 加载态骨架屏（UX P0）
 *
 * 替代各工作区的纯文字「正在加载…」，给用户「在动」的视觉反馈。
 * 低饱和脉动 jade 色块，对齐项目暗色主题。
 */

interface LoadingSkeletonProps {
  /** 提示文字，可选 */
  label?: string;
  /** 骨架块行数，默认 3 */
  rows?: number;
}

export function LoadingSkeleton({ label = '加载中', rows = 3 }: LoadingSkeletonProps) {
  return (
    <div className="space-y-3 py-8">
      {/* 脉动指示点 */}
      <div className="flex items-center justify-center gap-1.5">
        <span className="h-2 w-2 animate-pulse rounded-full bg-jade-500/60" style={{ animationDelay: '0ms' }} />
        <span className="h-2 w-2 animate-pulse rounded-full bg-jade-500/60" style={{ animationDelay: '150ms' }} />
        <span className="h-2 w-2 animate-pulse rounded-full bg-jade-500/60" style={{ animationDelay: '300ms' }} />
        <span className="ml-2 text-xs text-jade-100/45">{label}…</span>
      </div>
      {/* 骨架块：脉动 + shimmer 扫光叠加 */}
      <div className="mx-auto max-w-md space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="relative animate-pulse overflow-hidden rounded-card bg-white/[0.04]"
            style={{
              height: i === 0 ? '32px' : i === 1 ? '120px' : '80px',
              animationDelay: `${i * 100}ms`,
            }}
          >
            <div className="ct-shimmer absolute inset-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
