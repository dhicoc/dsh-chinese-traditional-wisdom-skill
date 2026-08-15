import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ModuleId } from '@/lib/modules';
import { MODULES, getModuleById } from '@/lib/modules';
import {
  COMMAND_FEEDBACK_EVENT,
  buildCommandFeedback,
  dispatchBirthIntent,
  dispatchCommandFeedback,
  dispatchCopyContextIntent,
  dispatchLiuyaoIntent,
  dispatchMeihuaIntent,
  dispatchReaderSearchIntent,
  dispatchRefreshAllIntent,
  dispatchYearIntent,
  extractCommandYear,
  isRefreshAllCommand,
  parseBirthCommand,
  parseLiuyaoCommand,
  parseMeihuaCommand,
  parseReaderSearchCommand,
  recordCommandHistory,
  listCommandHistory,
} from '@/lib/commandIntents';
import { routeQuery, type AgentRoute } from '@/lib/agentRouter';
import { AgentConfirmPanel } from './AgentConfirmPanel';
import { openSearchModal } from '@/features/search/SearchModal';
/* ── 类型 ─────────────────────────────────────────────── */

export interface CommandItem {
  id: string;
  label: string;
  hint: string;
  group: string;
  keywords: string[];
  action: () => void;
  module?: string;
}

interface CommandBarProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
}

interface CommandFeedbackState {
  title: string;
  description?: string;
  tone: 'success' | 'info';
}

/* ── 命令面板 ─────────────────────────────────────────── */

export function fuzzyMatch(query: string, item: CommandItem): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (item.label.toLowerCase().includes(q)) return true;
  if (item.hint.toLowerCase().includes(q)) return true;
  return item.keywords.some((kw) => kw.toLowerCase().includes(q));
}

function CommandPalette({
  items,
  onDismiss,
  getDynamicItems,
}: {
  items: CommandItem[];
  onDismiss: () => void;
  getDynamicItems?: (query: string) => CommandItem[];
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const allItems = useMemo(
    () => [...items, ...(getDynamicItems?.(query) ?? [])],
    [items, getDynamicItems, query],
  );
  const filtered = useMemo(() => allItems.filter((item) => fuzzyMatch(query, item)), [allItems, query]);

  const executeItem = useCallback(
    (item: CommandItem) => {
      item.action();
      if (item.module) {
        recordCommandHistory({
          module: item.module,
          title: item.label,
          summary: '已打开对应工具。',
          tags: [item.group === '导航' ? '导航' : '工具'],
          mode: item.group === '导航' ? 'navigation' : 'command',
          inputSummary: '已打开对应工具；不记录原始输入。',
        });
      }
      dispatchCommandFeedback(buildCommandFeedback(item));
      onDismiss();
    },
    [onDismiss],
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // 键盘导航
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const item = filtered[selectedIndex];
        if (item) {
          executeItem(item);
        }
      }
    },
    [executeItem, filtered, selectedIndex],
  );

  return (
    <div
      data-testid="command-palette"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[12vh] backdrop-blur-sm ct-animate-fade-in"
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-panel border border-ink-700 bg-ink-850/95 shadow-2xl ct-animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 搜索输入 */}
        <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
          <span className="font-mono text-sm text-jade-400">›</span>
          <input
            type="text"
            data-testid="command-input"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索工具、输入年份/生辰、快速起卦、古籍搜索…"
            className="flex-1 bg-transparent text-sm text-jade-100 placeholder:text-jade-100/25 focus:outline-none"
          />
          <kbd className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-jade-100/35">
            ESC
          </kbd>
        </div>

        {/* 搜索结果 */}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-jade-100/40">无匹配结果</p>
          ) : (
            filtered.map((item, index) => (
              <button
                key={item.id}
                type="button"
                data-testid="command-result"
                onClick={() => executeItem(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={[
                  'flex w-full items-center gap-3 rounded-card border px-3 py-2.5 text-left transition',
                  index === selectedIndex
                    ? 'border-jade-500/30 bg-jade-500/10'
                    : 'border-transparent hover:bg-white/[0.04]',
                ].join(' ')}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-jade-100">{item.label}</p>
                  <p className="mt-0.5 truncate text-xs text-jade-100/35">{item.hint}</p>
                </div>
                <span className="shrink-0 rounded-full bg-black/25 px-2 py-0.5 text-[10px] text-jade-100/30">
                  {item.group}
                </span>
              </button>
            ))
          )}
        </div>

        {/* 底部提示 */}
        <div className="flex items-center justify-between border-t border-white/8 px-4 py-2 text-[10px] text-jade-100/25">
          <span>↑↓ 导航 · Enter 选择 · ESC 关闭</span>
          <span>{filtered.length} 项</span>
        </div>
      </div>
    </div>
  );
}

