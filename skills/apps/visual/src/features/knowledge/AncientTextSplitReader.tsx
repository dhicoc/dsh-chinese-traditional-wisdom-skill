import { useEffect, useMemo, useState } from 'react';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import {
  consumeReaderSearchIntent,
  READER_SEARCH_INTENT_EVENT,
  type ReaderSearchIntentDetail,
} from '@/lib/commandIntents';
import { getCanonicalHexagram, type CanonicalHexagram } from '@/legacy/ichingTexts';
import { createKnowledgeCitationId, findKnowledgeBaseEntry } from '@/legacy/searchEngine';

import bazhaiText from '@kb/fengshui/03-yang-house/八宅明镜.md?raw';

interface TextPair {
  id: string;
  title: string;
  description: string;
  source: string;
  mappingName: string;
}

interface IChingReading {
  hexagram: CanonicalHexagram;
  changingHexagram: CanonicalHexagram | null;
  changingLines: number[];
}

const BAZHAI_CITATION_ID = createKnowledgeCitationId('03-yang-house/八宅明镜.md');

const TEXT_PAIRS: TextPair[] = [
  {
    id: 'bazhai-mansion',
    title: '八宅明镜 ↔ 八宅大游年映射',
    description: '清代箬冠道人《八宅明镜》原文与八宅大游年相关说明对照。',
    source: bazhaiText,
    mappingName: '八宅大游年说明',
  },
  {
    id: 'bazhai-life-trigram',
    title: '八宅明镜 ↔ 命卦映射',
    description: '《八宅明镜》论男女生命部分与命卦相关说明对照。',
    source: bazhaiText,
    mappingName: '命卦说明',
  },
  {
    id: 'bazhai-24mountains',
    title: '八宅明镜 ↔ 二十四山映射',
    description: '《八宅明镜》后天八卦方位部分与二十四山相关说明对照。',
    source: bazhaiText,
    mappingName: '二十四山说明',
  },
];

