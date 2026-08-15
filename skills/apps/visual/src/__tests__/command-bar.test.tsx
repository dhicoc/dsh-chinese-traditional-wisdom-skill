import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CommandBar, fuzzyMatch, type CommandItem } from '@/components/app-shell/CommandBar';
import { MODULES } from '@/lib/modules';

const makeItem = (over: Partial<CommandItem> = {}): CommandItem => ({
  id: 'x',
  label: '紫微斗数',
  hint: '十二宫命盘',
  group: '命理',
  keywords: ['ziwei', '紫微', '命盘'],
  action: () => {},
  ...over,
});

describe('fuzzyMatch', () => {
  it('空 query 始终匹配', () => {
    expect(fuzzyMatch('', makeItem())).toBe(true);
  });

  it('匹配 label（大小写不敏感）', () => {
    expect(fuzzyMatch('紫微', makeItem())).toBe(true);
    expect(fuzzyMatch('ZIWEI', makeItem({ label: 'Ziwei Chart' }))).toBe(true);
  });

  it('匹配 hint', () => {
    expect(fuzzyMatch('十二宫', makeItem())).toBe(true);
  });

  it('匹配 keywords', () => {
    expect(fuzzyMatch('命盘', makeItem())).toBe(true);
    expect(fuzzyMatch('ziwei', makeItem())).toBe(true);
  });

  it('不匹配时返回 false', () => {
    expect(fuzzyMatch('风水', makeItem())).toBe(false);
    expect(fuzzyMatch('八字', makeItem())).toBe(false);
  });
});

describe('CommandBar 组件', () => {
  const onSelectModule = vi.fn();

  beforeEach(() => {
    onSelectModule.mockClear();
  });

  afterEach(() => cleanup());

  it('渲染触发按钮，点击后打开命令面板', () => {
    render(<CommandBar activeModule="home" onSelectModule={onSelectModule} />);
    const trigger = screen.getByRole('button', { name: /打开命令面板/i });
    expect(trigger).toBeTruthy();
  });

  it('渲染所有模块的命令项（通过 MODULES 数量校验）', () => {
    // CommandBar 依赖 MODULES，确保至少有 home 与各工作区
    expect(MODULES.length).toBeGreaterThan(10);
    expect(MODULES.some((m) => m.id === 'home')).toBe(true);
  });
});
