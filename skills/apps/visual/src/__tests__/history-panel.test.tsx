import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HistoryWorkspace } from '@/features/history/HistoryPanel';
import { HistoryStore } from '@/legacy/historyStore';

afterEach(() => {
  localStorage.clear();
});

describe('HistoryWorkspace', () => {
  it('展示分析说明、报告版本和用户可读结果状态，不展示内部模式值', () => {
    HistoryStore.add({
      module: 'bazi',
      title: '八字命盘',
      summary: '已生成八字命盘参考。',
      mode: 'local-exact',
      reportVersion: '1.0',
      capabilityMode: '按出生资料排盘',
      inputSummary: '已完成分析；不记录原始输入。',
    });

    render(<HistoryWorkspace />);

    expect(screen.getByText('本次分析说明：已完成分析；不记录原始输入。')).toBeInTheDocument();
    expect(screen.getByText('报告版本：1.0')).toBeInTheDocument();
    expect(screen.getByText('结果状态：按出生资料排盘')).toBeInTheDocument();
    expect(screen.queryByText('能力模式：local-exact')).not.toBeInTheDocument();
  });
});
