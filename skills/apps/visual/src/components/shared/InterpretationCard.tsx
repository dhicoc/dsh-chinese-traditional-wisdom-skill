import type { ReactNode } from 'react';

export interface InterpretationItem {
  label: string;
  value: ReactNode;
  description?: ReactNode;
}

interface InterpretationCardProps {
  title: string;
  badge?: string;
  subtitle?: ReactNode;
  items?: InterpretationItem[];
  children?: ReactNode;
  /** 自定义卡片内边距等（如紧凑模式 p-2.5） */
  className?: string;
}

export function InterpretationCard({ title, badge, subtitle, items = [], children, className }: InterpretationCardProps) {
  return (
    <section className={`rounded-card border border-white/10 bg-ink-950/90 shadow-instrument ${className ?? 'p-4'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-serif text-sm font-semibold tracking-[0.12em] text-jade-100">{title}</p>
          {subtitle && <p className="mt-1 text-xs leading-5 text-jade-100/45">{subtitle}</p>}
        </div>
        {badge && (
          <span className="shrink-0 rounded-full border border-jade-500/25 bg-jade-500/10 px-2.5 py-1 text-[10px] font-semibold text-jade-400">
            {badge}
          </span>
        )}
      </div>

      {items.length > 0 && (
        <dl className="mt-3 space-y-2 text-sm text-jade-100/60">
          {items.map((item, idx) => (
            <div key={`${item.label}-${idx}`} className="grid gap-1 rounded-card bg-black/50 px-3 py-2 sm:grid-cols-[80px_minmax(0,1fr)]">
              <dt className="text-xs text-jade-100/55">{item.label}</dt>
              <dd className="min-w-0 text-jade-100">
                {item.value}
                {item.description && <p className="mt-1 text-xs leading-5 text-jade-100/45">{item.description}</p>}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {children && <div className="mt-3 text-sm leading-6 text-jade-100/55">{children}</div>}
    </section>
  );
}