/* ── CommandBar 主组件 ────────────────────────────────── */

export function CommandBar({ activeModule, onSelectModule }: CommandBarProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [feedback, setFeedback] = useState<CommandFeedbackState | null>(null);
  const [pendingRoute, setPendingRoute] = useState<AgentRoute | null>(null);
  const active = getModuleById(activeModule);
  const inputRef = useRef<HTMLButtonElement>(null);

  // ⌘K / Ctrl+K 打开
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    function handleFeedback(event: Event) {
      const detail = (event as CustomEvent<CommandFeedbackState>).detail;
      setFeedback(detail);
      window.setTimeout(() => setFeedback(null), 2600);
    }
    window.addEventListener(COMMAND_FEEDBACK_EVENT, handleFeedback);
    return () => window.removeEventListener(COMMAND_FEEDBACK_EVENT, handleFeedback);
  }, []);

  // 构建命令列表
  const items = useMemo<CommandItem[]>(() => {
    const moduleItems: CommandItem[] = MODULES.filter((m) => m.id !== 'home').map((m) => ({
      id: `nav-${m.id}`,
      label: m.title,
      hint: `${m.group} · ${m.statusLabel} · ${m.questionTypes.join('/')}`,
      group: '导航',
      keywords: [m.id, m.shortTitle, m.title, ...m.questionTypes],
      action: () => onSelectModule(m.id),
      module: m.id,
    }));

    const actionItems: CommandItem[] = [
      {
        id: 'action-home',
        label: '回到首页',
        hint: '工作台 · 工具索引与能力边界',
        group: '操作',
        keywords: ['home', '首页', '工作台'],
        action: () => onSelectModule('home'),
      },
      {
        id: 'action-copy-context',
        label: '复制当前页面摘要',
        hint: active.title,
        group: '操作',
        keywords: ['copy', '复制', '摘要'],
        action: () => dispatchCopyContextIntent(active.id),
      },
      {
        id: 'action-global-search',
        label: '全局搜索 · 术语 / 古籍 / 映射表',
        hint: '打开搜索浮层，全文检索 303 条术语、6 个风水映射表、31 篇古籍',
        group: '操作',
        keywords: ['search', '搜索', '查找', '术语', '古籍', 'global'],
        action: () => openSearchModal(),
      },
    ];

    return [...moduleItems, ...actionItems];
  }, [active, onSelectModule]);

  const getDynamicItems = useCallback(
    (query: string): CommandItem[] => {
      const trimmed = query.trim();
      const dynamicItems: CommandItem[] = [];
      const year = extractCommandYear(trimmed);
      if (year) {
        dynamicItems.push(
          {
            id: 'year-feixing-' + year,
            label: '查看 ' + year + ' 流年飞星',
            hint: '按年份跳转到流年飞星并更新九宫盘',
            group: '年份',
            keywords: [String(year), '流年', '飞星', '九宫', 'year', 'feixing'],
            action: () => {
              dispatchYearIntent('feixing', year);
              onSelectModule('feixing');
            },
          },
          {
            id: 'year-yunqi-' + year,
            label: '查看 ' + year + ' 五运六气',
            hint: '按年份跳转到五运六气并更新岁运、司天、在泉',
            group: '年份',
            keywords: [String(year), '五运六气', '岁运', '司天', '在泉', 'year', 'yunqi'],
            action: () => {
              dispatchYearIntent('yunqi', year);
              onSelectModule('yunqi');
            },
          },
        );
      }

      const birthIntent = parseBirthCommand(trimmed);
      let hasExplicitCommand = false;
      if (birthIntent) {
        hasExplicitCommand = true;
        dynamicItems.push({
          id: 'birth-update-' + trimmed,
          label: '更新全局生辰',
          hint: '同步到全局生辰与旧 FORTUNE，各工作区按新资料重算',
          group: '生辰',
          keywords: [trimmed, 'birth', '生辰', '出生', '农历', '公历'],
          action: () => dispatchBirthIntent(birthIntent),
        });
      }

      if (isRefreshAllCommand(trimmed)) {
        hasExplicitCommand = true;
        dynamicItems.push({
          id: 'refresh-all-' + trimmed,
          label: '刷新 / 重算所有工作区',
          hint: '重新触发全局出生资料同步；支持监听的工具会刷新',
          group: '操作',
          keywords: [trimmed, 'refresh', '刷新', '重算', '重新计算'],
          action: () => dispatchRefreshAllIntent(trimmed),
        });
      }

      const liuyaoIntent = parseLiuyaoCommand(trimmed);
      if (liuyaoIntent) {
        hasExplicitCommand = true;
        dynamicItems.push({
          id: 'quick-liuyao-' + trimmed,
          label: '六爻快速起卦',
          hint: liuyaoIntent.question ? '切换到六爻 · ' + liuyaoIntent.question : '切换到六爻并起卦',
          group: '占卜',
          keywords: [trimmed, liuyaoIntent.question ?? '', '六爻', 'liuyao', '起卦', '占卜'],
          action: () => {
            onSelectModule('liuyao');
            window.setTimeout(() => dispatchLiuyaoIntent(liuyaoIntent), 0);
          },
        });
      }

      const meihuaIntent = parseMeihuaCommand(trimmed);
      if (meihuaIntent) {
        hasExplicitCommand = true;
        dynamicItems.push({
          id: 'quick-meihua-' + trimmed,
          label: '梅花易数快速排盘',
          hint: '切换到梅花易数并应用时间、数字或揲蓍起卦方式',
          group: '占卜',
          keywords: [trimmed, meihuaIntent.method ?? '', String(meihuaIntent.numberA ?? ''), String(meihuaIntent.numberB ?? ''), '梅花', 'meihua', '易数'],
          action: () => {
            onSelectModule('meihua');
            window.setTimeout(() => dispatchMeihuaIntent(meihuaIntent), 0);
          },
        });
      }

      const readerIntent = parseReaderSearchCommand(trimmed);
      if (readerIntent) {
        hasExplicitCommand = true;
        dynamicItems.push({
          id: 'reader-search-' + trimmed,
          label: '古籍搜索：' + readerIntent.term,
          hint: '切换到古籍 Split Reader 并高亮关键词',
          group: '古籍',
          keywords: [trimmed, readerIntent.term, '古籍', 'reader', 'split', '搜索'],
          action: () => {
            onSelectModule('reader');
            window.setTimeout(() => dispatchReaderSearchIntent(readerIntent), 0);
          },
        });
      }

      if (!hasExplicitCommand) {
        const route = routeQuery(trimmed);
        if (route) {
          const targetModule = getModuleById(route.module);
          dynamicItems.push({
            id: 'agent-route-' + trimmed,
            label: '建议打开：' + targetModule.title,
            hint: route.reason + (route.question ? ' · ' + route.question : ''),
            group: '建议',
            keywords: [trimmed, route.module, targetModule.title, targetModule.shortTitle, '建议', '打开'],
            action: () => setPendingRoute(route),
            module: route.module,
          });
        }
      }

      // 历史重放：输入"历史"/"history"/"收藏"时列出最近命令
      if (/历史|history|收藏|favorite/.test(trimmed.toLowerCase())) {
        const isFavQuery = /收藏|favorite/.test(trimmed.toLowerCase());
        const historyList = listCommandHistory().filter((h) => isFavQuery ? h.favorite : true).slice(0, 5);
        historyList.forEach((entry) => {
          dynamicItems.push({
            id: 'history-' + entry.id,
            label: (entry.favorite ? '★ ' : '') + entry.title,
            hint: entry.summary || entry.module,
            group: isFavQuery ? '收藏' : '历史',
            keywords: [entry.module, entry.title, '历史', 'history', '收藏'],
            action: () => onSelectModule(entry.module as ModuleId),
            module: entry.module,
          });
        });
      }

      return dynamicItems;
    },
    [onSelectModule],
  );

  return (
    <>
      <header className="app-topbar sticky top-4 z-20 rounded-panel border border-jade-500/18 bg-ink-950/90 p-3 shadow-instrument backdrop-blur-xl">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <button
            ref={inputRef}
            type="button"
            onClick={() => setPaletteOpen(true)}
            data-testid="command-bar"
            className="flex min-h-12 items-center gap-3 rounded-card border border-white/10 bg-black/30 px-4 text-left text-jade-100/55 transition hover:border-jade-500/30 hover:text-jade-100 active:scale-[0.99]"
            aria-label="打开命令面板 (⌘K)"
          >
            <span className="font-mono text-jade-400">⌘K</span>
            <span className="min-w-0 flex-1 truncate text-sm">搜索工具、输入年份/生辰、快速起卦、古籍搜索</span>
            <span className="hidden rounded-full border border-white/10 px-2 py-1 text-[10px] text-jade-100/30 md:inline-flex">COMMAND</span>
          </button>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <button
              type="button"
              onClick={() => {
                dispatchCopyContextIntent(active.id);
                dispatchCommandFeedback({
                  title: '当前页面摘要已复制',
                  description: active.title,
                  tone: 'success',
                });
              }}
              data-testid="copy-context-button"
              className="rounded-full border border-jade-500/25 bg-jade-500/10 px-3.5 py-2 text-xs font-medium text-jade-400 transition hover:border-jade-500/40 active:scale-[0.98]"
            >
              复制摘要
            </button>
          </div>
        </div>
      </header>

      {paletteOpen && (
        <CommandPalette
          items={items}
          getDynamicItems={getDynamicItems}
          onDismiss={() => setPaletteOpen(false)}
        />
      )}

      {pendingRoute && (
        <AgentConfirmPanel
          route={pendingRoute}
          onConfirm={() => {
            const route = pendingRoute;
            const raw = route.question ?? route.reason;
            if (route.birthPatch) dispatchBirthIntent({ patch: route.birthPatch, source: 'command-bar', raw });
            onSelectModule(route.module);
            if (route.liuyao) window.setTimeout(() => dispatchLiuyaoIntent(route.liuyao!), 0);
            if (route.meihua) window.setTimeout(() => dispatchMeihuaIntent(route.meihua!), 0);
            if (route.reader) window.setTimeout(() => dispatchReaderSearchIntent(route.reader!), 0);
            recordCommandHistory({
              module: route.module,
              title: '已打开：' + getModuleById(route.module).title,
              summary: '已根据输入打开对应工具。',
              tags: ['工具'],
              mode: 'agent',
              inputSummary: '已根据输入打开对应工具；不记录原始问题或输入资料。',
            });
            dispatchCommandFeedback({
              title: '已打开：' + getModuleById(route.module).title,
              description: route.reason + (route.question ? ' · ' + route.question : ''),
              tone: 'success',
            });
            setPendingRoute(null);
          }}
          onCancel={() => setPendingRoute(null)}
        />
      )}

      {feedback && (
        <div
          data-testid="command-feedback"
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-[60] max-w-[90vw] -translate-x-1/2 rounded-card border border-jade-500/30 bg-ink-850/95 px-4 py-2.5 text-sm text-jade-100 shadow-2xl ct-animate-fade-in"
        >
          <span className="font-medium text-jade-50">{feedback.title}</span>
          {feedback.description && (
            <span className="ml-2 text-jade-100/55">{feedback.description}</span>
          )}
        </div>
      )}
    </>
  );
}
