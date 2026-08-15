import { useMemo, useState } from 'react';
import {
  KNOWLEDGE_REFERENCE_PRESETS,
  queryKnowledgeReferences,
  type KnowledgeReferenceHit,
} from '@/lib/knowledgeReference';

interface KnowledgeReferencePanelProps {
  title?: string;
  description?: string;
  initialTerm?: string;
  terms?: string[];
}

function HitCard({ hit }: { hit: KnowledgeReferenceHit }) {
  return (
    <article className="rounded-card border border-white/8 bg-black/24 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-jade-500/25 bg-jade-500/10 px-2 py-0.5 text-[10px] text-jade-400">
          {hit.kind === 'mapping' ? '映射表' : '古籍索引'}
        </span>
        <span className="text-[10px] text-jade-100/55">{hit.category}</span>
      </div>
      <h4 className="mt-2 text-sm font-semibold text-jade-100">{hit.title}</h4>
      {hit.citationId && (
        <p className="mt-1 text-[10px] text-jade-400/80">已关联古籍引用。</p>
      )}
      <p className="mt-1 text-xs leading-5 text-jade-100/60">{hit.summary}</p>
      {hit.details.length > 0 && (
        <ul className="mt-2 space-y-1 text-[11px] leading-5 text-jade-100/45">
          {hit.details.map((detail) => (
            <li key={detail}>• {detail}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function KnowledgeReferencePanel({
  title = '知识引用',
  description = '点击术语或输入关键词，查看映射表条目与古籍索引线索。',
  initialTerm = '坎',
  terms = [...KNOWLEDGE_REFERENCE_PRESETS],
}: KnowledgeReferencePanelProps) {
  const [term, setTerm] = useState(initialTerm);
  const hits = useMemo(() => queryKnowledgeReferences(term, { limit: 8 }), [term]);

  return (
    <section className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
      <div className="flex flex-col gap-1">
        <h3 className="font-serif text-lg font-semibold text-jade-100">{title}</h3>
        <p className="text-xs leading-5 text-jade-100/45">{description}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {terms.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTerm(item)}
            className={[
              'rounded-full border px-3 py-1.5 text-xs transition',
              item === term
                ? 'border-jade-500/40 bg-jade-500/12 text-jade-50'
                : 'border-white/8 bg-white/[0.03] text-jade-100/45 hover:border-white/18 hover:text-jade-100',
            ].join(' ')}
          >
            {item}
          </button>
        ))}
      </div>

      <label className="mt-3 flex items-center gap-2 rounded-card border border-white/8 bg-black/24 px-3 py-2">
        <span className="font-mono text-xs text-jade-400">引用</span>
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="输入术语、方位、山名、飞星…"
          className="min-w-0 flex-1 bg-transparent text-sm text-jade-100 placeholder:text-jade-100/25 focus:outline-none"
        />
      </label>

      <div className="mt-3 space-y-2">
        {hits.length > 0 ? (
          hits.map((hit) => <HitCard key={hit.id} hit={hit} />)
        ) : (
          <p className="rounded-card border border-white/8 bg-black/24 p-3 text-xs leading-5 text-jade-100/55">
            暂未命中映射表或风水知识库索引。可尝试“坎”“生气”“五黄”“反弓煞”等关键词。
          </p>
        )}
      </div>
    </section>
  );
}
