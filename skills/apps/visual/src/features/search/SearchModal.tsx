import { useEffect, useMemo, useRef, useState } from 'react';
import type { ModuleId } from '@/lib/modules';
import { searchAll, type SearchResult } from '@/legacy/searchEngine';
import { dispatchReaderSearchIntent } from '@/lib/commandIntents';

/**
 * SearchModal — 全局搜索浮层（从 visual/js/search.js 迁移）
 *
 * 三源全文搜索：术语解释 / 风水映射表 / 古籍文献。
 * 点击古籍条目切到 Split Reader 并高亮关键词。
 *
 * 通过 openSearchModal() / closeSearchModal() 控制，或监听 OPEN_SEARCH_INTENT_EVENT。
 */

export const OPEN_SEARCH_INTENT_EVENT = 'ctw:open-search';

export function openSearchModal(): void {
  window.dispatchEvent(new CustomEvent(OPEN_SEARCH_INTENT_EVENT));
}

export function SearchModal({ onSelectModule }: { onSelectModule: (id: ModuleId) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleOpen() {
      setOpen(true);
      setQuery('');
    }
    window.addEventListener(OPEN_SEARCH_INTENT_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_SEARCH_INTENT_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    // 打开后聚焦输入框
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
    };
  }, [open]);

  // 防抖搜索
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 150);
    return () => window.clearTimeout(t);
  }, [query]);

  const result: SearchResult = useMemo(
    () => (open ? searchAll(debouncedQuery) : { terms: [], mappings: [], kb: [] }),
    [open, debouncedQuery],
  );

  if (!open) return null;

  const total = result.terms.length + result.mappings.length + result.kb.length;

  function openReader(term: string, citationId?: string) {
    onSelectModule('reader');
    window.setTimeout(() => dispatchReaderSearchIntent({ term, citationId, raw: term }), 0);
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-[10001]">
      {/* 遮罩 */}
      <button
        type="button"
        aria-label="关闭搜索"
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm ct-animate-fade-in"
        onClick={() => setOpen(false)}
      />

      {/* 对话框 */}
      <div className="absolute left-1/2 top-20 flex max-h-[70vh] w-[640px] max-w-[90vw] -translate-x-1/2 flex-col overflow-hidden rounded-card border border-white/10 bg-ink-900/95 shadow-[0_8px_40px_rgb(var(--shadow-rgb)/0.5)] backdrop-blur-md ct-animate-fade-in">
        {/* 输入栏 */}
        <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-3.5">
          <span className="text-lg">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索术语、古籍、风水概念…"
            className="flex-1 border-none bg-transparent px-1 py-1.5 text-sm text-jade-100 outline-none placeholder:text-jade-100/30"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-1 text-xl text-jade-100/40 transition hover:text-jade-100/70"
          >
            ✕
          </button>
        </div>

        {/* 结果区 */}
        <div className="min-h-[100px] flex-1 overflow-y-auto py-2">
          {!debouncedQuery && (
            <div className="px-5 py-10 text-center text-sm text-jade-100/30">
              输入关键词开始搜索，可查术语解释、风水古籍、映射表
            </div>
          )}
          {debouncedQuery && total === 0 && (
            <div className="px-5 py-10 text-center text-sm text-jade-100/30">
              未找到与 <b className="text-jade-100/50">“{debouncedQuery}”</b> 相关的结果
            </div>
          )}

          {result.terms.length > 0 && (
            <ResultGroup label="术语解释" count={result.terms.length}>
              {result.terms.slice(0, 20).map((t) => (
                <div
                  key={t.term}
                  className="cursor-pointer border-b border-white/5 px-5 py-2.5 transition hover:bg-white/5"
                  onClick={() => openReader(t.term)}
                >
                  <div className="text-[13px] font-semibold text-jade-100">
                    {highlight(t.term, debouncedQuery)}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-jade-100/50">
                    {highlight(t.explanation.slice(0, 120), debouncedQuery)}
                  </div>
                </div>
              ))}
            </ResultGroup>
          )}

          {result.mappings.length > 0 && (
            <ResultGroup label="风水映射表" count={result.mappings.length}>
              {result.mappings.slice(0, 10).map((m) => (
                <div
                  key={m.file}
                  className="cursor-pointer border-b border-white/5 px-5 py-2.5 transition hover:bg-white/5"
                  onClick={() => openReader(m.title)}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-jade-100">
                      {highlight(m.title, debouncedQuery)}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-jade-100/35">
                    {m.category}
                  </div>
                  <div className="mt-0.5 text-xs text-jade-100/50">
                    {highlight(m.summary, debouncedQuery)}
                  </div>
                </div>
              ))}
            </ResultGroup>
          )}

          {result.kb.length > 0 && (
            <ResultGroup label="古籍文献" count={result.kb.length} testId="search-results-ancient">
              {result.kb.slice(0, 10).map((k) => (
                <div
                  key={k.file}
                  className="cursor-pointer border-b border-white/5 px-5 py-2.5 transition hover:bg-white/5"
                  onClick={() => openReader(k.title, k.citationId)}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-stone-700 px-1.5 py-px text-[11px] font-bold text-white">
                      古籍
                    </span>
                    <span className="text-[13px] font-semibold text-jade-100">
                      {highlight(k.title, debouncedQuery)}
                    </span>
                    {k.author && (
                      <span className="text-[11px] text-jade-100/30">{k.author}</span>
                    )}
                    <span className="text-[11px] text-jade-100/40">
                      {k.category}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-jade-100/50">
                    {highlight(k.summary, debouncedQuery)}
                  </div>
                </div>
              ))}
            </ResultGroup>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultGroup({ label, count, children, testId }: {
  label: string;
  count: number;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <div data-testid={testId}>
      <div className="flex justify-between px-5 py-1.5 text-[11px] text-jade-100/30">
        <span>{label}</span>
        <span>{count} 条</span>
      </div>
      {children}
    </div>
  );
}

/** 关键词高亮（大小写无关） */
function highlight(text: string, query: string): React.ReactNode {
  if (!text || !query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <b className="text-amber-400">{text.slice(idx, idx + query.length)}</b>
      {text.slice(idx + query.length)}
    </>
  );
}
