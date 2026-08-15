import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { dispatchReaderSearchIntent } from '@/lib/commandIntents';
import { AncientTextSplitReader } from '@/features/knowledge/AncientTextSplitReader';
import { createKnowledgeCitationId } from '@/legacy/searchEngine';

afterEach(() => {
  cleanup();
});

describe('AncientTextSplitReader', () => {
  it('通过已收录古籍的稳定 citation 打开对应原文并展示出处', () => {
    const citationId = createKnowledgeCitationId('03-yang-house/八宅明镜.md');
    dispatchReaderSearchIntent({
      term: '八宅',
      citationId,
      raw: '八宅明镜',
    });

    render(<AncientTextSplitReader />);

    expect(screen.getByText('当前古籍：八宅明镜')).toBeInTheDocument();
    expect(screen.getByText('已关联古籍引用。')).toBeInTheDocument();
    expect(screen.queryByText(citationId)).not.toBeInTheDocument();
    expect(screen.queryByText(/尚未内嵌到阅读器/)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain('kb://');
    expect(document.body.textContent).not.toContain('.json');
    expect(document.body.textContent).not.toContain('eight-mansions');
  });

  it('未收录古籍的 citation 不伪装为当前默认正文', () => {
    const citationId = createKnowledgeCitationId('01-situation-form/葬書-內篇.md');
    dispatchReaderSearchIntent({
      term: '生气',
      citationId,
      raw: '葬书·内篇',
    });

    render(<AncientTextSplitReader />);

    expect(screen.getByText('当前古籍：葬书·内篇')).toBeInTheDocument();
    expect(screen.getByText('已关联古籍引用。')).toBeInTheDocument();
    expect(screen.queryByText(citationId)).not.toBeInTheDocument();
    expect(screen.getByText('该古籍已建立稳定引用，但正文尚未内嵌到阅读器。')).toBeInTheDocument();
    expect(screen.queryByText('八宅明镜 ↔ 八宅大游年映射')).not.toBeInTheDocument();
  });

  it('无 citation 的后续搜索回到默认已收录正文', () => {
    const citationId = createKnowledgeCitationId('01-situation-form/葬書-內篇.md');
    dispatchReaderSearchIntent({ term: '生气', citationId, raw: '葬书·内篇' });
    render(<AncientTextSplitReader />);

    act(() => {
      dispatchReaderSearchIntent({ term: '八宅', raw: '古籍 八宅' });
    });

    expect(screen.getByText('当前古籍：八宅明镜')).toBeInTheDocument();
    expect(screen.getByText('已关联古籍引用。')).toBeInTheDocument();
    expect(screen.queryByText(createKnowledgeCitationId('03-yang-house/八宅明镜.md'))).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '古籍原文' })).toBeInTheDocument();
  });

  it('按本次起卦结果展示周易本卦动爻与变卦原文', () => {
    dispatchReaderSearchIntent({
      term: '晋',
      iching: {
        hexagramName: '晋',
        hexagramNumber: 35,
        changingHexagramName: '旅',
        changingHexagramNumber: 56,
        changingLines: [2],
      },
      raw: '本次起卦结果',
    });

    render(<AncientTextSplitReader />);

    expect(screen.getByRole('heading', { name: '本次起卦关联原文' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '本卦 · 晋' })).toBeInTheDocument();
    expect(screen.getByText('第2爻爻辞')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '变卦 · 旅' })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('kb://');
    expect(document.body.textContent).not.toContain('.json');
  });
});
