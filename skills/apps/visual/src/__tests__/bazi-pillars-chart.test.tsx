import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BaziPillarsChart } from '@/components/shared/BaziPillarsChart';

const pillars = {
  year: { stem: '甲', branch: '子', hidden: ['癸'] },
  month: { stem: '乙', branch: '丑', hidden: ['己', '癸', '辛'] },
  day: { stem: '丙', branch: '寅', hidden: ['甲', '丙', '戊'] },
  hour: { stem: '丁', branch: '卯', hidden: ['乙'] },
  dayMaster: '丙',
  gender: '男',
};

const shenSha = [
  { name: '天乙贵人', category: '贵人' as const, branch: '子', pillar: '年' as const, meaning: '逢凶化吉。' },
  { name: '文昌贵人', category: '文昌' as const, branch: '子', pillar: '年' as const, meaning: '主文思。' },
  { name: '金舆', category: '金舆' as const, branch: '寅', pillar: '日' as const, meaning: '主福气。' },
];

describe('BaziPillarsChart 神煞柱位索引', () => {
  it('仅为命中神煞的柱渲染准确计数', () => {
    render(<BaziPillarsChart pillars={pillars} shenSha={shenSha} />);

    expect(screen.getByRole('button', { name: '年柱神煞，2 项' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '日柱神煞，1 项' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /月柱神煞/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /时柱神煞/ })).toBeNull();
  });

  it('点击或键盘操作会选择对应柱', () => {
    const onSelect = vi.fn();
    render(
      <BaziPillarsChart
        pillars={pillars}
        shenSha={shenSha}
        activeShenShaPillar="年"
        onSelectShenShaPillar={onSelect}
      />,
    );

    expect(screen.getByRole('button', { name: '年柱神煞，2 项' }).getAttribute('aria-pressed')).toBe('true');
    const day = screen.getByRole('button', { name: '日柱神煞，1 项' });
    expect(day.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(day);
    fireEvent.keyDown(day, { key: 'Enter' });
    fireEvent.keyDown(day, { key: ' ' });

    expect(onSelect).toHaveBeenNthCalledWith(1, '日');
    expect(onSelect).toHaveBeenNthCalledWith(2, '日');
    expect(onSelect).toHaveBeenNthCalledWith(3, '日');
  });
});
