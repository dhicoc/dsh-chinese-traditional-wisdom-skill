import { useMemo, useState } from 'react';
import { getSolarEntry } from '@/engine-api/calendar';
import { useBirth } from '@/lib/birthContext';
import { calcChenguzEnveloped, type ChenguzResult } from '@/engine-api/folklore';
import type { ToolEnvelope } from '@/engine-api/types';
import { CHENGUZ_VERSIONS, DEFAULT_CHENGUZ_VERSION, type ChenguzVersionId } from '@/legacy/chenguzVersions';
import { validateDailyClaims, type DailyPresentationClaim } from '@/legacy/claimVerification/dailyClaimVerifier';
import { createWorkspaceReportMetadata } from '@/legacy/reportMetadata';
import { toUserPresentation, type StructuredFactCheck } from '@/legacy/reportLayers';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { FourLayerReport } from '@/components/shared/FourLayerReport';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { createChenguzExportReport } from '@/features/anonymousExport';

const SAFE_ERROR_MESSAGE = '本次计算未能完成，请核对输入后重试。';

/** Dashboard 边界：失败信封不透传引擎内部错误。 */
export function sanitizeChenguzEnvelope(envelope: ToolEnvelope<ChenguzResult>): ToolEnvelope<ChenguzResult> {
  if (envelope.ok) return envelope;
  return {
    ...envelope,
    error: { code: 'calculation_failed', message: SAFE_ERROR_MESSAGE },
  };
}

function createChenguzFailureEnvelope(
  birth: ToolEnvelope<ChenguzResult>['input_normalized']['birth'],
  version: ChenguzVersionId,
): ToolEnvelope<ChenguzResult> {
  return sanitizeChenguzEnvelope({
    ok: false,
    tool: 'calc_chenguz',
    version: 'unknown',
    input_normalized: { birth, version },
    data: {} as ChenguzResult,
    error: { code: 'calculation_exception', message: SAFE_ERROR_MESSAGE },
  });
}

export function createChenguzFactChecks(data: ChenguzResult): StructuredFactCheck[] {
  const claims: Array<{ claim: DailyPresentationClaim; label: string; value: string }> = [
    { claim: { tool: 'calc_chenguz', kind: 'chenguzTotal', field: 'text', value: data.totalText }, label: '总骨重', value: data.totalText },
    { claim: { tool: 'calc_chenguz', kind: 'chenguzVersion', field: 'name', value: data.versionName }, label: '版本', value: data.versionName },
    { claim: { tool: 'calc_chenguz', kind: 'chenguzBone', component: 'yearBone', field: 'branch', value: data.yearBone.branch }, label: '年支', value: data.yearBone.branch },
    { claim: { tool: 'calc_chenguz', kind: 'chenguzBone', component: 'monthBone', field: 'lunarMonth', value: data.monthBone.lunarMonth }, label: '农历月', value: String(data.monthBone.lunarMonth) },
  ];
  return claims.map(({ claim, label, value }) => ({
    fact: { label, value, tool: 'calc_chenguz' },
    validation: validateDailyClaims('calc_chenguz', data, [claim]),
  }));
}

