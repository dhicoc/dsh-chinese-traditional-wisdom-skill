import { useEffect, useMemo, useState } from 'react';
import { getSolarEntry } from '@/engine-api/calendar';
import { useBirth } from '@/lib/birthContext';
import { calcCeziEnveloped, type CeziResult } from '@/engine-api/folklore';
import type { ToolEnvelope } from '@/engine-api/types';
import { validateDailyClaims, type DailyPresentationClaim } from '@/legacy/claimVerification/dailyClaimVerifier';
import { createWorkspaceReportMetadata } from '@/legacy/reportMetadata';
import { toUserPresentation, type StructuredFactCheck } from '@/legacy/reportLayers';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { FourLayerReport } from '@/components/shared/FourLayerReport';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { createCeziExportReport } from '@/features/anonymousExport';

type CeziAspect = '事业' | '感情' | '财利' | '健康' | '综合';
const SAFE_ERROR_MESSAGE = '本次计算未能完成，请核对输入后重试。';

/** Dashboard 边界：失败信封不透传引擎内部错误。 */
export function sanitizeCeziEnvelope(envelope: ToolEnvelope<CeziResult>): ToolEnvelope<CeziResult> {
  if (envelope.ok) return envelope;
  return {
    ...envelope,
    error: { code: 'calculation_failed', message: SAFE_ERROR_MESSAGE },
  };
}

function createCeziFailureEnvelope(char: string, aspect: CeziAspect): ToolEnvelope<CeziResult> {
  return sanitizeCeziEnvelope({
    ok: false,
    tool: 'cast_cezi',
    version: 'unknown',
    input_normalized: { char, aspect },
    data: {} as CeziResult,
    error: { code: 'calculation_exception', message: SAFE_ERROR_MESSAGE },
  });
}

export function createCeziFactChecks(data: CeziResult): StructuredFactCheck[] {
  const claims: Array<{ claim: DailyPresentationClaim; label: string; value: string }> = [
    { claim: { tool: 'cast_cezi', kind: 'cezi', field: 'char', value: data.char }, label: '所测字', value: data.char },
    { claim: { tool: 'cast_cezi', kind: 'cezi', field: 'strokes', value: data.strokes }, label: '康熙笔画', value: String(data.strokes) },
    { claim: { tool: 'cast_cezi', kind: 'ceziShuli', field: 'lucky', value: data.shuli.lucky }, label: '数理', value: data.shuli.lucky },
    { claim: { tool: 'cast_cezi', kind: 'ceziStructure', field: 'structure', value: data.structure.structure }, label: '字形结构', value: data.structure.structure },
  ];
  return claims.map(({ claim, label, value }) => ({
    fact: { label, value, tool: 'cast_cezi' },
    validation: validateDailyClaims('cast_cezi', data, [claim]),
  }));
}

