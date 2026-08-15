import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('@/lib/birthContext', () => ({
  useBirth: () => ({
    solarBirth: { year: 2004, month: 7, day: 30, hour: 12, minute: 0, gender: '男' },
  }),
}));

vi.mock('@/engine-api/calendar', () => ({
  getSolarEntry: () => null,
}));

import { XingXiuWorkspace } from '@/features/xingxiu/XingXiuWorkspace';

afterEach(() => cleanup());

describe('XingXiuWorkspace', () => {
  it('明确区分出生日期排定的本命星宿与查询日期计算的当日值宿', () => {
    render(<XingXiuWorkspace />);

    expect(screen.getByText('本页同时呈现两项独立结果：本命星宿按出生日期排定；当日值宿按当前查询日期计算，用作日用宜忌参考，二者不互相替代。')).toBeInTheDocument();
    expect(screen.getByText('按出生日期排定，用于本命星宿参考。')).toBeInTheDocument();
    expect(screen.getByText(/^查询日期：\d{4}-\d{2}-\d{2} · 用于日用宜忌参考。$/)).toBeInTheDocument();
  });
});
