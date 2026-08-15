import { useEffect, useMemo, useRef, useState } from 'react';
import { ControlField } from '@/components/shared/ControlField';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { createWorkspaceReportMetadata } from '@/legacy/reportMetadata';
import { createDreamExportReport } from '@/features/dream/dreamExport';
import {
  searchDream,
  getHotDreams,
  getDreamLinks,
  loadFullDictionary,
  LUCK_COLOR,
  LUCK_ALPHA,
  BIG_CATEGORIES,
  CATEGORY_DESC,
  type DreamEntry,
  type DreamSearchResult,
} from '@/legacy/dreamDictionary';
import { DREAM_ENTRIES as DREAM_ENTRIES_FILTERED } from '@/legacy/dream-data/dreamData';

/**
 * 周公解梦工作区。
 *
 * 数据来自开源周公解梦库（均 MIT）：
 * - 现代解读：oswin-hu/zhougong_dream 9550 条（精选 137 内嵌，全量按需 fetch）
 * - 古文原典：KianReed/dreamlogic-mcp 952 条原版古文断语
 *
 * 定位：传统民俗梦象解读参考，非预言绝对。与八宅/飞星方位体系联动提示。
 */

export function DreamWorkspace() {
  const [searchTerm, setSearchTerm] = useState('');
  const [query, setQuery] = useState('');
  const [useFull, setUseFull] = useState(false);
  const [fullLoaded, setFullLoaded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const hotDreams = useMemo(() => getHotDreams(10), []);

  const result: DreamSearchResult = useMemo(
    () => (query ? searchDream(query, useFull) : { entries: [], classics: [], hit: false }),
    [query, useFull],
  );

  const links = useMemo(() => getDreamLinks(query), [query]);
  const exportReport = useMemo(
    () => query && result.hit ? createDreamExportReport({
      entries: result.entries,
      classics: result.classics,
      links,
    }) : null,
    [links, query, result],
  );
  const reportMetadata = useMemo(() => createWorkspaceReportMetadata({
    moduleId: 'dream',
    inputSummary: '已按梦象分类检索民俗文化参考；不记录梦境原文或个人叙述。',
  }), []);

  // 按大类浏览（精选库）
  const categoryEntries = useMemo(() => {
    if (!activeCategory) return [];
    return DREAM_ENTRIES_FILTERED.filter((e) => e.biglx === activeCategory).slice(0, 24);
  }, [activeCategory]);

  const handleSearch = () => setQuery(searchTerm.trim());

  const enableFull = () => {
    setUseFull(true);
    loadFullDictionary().then(() => setFullLoaded(true));
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-jade-50">周公解梦</h2>
            <p className="text-sm text-jade-100/55">传统梦象吉凶解读 · 古文原典 + 现代解说 · 民俗参考</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-400">
              民俗参考
            </span>
            <ExportReportButton module="周公解梦" report={exportReport} reportMetadata={reportMetadata} />
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-jade-100/45">
          数据源自开源周公解梦库：现代解读 9550 条 + 原版古文断语 952 条。输入梦象关键词查询吉凶寓意，并可查看相关方位联动提示。梦境解读为传统民俗象征，非预言绝对，请结合自身境遇理性参考。
        </p>
      </div>

      {/* 搜索区 */}
      <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <ControlField label="搜索梦象" hint="如：蛇、水、棺材、牙齿、飞、结婚">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="输入梦境中的事物（如：蛇、水、棺材、飞...）"
              className="flex-1 rounded-card border border-jade-500/20 bg-ink-900/80 px-3 py-2 text-sm text-jade-100/80 outline-none focus:border-jade-500/50"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              className="rounded-card bg-purple-500/20 px-4 py-2 text-sm font-medium text-purple-400 transition-colors hover:bg-purple-500/30"
            >
              解梦
            </button>
          </div>
        </ControlField>

        {/* 热门梦象快捷 */}
        <div className="mt-4">
          <span className="text-xs text-jade-100/45">热门梦象：</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {hotDreams.map((d) => (
              <button
                key={d.title}
                onClick={() => { setSearchTerm(d.title); setQuery(d.title); }}
                className="rounded-full border border-jade-500/20 bg-ink-900/50 px-3 py-1 text-sm text-jade-100/55 transition-colors hover:border-jade-500/50 hover:text-jade-100/80"
              >
                {d.title}
              </button>
            ))}
          </div>
        </div>

        {/* 全量库开关 */}
        <div className="mt-4 flex items-center gap-3 rounded-card border border-white/5 bg-ink-900/50 p-3">
          <span className="text-xs text-jade-100/55">数据范围：</span>
          <button
            onClick={enableFull}
            disabled={fullLoaded}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              fullLoaded
                ? 'border border-jade-500/40 bg-jade-500/10 text-jade-400'
                : 'border border-white/10 bg-black/30 text-jade-100/55 hover:border-jade-500/30'
            }`}
          >
            {fullLoaded ? '✓ 已载入全量库（9548条）' : '载入全量解梦库（9548条）'}
          </button>
          <span className="text-[11px] text-jade-100/40">
            {useFull ? '当前在全量库中搜索' : '当前仅搜索精选常见梦象（137条）'}
          </span>
        </div>
      </div>

      {/* 搜索结果 */}
      {query && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-jade-50">
            「{query}」解梦结果 {result.hit ? '' : '— 未命中'}
          </h3>

          {!result.hit && (
            <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 text-sm text-jade-100/55">
              未在周公解梦库中找到「{query}」。可尝试更通用的关键词（如用"蛇"代替"梦见蛇咬我"），或
              <button onClick={enableFull} className="mx-1 text-jade-400 underline">载入全量库</button>
              后再查。
            </div>
          )}

          {/* 现代解读卡片 */}
          {result.entries.length > 0 && (
            <div className="space-y-3">
              {result.entries.slice(0, useFull ? 8 : 3).map((e) => (
                <DreamEntryCard key={e.title + e.biglx} entry={e} />
              ))}
            </div>
          )}

          {/* 古文原典卡片 */}
          {result.classics.length > 0 && (
            <div className="console-panel rounded-panel border border-gold-500/20 bg-gold-500/6 p-4">
              <h4 className="mb-2 text-sm font-semibold text-gold-300">原版周公解梦古文</h4>
              <div className="space-y-1.5">
                {result.classics.slice(0, 6).map((c, i) => (
                  <div key={i} className="rounded border border-gold-500/15 bg-black/30 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-sm text-gold-200">{c.original}</span>
                      <span className="text-[10px] text-gold-400/60">{c.category.replace(/\s+/g, ' ')}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-gold-100/60">断语：{c.interpretation}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-gold-400/45">古文断语为原版周公解梦条目，多来自《周公解梦》《梦林玄解》《敦煌本梦书》。</p>
            </div>
          )}

          {/* 方位联动 */}
          {links.length > 0 && (
            <div className="console-panel rounded-panel border border-jade-500/20 bg-jade-500/6 p-4">
              <h4 className="mb-2 text-sm font-semibold text-jade-300">方位联动提示</h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {links.map((l) => (
                  <div key={l.label} className="rounded border border-jade-500/15 bg-black/30 px-3 py-2">
                    <p className="text-[11px] text-jade-100/45">{l.label}</p>
                    <p className="mt-0.5 text-sm text-jade-200/80">{l.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-jade-100/40">传统"梦象应方位"说法，可与八宅/飞星方位体系参看，仅作参考。</p>
            </div>
          )}
        </div>
      )}

      {/* 大类浏览 */}
      {!query && (
        <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
          <h3 className="mb-3 text-base font-semibold text-jade-50">按类别浏览梦象</h3>
          <div className="flex flex-wrap gap-2">
            {BIG_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  activeCategory === cat
                    ? 'border border-jade-500/50 bg-jade-500/15 text-jade-200'
                    : 'border border-jade-500/20 bg-ink-900/50 text-jade-100/55 hover:border-jade-500/40'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          {activeCategory && (
            <>
              <p className="mt-3 text-xs text-jade-100/45">{CATEGORY_DESC[activeCategory]}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                {categoryEntries.map((e) => (
                  <button
                    key={e.title}
                    onClick={() => { setSearchTerm(e.title); setQuery(e.title); }}
                    className="rounded-card border border-white/8 bg-white/[0.03] p-2.5 text-left transition hover:border-jade-500/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-sm text-jade-100">{e.title}</span>
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: LUCK_COLOR[e.luck] ?? 'var(--chart-text-faint)' }} />
                    </div>
                    <span className="mt-0.5 block text-[11px]" style={{ color: LUCK_COLOR[e.luck] ?? 'var(--chart-text-faint)' }}>{e.luck} · {e.smalllx}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* 热门推荐 */}
          {!activeCategory && (
            <>
              <h4 className="mt-5 text-sm font-semibold text-jade-100/70">热门梦象推荐</h4>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                {hotDreams.map((d) => (
                  <button
                    key={d.title}
                    onClick={() => { setSearchTerm(d.title); setQuery(d.title); }}
                    className="rounded-card border border-white/8 bg-white/[0.03] p-3 text-left transition hover:border-jade-500/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-base text-jade-100">{d.title}</span>
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: LUCK_COLOR[d.luck] ?? 'var(--chart-text-faint)' }} />
                    </div>
                    <span className="mt-1 block text-[11px]" style={{ color: LUCK_COLOR[d.luck] ?? 'var(--chart-text-faint)' }}>{d.luck}</span>
                    <span className="mt-0.5 block text-[10px] text-jade-100/40">{d.biglx}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 边界说明 */}
      <InterpretationCard title="使用说明" subtitle="民俗参考">
        周公解梦相传由周公旦所著（或后人托名），收录大量梦象象征与吉凶寓意，属象数易学分支，与梅花易数、六爻同源。本工具数据源自开源周公解梦库，含原版古文断语与现代白话解说。梦境解读为传统民俗象征体系，强调"梦为心声"、象征隐喻，**非预言绝对**，请结合自身境遇理性参考。如持续受噩梦困扰，建议咨询专业心理工作者。
      </InterpretationCard>
    </div>
  );
}

/** 单条梦象解读卡片（长文按实际高度自适应折叠，展开看全文） */

// 渐变模糊层：每层从底边起向上延伸至 height，模糊半径递增。
// 越靠近底部，叠加的层数越多 → 越模糊；顶部只被最低层覆盖 → 接近清晰。
const GRADIENT_BLUR_LAYERS = [
  { h: 24, blur: 0.6 },   // 顶层：覆盖范围最大，模糊最弱
  { h: 20, blur: 1.6 },
  { h: 16, blur: 3.0 },
  { h: 12, blur: 5.0 },   // 底层：范围最小，模糊最强
];

function DreamEntryCard({ entry }: { entry: DreamEntry }) {
  const color = LUCK_COLOR[entry.luck] ?? 'var(--chart-text-faint)';
  const alphaTriplet = LUCK_ALPHA[entry.luck] ?? 'var(--spirit)';
  const [expanded, setExpanded] = useState(false);
  const [isOverflow, setIsOverflow] = useState(false);
  const textRef = useRef<HTMLParagraphElement | null>(null);
  // 折叠态限高（约 6 行，行高 1.75rem → 10.5rem）
  const COLLAPSED_MAX_HEIGHT = 160;

  // 测量实际内容高度，判断是否超出折叠限高（不依赖固定字符数，按数据多少自适应）
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    // 临时解除限高测真实高度
    const prev = el.style.maxHeight;
    el.style.maxHeight = 'none';
    const fullHeight = el.scrollHeight;
    el.style.maxHeight = prev;
    setIsOverflow(fullHeight > COLLAPSED_MAX_HEIGHT + 4);
  }, [entry.meaning]);

  // 折叠态：文字带朦胧模糊，渐变遮罩淡出底部，营造"未揭晓"质感；展开时揭幕清晰
  const collapsed = !expanded && isOverflow;
  return (
    <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-serif text-2xl font-bold" style={{ color }}>{entry.title}</span>
          <span className="rounded-full border border-white/10 bg-ink-900/50 px-2 py-0.5 text-xs text-jade-100/55">{entry.biglx} · {entry.smalllx}</span>
        </div>
        <span className="rounded-full px-3 py-1 text-sm font-semibold" style={{ color, backgroundColor: `rgb(${alphaTriplet} / 0.1)`, border: `1px solid rgb(${alphaTriplet} / 0.25)` }}>
          {entry.luck}
        </span>
      </div>
      <div className="relative">
        <p
          ref={textRef}
          className="text-sm leading-7 text-jade-100/70"
          style={{
            maxHeight: expanded ? 'none' : `${COLLAPSED_MAX_HEIGHT}px`,
            overflow: 'hidden',
            transition: 'max-height 260ms ease',
          }}
        >
          {entry.meaning}
        </p>
        {/*
          折叠态：底部渐变模糊 + 墨色渐隐。
          单层 backdrop-filter 是均匀模糊，无法渐变；这里堆叠多层不同强度、
          不同高度的透明条带（均从底边起向上延伸），越靠下被叠加的层越多、越模糊，
          从上到下形成"清晰 → 朦胧"的自然过渡，而非一刀切。
        */}
        {collapsed && (
          <>
            {GRADIENT_BLUR_LAYERS.map((layer, i) => (
              <div
                key={i}
                className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b"
                style={{
                  height: `${layer.h}px`,
                  backdropFilter: `blur(${layer.blur}px)`,
                  WebkitBackdropFilter: `blur(${layer.blur}px)`,
                  background: 'transparent',
                }}
              />
            ))}
            {/* 底部墨色渐隐，让模糊与按钮区自然衔接 */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24 rounded-b"
              style={{ background: 'linear-gradient(to bottom, rgb(var(--background) / 0) 0%, rgb(var(--background) / 0.55) 55%, rgb(var(--background) / 0.95) 100%)' }}
            />
          </>
        )}
      </div>
      {isOverflow && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 rounded-full border border-jade-500/25 bg-jade-500/8 px-3 py-1 text-xs text-jade-300 transition-colors hover:border-jade-500/45 hover:bg-jade-500/15"
        >
          {expanded ? '收起 ▲' : '展开全文 ▼'}
        </button>
      )}
    </div>
  );
}
