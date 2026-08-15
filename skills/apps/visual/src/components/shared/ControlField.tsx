import type { ChangeEventHandler, FocusEventHandler, ReactNode } from 'react';

type ControlFieldProps = {
  label: string;
  hint?: string;
  children?: ReactNode;
  value?: string | number;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  type?: string;
  min?: number;
  max?: number;
  inputMode?: 'text' | 'numeric' | 'decimal';
  ariaLabel?: string;
};

export function ControlField({ label, hint, children, value, onChange, onBlur, type = 'text', min, max, inputMode, ariaLabel }: ControlFieldProps) {
  return (
    <label className="grid gap-1 text-xs text-jade-100/45">
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        {hint && <span className="text-[10px] text-jade-100/30">{hint}</span>}
      </span>
      {children ?? (
        <input
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          type={type}
          min={min}
          max={max}
          inputMode={inputMode}
          aria-label={ariaLabel}
          className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45 focus:ring-1 focus:ring-jade-500/20"
        />
      )}
    </label>
  );
}
