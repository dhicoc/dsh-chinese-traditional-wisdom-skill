import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const { calcMeihuaEnveloped } = vi.hoisted(() => ({
  calcMeihuaEnveloped: vi.fn((input: { method?: string; numberA?: number; numberB?: number }) => ({
  ok: true,
  tool: 'LocalMeihuaTimeAdapter',
  version: 'local',
  input_normalized: input,
  data: {
    upperTrigram: { name: '离', symbol: '☲', nature: '火' },
    lowerTrigram: { name: '坤', symbol: '☷', nature: '地' },
    changingLine: 2,
    mutualUpper: { name: '兑', symbol: '☱', nature: '泽' },
    mutualLower: { name: '震', symbol: '☳', nature: '雷' },
    bodyTrigram: '离',
    useTrigram: '坤',
    bodyUseRelation: '体生用',
    hexagramNumber: 35,
    classicalHexagramName: '晋',
    changingHexagramNumber: 56,
    changingClassicalHexagramName: '旅',
    fortuneLevel: '不利',
    fortuneDetail: '引擎结果',
    strategy: '引擎策略',
    bodyGuaDe: '丽',
    useGuaDe: '顺',
    cuoTrigram: { upper: '坎', lower: '乾', name: '水天' },
    zongTrigram: { upper: '坤', lower: '离', name: '地火' },
    hexagramName: input.method === 'number' ? `数字${input.numberA}/${input.numberB}` : '时间卦',
    changingHexagramName: '变卦',
    sourceMethod: '数字起卦',
    numbers: { year: 0, month: 0, day: 0, hourNumber: 0, source: 'test' },
    engineName: 'LocalMeihuaTimeAdapter',
    mode: 'local',
    confidenceNote: 'test',
    export_snapshot: {
      summary: '引擎导出摘要',
      sections: [{ heading: '本卦', body: '引擎导出内容' }],
    },
  },
  warnings: [],
  })),
}));

vi.mock('@/lib/birthContext', () => ({
  useBirth: () => ({ solarBirth: { year: 2004, month: 7, day: 30, hour: 12, minute: 0 } }),
}));
vi.mock('@/engine-api/calendar', () => ({ getSolarEntry: () => null }));
vi.mock('@/engine-api/divination', () => ({ calcMeihuaEnveloped }));

import { MeihuaWorkspace } from '@/features/meihua/MeihuaWorkspace';

afterEach(() => {
  cleanup();
  calcMeihuaEnveloped.mockClear();
});

describe('MeihuaWorkspace', () => {
  it('通过 engine-api 计算，数字输入变化后显示引擎结果', () => {
    render(<MeihuaWorkspace />);

    expect(calcMeihuaEnveloped).toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('起卦方式'), { target: { value: 'number' } });
    fireEvent.change(screen.getByLabelText('数字一'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('数字二'), { target: { value: '5' } });

    expect(calcMeihuaEnveloped).toHaveBeenLastCalledWith(
      expect.objectContaining({ method: 'number', numberA: 3, numberB: 5 }),
      null,
    );
    expect(screen.getAllByText('数字3/5').length).toBeGreaterThan(0);
    expect(screen.getByText('引擎导出摘要')).toBeInTheDocument();
  });

  it('仅以同次成功引擎结果打开关联周易原文', () => {
    const onSelectModule = vi.fn();
    render(<MeihuaWorkspace onSelectModule={onSelectModule} />);

    fireEvent.click(screen.getByRole('button', { name: '阅读本次关联《周易》原文' }));

    expect(onSelectModule).toHaveBeenCalledWith('reader');
  });
});