function renderMarkdownLite(text: string): string {
  const h1Open = '<h1 class="text-jade-50 font-serif text-xl font-bold mt-5 mb-3">';
  const h2Open = '<h2 class="text-jade-100 font-serif text-lg font-semibold mt-5 mb-2">';
  const h3Open = '<h3 class="text-jade-100/70 font-semibold mt-4 mb-2">';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, `${h3Open}$1</h3>`)
    .replace(/^## (.+)$/gm, `${h2Open}$1</h2>`)
    .replace(/^# (.+)$/gm, `${h1Open}$1</h1>`)
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-jade-500/30 pl-3 text-jade-100/55 italic my-2">$1</blockquote>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-jade-100/80">$1</strong>')
    .replace(/^---$/gm, '<hr class="border-white/8 my-3" />')
    .replace(/\n\n/g, '</p><p class="text-jade-100/70 leading-7 my-1">')
    .replace(/^/, '<p class="text-jade-100/70 leading-7 my-1">')
    .replace(/$/, '</p>');
}

function toIChingReading(detail: ReaderSearchIntentDetail): IChingReading | null {
  if (!detail.iching) return null;
  const hexagram = getCanonicalHexagram(detail.iching.hexagramNumber);
  const changingHexagram = detail.iching.changingHexagramNumber
    ? getCanonicalHexagram(detail.iching.changingHexagramNumber)
    : null;
  if (!hexagram || hexagram.name !== detail.iching.hexagramName) return null;
  if (changingHexagram && changingHexagram.name !== detail.iching.changingHexagramName) return null;
  return { hexagram, changingHexagram, changingLines: detail.iching.changingLines };
}

function ClassicalTextCard({ title, hexagram, changingLines }: {
  title: string;
  hexagram: CanonicalHexagram;
  changingLines?: number[];
}) {
  return (
    <article className="min-w-0 rounded-panel border border-ink-700 bg-ink-850/60 p-4">
      <div className="mb-3 border-b border-white/8 pb-2">
        <h3 className="font-serif text-lg font-semibold text-jade-100">{title} · {hexagram.name}</h3>
        <p className="mt-1 text-xs leading-5 text-jade-100/45">《周易》卦辞、爻辞与彖传</p>
      </div>
      <div className="space-y-4 text-sm leading-7 text-jade-100/70">
        <section>
          <h4 className="font-serif font-semibold text-jade-100">卦辞</h4>
          <p className="mt-1">{hexagram.guaCi}</p>
        </section>
        {changingLines?.map((line) => hexagram.yaoCi[line - 1] ? (
          <section key={line} className="rounded-card border border-cinnabar-500/20 bg-cinnabar-500/5 p-3">
            <h4 className="font-serif font-semibold text-cinnabar-300">第{line}爻爻辞</h4>
            <p className="mt-1">{hexagram.yaoCi[line - 1]}</p>
          </section>
        ) : null)}
        <section>
          <h4 className="font-serif font-semibold text-jade-100">彖传</h4>
          <p className="mt-1">{hexagram.tuanZhuan}</p>
        </section>
      </div>
    </article>
  );
}

export function AncientTextSplitReader() {
  const [selectedId, setSelectedId] = useState(TEXT_PAIRS[0].id);
  const [selectedCitationId, setSelectedCitationId] = useState(BAZHAI_CITATION_ID);
  const [searchTerm, setSearchTerm] = useState('');
  const [ichingReading, setIChingReading] = useState<IChingReading | null>(null);

  useEffect(() => {
    function applyReaderSearchIntent(detail: ReaderSearchIntentDetail | null) {
      if (!detail?.term) return;
      const nextIChingReading = toIChingReading(detail);
      setIChingReading(nextIChingReading);
      setSearchTerm(detail.term);
      setSelectedCitationId(detail.citationId ?? BAZHAI_CITATION_ID);
    }

    function handleReaderSearchIntent(event: Event) {
      applyReaderSearchIntent(consumeReaderSearchIntent() ?? (event as CustomEvent<ReaderSearchIntentDetail>).detail);
    }

    applyReaderSearchIntent(consumeReaderSearchIntent());
    window.addEventListener(READER_SEARCH_INTENT_EVENT, handleReaderSearchIntent);
    return () => window.removeEventListener(READER_SEARCH_INTENT_EVENT, handleReaderSearchIntent);
  }, []);

  const selected = TEXT_PAIRS.find((pair) => pair.id === selectedId) ?? TEXT_PAIRS[0];
  const selectedBook = findKnowledgeBaseEntry(selectedCitationId);
  const hasEmbeddedText = selectedCitationId === BAZHAI_CITATION_ID;
  const highlightedSource = useMemo(() => {
    const html = renderMarkdownLite(selected.source);
    if (!searchTerm) return html;
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return html.replace(
      new RegExp(escaped, 'gi'),
      '<mark class="bg-amber-500/30 text-amber-100 rounded px-0.5">$&</mark>',
    );
  }, [selected, searchTerm]);

  const contextPayload = useMemo(() => ({
    项目: '古籍阅读',
    当前内容: ichingReading ? `《周易》${ichingReading.hexagram.name}卦` : selectedBook?.title ?? selected.title,
    搜索关键词: searchTerm || '未填写',
  }), [ichingReading, selected, selectedBook, searchTerm]);

  if (ichingReading) {
    return (
      <section className="space-y-4">
        <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-jade-100">本次起卦关联原文</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
                以下仅对应本次起卦的本卦、动爻与变卦，供阅读《周易》原文与传统术语，不延伸为现实断语。
              </p>
              <p className="mt-3 rounded-card border border-white/10 bg-black/20 p-3 text-xs leading-5 text-jade-100/55">
                本卦：{ichingReading.hexagram.name}；动爻：{ichingReading.changingLines.length ? ichingReading.changingLines.map((line) => `第${line}爻`).join('、') : '无'}。
              </p>
              <p className="mt-3 rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-jade-100/55">
                古籍原文仅作传统文化知识学习参考，不作为现实决策依据。
              </p>
            </div>
            <CopyContextButton commandScope="reader" title="古籍阅读摘要" payload={contextPayload} />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ClassicalTextCard title="本卦" hexagram={ichingReading.hexagram} changingLines={ichingReading.changingLines} />
          {ichingReading.changingHexagram ? (
            <ClassicalTextCard title="变卦" hexagram={ichingReading.changingHexagram} />
          ) : (
            <div className="rounded-panel border border-dashed border-white/10 bg-black/16 p-6 text-sm leading-7 text-jade-100/55">
              本次无动爻，故不另列变卦原文。
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-jade-100">古籍阅读</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              阅读古籍原文与相关说明，支持关键词搜索与重点标记；现收录《八宅明镜》与起卦关联的《周易》原文。
            </p>
            <div className="mt-3 rounded-card border border-white/10 bg-black/20 p-3 text-xs leading-5 text-jade-100/55">
              <p>当前古籍：{selectedBook?.title ?? '未识别的古籍条目'}</p>
              <p className="mt-1 text-jade-300">已关联古籍引用。</p>
              {!hasEmbeddedText && <p className="mt-2 text-amber-200">该古籍已建立稳定引用，但正文尚未内嵌到阅读器。</p>}
            </div>
            <p className="mt-3 rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-jade-100/55">
              古籍阅读内容仅作传统文化知识学习参考，不作为现实决策依据。
            </p>
          </div>
          <CopyContextButton commandScope="reader" title="古籍阅读摘要" payload={contextPayload} />
        </div>
      </div>

      {hasEmbeddedText ? (
        <>
          <div className="flex flex-wrap gap-2">
            {TEXT_PAIRS.map((pair) => (
              <button key={pair.id} type="button" onClick={() => setSelectedId(pair.id)} className={[
                'shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition',
                pair.id === selectedId ? 'border-jade-500/40 bg-jade-500/12 text-jade-50' : 'border-transparent text-jade-100/45 hover:border-white/10 hover:text-jade-100/80',
              ].join(' ')}>
                {pair.title}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 rounded-panel border border-ink-700 bg-black/24 p-3">
            <span className="font-mono text-sm text-jade-500">🔍</span>
            <input type="text" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="搜索原文关键词…" className="flex-1 bg-transparent text-sm text-jade-100 placeholder:text-jade-100/55 focus:outline-none" />
            {searchTerm && <button type="button" onClick={() => setSearchTerm('')} className="text-xs text-jade-100/45 hover:text-jade-100/70">清除</button>}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="min-w-0 rounded-panel border border-ink-700 bg-ink-850/60 p-4">
              <div className="mb-3 flex items-center justify-between border-b border-white/8 pb-2"><h3 className="font-serif text-sm font-semibold text-jade-100/70">古籍原文</h3></div>
              <div className="max-h-[60vh] overflow-y-auto pr-2 text-sm leading-7" dangerouslySetInnerHTML={{ __html: highlightedSource }} />
            </div>
            <div className="min-w-0 rounded-panel border border-ink-700 bg-ink-850/60 p-4">
              <div className="mb-3 flex items-center justify-between border-b border-white/8 pb-2"><h3 className="font-serif text-sm font-semibold text-jade-100/70">相关说明</h3></div>
              <p className="rounded-card border border-white/8 bg-black/30 p-3 text-sm leading-7 text-jade-100/65">本页将《八宅明镜》原文与{selected.mappingName}并列阅读，便于对照理解传统术语与方位关系。</p>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-panel border border-amber-300/20 bg-amber-500/5 p-4 text-sm leading-7 text-jade-100/65">当前古籍正文尚未收录到阅读器；相关引用已保留，待后续补充原文。</div>
      )}
    </section>
  );
}