export function ChenguzWorkspace() {
  const { solarBirth } = useBirth();
  const [versionId, setVersionId] = useState<ChenguzVersionId>(DEFAULT_CHENGUZ_VERSION);
  const envelope = useMemo<ToolEnvelope<ChenguzResult>>(() => {
    try {
      return sanitizeChenguzEnvelope(calcChenguzEnveloped({ birth: solarBirth, solar: getSolarEntry() ?? null, version: versionId }));
    } catch {
      return createChenguzFailureEnvelope(solarBirth, versionId);
    }
  }, [solarBirth, versionId]);
  const factChecks = useMemo(() => envelope.ok ? createChenguzFactChecks(envelope.data) : [], [envelope]);
  const presentation = useMemo(() => toUserPresentation(envelope, { factChecks, disclaimers: ['称骨结果仅作传统民俗文化学习参考，不作为现实决策依据。'] }), [envelope, factChecks]);
  const reportMetadata = useMemo(() => createWorkspaceReportMetadata({ moduleId: 'chenguz', inputSummary: '本次按选定民间版本完成称骨参考；报告不保留出生资料。' }), []);
  const exportPresentation = useMemo(() => presentation.exportReport ? ({
    report: createChenguzExportReport({ source: presentation.exportReport }),
    notices: presentation.notices,
    warnings: ['导出内容已按隐私边界脱敏处理。'],
    reportMetadata,
  }) : null, [presentation, reportMetadata]);
  const r = envelope.ok ? envelope.data : null;
  const toneColor = r?.tone === '吉' ? 'text-jade-300' : r?.tone === '凶' ? 'text-red-300' : 'text-amber-300';
  const activeVersion = CHENGUZ_VERSIONS.find((v) => v.id === versionId) ?? CHENGUZ_VERSIONS[0];

  if (presentation.state === 'error') return <div className="space-y-4"><InterpretationCard title="计算未完成" subtitle="请核对输入"><p className="text-sm text-jade-100/55">{presentation.error?.message}</p></InterpretationCard></div>;
  if (!r || !presentation.report) return null;
  return (
    <div className="space-y-4">
      <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><h2 className="text-lg font-semibold text-jade-50">袁天罡称骨算命</h2><p className="text-sm text-jade-100/55">按出生年月日时查骨重 · 称骨歌定命格</p></div><span className="rounded-full border border-jade-500/30 bg-jade-500/10 px-3 py-1 text-xs text-jade-400">民间算命</span></div><p className="mt-3 text-xs leading-5 text-jade-100/45">袁天罡称骨法：按农历年月日时查四柱骨重（两+钱），总重对应称骨歌一段，定命格轻重。骨越重命越贵，骨轻则多劳。用顶部全局生辰即可，无需额外输入。仅供文化参考。</p><p className="mt-3 rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-jade-100/55">称骨结果仅作传统民俗文化学习参考，不作为现实决策依据。</p><div className="mt-3 rounded-card border border-white/8 bg-ink-900/40 px-3 py-2"><p className="mb-1.5 text-xs font-semibold text-jade-100/70">称骨歌版本（无唯一正本，三版民间传抄本供选择）</p><div className="flex flex-wrap gap-1.5">{CHENGUZ_VERSIONS.map((v) => <button key={v.id} type="button" onClick={() => setVersionId(v.id)} className={`rounded-full px-3 py-1 text-xs transition-colors ${v.id === versionId ? 'border border-jade-500/50 bg-jade-500/20 text-jade-100' : 'border border-white/10 bg-ink-900/60 text-jade-100/55 hover:border-jade-500/30 hover:text-jade-100/80'}`}>{v.name}</button>)}</div><p className="mt-1.5 text-[11px] leading-4 text-jade-100/45">{activeVersion.note}</p></div></div>
      <div className="space-y-4 ct-animate-fade-in"><InterpretationCard title={`称骨 · 总重${r.totalText}`} subtitle={`${r.tone === '吉' ? '骨重厚实' : r.tone === '凶' ? '骨轻多劳' : '中等'} · ${r.yearBone.branch}年 ${r.hourBone.branch}时 · ${r.versionName}`}><div className="space-y-3"><div className="flex items-center gap-4 rounded-card border border-white/8 bg-ink-900/40 px-4 py-4"><span className={`font-serif text-4xl font-bold ${toneColor}`}>{r.totalText}</span><div className="flex-1"><p className={`text-sm font-semibold ${toneColor}`}>{r.tone === '吉' ? '福禄丰盈' : r.tone === '凶' ? '宜积德行善' : '先难后易'}</p><p className="text-xs text-jade-100/55">{r.interpretation}</p></div></div><div><p className="mb-1 text-xs font-semibold text-jade-100/70">四柱骨重</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{[{ label: `年（${r.yearBone.branch}）`, w: r.yearBone.weight }, { label: `月（农历${r.monthBone.lunarMonth}月）`, w: r.monthBone.weight }, { label: `日（农历${r.dayBone.lunarDay}）`, w: r.dayBone.weight }, { label: `时（${r.hourBone.branch}）`, w: r.hourBone.weight }].map((b) => <div key={b.label} className="rounded-card border border-white/8 bg-ink-900/40 px-3 py-2 text-xs"><p className="text-jade-300">{b.label}</p><p className="mt-1 font-mono text-lg text-jade-100">{b.w.liang}两{b.w.qian > 0 ? `${b.w.qian}钱` : ''}</p></div>)}</div><p className="mt-2 text-center text-xs text-jade-100/45">{r.yearBone.weight.liang}两{r.yearBone.weight.qian}钱 + {r.monthBone.weight.liang}两{r.monthBone.weight.qian}钱 + {r.dayBone.weight.liang}两{r.dayBone.weight.qian}钱 + {r.hourBone.weight.liang}两{r.hourBone.weight.qian}钱 = <span className="font-bold text-jade-200">{r.totalText}</span></p></div><div className="rounded-card border border-jade-500/20 bg-jade-500/5 px-4 py-3"><p className="text-xs font-semibold text-jade-300">称骨歌 · {r.totalText}</p><p className="mt-2 font-serif text-sm leading-7 text-jade-100/80">{r.song}</p></div><div className="flex justify-end gap-2"><CopyContextButton commandScope="chenguz" title="称骨摘要" payload={{ 项目: '称骨', 骨重: r.totalText, 称骨歌: r.song, 解读: r.interpretation, 年柱: r.yearBone, 月柱: r.monthBone, 日柱: r.dayBone, 时柱: r.hourBone }} /><ExportReportButton module="称骨" presentation={exportPresentation} /></div></div></InterpretationCard><FourLayerReport report={presentation.report} semanticReport={presentation.semanticReport} notices={presentation.notices} warnings={presentation.warnings} reportMetadata={reportMetadata} title={`称骨 · ${r.totalText} 解读`} /></div>
    </div>
  );
}
