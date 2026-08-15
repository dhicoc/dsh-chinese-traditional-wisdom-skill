import { afterEach, describe, expect, it, vi } from 'vitest';
import { HistoryStore, HISTORY_SCHEMA_VERSION } from '@/legacy/historyStore';

const HISTORY_KEY = 'FORTUNE_HISTORY';
const FAVORITES_KEY = 'FORTUNE_FAVORITES';

afterEach(() => {
  localStorage.clear();
});

describe('HistoryStore', () => {
  it('持久化版本化的安全报告摘要，并脱敏日期、姓名和地点', () => {
    const entry = HistoryStore.add({
      module: 'bazi',
      title: '姓名：张三，出生：1990/6/15，地点：浙江省杭州市西湖区',
      summary: '生于 1990.06.15 12时，出生地点：北京市朝阳区',
      tags: ['1990年6月15日', '姓名：李四'],
      mode: 'local-exact',
      reportVersion: '1.0',
      capabilityMode: '按出生资料排盘（local-exact）',
      inputSummary: '1990年出生，男，公历',
    });

    expect(entry).toMatchObject({
      schemaVersion: HISTORY_SCHEMA_VERSION,
      reportVersion: '1.0',
      capabilityMode: '按出生资料排盘（local-exact）',
      inputSummary: '1990年出生，男，公历',
    });
    const text = [entry?.title, entry?.summary, ...(entry?.tags ?? [])].join('\n');
    expect(text).not.toContain('张三');
    expect(text).not.toContain('李四');
    expect(text).not.toContain('杭州市');
    expect(text).not.toContain('朝阳区');
    expect(text).not.toMatch(/1990[./年-]0?6[./月-]0?15/);
  });

  it('清空历史后仍保留已收藏条目', () => {
    const entry = HistoryStore.add({
      module: 'bazi',
      title: '八字命盘',
      summary: '已保存脱敏摘要。',
      mode: 'local-exact',
    });
    HistoryStore.toggleFavorite(entry!.id);
    HistoryStore.clear();

    expect(HistoryStore.list()).toHaveLength(0);
    expect(HistoryStore.listFavorites()).toMatchObject([{ id: entry!.id, favorite: true }]);
  });

  it('读取旧历史时迁移、重新脱敏并同步收藏条目', () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([{
      id: 'legacy',
      module: 'bazi',
      title: '姓名：王五 1990-06-15',
      summary: '地点：上海市浦东新区',
      tags: ['1990/06/15'],
      mode: 'local-exact',
      createdAt: '2026-01-01T00:00:00.000Z',
      favorite: true,
    }]));
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([{
      id: 'legacy',
      module: 'bazi',
      title: '姓名：王五 1990-06-15',
      summary: '地点：上海市浦东新区',
      tags: ['1990/06/15'],
      mode: 'local-exact',
      createdAt: '2026-01-01T00:00:00.000Z',
      favorite: true,
    }]));

    const [entry] = HistoryStore.list();
    const [favorite] = HistoryStore.listFavorites();

    expect(entry).toMatchObject({
      schemaVersion: HISTORY_SCHEMA_VERSION,
      reportVersion: 'unknown',
      capabilityMode: 'local-exact',
      inputSummary: '未提供',
    });
    expect([entry.title, entry.summary, ...entry.tags].join('\n')).not.toMatch(/王五|上海市|浦东新区|1990[/-]06[/-]15/);
    expect(favorite).toEqual(entry);
  });

  it('按版本迁移 v1 条目的报告元信息', () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([{
      id: 'v1-entry',
      module: 'bazi',
      title: '八字命盘',
      summary: '已保存摘要。',
      tags: [],
      mode: 'local-exact',
      createdAt: '2026-01-01T00:00:00.000Z',
      favorite: false,
      schemaVersion: 1,
      reportVersion: '0.9',
      inputSummary: '旧版安全摘要',
    }]));

    expect(HistoryStore.list()).toMatchObject([{
      id: 'v1-entry',
      schemaVersion: HISTORY_SCHEMA_VERSION,
      reportVersion: '0.9',
      capabilityMode: 'local-exact',
      inputSummary: '旧版安全摘要',
    }]);
  });

  it('读取 localStorage 受限时安全返回空历史', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });

    expect(HistoryStore.list()).toEqual([]);
    getItem.mockRestore();
  });
});
