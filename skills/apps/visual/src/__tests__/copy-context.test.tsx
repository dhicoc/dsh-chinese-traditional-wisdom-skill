import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, cleanup } from '@testing-library/react';
import { toMarkdown, CopyContextButton } from '@/components/shared/CopyContextButton';
import { COPY_CONTEXT_INTENT } from '@/lib/commandIntents';

describe('CopyContextButton toMarkdown', () => {
  it('把标题与 payload 转成可读摘要', () => {
    const md = toMarkdown('八字摘要', { 年份: 1990, 性别: '男' });
    expect(md).toContain('# 八字摘要');
    expect(md).toContain('- 年份：1990');
    expect(md).toContain('- 性别：男');
    expect(md).not.toContain('```');
    expect(md.endsWith('\n')).toBe(true);
  });

  it('处理嵌套对象与数组', () => {
    const md = toMarkdown('测试', { 列表: [1, 2, 3], 嵌套: { 状态: true } });
    expect(md).toContain('- 列表：1、2、3');
    expect(md).toContain('- 嵌套：状态：true');
  });

  it('处理空 payload', () => {
    const md = toMarkdown('空', {});
    expect(md).toContain('# 空');
    expect(md).not.toContain('undefined');
  });
});

describe('CopyContextButton 组件', () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    writeText.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('渲染默认按钮标签', () => {
    render(<CopyContextButton title="t" payload={{ a: 1 }} />);
    expect(screen.getByRole('button', { name: '复制解读摘要' })).toBeTruthy();
  });

  it('点击后调用 clipboard.writeText 并写入摘要', async () => {
    render(<CopyContextButton title="八字摘要" payload={{ 年份: 1990 }} />);
    const btn = screen.getByRole('button', { name: '复制解读摘要' });
    await act(async () => {
      fireEvent.click(btn);
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    const written = writeText.mock.calls[0][0] as string;
    expect(written).toContain('# 八字摘要');
    expect(written).toContain('- 年份：1990');
  });

  it('commandScope 匹配时响应 COPY_CONTEXT_INTENT 事件并复制', async () => {
    render(<CopyContextButton title="八字上下文" payload={{ x: 1 }} commandScope="bazi" />);
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(COPY_CONTEXT_INTENT, { detail: { scope: 'bazi' } }),
      );
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    const written = writeText.mock.calls[0][0] as string;
    expect(written).toContain('# 八字上下文');
  });

  it('commandScope 不匹配时不复制', () => {
    render(<CopyContextButton title="t" payload={{ x: 1 }} commandScope="bazi" />);
    window.dispatchEvent(
      new CustomEvent(COPY_CONTEXT_INTENT, { detail: { scope: 'ziwei' } }),
    );
    expect(writeText).not.toHaveBeenCalled();
  });
});
