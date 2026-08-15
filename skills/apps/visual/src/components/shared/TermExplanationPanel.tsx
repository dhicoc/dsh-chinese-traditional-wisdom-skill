import { useEffect, useState } from 'react';
import { explainTerm } from '@/legacy/termExplanations';

/**
 * TermExplanationPanel — 通用术语解释面板（纯 TS 词表，无 window.LegacyCORE）
 */

interface TermExplanationPanelProps {
  /** 初始选中术语 */
  initialTerm?: string;
  /** 可点击的术语列表 */
  terms: string[];
  /** 面板说明 */
  description?: string;
  /**
   * @deprecated 旧桥已移除，术语表始终可用；保留 prop 以免改动各工作区调用点。
   */
  ready?: boolean;
}

export function TermExplanationPanel({ initialTerm, terms, description, ready = true }: TermExplanationPanelProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string>('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!ready || !initialTerm) return;
    const exp = explainTerm(initialTerm);
    if (exp && exp !== '暂无该术语的解释') {
      setSelected(initialTerm);
      setExplanation(exp);
      setNotFound(false);
    }
  }, [ready, initialTerm]);

  const lookupTerm = (term: string) => {
    setSelected(term);
    if (!ready) {
      setExplanation('');
      setNotFound(true);
      return;
    }
    const exp = explainTerm(term);
    if (exp && exp !== '暂无该术语的解释') {
      setExplanation(exp);
      setNotFound(false);
    } else {
      setExplanation('');
      setNotFound(true);
    }
  };

  return (
    <div className="rounded-card border border-white/8 bg-white/[0.025] p-4">
      <p className="text-sm font-semibold text-jade-100/70">术语解释</p>
      {description && <p className="mt-0.5 text-xs text-jade-100/45">{description}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {terms.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => lookupTerm(term)}
            className={`rounded-full border px-2.5 py-1 text-xs transition ${
              selected === term
                ? 'border-jade-500/40 bg-jade-500/15 text-jade-300'
                : 'border-white/10 bg-black/20 text-jade-100/60 hover:border-white/20 hover:text-jade-100/80'
            }`}
          >
            {term}
          </button>
        ))}
      </div>
      {selected && (
        <div className="mt-3 rounded-card border border-white/8 bg-black/20 p-3 text-sm leading-6 text-jade-100/70">
          {notFound ? (
            <span className="text-jade-100/45">「{selected}」暂无内置解释。</span>
          ) : (
            <>
              <span className="font-semibold text-jade-200">{selected}：</span>
              {explanation}
            </>
          )}
        </div>
      )}
    </div>
  );
}
