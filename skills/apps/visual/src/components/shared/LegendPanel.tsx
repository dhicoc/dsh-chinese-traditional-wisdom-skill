import type { ReactNode } from 'react';

export interface LegendItem {
  label: string;
  color: string;
  description?: ReactNode;
  value?: ReactNode;
}

interface LegendPanelProps {
  title: string;
  description?: ReactNode;
  items: LegendItem[];
}

export function LegendPanel({ title, description, items }: LegendPanelProps) {
  return (
    <section className="rounded-card border border-white/8 bg-white/[0.035] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-jade-100">{title}</p>
          {description && <p className="mt-1 text-xs leading-5 text-jade-100/45">{description}</p>}
        </div>
        <span className="rounded-full bg-black/24 px-2 py-0.5 text-[10px] text-jade-100/55">Legend</span>
      </div>

      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-3 rounded-card bg-black/16 px-3 py-2">
            <span
              aria-hidden="true"
              className="mt-1 h-3 w-3 shrink-0 rounded-full border border-white/20"
              style={{ backgroundColor: item.color }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-jade-100">{item.label}</span>
                {item.value && <span className="text-[10px] text-jade-100/55">{item.value}</span>}
              </div>
              {item.description && <p className="mt-1 text-xs leading-5 text-jade-100/55">{item.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
