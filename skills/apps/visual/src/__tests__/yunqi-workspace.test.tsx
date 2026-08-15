import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('@/engine-api/calendar', () => ({
  getSolarEntry: () => null,
}));

import { YunqiChart } from '@/components/shared/YunqiChart';
import { YunqiWorkspace } from '@/features/yunqi/YunqiWorkspace';
import { calculateYunqi } from '@/engine-api/yunqi';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-14T12:00:00'));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('YunqiWorkspace', () => {
  it('以查询日期呈现六气时间轴，并使用非诊断性安全提示', () => {
    render(<YunqiWorkspace />);

    expect(screen.getByLabelText('查询日期')).toHaveAttribute('type', 'date');
    expect(screen.getByText('岁运 · 六气时间轴')).toBeInTheDocument();
    expect(screen.getByText(/查询日期所在步位以金边标出/)).toBeInTheDocument();
    expect(screen.getAllByText(/不构成医学诊断或治疗建议/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/病势倾向/)).not.toBeInTheDocument();
  });
});

describe('YunqiChart', () => {
  it('将太一天符作为用户可见的传统运气格局标签', () => {
    const data = {
      ...calculateYunqi({ year: 1978, targetDate: '1978-06-15' }),
      export_snapshot: { summary: '', sections: [] },
    };

    render(<YunqiChart data={data} />);

    const chart = screen.getByRole('img', { name: /五运六气/ });
    expect(chart).toHaveTextContent('太一天符');
    expect(chart).not.toHaveTextContent('太乙天符');
  });
});
