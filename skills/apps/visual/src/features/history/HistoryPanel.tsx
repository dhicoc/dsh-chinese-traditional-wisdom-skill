import { useCallback, useEffect, useMemo, useState } from 'react';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { HistoryStore, type HistoryEntry } from '@/legacy/historyStore';

/* ── 工具 ─────────────────────────────────────────────── */

const MODULE_LABELS: Record<string, string> = {
  bazi: '八字命盘',
  yunqi: '五运六气',
  meihua: '梅花易数',
  ziwei: '紫微斗数',
  liuyao: '六爻占卜',
  fengshui: '风水罗盘',
  feixing: '流年飞星',
  bazhai: '八宅大游年',
  tizhi: '体质辨识',
};

const MODE_COLORS: Record<string, { color: string; border: string }> = {
  'local-exact': { color: 'var(--wz-water)', border: 'rgb(var(--water) / 0.2)' },
  'local': { color: 'var(--wz-wood)', border: 'rgb(var(--wood) / 0.2)' },
  'local-approx': { color: 'var(--wz-wood)', border: 'rgb(var(--wood) / 0.2)' },
  'demo': { color: 'var(--wz-fire)', border: 'rgb(var(--cinnabar) / 0.2)' },
  'knowledge': { color: 'var(--wz-earth)', border: 'rgb(var(--earth) / 0.2)' },
  'derived': { color: 'var(--chart-text-faint)', border: 'var(--chart-text-faint)' },
};

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16).replace('T', ' ');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day} ${hour}:${min}`;
}

/* ── 单条历史卡片 ─────────────────────────────────────── */

function EntryCard({
  entry,
  onToggleFav,
  onRemove,
}: {
  entry: HistoryEntry;
  onToggleFav: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const modeStyle = MODE_COLORS[entry.mode] ?? { color: 'var(--chart-text-faint)', border: 'var(--chart-text-faint)' };
  const moduleLabel = MODULE_LABELS[entry.module] ?? entry.module;

  return (
    <article className="rounded-card border border-white/8 bg-white/[0.035] p-4 transition hover:border-white/16">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleFav(entry.id)}
              className="text-lg leading-none transition hover:scale-110"
              title={entry.favorite ? '取消收藏' : '收藏'}
            >
              {entry.favorite ? '★' : '☆'}
            </button>
            <h3 className="truncate text-sm font-semibold text-jade-100">{entry.title}</h3>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-jade-100/55">{entry.summary}</p>
          <div className="mt-2 rounded border border-jade-500/15 bg-jade-500/[0.035] px-2 py-1.5 text-[10px] leading-4 text-jade-100/45">
            <p>本次分析说明：{entry.inputSummary}</p>
            <p>报告版本：{entry.reportVersion}</p>
            <p>结果状态：{entry.capabilityMode}</p>
          </div>
          {entry.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {entry.tags.slice(0, 6).map((tag, i) => (
                <span key={i} className="rounded-full bg-black/24 px-2 py-0.5 text-[10px] text-jade-100/45">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
            style={{ borderColor: modeStyle.border, color: modeStyle.color }}
          >
            {moduleLabel}
          </span>
          <span className="text-[10px] text-jade-100/55">{formatTime(entry.createdAt)}</span>
          <button
            type="button"
            onClick={() => onRemove(entry.id)}
            className="text-[10px] text-jade-100/55 transition hover:text-cinnabar-500"
          >
            删除
          </button>
        </div>
      </div>
    </article>
  );
}

/* ── 主组件 ───────────────────────────────────────────── */

export function HistoryWorkspace() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [favorites, setFavorites] = useState<HistoryEntry[]>([]);
  const [tab, setTab] = useState<'history' | 'favorites'>('history');
  const store = HistoryStore;

  const refresh = useCallback(() => {
    setEntries(store.list());
    setFavorites(store.listFavorites());
  }, [store]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleToggleFav = useCallback(
    (id: string) => {
      store?.toggleFavorite(id);
      refresh();
    },
    [store, refresh],
  );

  const handleRemove = useCallback(
    (id: string) => {
      store?.remove(id);
      refresh();
    },
    [store, refresh],
  );

  const handleClearHistory = useCallback(() => {
    if (confirm('确定清空全部历史记录？收藏不会删除。')) {
      store?.clear();
      refresh();
    }
  }, [store, refresh]);

  const handleClearFavorites = useCallback(() => {
    if (confirm('确定清空全部收藏？')) {
      store?.clearFavorites();
      refresh();
    }
  }, [store, refresh]);

  const displayList = tab === 'history' ? entries : favorites;
  const contextPayload = useMemo(
    () => ({
      module: 'history',
      mode: 'history-panel',
      historyCount: entries.length,
      favoritesCount: favorites.length,
      maxHistory: 30,
    }),
    [entries.length, favorites.length],
  );

  return (
    <section className="space-y-4">
      {/* 标题区 */}
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-jade-100">本地历史与收藏</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              自动保存最近 30 条脱敏阅读摘要。仅保留模块、标题、摘要和标签，不保存完整姓名、完整出生日期或具体地点。
            </p>
          </div>
          <CopyContextButton commandScope="history" title="历史记录摘要" payload={contextPayload} />
        </div>
        {!store && (
          <p className="mt-3 rounded-card border border-cinnabar-500/30 bg-cinnabar-500/10 p-3 text-sm text-red-200">
            暂无历史记录。排盘后可导出或复制摘要。
          </p>
        )}
      </div>

      {/* 摘要仪表盘 */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-card border border-white/8 bg-white/[0.04] p-4">
          <p className="font-mono text-3xl font-semibold text-jade-500">{entries.length}</p>
          <p className="mt-1 text-sm text-jade-100/55">历史记录</p>
        </div>
        <div className="rounded-card border border-white/8 bg-white/[0.04] p-4">
          <p className="font-mono text-3xl font-semibold text-amber-400">{favorites.length}</p>
          <p className="mt-1 text-sm text-jade-100/55">收藏</p>
        </div>
        <div className="rounded-card border border-white/8 bg-white/[0.04] p-4">
          <p className="font-mono text-3xl font-semibold text-jade-100">30</p>
          <p className="mt-1 text-sm text-jade-100/55">最大保留数</p>
        </div>
      </div>

      {/* 标签切换 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab('history')}
          className={[
            'rounded-full border px-4 py-2 text-xs font-medium transition',
            tab === 'history'
              ? 'border-jade-500/40 bg-jade-500/12 text-jade-50'
              : 'border-white/10 bg-white/[0.035] text-jade-100/55 hover:text-jade-100',
          ].join(' ')}
        >
          历史 ({entries.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('favorites')}
          className={[
            'rounded-full border px-4 py-2 text-xs font-medium transition',
            tab === 'favorites'
              ? 'border-amber-500/40 bg-amber-500/12 text-jade-50'
              : 'border-white/10 bg-white/[0.035] text-jade-100/55 hover:text-jade-100',
          ].join(' ')}
        >
          收藏 ({favorites.length})
        </button>
        <div className="flex-1" />
        {tab === 'history' && entries.length > 0 && (
          <button
            type="button"
            onClick={handleClearHistory}
            className="rounded-full border border-white/10 px-3 py-2 text-xs text-jade-100/45 transition hover:border-cinnabar-500/30 hover:text-cinnabar-500"
          >
            清空历史
          </button>
        )}
        {tab === 'favorites' && favorites.length > 0 && (
          <button
            type="button"
            onClick={handleClearFavorites}
            className="rounded-full border border-white/10 px-3 py-2 text-xs text-jade-100/45 transition hover:border-cinnabar-500/30 hover:text-cinnabar-500"
          >
            清空收藏
          </button>
        )}
      </div>

      {/* 列表 */}
      <div className="grid gap-3 md:grid-cols-2">
        {displayList.length === 0 ? (
          <div className="col-span-full rounded-card border border-white/8 bg-white/[0.025] p-8 text-center">
            <p className="text-sm text-jade-100/45">
              {tab === 'history'
                ? '暂无历史记录。生成命盘后会自动保存脱敏摘要。'
                : '暂无收藏。点击历史记录中的 ☆ 标记可添加收藏。'}
            </p>
          </div>
        ) : (
          displayList.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onToggleFav={handleToggleFav}
              onRemove={handleRemove}
            />
          ))
        )}
      </div>

      {/* 隐私说明 */}
      <div className="rounded-card border border-jade-500/20 bg-jade-500/8 p-3">
        <p className="text-xs leading-5 text-jade-100/55">
          隐私保护：HistoryStore 使用 <code className="text-jade-500">localStorage</code> 存储脱敏摘要，
          不保存完整姓名、完整出生日期（<code className="text-jade-500">YYYY-MM-DD</code> 格式会被自动替换为 ****）或具体地点。
          数据完全本地化，不上传任何服务器。
        </p>
      </div>
    </section>
  );
}
