import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildCommandFeedback,
  consumeReaderSearchIntent,
  dispatchReaderSearchIntent,
  isRefreshAllCommand,
  isHistoryStoreReady,
  listCommandHistory,
  parseBirthCommand,
  parseLiuyaoCommand,
  parseMeihuaCommand,
  parseReaderSearchCommand,
  recordCommandHistory,
} from '@/lib/commandIntents';

// 隔离前置：historyStore 模块在 import 时会把 HistoryStore 挂到 window（供 e2e / 命令历史记录），
// 但本文件的「store 不存在」断言依赖其缺位；此处还原该前置条件，并清空 localStorage
// 避免命令历史跨用例/跨运行污染（此前一个遗留的「测试」条目导致 listCommandHistory 非空）。
beforeEach(() => {
  delete (window as unknown as { HistoryStore?: unknown }).HistoryStore;
  try { localStorage.clear(); } catch { /* jsdom 无 localStorage 时忽略 */ }
});

describe('command intent parsers', () => {
  it('parses a Chinese solar birth command', () => {
    const parsed = parseBirthCommand('生辰 1992-03-04 9 女');
    expect(parsed?.patch).toMatchObject({
      year: 1992,
      month: 3,
      day: 4,
      hour: 9,
      gender: '女',
    });
  });

  it('parses lunar birth commands', () => {
    const parsed = parseBirthCommand('农历 1992-3-4 23 男');
    expect(parsed?.patch).toMatchObject({
      year: 1992,
      month: 3,
      day: 4,
      hour: 23,
      gender: '男',
      isLunar: true,
    });
  });

  it('does not treat a bare year as birth data', () => {
    expect(parseBirthCommand('2026')).toBeNull();
  });

  it('clamps out-of-range birth fields', () => {
    const parsed = parseBirthCommand('birth 2200 15 40 99 female');
    expect(parsed?.patch).toMatchObject({
      year: 2100,
      month: 12,
      day: 31,
      hour: 23,
      gender: '女',
    });
  });
});

describe('command feedback helpers', () => {
  it('builds informational feedback for navigation commands', () => {
    expect(buildCommandFeedback({ label: '八字命盘', group: '导航', hint: '命理 · 可用' })).toMatchObject({
      title: '已执行：八字命盘',
      description: '导航 · 命理 · 可用',
      tone: 'info',
    });
  });

  it('builds success feedback for action commands', () => {
    expect(buildCommandFeedback({ label: '刷新 / 重算所有工作区', group: '操作' })).toMatchObject({
      title: '已执行：刷新 / 重算所有工作区',
      description: '操作',
      tone: 'success',
    });
  });
});

describe('command history helpers', () => {
  it('recordCommandHistory returns null when HistoryStore is absent', () => {
    // jsdom 环境默认无 HistoryStore
    const result = recordCommandHistory({ module: 'bazi', title: '测试' });
    expect(result).toBeNull();
  });

  it('listCommandHistory returns empty array when store absent', () => {
    expect(listCommandHistory()).toEqual([]);
  });

  it('isHistoryStoreReady reflects store presence', () => {
    expect(isHistoryStoreReady()).toBe(false);
  });

  it('records and lists history when a mock store is present', () => {
    const store: { [k: string]: unknown } = {};
    let history: unknown[] = [];
    store.add = (entry: { module: string; title: string; reportVersion?: string; capabilityMode?: string; inputSummary?: string }) => {
      const rec = { id: 'h1', module: entry.module, title: entry.title, summary: '', tags: [], mode: 'command', createdAt: 'now', favorite: false, reportVersion: entry.reportVersion, capabilityMode: entry.capabilityMode, inputSummary: entry.inputSummary };
      history = [rec, ...history];
      return rec;
    };
    store.list = () => history;
    (window as unknown as { HistoryStore: unknown }).HistoryStore = store;
    try {
      expect(isHistoryStoreReady()).toBe(true);
      const rec = recordCommandHistory({
        module: 'bazi',
        title: '八字命盘',
        reportVersion: '1.0',
        capabilityMode: '按出生资料排盘（local-exact）',
        inputSummary: '已完成本地计算；不记录原始输入。',
      });
      expect(rec).toMatchObject({
        module: 'bazi',
        reportVersion: '1.0',
        capabilityMode: '按出生资料排盘（local-exact）',
        inputSummary: '已完成本地计算；不记录原始输入。',
      });
      expect(listCommandHistory()).toHaveLength(1);
    } finally {
      delete (window as unknown as { HistoryStore: unknown }).HistoryStore;
    }
  });
});

describe('divination and reader command parsers', () => {
  it('parses Liuyao coin quick commands', () => {
    const parsed = parseLiuyaoCommand('六爻 今日财运');
    expect(parsed).toMatchObject({
      method: 'coin',
      question: '今日财运',
      recast: true,
    });
  });

  it('parses Liuyao manual quick commands', () => {
    const parsed = parseLiuyaoCommand('六爻 手动 789789 考试');
    expect(parsed).toMatchObject({
      method: 'manual',
      yaoValues: '789789',
      question: '考试',
    });
  });

  it('parses engine-compatible Meihua number commands', () => {
    const parsed = parseMeihuaCommand('梅花 数字 3 5');
    expect(parsed).toMatchObject({
      method: 'number',
      numberA: 3,
      numberB: 5,
    });
  });

  it('parses Meihua yarrow commands', () => {
    expect(parseMeihuaCommand('meihua yarrow')).toMatchObject({
      method: 'yarrow',
    });
  });

  it('parses reader search commands', () => {
    expect(parseReaderSearchCommand('古籍 生气')).toMatchObject({ term: '生气' });
    expect(parseReaderSearchCommand('reader 八宅')).toMatchObject({ term: '八宅' });
  });

  it('retains a reader citation until its lazy workspace consumes it', () => {
    dispatchReaderSearchIntent({
      term: '生气',
      citationId: 'kb://fengshui/03-yang-house/八宅明镜.md',
      raw: '古籍 生气',
    });
    expect(consumeReaderSearchIntent()).toMatchObject({
      term: '生气',
      citationId: 'kb://fengshui/03-yang-house/八宅明镜.md',
    });
    expect(consumeReaderSearchIntent()).toBeNull();
  });

  it('detects refresh all commands', () => {
    expect(isRefreshAllCommand('刷新全部')).toBe(true);
    expect(isRefreshAllCommand('refresh all')).toBe(true);
    expect(isRefreshAllCommand('八字')).toBe(false);
  });
});