export function CeziWorkspace() {
  const { solarBirth } = useBirth();
  const [char, setChar] = useState('明');
  const [aspect, setAspect] = useState<CeziAspect>('综合');
  const [useBazi, setUseBazi] = useState(true);
  const [result, setResult] = useState<{ envelope: ToolEnvelope<CeziResult> | null }>({ envelope: null });

  useEffect(() => {
    let cancelled = false;
    if (!char.trim()) {
      setResult({ envelope: null });
      return;
    }
    void (async () => {
      try {
        const solar = getSolarEntry() ?? null;
        const envelope = await calcCeziEnveloped({
          char,
          aspect,
          birth: useBazi ? { year: solarBirth.year, month: solarBirth.month, day: solarBirth.day, hour: solarBirth.hour, minute: solarBirth.minute, gender: solarBirth.gender } : undefined,
          solar,
        });
        if (!cancelled) setResult({ envelope: sanitizeCeziEnvelope(envelope) });
      } catch {
        if (!cancelled) setResult({ envelope: createCeziFailureEnvelope(char, aspect) });
      }
    })();
    return () => { cancelled = true; };
  }, [char, aspect, useBazi, solarBirth]);

  const factChecks = useMemo(() => result.envelope?.ok ? createCeziFactChecks(result.envelope.data) : [], [result.envelope]);
  const presentation = useMemo(() => result.envelope ? toUserPresentation(result.envelope, {
    factChecks,
    disclaimers: ['测字结果仅作传统民俗文化学习参考，不作为现实决策依据。'],
  }) : null, [result.envelope, factChecks]);
  const reportMetadata = useMemo(() => result.envelope ? createWorkspaceReportMetadata({ moduleId: 'cezi', inputSummary: '本次已按所选方向完成字占参考；报告不记录输入文字、原始问题或出生资料。' }) : null, [result.envelope]);
  const exportPresentation = useMemo(() => presentation?.exportReport ? ({
    report: createCeziExportReport({ source: presentation.exportReport }),
    notices: presentation.notices,
    warnings: ['导出内容已按隐私边界脱敏处理。'],
    reportMetadata: reportMetadata ?? undefined,
  }) : null, [presentation, reportMetadata]);
  const r = result.envelope?.ok ? result.envelope.data : null;
  const toneColor = r?.tone === '吉' ? 'text-jade-300' : r?.tone === '凶' ? 'text-red-300' : 'text-amber-300';

  return (
    <div className="space-y-4">
      <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><h2 className="text-lg font-semibold text-jade-50">测字 · 字占</h2><p className="text-sm text-jade-100/55">一笔一画皆有象 · 象数 + 字义占卜</p></div><span className="rounded-full border border-jade-500/30 bg-jade-500/10 px-3 py-1 text-xs text-jade-400">民间占卜</span></div>
        <p className="mt-3 text-xs leading-5 text-jade-100/45">输入一个字，看笔画数理、字义五行、字形结构与偏旁象义。可选结合八字用神，判断该字对事业/感情的影响与起名建议。仅供文化参考。</p>
        <p className="mt-3 rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-jade-100/55">测字结果仅作传统民俗文化学习参考，不作为现实决策依据。</p>
      </div>
      <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument"><div className="flex items-center justify-between gap-3 border-b border-white/8 pb-3"><p className="text-sm font-semibold text-jade-100">输入</p></div><div className="mt-3 space-y-3">
        <label className="flex flex-col gap-1 text-sm"><span className="text-jade-100/55">所测之字（取首字）</span><input type="text" value={char} onChange={(e) => setChar(e.target.value.slice(0, 4))} placeholder="输入一个汉字" className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-lg text-jade-100 outline-none transition focus:border-jade-500/45" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="text-jade-100/55">问题方向</span><select value={aspect} onChange={(e) => setAspect(e.target.value as CeziAspect)} className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45">{(['综合', '事业', '感情', '财利', '健康'] as CeziAspect[]).map((a) => <option key={a} value={a}>{a}</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm text-jade-100/70"><input type="checkbox" checked={useBazi} onChange={(e) => setUseBazi(e.target.checked)} className="rounded border-white/20 bg-ink-900" /><span>结合八字用神（当前生辰：{solarBirth.year}-{String(solarBirth.month).padStart(2, '0')}-{String(solarBirth.day).padStart(2, '0')}）</span></label>
      </div></div>
      {presentation?.state === 'error' && <InterpretationCard title="计算未完成" subtitle="请核对输入"><p className="text-sm text-jade-100/55">{presentation.error?.message}</p></InterpretationCard>}
      {r && presentation?.report && (
        <div className="space-y-4 ct-animate-fade-in"><InterpretationCard title={`测「${r.char}」字 · ${r.tone === '吉' ? '吉' : r.tone === '凶' ? '凶' : '中'}`} subtitle={`康熙${r.strokes}画 · 数理${r.shuli.lucky}（${r.shuli.skyNine}）${r.charWuxing ? ` · 属${r.charWuxing}` : ''} · ${r.structure.structure}`}><div className="space-y-3">
          <div className="flex items-center gap-4 rounded-card border border-white/8 bg-ink-900/40 px-4 py-3"><span className="font-serif text-5xl text-jade-100">{r.char}</span><div className="flex-1"><p className={`text-lg font-bold ${toneColor}`}>{r.tone === '吉' ? '吉' : r.tone === '凶' ? '凶' : '中平'}</p><p className="text-xs text-jade-100/55">{r.shuli.skyNine} · {r.shuli.comment}</p></div></div>
          <div className="grid gap-2 sm:grid-cols-3"><div className="rounded-card border border-white/8 bg-ink-900/40 px-3 py-2 text-xs"><p className="font-semibold text-jade-300">笔画数理</p><p className="mt-1 text-jade-100/60">康熙 {r.strokes} 画{r.strokesEstimated ? '（估算）' : ''}</p><p className="text-jade-100/55">数理{r.shuli.lucky}</p></div><div className="rounded-card border border-white/8 bg-ink-900/40 px-3 py-2 text-xs"><p className="font-semibold text-jade-300">字义五行</p><p className="mt-1 text-jade-100/60">{r.charWuxing ? `属${r.charWuxing}` : '未收录'}</p><p className="text-jade-100/45 line-clamp-2">{r.meaning ? r.meaning.slice(0, 40) + (r.meaning.length > 40 ? '…' : '') : '字义未录'}</p></div><div className="rounded-card border border-white/8 bg-ink-900/40 px-3 py-2 text-xs"><p className="font-semibold text-jade-300">字形结构</p><p className="mt-1 text-jade-100/60">{r.structure.structure}</p><p className="text-jade-100/45">{r.structure.symbolism.split('，')[0]}</p></div></div>
          {r.baziComplement && <div className="rounded-card border border-jade-500/20 bg-jade-500/5 px-3 py-2 text-xs"><p className="font-semibold text-jade-300">八字用神补益</p><p className="mt-1 text-jade-100/60">日主{r.baziComplement.dayMaster} · 用神{r.baziComplement.xiyongShen} · <span className={r.baziComplement.complement === '补用神' ? 'text-jade-300' : r.baziComplement.complement === '克耗' ? 'text-red-300' : 'text-amber-300'}>{r.baziComplement.complement}</span>（补益度{r.baziComplement.score}）</p><p className="text-jade-100/55">{r.baziComplement.detail}</p></div>}
          <div className="space-y-1.5 text-xs"><p className="rounded-card border border-white/8 bg-ink-900/40 px-3 py-2 text-jade-100/60"><span className="text-jade-300">事业影响：</span>{r.careerAdvice}</p><p className="rounded-card border border-white/8 bg-ink-900/40 px-3 py-2 text-jade-100/60"><span className="text-jade-300">感情影响：</span>{r.loveAdvice}</p><p className="rounded-card border border-white/8 bg-ink-900/40 px-3 py-2 text-jade-100/60"><span className="text-jade-300">改字/起名建议：</span>{r.nameAdvice}</p></div>
          <div className="flex justify-end gap-2"><CopyContextButton commandScope="cezi" title="测字摘要" payload={{ 项目: '测字', 文字: r.char, 笔画: r.strokes, 数理: r.shuli, 五行: r.charWuxing, 结构: r.structure.structure, 八字补益: r.baziComplement, 解读: r.synthesis }} /><ExportReportButton module="测字" presentation={exportPresentation} /></div>
        </div></InterpretationCard><FourLayerReport report={presentation.report} semanticReport={presentation.semanticReport} notices={presentation.notices} warnings={presentation.warnings} reportMetadata={reportMetadata ?? undefined} title={`测「${r.char}」字解读`} /></div>
      )}
    </div>
  );
}
